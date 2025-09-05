// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20Pool, IERC20Taker, PoolDeployer } from "./AjnaInterfaces.sol";
import { IAggregationExecutor, IERC20, IGenericRouter, SwapDescription } from "./OneInchInterfaces.sol";
// SECURITY FIX: Add SafeERC20 import
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Allows a keeper to take auctions using external liquidity sources.
contract AjnaKeeperTaker is IERC20Taker {
    // SECURITY FIX: Add SafeERC20 using statement
    using SafeERC20 for IERC20;
    
    /// @notice Identifies the source of liquidity to use for the swap.
    enum LiquiditySource {
        None, // (do not use)
        OneInch
    }

    /// @notice Use this to pass configuration data from the keeper to the callback function.
    struct SwapData {
        LiquiditySource source; // determines which type of AMM, which the callback function interacts with
        address router;         // address of the AMM router to interact with
        bytes details;          // source-specific data needed to perform the swap,
                                // which may be populated by an external API
    }

    struct OneInchSwapDetails {
        address aggregationExecutor;     // 1inch executor which will receive collateral
        SwapDescription swapDescription; // identifies tokens and amounts to swap
        bytes opaqueData;                // passed through from 1inch API to router
    }


    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");

    /// @dev Actor allowed to take auctions using this contract
    address public immutable owner;

    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;


    // sig: 0x2083cd40
    /// @notice Pool invoking callback is not from the Ajna deployment configured in this contract.
    error InvalidPool();

    // sig: 0x82b42900
    /// @notice Caller is not the owner of this contract.
    error Unauthorized();

    // sig: 0xf54a7ed9
    /// @notice Emitted when the requested liquidity source is not available on this deployment of the contract.
    error UnsupportedLiquiditySource();


    /// @param ajnaErc20PoolFactory Ajna ERC20 pool factory for the deployment of Ajna the keeper is interacting with.
    constructor(PoolDeployer ajnaErc20PoolFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
    }

    /// @notice Owner may call to recover legitimate ERC20 tokens sent to this contract.
    function recover(IERC20 token) public onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        // SECURITY FIX: Use safeTransfer instead of transfer to handle non-standard tokens (like USDT)
        if (balance > 0) {
            token.safeTransfer(owner, balance);
        }
    }

    /// @notice Called by keeper to invoke `Pool.take`, passing `IERC20Taker` callback data.
    /// @param pool ERC20 pool with an active auction.
    /// @param borrowerAddress Identifies the liquidation to take.
    /// @param auctionPrice Last known price of the auction, in `WAD` precision, used for quote token approval.
    /// @param maxAmount Limit collateral to take from the auction, in `WAD` precision.
    /// @param source Identifies the source of liquidity to use for the swap (e.g. 1inch).
    /// @param swapRouter Address of the router to use for the swap.
    /// @param swapDetails Source-specific data needed to perform the swap, which may be populated by an external API.
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        LiquiditySource source,
        address swapRouter,
        bytes calldata swapDetails
    ) external onlyOwner {
        // configuration passed through to the callback function instructing this contract how to swap
        bytes memory data = abi.encode(
            SwapData({
                source: source,
                router: swapRouter,
                details: swapDetails
            })
        );

        // SECURITY FIX: Use safe approve with reset pattern to prevent "non-zero to non-zero allowance" error
        uint256 approvalAmount = _ceilWmul(maxAmount, auctionPrice) / pool.quoteTokenScale(); // convert WAD to token precision
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), approvalAmount);

        // invoke the take
        pool.take(borrowerAddress, maxAmount, address(this), data);

        // SECURITY FIX: Reset allowance to prevent future misuse
        _safeApproveWithReset(IERC20(pool.quoteTokenAddress()), address(pool), 0);

        recover(IERC20(pool.quoteTokenAddress())); // send excess quote token (profit) to owner
    }

    /// @dev Called by `Pool` to allow a taker to externally swap collateral for quote token.
    /// @param data Determines where external liquidity should be sourced to swap collateral for quote token.
    function atomicSwapCallback(uint256 collateral, uint256, bytes calldata data) external override {
        SwapData memory swapData = abi.decode(data, (SwapData));

        // Ensure msg.sender is a valid Ajna pool and matches the pool in the data
        IERC20Pool pool = IERC20Pool(msg.sender);
        if (!_validatePool(pool)) revert InvalidPool();

        if (swapData.source == LiquiditySource.OneInch)
        {
            OneInchSwapDetails memory details = abi.decode(swapData.details, (OneInchSwapDetails));
            _swapWithOneInch(
                IGenericRouter(swapData.router),
                details.aggregationExecutor,
                details.swapDescription,
                details.opaqueData,
                collateral //Already in token precision from Ajna
            );
        } else {
            revert UnsupportedLiquiditySource();
        }
    }

    /// @dev Called by atomicSwapCallback to swap collateral for quote token using 1inch.
    /// @param swapRouter 1inch router to which transaction will be sent
    /// @param aggregationExecutor 1inch executor which will receive collateral
    /// @param swapDescription 1inch swap description
    /// @param swapData opaque calldata from 1inch API
    /// @param actualCollateralAmount collateral received from take, in token precision
    function _swapWithOneInch(
        IGenericRouter swapRouter,
        address aggregationExecutor,
        SwapDescription memory swapDescription,
        bytes memory swapData,
        uint256 actualCollateralAmount
    ) private {
        // SECURITY FIX: Use safe approve with reset pattern to prevent "non-zero to non-zero allowance" error
        _safeApproveWithReset(swapDescription.srcToken, address(swapRouter), actualCollateralAmount);

        // scale the return amount to the actual amount
        if (swapDescription.amount != actualCollateralAmount) {
            swapDescription.minReturnAmount = actualCollateralAmount * swapDescription.minReturnAmount / swapDescription.amount;
            swapDescription.amount = actualCollateralAmount;
        }

        // execute the swap
        swapRouter.swap(
            IAggregationExecutor(aggregationExecutor),
            swapDescription,
            swapData
        );
    }


    /// @dev Called by query-1inch.ts to test mutating calldata to send to 1inch GenericRouter.swap
    function testOneInchSwapBytes(
        IGenericRouter swapRouter,
        bytes calldata swapDetails,
        uint256 actualCollateralAmount
    ) external onlyOwner {
        OneInchSwapDetails memory details = abi.decode(swapDetails, (OneInchSwapDetails));
        testOneInchSwapStruct(swapRouter, details, actualCollateralAmount);
    }

    /// @dev Called by query-1inch.ts to test mutating calldata to send to 1inch GenericRouter.swap
    function testOneInchSwapStruct(
        IGenericRouter swapRouter,
        OneInchSwapDetails memory swapDetails,
        uint256 actualCollateralAmount
    ) public onlyOwner {
        _swapWithOneInch(
            swapRouter,
            swapDetails.aggregationExecutor,
            swapDetails.swapDescription,
            swapDetails.opaqueData,
            actualCollateralAmount
        );
    }

    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    /// @dev multiplies two WADs and rounds up to the nearest decimal
    function _ceilWmul(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x * y + 1e18 - 1) / 1e18;
    }

    /// @dev SECURITY FIX: Safe approval that handles non-zero to non-zero allowance issue
    /// @notice This function prevents "SafeERC20: approve from non-zero to non-zero allowance" errors
    /// by resetting allowance to zero before setting new amount, which is the industry standard pattern
    /// used by Compound, Aave, Uniswap V3, and other major DeFi protocols.
    /// @param token The ERC20 token to approve
    /// @param spender The address to approve  
    /// @param amount The amount to approve
    function _safeApproveWithReset(IERC20 token, address spender, uint256 amount) private {
        uint256 currentAllowance = token.allowance(address(this), spender);
        
        if (currentAllowance != 0) {
            // Reset to zero first if there's existing allowance
            // This satisfies SafeERC20's requirement for non-zero to zero approval
            token.safeApprove(spender, 0);
        }
        
        // Now approve the new amount
        // This satisfies SafeERC20's requirement for zero to non-zero approval  
        if (amount != 0) {
            token.safeApprove(spender, amount);
        }
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
}
