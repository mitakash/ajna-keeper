// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { IERC20Pool, IERC20Taker, PoolDeployer } from "./AjnaInterfaces.sol";
import { IAggregationExecutor,IGenericRouter, SwapDescription } from "./OneInchInterfaces.sol";

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
        bytes[] data;           // for certain sources (1inch), this is populated by an external API
    }

    /// @dev Hash used for all ERC20 pools, used for pool validation
    bytes32 public constant ERC20_NON_SUBSET_HASH = keccak256("ERC20_NON_SUBSET_HASH");

    /// @dev Actor allowed to take auctions using this contract
    address public immutable owner;

    /// @dev Identifies the Ajna deployment, used to validate pools
    PoolDeployer public immutable poolFactory;

    /// @param ajnaErc20PoolFactory Ajna ERC20 pool factory for the deployment of Ajna the keeper is interacting with.
    constructor(PoolDeployer ajnaErc20PoolFactory) {
        owner = msg.sender;
        poolFactory = ajnaErc20PoolFactory;
    }

    /// @notice Called by keeper to invoke `Pool.take`, passing `IERC20Taker` callback data.
    /// @param pool ERC20 pool with an active auction.
    /// @param borrowerAddress Identifies the liquidation to take.
    /// @param maxAmount Limit collateral to take from the auction, in `WAD` precision.
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 maxAmount,
        LiquiditySource source,
        address swapRouter,
        bytes[] calldata swapData
    ) external onlyOwner {
        bytes memory data = abi.encode(
            SwapData({
                source: source,
                router: swapRouter,
                data: swapData
            })
        );
        pool.take(borrowerAddress, maxAmount, address(this), data);

        // TODO: send remaining quote token back to owner (to take profit or be used for posting liquidation bonds)
    }

    /// @dev Called by `Pool` to allow a taker to externally swap collateral for quote token.
    /// @param data Determines where external liquidity should be sourced to swap collateral for quote token.
    function atomicSwapCallback(uint256 collateralAmountWad, uint256 quoteAmountDueWad, bytes calldata data) external override {
        SwapData memory swapData = abi.decode(data, (SwapData));

        // Ensure msg.sender is a valid Ajna pool and matches the pool in the data
        require(_validatePool(IERC20Pool(msg.sender)), "AjnaKeeperTaker: Sender is not from the Ajna deployment configured in this contract");

        if (swapData.source == LiquiditySource.OneInch)
        {
            // TODO: convert amounts from WAD precision to whatever the liquidity source expects (likely token precision)
            // TODO: abi.decode the swapData payload
            // TODO: adjust `amount` and `minReturn` fields as needed
            // TODO: abi.encode the calldata
            // TODO: perform the swap by invoking swapData.router.call(calldata)
        }
    }

    /// @dev Called by query-1inch.ts to test mutating calldata to send to 1inch GenericRouter.swap
    /// @param pool ERC20 pool which identifies the tokens to swap
    /// @param swapRouter 1inch router to which transaction will be sent
    /// @param aggregationExecutor 1inch executor which will receive collateral
    /// @param swapDescription 1inch swap description
    /// @param swapData opaque calldata from 1inch API
    /// @param actualCollateralAmount simulates collateral received from take
    function testOneInchSwapWithCalldataMutation(
        IERC20Pool pool,
        IGenericRouter swapRouter,
        address aggregationExecutor,
        SwapDescription memory swapDescription,
        bytes calldata swapData,
        uint256 actualCollateralAmount
    ) external onlyOwner {
        swapDescription.dstReceiver = payable(owner);

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

    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "AjnaKeeperTaker: Only owner can call this function");
        _;
    }
}
