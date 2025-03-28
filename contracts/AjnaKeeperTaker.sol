// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { IERC20Pool, IERC20Taker, PoolDeployer } from "./AjnaInterfaces.sol";

/// @notice Allows a keeper to take auctions using external liquidity sources.
contract AjnaKeeperTaker is IERC20Taker {
    /// @notice Identifies the source of liquidity to use for the swap.
    enum LiquiditySource {
        None, // (do not use)
        OneInch
    }

    /// @notice Use this to pass configuration data from the keeper to the callback function.
    struct SwapData {
        address pool; // TODO: we don't really need this
        LiquiditySource source;
        // TODO: add ambiguous "calldata" field to use with OneInch?
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
    function takeWithAtomicSwap(IERC20Pool pool, address borrowerAddress, uint256 maxAmount, LiquiditySource source) external onlyOwner {
        bytes memory data = abi.encode(
            SwapData({
                pool: address(pool),
                source: source
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
        require(_validatePool(IERC20Pool(swapData.pool)), "AjnaKeeperTaker: Sender is not from the Ajna deployment configured in this contract");
        require(msg.sender == swapData.pool, "AjnaKeeperTaker: Sender is not pool in message");

        if (swapData.source == LiquiditySource.OneInch)
        {
            // TODO: convert amounts from WAD precision to whatever the liquidity source expects (likely token precision)
            // TODO: perform the swap
        }
    }

    function _validatePool(IERC20Pool pool) private view returns(bool) {
        return poolFactory.deployedPools(ERC20_NON_SUBSET_HASH, pool.collateralAddress(), pool.quoteTokenAddress()) == address(pool);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "AjnaKeeperTaker: Only owner can call this function");
        _;
    }
}
