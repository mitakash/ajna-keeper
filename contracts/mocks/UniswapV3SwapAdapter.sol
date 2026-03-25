// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAggregationExecutor, IGenericRouter, SwapDescription } from "../OneInchInterfaces.sol";

/// @notice Wraps the real Uniswap V3 SwapRouter behind the 1inch IGenericRouter interface.
/// @dev Allows the AjnaKeeperTaker (which expects 1inch) to execute real swaps
/// through Uniswap V3 without any mocking. Used for integration testing.
contract UniswapV3SwapAdapter is IGenericRouter {
    /// @notice Uniswap V3 SwapRouter interface (subset)
    ISwapRouter public immutable uniswapRouter;
    uint24 public immutable feeTier;

    constructor(address _uniswapRouter, uint24 _feeTier) {
        uniswapRouter = ISwapRouter(_uniswapRouter);
        feeTier = _feeTier;
    }

    function swap(
        IAggregationExecutor,
        SwapDescription calldata desc,
        bytes calldata
    ) external override returns (uint256 returnAmount, uint256 spentAmount) {
        // Pull srcToken from caller (the AjnaKeeperTaker)
        IERC20(desc.srcToken).transferFrom(msg.sender, address(this), desc.amount);

        // Approve Uniswap V3 router to spend srcToken
        IERC20(desc.srcToken).approve(address(uniswapRouter), desc.amount);

        // Execute real Uniswap V3 swap
        returnAmount = uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(desc.srcToken),
                tokenOut: address(desc.dstToken),
                fee: feeTier,
                recipient: desc.dstReceiver,
                deadline: block.timestamp + 3600,
                amountIn: desc.amount,
                amountOutMinimum: desc.minReturnAmount,
                sqrtPriceLimitX96: 0
            })
        );

        spentAmount = desc.amount;
    }
}

/// @dev Minimal Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}
