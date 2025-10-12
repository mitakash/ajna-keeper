// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Ajna interfaces
interface IAjnaPool {
    function take(
        address borrower,
        uint256 collateral,
        address taker,
        bytes calldata data
    ) external returns (uint256 collateralTaken, uint256 t0RepayAmount, uint256 t0BondChange, uint256 t0DebtInAuctionChange);

    function collateralScale() external view returns (uint256);
    function quoteTokenScale() external view returns (uint256);
}

// V4 Core Types
struct Currency {
    address addr;
}

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

struct BalanceDelta {
    int128 amount0;
    int128 amount1;
}

// V4 Core interfaces
interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) 
        external returns (BalanceDelta memory swapDelta);
    function take(Currency memory currency, address to, uint256 amount) external;
    function settle() external payable returns (uint256 paid);
}

interface IUnlockCallback {
    function unlockCallback(bytes calldata data) external returns (bytes memory);
}

/**
 * UniswapV4KeeperTaker - Atomic liquidation + swap using Uniswap V4
 * 
 * ARCHITECTURE:
 * V4 uses a singleton PoolManager with an unlock/callback pattern:
 * 1. Call PoolManager.unlock() to begin transaction
 * 2. PoolManager calls back to unlockCallback()
 * 3. In callback, perform all pool operations (swap, take, settle)
 * 4. PoolManager verifies all balances net to zero before unlocking
 * 
 * FLASH ACCOUNTING:
 * - All balance changes tracked as "deltas" during unlock
 * - Only net changes settled at end of transaction
 * - Enables complex multi-step operations without intermediate transfers
 */
contract UniswapV4KeeperTaker is Ownable, ReentrancyGuard, IUnlockCallback {
    using SafeERC20 for IERC20;

    // Core addresses
    address public immutable ajnaErc20PoolFactory;
    address public immutable authorizedFactory;
    IPoolManager public immutable poolManager;

    // Swap execution context
    struct V4SwapContext {
        PoolKey poolKey;
        address ajnaPool;
        address borrower;
        uint256 collateralAmount;
        uint256 quoteAmountDue;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
        uint256 deadline;
        bool isActive;
    }

    V4SwapContext private swapContext;

    // Events
    event TakeWithSwap(
        address indexed pool,
        address indexed borrower,
        uint256 collateralTaken,
        uint256 quoteRepaid,
        uint256 profit
    );

    event EmergencyWithdraw(address indexed token, uint256 amount);

    // Custom errors
    error UnauthorizedCaller();
    error InvalidPool();
    error SwapFailed(string reason);
    error InsufficientOutput();
    error DeadlineExceeded();
    error InvalidSwapContext();

    constructor(
        address _ajnaErc20PoolFactory,
        address _authorizedFactory,
        address _poolManager
    ) {
        ajnaErc20PoolFactory = _ajnaErc20PoolFactory;
        authorizedFactory = _authorizedFactory;
        poolManager = IPoolManager(_poolManager);
    }

    modifier onlyAuthorizedFactory() {
        if (msg.sender != authorizedFactory) revert UnauthorizedCaller();
        _;
    }

    function isSourceSupported(uint8 source) external pure returns (bool) {
        // 5 = LiquiditySource.UNISWAPV4
        return source == 5;
    }

    /// @notice Returns the owner of this taker
    function owner() public view override returns (address) {
        return super.owner(); // Uses Ownable's owner()
    }

    /// @notice Owner may call to recover legitimate ERC20 tokens sent to this contract
    function recover(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /**
     * Take liquidation with atomic V4 swap
     * Called by AjnaKeeperTakerFactory
     */
    function takeWithAtomicSwap(
        address pool,
        address borrower,
        uint256 limitPrice,
        uint256 collateral,
        address swapRouter, // This is actually the PoolManager address
        bytes calldata swapData
    ) external onlyAuthorizedFactory nonReentrant {
        
        // Decode V4 swap parameters
        (
            PoolKey memory poolKey,
            uint256 amountOutMinimum,
            uint160 sqrtPriceLimitX96,
            uint256 deadline
        ) = abi.decode(swapData, (PoolKey, uint256, uint160, uint256));

        // Validate deadline
        if (block.timestamp > deadline) revert DeadlineExceeded();

        // Prepare callback context for V4's unlock pattern
        bytes memory unlockData = abi.encode(
            pool,           // Ajna pool address
            borrower,       // Borrower being liquidated
            collateral,     // Collateral amount to take
            poolKey,        // V4 pool identification
            amountOutMinimum,
            sqrtPriceLimitX96
        );

        // Trigger V4 unlock -> callback -> swap sequence
        // This will call our unlockCallback function
        poolManager.unlock(unlockData);
    }

    /**
     * V4 Unlock Callback - Core execution logic
     * 
     * Called by PoolManager during unlock sequence
     * Must perform all operations and ensure balance deltas net to zero
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        // Only PoolManager can call this
        if (msg.sender != address(poolManager)) revert UnauthorizedCaller();

        // Decode callback parameters
        (
            address ajnaPool,
            address borrower,
            uint256 collateralToTake,
            PoolKey memory poolKey,
            uint256 amountOutMinimum,
            uint160 sqrtPriceLimitX96
        ) = abi.decode(data, (address, address, uint256, PoolKey, uint256, uint160));

        // Store context for Ajna callback
        swapContext = V4SwapContext({
            poolKey: poolKey,
            ajnaPool: ajnaPool,
            borrower: borrower,
            collateralAmount: 0, // Will be set by Ajna callback
            quoteAmountDue: 0,   // Will be set by Ajna callback  
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: sqrtPriceLimitX96,
            deadline: block.timestamp + 1800,
            isActive: true
        });

        // Trigger Ajna liquidation -> this calls our auctionTake callback
        IAjnaPool(ajnaPool).take(borrower, collateralToTake, address(this), "");

        // Clean up context
        swapContext.isActive = false;

        return "";
    }

    /**
     * Ajna Callback - Executes the V4 swap
     * 
     * Called when Ajna liquidation occurs
     * Receives collateral, must return quote tokens
     */
    function auctionTake(
        uint256 collateralAmount,    // Amount of collateral received (token decimals)
        uint256 quoteAmountDue,      // Amount of quote tokens we owe (token decimals)
        bytes calldata               // Unused
    ) external {
        V4SwapContext memory ctx = swapContext;
        
        if (!ctx.isActive) revert InvalidSwapContext();
        if (msg.sender != ctx.ajnaPool) revert UnauthorizedCaller();

        // Update context with actual amounts
        swapContext.collateralAmount = collateralAmount;
        swapContext.quoteAmountDue = quoteAmountDue;

        // Get token addresses from pool key
        address collateralToken = ctx.poolKey.currency0.addr;
        address quoteToken = ctx.poolKey.currency1.addr;

        // Determine swap direction
        // If collateral is token0, we swap token0 -> token1 (zeroForOne = true)
        // If collateral is token1, we swap token1 -> token0 (zeroForOne = false)
        bool zeroForOne = (collateralToken != address(0)) && 
                         (collateralToken < quoteToken || quoteToken == address(0));

        // For exact input swap, amountSpecified is negative
        SwapParams memory swapParams = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(collateralAmount), // Negative for exact input
            sqrtPriceLimitX96: ctx.sqrtPriceLimitX96
        });

        // Execute V4 swap
        BalanceDelta memory delta = poolManager.swap(ctx.poolKey, swapParams, "");

        // Calculate actual output amount from delta
        uint256 amountOut;
        if (zeroForOne) {
            // Swapped token0 -> token1, output is in amount1 
            amountOut = uint256(uint128(-delta.amount1)); // Convert to positive
        } else {
            // Swapped token1 -> token0, output is in amount0
            amountOut = uint256(uint128(-delta.amount0)); // Convert to positive
        }

        // Verify minimum output
        if (amountOut < ctx.amountOutMinimum) {
            revert InsufficientOutput();
        }

        if (amountOut < quoteAmountDue) {
            revert SwapFailed("Insufficient swap output for liquidation");
        }

        // Settle V4 balance (pay what we owe for the swap)
        if (collateralToken == address(0)) {
            // Native ETH
            poolManager.settle{value: collateralAmount}();
        } else {
            // ERC20 token
            IERC20(collateralToken).safeTransfer(address(poolManager), collateralAmount);
            poolManager.settle();
        }

        // Take our output tokens from V4
        if (quoteToken == address(0)) {
            // Native ETH output
            poolManager.take(Currency(address(0)), address(this), amountOut);
        } else {
            // ERC20 output
            poolManager.take(Currency(quoteToken), address(this), amountOut);
        }

        // Pay back Ajna pool
        if (quoteToken == address(0)) {
            // Native ETH payment to Ajna
            payable(ctx.ajnaPool).transfer(quoteAmountDue);
        } else {
            // ERC20 payment to Ajna
            IERC20(quoteToken).safeTransfer(ctx.ajnaPool, quoteAmountDue);
        }

        // Calculate and transfer profit to owner
        uint256 profit = amountOut - quoteAmountDue;
        if (profit > 0) {
            if (quoteToken == address(0)) {
                payable(owner()).transfer(profit);
            } else {
                IERC20(quoteToken).safeTransfer(owner(), profit);
            }
        }

        emit TakeWithSwap(
            ctx.ajnaPool,
            ctx.borrower,
            collateralAmount,
            quoteAmountDue,
            profit
        );
    }

    /**
     * Emergency functions for stuck tokens/ETH
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
            emit EmergencyWithdraw(token, balance);
        }
    }

    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner()).transfer(balance);
        }
    }

    // Required to receive ETH from V4 operations
    receive() external payable {}
}