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

/// @notice Curve DEX implementation for Ajna keeper takes using Curve pools
/// @dev FIXED: Follows SushiSwap pattern for decimal handling and pre-calculated minimums
contract CurveKeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /// @notice Configuration for Curve swaps with pre-calculated minimum and pre-discovered indices
    struct CurveSwapDetails {
        address poolAddress;        // Curve pool contract address (from config)
        address tokenIn;           // Token input address (from Ajna pool.collateralAddress())
        address tokenOut;          // Token output address (from Ajna pool.quoteTokenAddress())
        uint8 poolType;           // 0=STABLE(int128), 1=CRYPTO(uint256)
        uint8 tokenInIndex;       // Pre-discovered by TypeScript
        uint8 tokenOutIndex;      // Pre-discovered by TypeScript
        uint256 amountOutMinimum; // Pre-calculated minimum output (replaces slippage calculation)
        uint256 deadline;         // Swap deadline timestamp
    }

    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");

    /// @dev Pool type constants
    uint8 private constant POOL_TYPE_STABLE = 0; // StableSwap pools use int128 indices
    uint8 private constant POOL_TYPE_CRYPTO = 1; // CryptoSwap pools use uint256 indices

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

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    // Errors
    error Unauthorized();       // sig: 0x82b42900
    error InvalidPool();        // sig: 0x2083cd40
    error UnsupportedSource();  // sig: 0xf54a7ed9
    error SwapFailed();         // sig: 0xf2fde38b
    error InvalidSwapDetails(); // sig: 0x13d0c2b4
    error InvalidPoolType();    // sig: 0x570b9b3f

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
        if (source != LiquiditySource.Curve) revert UnsupportedSource();
        if (!_validatePool(pool)) revert InvalidPool();

        // FIXED: Decode poolAddress first to validate against swapRouter
        if (swapDetails.length < 160) revert InvalidSwapDetails();
        (address poolAddress,,,,,) = abi.decode(swapDetails, (address, uint8, uint8, uint8, uint256, uint256));
        
        // FIXED: Validate swapRouter matches poolAddress (Curve has no central router)
        require(swapRouter == poolAddress, "Router must match pool address");

        // Use internal function to avoid stack depth issues
        _executeCurveTake(pool, borrowerAddress, auctionPrice, maxAmount, swapDetails);
    }

    /// @dev Internal function to handle Curve take logic and avoid stack depth issues
    function _executeCurveTake(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        bytes calldata swapDetails
    ) internal {
        // FIXED: Decode like SushiSwap pattern - basic validation first
        if (swapDetails.length < 160) revert InvalidSwapDetails();
        
        (address poolAddress, uint8 poolType, uint8 tokenInIndex, uint8 tokenOutIndex, uint256 amountOutMinimum, uint256 deadline) = 
            abi.decode(swapDetails, (address, uint8, uint8, uint8, uint256, uint256));

        // Basic validation (like SushiSwap)
        require(poolAddress != address(0) && poolType <= POOL_TYPE_CRYPTO && deadline > block.timestamp && amountOutMinimum > 0, "Invalid params");

        // FIXED: Create struct directly like SushiSwap (no helper function)
        bytes memory data = abi.encode(CurveSwapDetails({
            poolAddress: poolAddress,
            tokenIn: pool.collateralAddress(),
            tokenOut: pool.quoteTokenAddress(),
            poolType: poolType,
            tokenInIndex: tokenInIndex,
            tokenOutIndex: tokenOutIndex,
            amountOutMinimum: amountOutMinimum,
            deadline: deadline
        }));

        // FIXED: Safe approval (same as SushiSwap pattern)
        uint256 approvalAmount = Math.ceilDiv(_ceilWmul(maxAmount, auctionPrice), pool.quoteTokenScale());
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), approvalAmount);

        // Invoke the take
        pool.take(borrowerAddress, maxAmount, address(this), data);

        // Reset allowance and recover tokens
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), 0);
        _recoverToken(IERC20(pool.quoteTokenAddress()));
    }

    /// @notice Called by Pool to swap collateral for quote tokens during liquidation
    function atomicSwapCallback(uint256 collateral, uint256, bytes calldata data) external override nonReentrant {
        // Ensure msg.sender is a valid Ajna pool
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        // Decode swap configuration
        CurveSwapDetails memory details = abi.decode(data, (CurveSwapDetails));

        // Execute Curve swap
        _swapWithCurve(
            pool.collateralAddress(),
            details,
            collateral // This is already in native token amount that Ajna Core knows
        );
    }

    /// @inheritdoc IAjnaKeeperTaker
    function recover(IERC20 token) external onlyOwnerOrFactory {
        _recoverToken(token);
    }

    /// @inheritdoc IAjnaKeeperTaker
    function getSupportedSources() external pure returns (LiquiditySource[] memory sources) {
        sources = new LiquiditySource[](1);
        sources[0] = LiquiditySource.Curve;
    }

    /// @inheritdoc IAjnaKeeperTaker
    function isSourceSupported(LiquiditySource source) external pure returns (bool supported) {
        return source == LiquiditySource.Curve;
    }

    /// @dev Executes swap using Curve pools with pool-type-specific ABI calls
    function _swapWithCurve(
        address tokenIn,
        CurveSwapDetails memory details,
        uint256 amountIn
    ) private {
        if (amountIn == 0) revert SwapFailed();
        if (block.timestamp > details.deadline) revert SwapFailed();
        if (details.poolType > POOL_TYPE_CRYPTO) revert InvalidPoolType();

        // Validate token addresses match (additional safety check)
        require(tokenIn == details.tokenIn, "Token input mismatch");

        IERC20 tokenInContract = IERC20(tokenIn);

        // FIXED: Safe approval for Curve pool (same as SushiSwap pattern)
        _safeApproveWithReset(tokenInContract, details.poolAddress, amountIn);

        // FIXED: Use pre-calculated minimum directly (mirrors SushiSwap success pattern)
        uint256 amountOutMin = details.amountOutMinimum;

        bytes memory swapCalldata;
        if (details.poolType == POOL_TYPE_STABLE) {
            // StableSwap pools use int128 indices: exchange(int128 i, int128 j, uint256 dx, uint256 min_dy)
            swapCalldata = abi.encodeWithSignature(
                "exchange(int128,int128,uint256,uint256)",
                int128(uint128(details.tokenInIndex)),  // Cast to int128 for StableSwap
                int128(uint128(details.tokenOutIndex)), // Cast to int128 for StableSwap
                amountIn,
                amountOutMin
            );
        } else {
            // CryptoSwap pools use uint256 indices: exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy, bool use_eth, address receiver)
            swapCalldata = abi.encodeWithSignature(
                "exchange(uint256,uint256,uint256,uint256,bool,address)",
                uint256(details.tokenInIndex),   // uint256 for CryptoSwap
                uint256(details.tokenOutIndex),  // uint256 for CryptoSwap
                amountIn,
                amountOutMin,
                false,        // use_eth = false (ERC20 tokens only)
                address(this) // receiver = this contract
            );
        }

        // Execute the swap with conservative gas limit
        (bool success, bytes memory result) = details.poolAddress.call{gas: 300000}(swapCalldata);
        if (!success) {
            revert SwapFailed();
        }

        // Decode and validate output amount (both pool types return uint256)
        uint256 amountOut = abi.decode(result, (uint256));
        require(amountOut >= amountOutMin, "Insufficient output amount");

        emit SwapExecuted(details.tokenIn, details.tokenOut, amountIn, amountOut);
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

    /// @dev FIXED: Multiplies two WADs and rounds up (same as SushiSwap pattern)
    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    /// @dev FIXED: Safe approval that handles non-zero to non-zero allowance issue (same as SushiSwap)
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