// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20Pool, IERC20Taker } from "../AjnaInterfaces.sol";
import { IERC20 } from "../OneInchInterfaces.sol";

/// @notice Common interface for all Ajna keeper taker implementations
/// @dev Extends IERC20Taker to ensure compatibility with Ajna pools
interface IAjnaKeeperTaker is IERC20Taker {
    /// @notice Identifies the source of liquidity to use for the swap.
    enum LiquiditySource {
        None,      // (do not use)
        OneInch,   // Use 1inch for swaps
        UniswapV3, // Use Uniswap V3 Universal Router
        SushiSwap, // Future: SushiSwap integration
        Curve,      // Future: Curve integration
        UniswapV4   //New implementation
    }

    /// @notice Called by keeper to invoke `Pool.take`, passing `IERC20Taker` callback data.
    /// @param pool ERC20 pool with an active auction.
    /// @param borrowerAddress Identifies the liquidation to take.
    /// @param auctionPrice Last known price of the auction, in `WAD` precision, used for quote token approval.
    /// @param maxAmount Limit collateral to take from the auction, in `WAD` precision.
    /// @param source Identifies the source of liquidity to use for the swap.
    /// @param swapRouter Address of the router to use for the swap.
    /// @param swapDetails Source-specific data needed to perform the swap.
    function takeWithAtomicSwap(
        IERC20Pool pool,
        address borrowerAddress,
        uint256 auctionPrice,
        uint256 maxAmount,
        LiquiditySource source,
        address swapRouter,
        bytes calldata swapDetails
    ) external;

    /// @notice Owner may call to recover legitimate ERC20 tokens sent to this contract.
    /// @param token The ERC20 token to recover.
    function recover(IERC20 token) external;

    /// @notice Returns the owner of this contract.
    /// @return The address of the contract owner.
    function owner() external view returns (address);

    /// @notice Returns the supported liquidity sources for this taker.
    /// @return sources Array of supported LiquiditySource values.
    function getSupportedSources() external pure returns (LiquiditySource[] memory sources);

    /// @notice Checks if a specific liquidity source is supported by this taker.
    /// @param source The liquidity source to check.
    /// @return supported True if the source is supported, false otherwise.
    function isSourceSupported(LiquiditySource source) external pure returns (bool supported);
}