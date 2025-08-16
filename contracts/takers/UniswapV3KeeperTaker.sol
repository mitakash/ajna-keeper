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
/// @dev FIXED: Now supports both direct owner calls AND factory calls
// AUDIT FIX: Inherit from ReentrancyGuard
contract UniswapV3KeeperTaker is IAjnaKeeperTaker, ReentrancyGuard {
    using SafeERC20 for IERC20; 
    /// @notice Configuration for Uniswap V3 swaps via Universal Router
    struct UniswapV3SwapDetails {
        address universalRouter;        // Universal Router contract address
        address permit2;                // Permit2 contract address for approvals
        address targetToken;            // Token to swap collateral for (usually quote token)
        uint24 feeTier;                 // Uniswap V3 fee tier (500, 3000, 10000)
        uint256 slippageBps;            // Slippage in basis points (e.g., 200 = 2%)
        uint256 deadline;               // Swap deadline timestamp
    }

    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");
    /// @dev V3_SWAP_EXACT_IN command for Universal Router
    bytes1 private constant V3_SWAP_EXACT_IN = 0x00;
    /// @dev Actor allowed to take auctions using this contract
    address public immutable owner;
    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;
    /// @dev Factory contract that is also authorized to call functions
    address public immutable authorizedFactory;

    // Events
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // AUDIT FIX: Add new events for enhanced monitoring
    event TakeExecuted(
        address indexed pool,
        address indexed borrower,
        uint256 collateralAmount,
        uint256 quoteAmount,
        LiquiditySource source,
        address indexed caller
    );
    event SwapDetailsDecoded(
        address indexed universalRouter,
        address indexed permit2,
        address indexed targetToken,
        uint24 feeTier,
        uint256 deadline
    );

    // Errors
    error Unauthorized();           // sig: 0x82b42900
    error InvalidPool();            // sig: 0x2083cd40
    error UnsupportedSource();      // sig: 0xf54a7ed9
    error SwapFailed();             // sig: 0x24531a67
    error InvalidSwapDetails();     // sig: 0x13d0c2b4

    /// @param ajnaErc20PoolFactory Ajna ERC20 pool factory for the deployment
    /// @param _authorizedFactory Factory contract address that can also call functions
    constructor(PoolDeployer ajnaErc20PoolFactory, address _authorizedFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
        authorizedFactory = _authorizedFactory; // Store factory address
    }

    /// @notice Called by keeper to invoke `Pool.take`, passing `IERC20Taker` callback data.
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        LiquiditySource source,
        address swapRouter,
        bytes calldata swapDetails
    ) external onlyOwnerOrFactory { // Modifier allows both owner and factory
        // AUDIT FIX: Add business logic validation
        require(source == LiquiditySource.UniswapV3, "Wrong DEX for this contract");

        // Validate inputs
        if (source != LiquiditySource.UniswapV3) revert UnsupportedSource();
        if (!_validatePool(pool)) revert InvalidPool();

        // Decode swap details
        UniswapV3SwapDetails memory details;
        try this.decodeSwapDetails(swapDetails) returns (UniswapV3SwapDetails memory decoded) {
            details = decoded;
        } catch {
            revert InvalidSwapDetails();
        }

        // Validate swap router matches details
        if (swapRouter != details.universalRouter) revert InvalidSwapDetails();

        // Configuration passed through to the callback function
        bytes memory data = abi.encode(details);
        // FIXED: Safe approval for pool to spend quote token
        uint256 approvalAmount = _ceilWmul(maxAmount, auctionPrice) / pool.quoteTokenScale();
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), approvalAmount);

        // AUDIT FIX: Emit TakeExecuted event for monitoring
        emit TakeExecuted(
            address(pool),
            borrowerAddress,
            maxAmount,
            approvalAmount,
            source,
            msg.sender // Shows if called by owner or factory
        );

        // Invoke the take
        pool.take(borrowerAddress, maxAmount, address(this), data);
        // Send excess quote token (profit) to owner
        _recoverToken(IERC20(pool.quoteTokenAddress()));
    }

    /// @notice Called by `Pool` to allow a taker to externally swap collateral for quote token.
    // AUDIT FIX: Add nonReentrant modifier
    function atomicSwapCallback(uint256 collateralAmountWad, uint256, bytes calldata data) external override nonReentrant {
        // Ensure msg.sender is a valid Ajna pool
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        // Decode swap configuration
        UniswapV3SwapDetails memory details = abi.decode(data, (UniswapV3SwapDetails));
        // Convert WAD to token precision
        uint256 collateralAmount = collateralAmountWad / pool.collateralScale();
        // Execute Uniswap V3 swap
        _swapWithUniswapV3(
            pool.collateralAddress(),
            details.targetToken,
            collateralAmount,
            details
        );
    }

    /// @notice Owner may call to recover legitimate ERC20 tokens sent to this contract.
    function recover(IERC20 token) external onlyOwnerOrFactory { // Factory can also recover
        _recoverToken(token);
    }

    /// @notice Returns the supported liquidity sources for this taker.
    function getSupportedSources() external pure returns (LiquiditySource[] memory sources) {
        sources = new LiquiditySource[](1);
        sources[0] = LiquiditySource.UniswapV3;
    }

    /// @notice Checks if a specific liquidity source is supported by this taker.
    function isSourceSupported(LiquiditySource source) external pure returns (bool supported) {
        return source == LiquiditySource.UniswapV3;
    }

    /// @notice External function to decode swap details (for validation)
    function decodeSwapDetails(bytes calldata swapDetails) external pure returns (UniswapV3SwapDetails memory) {
        return abi.decode(swapDetails, (UniswapV3SwapDetails));
    }

    /// @dev Executes swap using Uniswap V3 Universal Router
    function _swapWithUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        UniswapV3SwapDetails memory details
    ) private {
        // AUDIT FIX: Emit SwapDetailsDecoded event for monitoring
        emit SwapDetailsDecoded(
            details.universalRouter,
            details.permit2,
            details.targetToken,
            details.feeTier,
            details.deadline
        );

        if (amountIn == 0) revert SwapFailed();
        if (block.timestamp > details.deadline) revert SwapFailed();

        IERC20 tokenInContract = IERC20(tokenIn);
        // Step 1: FIXED: Safe approval for Permit2 to spend collateral token
        _safeApproveWithReset(tokenInContract, details.permit2, amountIn);
        
        // Step 2: Approve Universal Router via Permit2
        bytes memory permit2ApprovalData = abi.encodeWithSignature(
            "approve(address,address,uint160,uint48)",
            tokenIn,
            details.universalRouter,
            amountIn,
            uint48(details.deadline)
        );
        (bool permit2Success,) = details.permit2.call(permit2ApprovalData);
        if (!permit2Success) revert SwapFailed();

        // Step 3: Calculate minimum amount out with slippage
        uint256 amountOutMin = (amountIn * (10000 - details.slippageBps)) / 10000;
        // Step 4: Encode the path (tokenIn -> fee -> tokenOut)
        bytes memory path = abi.encodePacked(tokenIn, details.feeTier, tokenOut);
        // Step 5: Prepare Universal Router command
        bytes memory commands = abi.encodePacked(V3_SWAP_EXACT_IN);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            address(this),    // recipient
            amountIn,         // amountIn
            amountOutMin,     // amountOutMin
            path,             // path
            true              // payerIsUser (tokens come from msg.sender via Permit2)
        );
        // Step 6: Execute the swap
        bytes memory swapData = abi.encodeWithSignature(
            "execute(bytes,bytes[],uint256)",
            commands,
            inputs,
            details.deadline
        );
        
        // AUDIT FIX: Replace unsafe assembly with Address.functionCall
        Address.functionCall(
            details.universalRouter,
            swapData,
            "Uniswap swap failed"
        );

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOutMin);
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

    /// @dev Multiplies two WADs and rounds up to the nearest decimal
    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    /// @dev FIXED: Safe approval that handles non-zero to non-zero allowance issue
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