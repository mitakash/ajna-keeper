// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IERC20 } from "../OneInchInterfaces.sol";
import { IERC20Pool, PoolDeployer } from "../AjnaInterfaces.sol";
import { IAjnaKeeperTaker } from "../interfaces/IAjnaKeeperTaker.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice UniswapV4KeeperTaker – mirrors your V3 taker but defers exact swap logic to a V4 router/adapter.
///         TS builds `routerCalldata` for the chosen V4 router (PoolManager/periphery/adapter) and we just forward it.
contract UniswapV4KeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- config/immutables ----
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    address public immutable owner;
    PoolDeployer public immutable poolFactory;
    address public immutable authorizedFactory;

    // ---- errors/events ----
    error Unauthorized();
    error InvalidPool();
    error UnsupportedSource();
    error InvalidSwapDetails();
    error Expired();
    error SwapFailed();

    event TakeExecuted(address indexed pool, address indexed borrower, uint256 collateralAmount, uint256 quoteAmount, LiquiditySource source, address indexed caller);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // Pick the enum value you reserve for V4 in your system (e.g., LiquiditySource.UniswapV4)
    // If your enum doesn’t yet include UniswapV4, add it and use that here.
    LiquiditySource private constant UNI_V4_SOURCE = LiquiditySource.UniswapV4;

    struct UniswapV4SwapDetails {
        address router;               // V4 router/adapter you’re calling
        address tokenOut;             // must equal pool.quoteTokenAddress()
        uint256 amountOutMinimum;     // TS pre-computed
        uint256 deadline;             // unix ts; enforced here
        bytes   routerCalldata;       // full calldata for the router
    }

    constructor(PoolDeployer ajnaErc20PoolFactory, address _authorizedFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
        authorizedFactory = _authorizedFactory;
    }

    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != authorizedFactory) revert Unauthorized();
        _;
    }

    // -------- IAjnaKeeperTaker --------

    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,      // WAD
        uint256 maxAmount,         // WAD collateral to take
        LiquiditySource source,
        address swapRouter,        // must match details.router
        bytes calldata swapDetails // abi.encode(UniswapV4SwapDetails)
    ) external onlyOwnerOrFactory {
        if (source != UNI_V4_SOURCE) revert UnsupportedSource();
        if (!_validatePool(pool)) revert InvalidPool();
        if (swapDetails.length < 96) revert InvalidSwapDetails();

        UniswapV4SwapDetails memory details = abi.decode(swapDetails, (UniswapV4SwapDetails));
        if (details.router != swapRouter) revert InvalidSwapDetails();
        if (details.tokenOut != pool.quoteTokenAddress()) revert InvalidSwapDetails();
        if (details.amountOutMinimum == 0) revert InvalidSwapDetails();
        if (details.deadline <= block.timestamp) revert Expired();

        // approve Ajna pool to pull quote tokens per your V3 math pattern
        uint256 approvalAmount = _ceilWmul(maxAmount, auctionPrice) / pool.quoteTokenScale();
        IERC20 quote = IERC20(pool.quoteTokenAddress());
        _safeApproveWithReset(quote, address(pool), approvalAmount);

        // pass through to callback
        bytes memory data = abi.encode(details);
        pool.take(borrowerAddress, maxAmount, address(this), data);

        // reset allowance & sweep
        _safeApproveWithReset(quote, address(pool), 0);
        _recoverToken(quote);
    }

    // Called by Ajna pool
    function atomicSwapCallback(uint256 collateral, uint256, bytes calldata data)
        external
        override
        nonReentrant
    {
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        UniswapV4SwapDetails memory details = abi.decode(data, (UniswapV4SwapDetails));
        if (details.deadline <= block.timestamp) revert Expired();

        address tokenInAddr  = pool.collateralAddress();
        address tokenOutAddr = details.tokenOut;

        IERC20 tokenIn  = IERC20(tokenInAddr);
        IERC20 tokenOut = IERC20(tokenOutAddr);

        // approve router for the exact collateral we received
        _safeApproveWithReset(tokenIn, details.router, collateral);

        uint256 beforeOut = tokenOut.balanceOf(address(this));

        // forward the calldata built off-chain for your chosen v4 router/adapter
        (bool ok, ) = details.router.call{ gas: 300_000 }(details.routerCalldata);
        if (!ok) revert SwapFailed();

        uint256 outDelta = tokenOut.balanceOf(address(this)) - beforeOut;
        if (outDelta < details.amountOutMinimum) revert SwapFailed();

        // reset router approval and emit
        _safeApproveWithReset(tokenIn, details.router, 0);
        emit SwapExecuted(tokenInAddr, tokenOutAddr, collateral, outDelta);
    }

    function recover(IERC20 token) external onlyOwnerOrFactory {
        _recoverToken(token);
    }

    function getSupportedSources() external pure returns (LiquiditySource[] memory sources) {
        sources = new LiquiditySource[](1);
        sources[0] = UNI_V4_SOURCE;
    }

    function isSourceSupported(LiquiditySource s) external pure returns (bool) {
        return s == UNI_V4_SOURCE;
    }

    // -------- internals --------

    function _validatePool(IERC20Pool pool) private view returns (bool) {
        return poolFactory.deployedPools(
            ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()
        ) == address(pool);
    }

    // ceil(x*y / 1e18)
    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    function _safeApproveWithReset(IERC20 token, address spender, uint256 amount) internal {
        uint256 curr = token.allowance(address(this), spender);
        if (curr != 0) token.safeApprove(spender, 0);
        if (amount != 0) token.safeApprove(spender, amount);
    }

    function _recoverToken(IERC20 token) private {
        uint256 bal = token.balanceOf(address(this));
        if (bal > 0) token.safeTransfer(owner, bal);
    }
}