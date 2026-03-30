// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAggregationExecutor, IGenericRouter, SwapDescription } from "../OneInchInterfaces.sol";

/// @notice Mock 1inch-compatible router for integration testing.
/// @dev Simulates a DEX swap with a configurable exchange rate.
/// Pre-fund this contract with dstToken before using.
contract MockSwapRouter is IGenericRouter {
    /// @notice Exchange rate: how many dstToken wei per srcToken wei.
    /// Set to 0 for "send all balance" mode (original behavior).
    uint256 public exchangeRateNumerator;
    uint256 public exchangeRateDenominator;

    /// @param _rateNum Numerator of exchange rate (dstToken per srcToken).
    ///                 Set both to 0 for "send all balance" mode.
    /// @param _rateDen Denominator of exchange rate.
    constructor(uint256 _rateNum, uint256 _rateDen) {
        exchangeRateNumerator = _rateNum;
        exchangeRateDenominator = _rateDen;
    }

    function swap(
        IAggregationExecutor,
        SwapDescription calldata desc,
        bytes calldata
    ) external override returns (uint256 returnAmount, uint256 spentAmount) {
        // Validate inputs
        require(desc.amount > 0, "MockSwapRouter: zero amount");
        require(address(desc.srcToken) != address(0), "MockSwapRouter: zero srcToken");
        require(address(desc.dstToken) != address(0), "MockSwapRouter: zero dstToken");
        require(desc.dstReceiver != address(0), "MockSwapRouter: zero dstReceiver");

        // Pull srcToken from caller (the AjnaKeeperTaker)
        IERC20(desc.srcToken).transferFrom(msg.sender, address(this), desc.amount);
        spentAmount = desc.amount;

        // Calculate output amount
        if (exchangeRateDenominator > 0) {
            // Rate-based mode: output = input * rate
            returnAmount = desc.amount * exchangeRateNumerator / exchangeRateDenominator;
        } else {
            // Send-all mode: dump entire balance (original behavior)
            returnAmount = IERC20(desc.dstToken).balanceOf(address(this));
        }

        // Cap at available balance
        uint256 balance = IERC20(desc.dstToken).balanceOf(address(this));
        if (returnAmount > balance) {
            returnAmount = balance;
        }

        // Enforce minReturnAmount (like a real DEX would)
        require(
            returnAmount >= desc.minReturnAmount,
            "MockSwapRouter: insufficient output amount"
        );

        // Send dstToken to receiver
        if (returnAmount > 0) {
            IERC20(desc.dstToken).transfer(desc.dstReceiver, returnAmount);
        }
    }
}
