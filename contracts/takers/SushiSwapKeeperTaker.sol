// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// AUDIT FIX: Import OpenZeppelin utilities for security
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { IERC20Pool, PoolDeployer } from "../AjnaInterfaces.sol";
import { IERC20 } from "../OneInchInterfaces.sol";
import { IAjnaKeeperTaker } from "../interfaces/IAjnaKeeperTaker.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice SushiSwap V3 implementation for Ajna keeper takes using SushiSwap Router
/// @dev FIXED: Now mirrors 1inch pattern for decimal handling and pre-calculated minimums
// AUDIT FIX: Inherit from ReentrancyGuard for security
contract SushiSwapKeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;
      
    /// @notice FIXED: Configuration for SushiSwap swaps with pre-calculated minimum (mirrors 1inch)
    struct SushiSwapDetails {
        address swapRouter;         // SushiSwap router contract address
        address targetToken;        // Token to swap collateral for (usually quote token)
        uint24 feeTier;            // SushiSwap fee tier (500, 3000, 10000)
        uint256 amountOutMinimum;  // FIXED: Pre-calculated minimum output (replaces slippageBps)
        uint256 deadline;          // Swap deadline timestamp
    }

    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    /// @dev Actor allowed to take auctions using this contract
    address public immutable owner;
    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;
    /// @dev Factory contract that is also authorized to call functions
    address public immutable authorizedFactory;

    // Events for monitoring
    event TakeExecuted(
        address indexed pool,
        address indexed borrower,
        uint256 collateralAmount,
        uint256 quoteAmount,
        LiquiditySource source,
        address indexed caller
    );
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // Errors
    error Unauthorized();           // sig: 0x82b42900
    error InvalidPool();            // sig: 0x2083cd40
    error UnsupportedSource();      // sig: 0xf54a7ed9
    error SwapFailed();             // sig: 0xf2fde38b
    error InvalidSwapDetails();     // sig: 0x13d0c2b4

    /// @param ajnaErc20PoolFactory Ajna ERC20 pool factory for the deployment
    /// @param _authorizedFactory Factory contract address that can also call functions
    constructor(PoolDeployer ajnaErc20PoolFactory, address _authorizedFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
        authorizedFactory = _authorizedFactory;
    }

    /// @inheritdoc IAjnaKeeperTaker
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        LiquiditySource source,
        address swapRouter,
        bytes calldata swapDetails
    ) external onlyOwnerOrFactory {
        // Validate inputs
        if (source != LiquiditySource.SushiSwap) revert UnsupportedSource();
        if (!_validatePool(pool)) revert InvalidPool();
        
        // FIXED: Decode new parameter structure (mirrors TypeScript encoding)
        if (swapDetails.length < 96) revert InvalidSwapDetails(); // Basic length check
        (uint24 feeTier, uint256 amountOutMinimum, uint256 deadline) = abi.decode(swapDetails, (uint24, uint256, uint256));
        
        // FIXED: Validate parameters (updated for new structure)
        require(swapRouter != address(0), "Invalid router");
        require(deadline > block.timestamp, "Expired deadline");
        require(amountOutMinimum > 0, "Invalid minimum amount"); // FIXED: Validate minimum instead of slippage

        // FIXED: Configuration with new struct (mirrors 1inch pattern)
        bytes memory data = abi.encode(SushiSwapDetails({
            swapRouter: swapRouter,
            targetToken: pool.quoteTokenAddress(),
            feeTier: feeTier,
            amountOutMinimum: amountOutMinimum, // FIXED: Use pre-calculated minimum
            deadline: deadline
        }));

        // FIXED: Safe approval using Ajna's scaling (same as 1inch pattern)
        uint256 approvalAmount = Math.ceilDiv(_ceilWmul(maxAmount, auctionPrice), pool.quoteTokenScale());
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), approvalAmount);

        // Invoke the take
        pool.take(borrowerAddress, maxAmount, address(this), data);
        
        // SECURITY FIX: Reset allowance to prevent future misuse
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), 0);

        // AUDIT FIX: Emit event for monitoring
        emit TakeExecuted(
            address(pool),
            borrowerAddress,
            maxAmount,
            approvalAmount,
            source,
            msg.sender
        );
        
        // Send excess quote token (profit) to owner
        _recoverToken(IERC20(pool.quoteTokenAddress()));
    }

    /// @notice Called by Pool to swap collateral for quote tokens during liquidation
    // AUDIT FIX: Add nonReentrant modifier for security
    function atomicSwapCallback(uint256 collateralAmountWad, uint256, bytes calldata data) external override nonReentrant {
        // Ensure msg.sender is a valid Ajna pool
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        // Decode swap configuration
        SushiSwapDetails memory details = abi.decode(data, (SushiSwapDetails));
        
        // FIXED: Convert WAD to token precision using Ajna scaling (same as 1inch)
        uint256 collateralAmount = Math.ceilDiv(collateralAmountWad, pool.collateralScale());
        
        // Execute SushiSwap swap
        _swapWithSushiSwap(
            pool.collateralAddress(),
            details.targetToken,
            collateralAmount,
            details
        );
    }

    /// @inheritdoc IAjnaKeeperTaker
    function recover(IERC20 token) external onlyOwnerOrFactory {
        _recoverToken(token);
    }

    /// @inheritdoc IAjnaKeeperTaker
    function getSupportedSources() external pure returns (LiquiditySource[] memory sources) {
        sources = new LiquiditySource[](1);
        sources[0] = LiquiditySource.SushiSwap;
    }

    /// @inheritdoc IAjnaKeeperTaker
    function isSourceSupported(LiquiditySource source) external pure returns (bool supported) {
        return source == LiquiditySource.SushiSwap;
    }

    /// @dev FIXED: Executes swap using SushiSwap Router with pre-calculated minimum (mirrors 1inch)
    function _swapWithSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        SushiSwapDetails memory details
    ) private {
        if (amountIn == 0) revert SwapFailed();
        if (block.timestamp > details.deadline) revert SwapFailed();

        IERC20 tokenInContract = IERC20(tokenIn);
        
        // FIXED: Safe approval for SushiSwap router (same as 1inch pattern)
        _safeApproveWithReset(tokenInContract, details.swapRouter, amountIn);

        // CRITICAL FIX: Use pre-calculated minimum directly (mirrors 1inch success pattern)
        // This replaces the broken slippage calculation that didn't work with mixed decimals
        uint256 amountOutMin = details.amountOutMinimum;

        // Prepare SushiSwap exactInputSingle parameters
        bytes memory swapCalldata = abi.encodeWithSignature(
            "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
            tokenIn,              // tokenIn
            tokenOut,             // tokenOut
            details.feeTier,      // fee
            address(this),        // recipient
            details.deadline,     // deadline
            amountIn,             // amountIn
            amountOutMin,         // FIXED: Use pre-calculated minimum (not broken slippage calc)
            uint160(0)            // sqrtPriceLimitX96 (no limit)
        );

        // Execute the swap
        // AUDIT FIX: Replace unsafe call with Address.functionCall and validate return
        bytes memory result = Address.functionCall(
            details.swapRouter,
            swapCalldata,
            "SushiSwap swap failed"
        );
        
        // Decode and validate output amount
        uint256 amountOut = abi.decode(result, (uint256));
        require(amountOut >= amountOutMin, "Insufficient output amount");
        
        // AUDIT FIX: Emit swap event for monitoring
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @dev Recovers token balance to owner
    function _recoverToken(IERC20 token) private {
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner, balance);
        }
    }

    /// @dev Validates that the pool is from our Ajna deployment
    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    /// @dev FIXED: Multiplies two WADs and rounds up (same as 1inch pattern)
    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    /// @dev FIXED: Safe approval that handles non-zero to non-zero allowance issue (same as 1inch)
    /// @param token The ERC20 token to approve
    /// @param spender The address to approve
    /// @param amount The amount to approve
    function _safeApproveWithReset(IERC20 token, address spender, uint256 amount) private {
        uint256 currentAllowance = token.allowance(address(this), spender);
        
        if (currentAllowance != 0) {
            // Reset to zero first if there's existing allowance
            token.safeApprove(spender, 0);
        }
        
        // Now approve the new amount
        if (amount != 0) {
            token.safeApprove(spender, amount);
        }
    }

    // New modifier that allows both owner and authorized factory
    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != authorizedFactory) revert Unauthorized();
        _;
    }
}
