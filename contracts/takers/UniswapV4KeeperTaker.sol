// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// OpenZeppelin
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Project imports
import { IERC20Pool, PoolDeployer } from "../AjnaInterfaces.sol";
import { IERC20 } from "../OneInchInterfaces.sol";
import { IAjnaKeeperTaker } from "../interfaces/IAjnaKeeperTaker.sol";

/// @dev Uniswap v4 "Currency" UDVT. Matches canonical V4 ABI.
type Currency is address;

using { CurrencyLibrary.unwrap } for Currency;
using { CurrencyLibrary.isNative } for Currency;

library CurrencyLibrary {
    function unwrap(Currency currency) internal pure returns (address) {
        return Currency.unwrap(currency);
    }
    function isNative(Currency currency) internal pure returns (bool) {
        return Currency.unwrap(currency) == address(0);
    }
    function toId(Currency currency) internal pure returns (uint256) {
        return uint256(uint160(Currency.unwrap(currency)));
    }
    function fromId(uint256 id) internal pure returns (Currency) {
        return Currency.wrap(address(uint160(id)));
    }
}

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

/// @dev BalanceDelta is a packed int256 in V4 (not a struct!)
/// Upper 128 bits = amount0, Lower 128 bits = amount1
type BalanceDelta is int256;

library BalanceDeltaLibrary {
    function amount0(BalanceDelta balanceDelta) internal pure returns (int128) {
        return int128(int256(BalanceDelta.unwrap(balanceDelta)) >> 128);
    }
    function amount1(BalanceDelta balanceDelta) internal pure returns (int128) {
        return int128(int256(BalanceDelta.unwrap(balanceDelta)));
    }
}

using BalanceDeltaLibrary for BalanceDelta global;

/// @dev Minimal subset of Uniswap v4 PoolManager we need.
interface IPoolManager {
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified; // exact input if negative
        uint160 sqrtPriceLimitX96;
    }

    function unlock(bytes calldata data) external returns (bytes memory);

    function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        returns (BalanceDelta);

    // V4 settle takes a currency argument
    function settle(Currency currency) external payable returns (uint256 paid);

    function take(Currency currency, address to, uint256 amount) external;

    // AUDIT FIX: sync() required before ERC-20 settlement
    // Snapshots the current balance so settle() can calculate the delta
    function sync(Currency currency) external;
}

/// @notice Uniswap V4 implementation for Ajna keeper takes using V4 flash accounting
/// @dev AUDIT FIXES: Aligned with SushiSwap pattern - immutable owner, pool validation, token recovery
contract UniswapV4KeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================================================
    // AUDIT FIX #1: Use immutable owner like SushiSwap (not Ownable)
    // ============================================================================

    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    /// @dev Actor allowed to take auctions using this contract
    address public immutable owner;
    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;
    /// @dev Factory contract authorized to call takeWithAtomicSwap
    address public immutable authorizedFactory;

    IPoolManager public immutable poolManager;

    // sqrtPriceX96 limits
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    struct CallbackCtx {
        bool active;
        IERC20Pool ajnaPool;
        address borrower;
        uint256 collateralWad;
        uint256 auctionPriceWad;
        SwapDetails details;
    }

    struct SwapDetails {
        PoolKey poolKey;
        uint256 amountOutMinimum; // quote token minimum
        uint160 sqrtPriceLimitX96;
    }

    CallbackCtx private ctx;

    event V4SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event TakeExecuted(address indexed pool, address indexed borrower, uint256 collateralAmount, uint256 quoteAmount);

    error InvalidUnlockCaller();
    error InvalidPool();
    error SwapFailed(string reason);
    error SourceNotSupported();
    error Unauthorized();

    /// @param _poolManager Uniswap V4 PoolManager address
    /// @param _poolFactory Ajna ERC20 pool factory for pool validation
    /// @param _authorizedFactory Factory contract that can call takeWithAtomicSwap
    constructor(address _poolManager, PoolDeployer _poolFactory, address _authorizedFactory) {
        poolManager = IPoolManager(_poolManager);
        poolFactory = _poolFactory;
        authorizedFactory = _authorizedFactory;
        owner = msg.sender;
    }

    // ----------------------------
    // IAjnaKeeperTaker
    // ----------------------------

    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount, // collateral WAD
        LiquiditySource source,
        address /* swapRouter */, // Ignored, we use immutable poolManager
        bytes calldata swapDetails
    ) external override onlyOwnerOrFactory nonReentrant {
        if (source != LiquiditySource.UniswapV4) revert SourceNotSupported();

        // AUDIT FIX #2: Validate pool is from our Ajna deployment
        if (!_validatePool(pool)) revert InvalidPool();

        // Decode V4 specific details
        (PoolKey memory key, uint256 minQuoteOut) = abi.decode(swapDetails, (PoolKey, uint256));

        ctx = CallbackCtx({
            active: true,
            ajnaPool: pool,
            borrower: borrowerAddress,
            collateralWad: maxAmount,
            auctionPriceWad: auctionPrice,
            details: SwapDetails({
                poolKey: key,
                amountOutMinimum: minQuoteOut,
                sqrtPriceLimitX96: 0 // Will be set in unlockCallback
            })
        });

        // Trigger the flash-swap flow via unlock
        poolManager.unlock("");

        // AUDIT FIX #10: Reset approval after take (security)
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), 0);

        // AUDIT FIX #9: Recover leftover tokens (profit) to owner
        _recoverToken(IERC20(pool.collateralAddress()));
        _recoverToken(IERC20(pool.quoteTokenAddress()));

        // Cleanup
        delete ctx;
    }

    function recover(IERC20 token) external override onlyOwnerOrFactory {
        _recoverToken(token);
    }

    // Note: The IAjnaKeeperTaker interface expects owner() but we use immutable owner
    // The immutable variable serves as the getter automatically

    function getSupportedSources() external pure override returns (LiquiditySource[] memory) {
        LiquiditySource[] memory sources = new LiquiditySource[](1);
        sources[0] = LiquiditySource.UniswapV4;
        return sources;
    }

    function isSourceSupported(LiquiditySource source) external pure override returns (bool) {
        return source == LiquiditySource.UniswapV4;
    }

    // ----------------------------
    // IERC20Taker (Ajna)
    // ----------------------------

    /// @notice Called by Ajna pool during take - INTENTIONALLY A NO-OP in V4 flow
    /// @dev AUDIT FIX M-04: This function is intentionally empty (except for pool validation).
    ///
    /// V4 ARCHITECTURE EXPLANATION:
    /// Unlike V3/SushiSwap where atomicSwapCallback performs the swap AFTER receiving collateral,
    /// V4 uses flash accounting with an inverted flow:
    ///
    /// V3/SushiSwap flow:
    ///   1. takeWithAtomicSwap() -> 2. pool.take() -> 3. atomicSwapCallback() performs swap -> 4. Done
    ///
    /// V4 flow (this contract):
    ///   1. takeWithAtomicSwap() -> 2. poolManager.unlock() -> 3. unlockCallback() {
    ///      a. V4 swap executes (we owe collateral, receive quote)
    ///      b. pool.take() -> atomicSwapCallback() (NO-OP, just validates pool)
    ///      c. Settle collateral to V4 PoolManager
    ///   } -> 4. Done
    ///
    /// The actual swap logic lives in unlockCallback(), NOT here.
    /// This callback only validates the pool for security and receives collateral passively.
    /// All three parameters (collateralAmount, quoteAmountDue, data) are intentionally unused.
    function atomicSwapCallback(
        uint256 /* collateralAmount */,
        uint256 /* quoteAmountDue */,
        bytes calldata /* data */
    ) external override {
        // SECURITY: Validate caller is a valid Ajna pool from our deployment
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        // NO-OP: Collateral is automatically transferred to this contract by Ajna.
        // The V4 unlockCallback will settle this collateral to the PoolManager.
        // DO NOT add swap logic here - it would conflict with the V4 flash accounting flow.
    }

    // ----------------------------
    // IPoolManager Callback
    // ----------------------------

    function unlockCallback(bytes calldata) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert InvalidUnlockCaller();
        if (!ctx.active) revert SwapFailed("no ctx");

        IERC20Pool pool = ctx.ajnaPool;
        address collateralToken = pool.collateralAddress();
        address quoteToken = pool.quoteTokenAddress();
        PoolKey memory key = ctx.details.poolKey;

        // Validate poolKey matches Ajna tokens and derive direction
        bool cIs0 = key.currency0.unwrap() == collateralToken;
        bool cIs1 = key.currency1.unwrap() == collateralToken;
        bool qIs0 = key.currency0.unwrap() == quoteToken;
        bool qIs1 = key.currency1.unwrap() == quoteToken;

        if (!(cIs0 || cIs1) || !(qIs0 || qIs1) || (cIs0 && qIs0) || (cIs1 && qIs1)) {
            revert SwapFailed("poolKey tokens mismatch");
        }

        bool zeroForOne = cIs0 && qIs1; // if collateral is currency0, we sell currency0

        uint160 sqrtLimit = ctx.details.sqrtPriceLimitX96;
        if (sqrtLimit == 0) {
            sqrtLimit = zeroForOne ? (MIN_SQRT_RATIO + 1) : (MAX_SQRT_RATIO - 1);
        }

        // Scale WAD (18 decimals) down to Native Token Decimals
        uint256 collateralScale = ctx.ajnaPool.collateralScale();
        uint256 collateralIn = ctx.collateralWad / collateralScale;

        if (collateralIn == 0) revert SwapFailed("collateral=0");

        // ================================================================
        // V4 FLASH ACCOUNTING FLOW
        // This uses V4's deferred settlement model:
        // 1. Swap records delta (we owe collateral, receive quote)
        // 2. Take quote from PM (we now have quote tokens)
        // 3. Pay Ajna (quote -> collateral via pool.take)
        // 4. Settle collateral to PM (balance our debt)
        // ================================================================

        // 1) Swap - records that we OWE collateral and RECEIVE quote
        BalanceDelta delta = poolManager.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(collateralIn), // exact input (negative)
                sqrtPriceLimitX96: sqrtLimit
            }),
            ""
        );

        // Extract deltas
        int128 collateralDelta = zeroForOne ? delta.amount0() : delta.amount1();
        int128 quoteDelta      = zeroForOne ? delta.amount1() : delta.amount0();

        // Validate: we PAY collateral (negative), RECEIVE quote (positive)
        if (collateralDelta >= 0) revert SwapFailed("collateralDelta>=0");
        if (quoteDelta <= 0) revert SwapFailed("quoteDelta<=0");

        uint256 collateralOwed = uint256(int256(-collateralDelta));
        uint256 quoteOut       = uint256(int256(quoteDelta));

        // AUDIT FIX: Allow 1-wei tolerance for V4 rounding dust
        // V4's internal arithmetic can produce 1-wei residuals that would otherwise cause
        // CurrencyNotSettled reverts at unlock exit
        if (collateralOwed > collateralIn + 1) revert SwapFailed("paid>specified");
        if (quoteOut < ctx.details.amountOutMinimum) revert SwapFailed("out<min");

        // 2) Pull quote OUT of PoolManager into this contract
        poolManager.take(Currency.wrap(quoteToken), address(this), quoteOut);

        emit V4SwapExecuted(collateralToken, quoteToken, collateralOwed, quoteOut);

        // 3) Pre-approve Ajna to pull quote
        // AUDIT FIX C-03: Calculate quoteNeeded first, then guard quoteOut >= quoteNeeded.
        // Using requested amounts for the ceiling calc matches Ajna's internal computation.
        // If the V4 swap didn't produce enough quote tokens to cover what Ajna will pull,
        // revert NOW with a clear error rather than letting Ajna's transferFrom fail silently.
        uint256 quoteScale = pool.quoteTokenScale();
        // AUDIT FIX L-01: Guard against zero quoteScale (should never happen, but defensive)
        if (quoteScale == 0) revert SwapFailed("quoteTokenScale=0");
        uint256 quoteNeeded = _ceilDiv(_ceilWmul(ctx.collateralWad, ctx.auctionPriceWad), quoteScale);
        if (quoteOut < quoteNeeded) revert SwapFailed("V4 output insufficient for Ajna take");

        _safeApproveWithReset(IERC20(quoteToken), address(pool), quoteNeeded);

        // 4) Ajna take (Collateral comes in via atomicSwapCallback)
        // AUDIT FIX C-01: Track actual collateral delivered by Ajna to detect partial fills.
        // If Ajna delivers less collateral than collateralOwed (which V4 flash accounting requires
        // us to settle), we revert here with a clear diagnostic instead of failing in settlement.
        uint256 collateralBefore = IERC20(collateralToken).balanceOf(address(this));
        pool.take(ctx.borrower, ctx.collateralWad, address(this), "");
        uint256 collateralReceived = IERC20(collateralToken).balanceOf(address(this)) - collateralBefore;
        if (collateralReceived < collateralOwed) {
            revert SwapFailed("partial fill: collateral received < V4 debt");
        }

        // 5) Settle collateral owed to V4
        _settleToPoolManager(collateralToken, collateralOwed);

        emit TakeExecuted(address(pool), ctx.borrower, ctx.collateralWad, quoteOut);

        return "";
    }

    // ----------------------------
    // Internals
    // ----------------------------

    /// @dev AUDIT FIX: Correct V4 ERC-20 settlement pattern: sync -> transfer -> settle
    /// For ETH: settle with value (no sync needed)
    /// For ERC-20: sync() snapshots balance, transfer adds tokens, settle() credits the delta
    function _settleToPoolManager(address token, uint256 amount) internal {
        if (amount == 0) return;

        Currency currency = Currency.wrap(token);

        if (token == address(0)) {
            // ETH: just settle with value
            poolManager.settle{ value: amount }(currency);
        } else {
            // ERC-20: sync -> transfer -> settle (AUDIT FIX for correct settlement)
            poolManager.sync(currency);  // Snapshot current balance
            IERC20(token).safeTransfer(address(poolManager), amount);
            poolManager.settle(currency);  // Credits delta = new balance - synced balance
        }
    }

    /// @dev AUDIT FIX #9: Recovers token balance to owner
    function _recoverToken(IERC20 token) private {
        uint256 bal = token.balanceOf(address(this));
        if (bal > 0) token.safeTransfer(owner, bal);
    }

    /// @dev AUDIT FIX #2: Validates that the pool is from our Ajna deployment (matches SushiSwap)
    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    /// @dev AUDIT FIX #10: Safe approval that handles non-zero to non-zero allowance issue
    function _safeApproveWithReset(IERC20 token, address spender, uint256 amount) private {
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance != 0) token.safeApprove(spender, 0);
        if (amount != 0) token.safeApprove(spender, amount);
    }

    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    function _ceilDiv(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x + y - 1) / y;
    }

    // AUDIT FIX #1: Access control modifier matching SushiSwap pattern
    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != authorizedFactory) revert Unauthorized();
        _;
    }
}
