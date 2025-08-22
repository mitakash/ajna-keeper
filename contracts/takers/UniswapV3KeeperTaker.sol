// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// AUDIT FIX: Import OpenZeppelin utilities
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import { IERC20Pool, PoolDeployer } from "../AjnaInterfaces.sol";
import { IERC20 } from "../OneInchInterfaces.sol";
import { IAjnaKeeperTaker } from "../interfaces/IAjnaKeeperTaker.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Uniswap V3 implementation for Ajna keeper takes using Universal Router
/// @dev FIXED: Now follows 1inch pattern exactly - simple and clean
contract UniswapV3KeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @notice FIXED: Simple configuration like 1inch (no complex validation)
    struct UniswapV3SwapDetails {
        address universalRouter;
        address permit2;
        address targetToken;
        uint24 feeTier;
        uint256 amountOutMinimum;  // Pre-calculated by TypeScript
        uint256 deadline;
    }

    /// @dev Hash used for all ERC20 pools
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    /// @dev V3_SWAP_EXACT_IN command for Universal Router
    bytes1 private constant V3_SWAP_EXACT_IN = 0x00;
    /// @dev Actor allowed to take auctions
    address public immutable owner;
    /// @dev Identifies the Ajna deployment
    PoolDeployer public immutable poolFactory;
    /// @dev Factory contract that can also call functions
    address public immutable authorizedFactory;

    // Events
    event TakeExecuted(address indexed pool, address indexed borrower, uint256 collateralAmount, uint256 quoteAmount, LiquiditySource source, address indexed caller);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // Errors
    error Unauthorized();
    error InvalidPool();
    error UnsupportedSource();
    error SwapFailed();

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
        // Basic validation (like 1inch)
        if (source != LiquiditySource.UniswapV3) revert UnsupportedSource();
        if (!_validatePool(pool)) revert InvalidPool();

        // FIXED: Decode struct like SushiSwap pattern
        UniswapV3SwapDetails memory details = abi.decode(swapDetails, (UniswapV3SwapDetails));
        
        // Basic validation
        require(details.universalRouter == swapRouter, "Router mismatch");
        require(details.targetToken == pool.quoteTokenAddress(), "Invalid target");
        
        // FIXED: Re-encode for callback (like SushiSwap)
        bytes memory data = abi.encode(details);

        // FIXED: Simple approval like 1inch
        uint256 approvalAmount = _ceilWmul(maxAmount, auctionPrice) / pool.quoteTokenScale();
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), approvalAmount);

        emit TakeExecuted(address(pool), borrowerAddress, maxAmount, approvalAmount, source, msg.sender);

        // Invoke take
        pool.take(borrowerAddress, maxAmount, address(this), data);
        
        // Send profit to owner
        _recoverToken(IERC20(pool.quoteTokenAddress()));
    }

    /// @notice Called by Pool to swap collateral for quote tokens
    function atomicSwapCallback(uint256 collateralAmountWad, uint256, bytes calldata data) external override nonReentrant {
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        // FIXED: Simple decode like 1inch
        UniswapV3SwapDetails memory details = abi.decode(data, (UniswapV3SwapDetails));
        
        // FIXED: Simple conversion like 1inch/SushiSwap
        uint256 collateralAmount = collateralAmountWad / pool.collateralScale();
        
        // Execute swap
        _swapWithUniswapV3(pool.collateralAddress(), details.targetToken, collateralAmount, details);
    }

    /// @inheritdoc IAjnaKeeperTaker
    function recover(IERC20 token) external onlyOwnerOrFactory {
        _recoverToken(token);
    }

    /// @inheritdoc IAjnaKeeperTaker
    function getSupportedSources() external pure returns (LiquiditySource[] memory sources) {
        sources = new LiquiditySource[](1);
        sources[0] = LiquiditySource.UniswapV3;
    }

    /// @inheritdoc IAjnaKeeperTaker
    function isSourceSupported(LiquiditySource source) external pure returns (bool supported) {
        return source == LiquiditySource.UniswapV3;
    }

    /// @dev FIXED: Simple swap like 1inch pattern
    function _swapWithUniswapV3(address tokenIn, address tokenOut, uint256 amountIn, UniswapV3SwapDetails memory details) private {
        if (amountIn == 0) revert SwapFailed();

        IERC20 tokenInContract = IERC20(tokenIn);
        
        // Step 1: Approve Permit2
        _safeApproveWithReset(tokenInContract, details.permit2, amountIn);
        
        // Step 2: Approve Universal Router via Permit2
        bytes memory permit2ApprovalData = abi.encodeWithSignature(
            "approve(address,address,uint160,uint48)",
            tokenIn, details.universalRouter, amountIn, uint48(details.deadline)
        );
        (bool permit2Success,) = details.permit2.call(permit2ApprovalData);
        if (!permit2Success) revert SwapFailed();

        // Step 3: Build Universal Router call
        bytes memory path = abi.encodePacked(tokenIn, details.feeTier, tokenOut);
        bytes memory commands = abi.encodePacked(V3_SWAP_EXACT_IN);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(address(this), amountIn, details.amountOutMinimum, path, true);
        
        bytes memory swapData = abi.encodeWithSignature(
            "execute(bytes,bytes[],uint256)",
            commands, inputs, details.deadline
        );
        
        // Step 4: Execute swap
        Address.functionCall(details.universalRouter, swapData, "Uniswap swap failed");
        
        emit SwapExecuted(tokenIn, tokenOut, amountIn, details.amountOutMinimum);
    }

    function _recoverToken(IERC20 token) private {
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner, balance);
        }
    }

    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    function _safeApproveWithReset(IERC20 token, address spender, uint256 amount) private {
        uint256 currentAllowance = token.allowance(address(this), spender);
        if (currentAllowance != 0) {
            token.safeApprove(spender, 0);
        }
        if (amount != 0) {
            token.safeApprove(spender, amount);
        }
    }

    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != authorizedFactory) revert Unauthorized();
        _;
    }
}