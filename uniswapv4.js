"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.V4QuoteError = exports.V4SwapError = exports.V4Error = exports.V4Utils = exports.ZERO_ADDRESS = exports.MAX_UINT160 = exports.MAX_SQRT_RATIO = exports.MIN_SQRT_RATIO = exports.Actions = exports.Commands = exports.V4_CHAIN_ADDRESSES = exports.V4_ADDRESSES = exports.UNIVERSAL_ROUTER_ABI = exports.PERMIT2_ABI = exports.ERC20_ABI = exports.STATE_VIEW_ABI = exports.POOL_MANAGER_ABI = void 0;
// src/uniswapV4-core.ts
/**
 * Uniswap V4 Core Types and Utilities
 * Based on working manual swap implementation
 */
var ethers_1 = require("ethers");
// ============================================================================
// Contract ABIs
// ============================================================================
// AUDIT FIX NEW-01: Corrected POOL_MANAGER_ABI - settle() takes a Currency (address) argument.
// V4 PoolManager signature: settle(Currency currency) external payable returns (uint256 paid)
// Currency is a UDVT over address, so ABI encodes as plain address.
// Also corrected: Currency in PoolKey encodes as address (UDVT), NOT tuple(address).
exports.POOL_MANAGER_ABI = [
    'function unlock(bytes calldata data) external returns (bytes memory)',
    'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes calldata hookData) external returns (int256)',
    'function take(address currency, address to, uint256 amount) external',
    'function settle(address currency) external payable returns (uint256)',
    'function sync(address currency) external',
];
exports.STATE_VIEW_ABI = [
    'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)',
];
exports.ERC20_ABI = [
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
];
exports.PERMIT2_ABI = [
    'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
    'function allowance(address user, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
];
exports.UNIVERSAL_ROUTER_ABI = [
    'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
    'function execute(bytes commands, bytes[] inputs) payable',
];
// ============================================================================
// Known Addresses (Base Mainnet)
// ============================================================================
exports.V4_ADDRESSES = {
    BASE: {
        POOL_MANAGER: '0x498581FF718922C3f8E6A244956AF099B2652B2b',
        UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
        STATE_VIEW: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
        PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    },
};
// Chain ID mapping
exports.V4_CHAIN_ADDRESSES = {
    8453: exports.V4_ADDRESSES.BASE, // Base mainnet
};
// ============================================================================
// Universal Router Commands
// ============================================================================
exports.Commands = {
    PERMIT2_TRANSFER_FROM: 0x02,
    V4_SWAP: 0x10,
    // Add other commands as needed
};
// ============================================================================
// V4Router Actions (from v4-periphery)
// ============================================================================
exports.Actions = {
    SWAP_EXACT_IN_SINGLE: 0x06,
    SWAP_EXACT_IN: 0x07,
    SWAP_EXACT_OUT_SINGLE: 0x08,
    SWAP_EXACT_OUT: 0x09,
    SETTLE: 0x0b,
    SETTLE_ALL: 0x0c,
    TAKE: 0x0e,
    TAKE_ALL: 0x0f,
    TAKE_PORTION: 0x10,
};
// ============================================================================
// Constants
// ============================================================================
exports.MIN_SQRT_RATIO = ethers_1.BigNumber.from('4295128740');
exports.MAX_SQRT_RATIO = ethers_1.BigNumber.from('1461446703485210103287273052203988822378723970341');
exports.MAX_UINT160 = ethers_1.BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
exports.ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// ============================================================================
// Utility Functions
// ============================================================================
var V4Utils = /** @class */ (function () {
    function V4Utils() {
    }
    /**
     * Get V4 addresses for a specific chain
     */
    V4Utils.getAddresses = function (chainId) {
        return exports.V4_CHAIN_ADDRESSES[chainId] || null;
    };
    /**
     * Generate V4 Pool ID from PoolKey
     * AUDIT FIX C-01: V4 Currency is a UDVT (type Currency is address), encodes as plain address
     * PoolKey encodes as: (address, address, uint24, int24, address) - NOT tuple(address)
     */
    V4Utils.generatePoolId = function (poolKey) {
        return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.defaultAbiCoder.encode(['tuple(address, address, uint24, int24, address)'], [[
                poolKey.currency0.addr,
                poolKey.currency1.addr,
                poolKey.fee,
                poolKey.tickSpacing,
                poolKey.hooks,
            ]]));
    };
    /**
     * Convert sqrtPriceX96 to human-readable price
     * Formula: price = (sqrtPriceX96 / 2^96)^2 * 10^(token0Decimals - token1Decimals)
     *
     * AUDIT FIX M-05: Use BigNumber integer arithmetic to avoid float precision loss.
     * sqrtPriceX96 can be up to 160 bits; parseFloat() only has ~53 bits of mantissa,
     * which causes significant precision loss for extreme price ratios.
     *
     * Approach: scale the intermediate BigNumber result to 18 decimal places of precision,
     * then convert to float only at the final step.
     */
    V4Utils.sqrtPriceX96ToPrice = function (sqrtPriceX96, token0Decimals, token1Decimals, token0IsInput) {
        if (token0IsInput === void 0) { token0IsInput = true; }
        // SCALE = 10^18 gives us 18 decimal places of fixed-point precision
        var SCALE = ethers_1.BigNumber.from(10).pow(18);
        // Q192 = (2^96)^2
        var Q192 = ethers_1.BigNumber.from(2).pow(192);
        // rawPriceScaled = sqrtPriceX96^2 * SCALE / Q192
        // Represents (token1 per token0 in smallest units) with 18 decimal precision
        // BigNumber handles arbitrary precision so no overflow risk here
        var rawPriceScaled = sqrtPriceX96.mul(sqrtPriceX96).mul(SCALE).div(Q192);
        // Adjust for decimal difference: multiply/divide by 10^|decimalDiff|
        var decimalDiff = token0Decimals - token1Decimals;
        var adjustedScaled;
        if (decimalDiff >= 0) {
            adjustedScaled = rawPriceScaled.mul(ethers_1.BigNumber.from(10).pow(decimalDiff));
        }
        else {
            adjustedScaled = rawPriceScaled.div(ethers_1.BigNumber.from(10).pow(-decimalDiff));
        }
        // Convert back to a float - precision is now acceptable since we've already
        // done the heavy lifting in BigNumber land. Final value is (price * 10^18).
        var priceFloat = parseFloat(ethers_1.ethers.utils.formatUnits(adjustedScaled, 18));
        // If token0 is input, return token1/token0 (how much token1 per token0)
        // If token1 is input, invert
        return token0IsInput ? priceFloat : (priceFloat > 0 ? 1 / priceFloat : 0);
    };
    /**
     * Calculate sqrt price limit for slippage protection
     */
    V4Utils.calculateSqrtPriceLimitX96 = function (zeroForOne) {
        return zeroForOne ? exports.MIN_SQRT_RATIO : exports.MAX_SQRT_RATIO;
    };
    /**
     * Determine if swap is zeroForOne
     */
    V4Utils.getZeroForOne = function (tokenIn, poolKey) {
        return tokenIn.toLowerCase() === poolKey.currency0.addr.toLowerCase();
    };
    /**
     * Create Currency struct
     */
    V4Utils.createCurrency = function (address) {
        return { addr: address };
    };
    /**
     * Validate PoolKey structure
     */
    V4Utils.validatePoolKey = function (poolKey) {
        var _a, _b;
        return !!(((_a = poolKey.currency0) === null || _a === void 0 ? void 0 : _a.addr) &&
            ((_b = poolKey.currency1) === null || _b === void 0 ? void 0 : _b.addr) &&
            poolKey.fee !== undefined &&
            poolKey.tickSpacing !== undefined &&
            poolKey.hooks);
    };
    /**
     * Get tick spacing for fee tier
     */
    V4Utils.getTickSpacingForFee = function (fee) {
        var tickSpacings = {
            100: 1,
            500: 10,
            3000: 60,
            10000: 200,
        };
        return tickSpacings[fee] || 60;
    };
    return V4Utils;
}());
exports.V4Utils = V4Utils;
// ============================================================================
// Custom Errors
// ============================================================================
var V4Error = /** @class */ (function (_super) {
    __extends(V4Error, _super);
    function V4Error(message) {
        var _this = _super.call(this, "V4Error: ".concat(message)) || this;
        _this.name = 'V4Error';
        return _this;
    }
    return V4Error;
}(Error));
exports.V4Error = V4Error;
var V4SwapError = /** @class */ (function (_super) {
    __extends(V4SwapError, _super);
    function V4SwapError(message) {
        var _this = _super.call(this, "Swap failed: ".concat(message)) || this;
        _this.name = 'V4SwapError';
        return _this;
    }
    return V4SwapError;
}(V4Error));
exports.V4SwapError = V4SwapError;
var V4QuoteError = /** @class */ (function (_super) {
    __extends(V4QuoteError, _super);
    function V4QuoteError(message) {
        var _this = _super.call(this, "Quote failed: ".concat(message)) || this;
        _this.name = 'V4QuoteError';
        return _this;
    }
    return V4QuoteError;
}(V4Error));
exports.V4QuoteError = V4QuoteError;
//# sourceMappingURL=uniswapv4.js.map