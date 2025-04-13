// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { IERC20Pool, IERC20Taker, PoolDeployer } from "./AjnaInterfaces.sol";
import { IAggregationExecutor, IERC20, IGenericRouter, SwapDescription } from "./OneInchInterfaces.sol";

/// @notice Allows a keeper to take auctions using external liquidity sources.
contract AjnaKeeperTaker is IERC20Taker {
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


    /// @notice Pool invoking callback is not from the Ajna deployment configured in this contract.
    error InvalidPool();

    /// @notice Caller is not the owner of this contract.
    error Unauthorized();

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
        token.transfer(owner, balance);
    }

    /// @notice Called by keeper to invoke `Pool.take`, passing `IERC20Taker` callback data.
    /// @param pool ERC20 pool with an active auction.
    /// @param borrowerAddress Identifies the liquidation to take.
    /// @param maxAmount Limit collateral to take from the auction, in `WAD` precision.
    /// @param source Identifies the source of liquidity to use for the swap (e.g. 1inch).
    /// @param swapRouter Address of the router to use for the swap.
    /// @param swapDetails Source-specific data needed to perform the swap, which may be populated by an external API.
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
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
        // invoke the take
        pool.take(borrowerAddress, maxAmount, address(this), data);

        recover(IERC20(pool.quoteTokenAddress())); // send excess quote token (profit) to owner
    }

    /// @dev Called by `Pool` to allow a taker to externally swap collateral for quote token.
    /// @param data Determines where external liquidity should be sourced to swap collateral for quote token.
    function atomicSwapCallback(uint256 collateralAmountWad, uint256, bytes calldata data) external override {
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
                collateralAmountWad / pool.collateralScale() // convert WAD to token precision
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
        // approve the router to spend this contract's collateral
        swapDescription.srcToken.approve(address(swapRouter), actualCollateralAmount);

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

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
}
