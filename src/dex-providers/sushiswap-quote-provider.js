"use strict";
// src/dex-providers/sushiswap-quote-provider.ts
// SushiSwap V3 Quote Provider for accurate price discovery during external takes
// Based on working production patterns from test-sushiswap-bypass-quoter.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SushiSwapQuoteProvider = void 0;
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var erc20_1 = require("../erc20");
// SushiSwap V3 QuoterV2 ABI with CORRECT field order (from production testing)
var SUSHI_QUOTER_ABI = [
    "function quoteExactInputSingle(\n    (address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params\n  ) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
    'function WETH9() external view returns (address)',
    'function factory() external view returns (address)'
];
var SUSHI_FACTORY_ABI = [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];
/**
 * SushiSwap V3 Quote Provider for External Take Profitability Analysis
 *
 * Uses SushiSwap's official QuoterV2 contract for accurate pricing
 * Based on production-tested patterns from fixed_quoter_test.ts
 */
var SushiSwapQuoteProvider = /** @class */ (function () {
    function SushiSwapQuoteProvider(signer, config) {
        this.isInitialized = false;
        this.signer = signer;
        this.config = config;
        // Always initialize factory for pool validation
        this.factoryContract = new ethers_1.ethers.Contract(config.factoryAddress, SUSHI_FACTORY_ABI, signer);
        // Initialize quoter if address is provided
        if (config.quoterV2Address) {
            this.quoterContract = new ethers_1.ethers.Contract(config.quoterV2Address, SUSHI_QUOTER_ABI, signer);
        }
    }
    /**
     * Initialize and validate the quote provider
     */
    SushiSwapQuoteProvider.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var factoryCode, quoterCode, weth, factory, error_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isInitialized) {
                            return [2 /*return*/, true];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, this.signer.provider.getCode(this.config.factoryAddress)];
                    case 2:
                        factoryCode = _a.sent();
                        if (factoryCode === '0x') {
                            logging_1.logger.warn("SushiSwap factory not found at ".concat(this.config.factoryAddress));
                            return [2 /*return*/, false];
                        }
                        if (!this.quoterContract) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.signer.provider.getCode(this.config.quoterV2Address)];
                    case 3:
                        quoterCode = _a.sent();
                        if (!(quoterCode === '0x')) return [3 /*break*/, 4];
                        logging_1.logger.warn("SushiSwap QuoterV2 not found at ".concat(this.config.quoterV2Address));
                        return [3 /*break*/, 8];
                    case 4:
                        _a.trys.push([4, 7, , 8]);
                        return [4 /*yield*/, this.quoterContract.WETH9()];
                    case 5:
                        weth = _a.sent();
                        return [4 /*yield*/, this.quoterContract.factory()];
                    case 6:
                        factory = _a.sent();
                        if (factory.toLowerCase() !== this.config.factoryAddress.toLowerCase()) {
                            logging_1.logger.warn("SushiSwap quoter factory mismatch: expected ".concat(this.config.factoryAddress, ", got ").concat(factory));
                        }
                        else {
                            logging_1.logger.debug("SushiSwap QuoterV2 initialized successfully at ".concat(this.config.quoterV2Address));
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_1 = _a.sent();
                        logging_1.logger.warn("SushiSwap QuoterV2 validation failed: ".concat(error_1));
                        this.quoterContract = undefined;
                        return [3 /*break*/, 8];
                    case 8:
                        this.isInitialized = true;
                        return [2 /*return*/, true];
                    case 9:
                        error_2 = _a.sent();
                        logging_1.logger.error("Failed to initialize SushiSwap quote provider: ".concat(error_2));
                        return [2 /*return*/, false];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if quote provider is available and ready
     */
    SushiSwapQuoteProvider.prototype.isAvailable = function () {
        return this.isInitialized;
    };
    /**
     * Get QuoterV2 address being used (if any)
     */
    SushiSwapQuoteProvider.prototype.getQuoterAddress = function () {
        return this.config.quoterV2Address;
    };
    /**
     * Check if pool exists for the given token pair
     */
    SushiSwapQuoteProvider.prototype.poolExists = function (tokenA, tokenB, feeTier) {
        return __awaiter(this, void 0, void 0, function () {
            var fee, poolAddress, exists, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        fee = feeTier || this.config.defaultFeeTier;
                        return [4 /*yield*/, this.factoryContract.getPool(tokenA, tokenB, fee)];
                    case 3:
                        poolAddress = _a.sent();
                        exists = poolAddress !== '0x0000000000000000000000000000000000000000';
                        if (exists) {
                            logging_1.logger.debug("SushiSwap pool found: ".concat(tokenA, "/").concat(tokenB, " fee=").concat(fee, " at ").concat(poolAddress));
                        }
                        else {
                            logging_1.logger.debug("SushiSwap pool NOT found: ".concat(tokenA, "/").concat(tokenB, " fee=").concat(fee));
                        }
                        return [2 /*return*/, exists];
                    case 4:
                        error_3 = _a.sent();
                        logging_1.logger.debug("Error checking SushiSwap pool existence: ".concat(error_3));
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get accurate quote from SushiSwap QuoterV2 contract
     * Uses the CORRECT struct field order discovered in production testing
     */
    SushiSwapQuoteProvider.prototype.getQuote = function (amountIn, tokenIn, tokenOut, feeTier) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var initialized, fee, poolExists, params, result, amountOut, gasEstimate, inputDecimals, outputDecimals, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 7, , 8]);
                        if (!!this.isInitialized) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        initialized = _c.sent();
                        if (!initialized) {
                            return [2 /*return*/, { success: false, error: 'Quote provider not available' }];
                        }
                        _c.label = 2;
                    case 2:
                        // Check if quoter is available
                        if (!this.quoterContract) {
                            return [2 /*return*/, { success: false, error: 'QuoterV2 not available - use direct swap approach' }];
                        }
                        fee = feeTier || this.config.defaultFeeTier;
                        return [4 /*yield*/, this.poolExists(tokenIn, tokenOut, fee)];
                    case 3:
                        poolExists = _c.sent();
                        if (!poolExists) {
                            return [2 /*return*/, { success: false, error: "No SushiSwap pool for ".concat(tokenIn, "/").concat(tokenOut, " with fee ").concat(fee) }];
                        }
                        params = {
                            tokenIn: tokenIn,
                            tokenOut: tokenOut,
                            amountIn: amountIn,
                            fee: fee,
                            sqrtPriceLimitX96: 0 // No price limit
                        };
                        logging_1.logger.debug("SushiSwap quote params: tokenIn=".concat(params.tokenIn, ", tokenOut=").concat(params.tokenOut, ", amountIn=").concat(params.amountIn.toString(), ", fee=").concat(params.fee));
                        return [4 /*yield*/, this.quoterContract.callStatic.quoteExactInputSingle(params)];
                    case 4:
                        result = _c.sent();
                        amountOut = result[0];
                        gasEstimate = result[3];
                        if (amountOut.isZero()) {
                            return [2 /*return*/, { success: false, error: 'Zero output from SushiSwap quoter' }];
                        }
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, tokenIn)];
                    case 5:
                        inputDecimals = _c.sent();
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, tokenOut)];
                    case 6:
                        outputDecimals = _c.sent();
                        logging_1.logger.debug("SushiSwap quote success: ".concat(ethers_1.ethers.utils.formatUnits(amountIn, inputDecimals), " in -> ").concat(ethers_1.ethers.utils.formatUnits(amountOut, outputDecimals), " out"));
                        return [2 /*return*/, {
                                success: true,
                                dstAmount: amountOut,
                                gasEstimate: gasEstimate
                            }];
                    case 7:
                        error_4 = _c.sent();
                        logging_1.logger.debug("SushiSwap quote failed: ".concat(error_4.message));
                        // Parse common errors
                        if ((_a = error_4.message) === null || _a === void 0 ? void 0 : _a.includes('INSUFFICIENT_LIQUIDITY')) {
                            return [2 /*return*/, { success: false, error: 'Insufficient liquidity in SushiSwap pool' }];
                        }
                        else if ((_b = error_4.message) === null || _b === void 0 ? void 0 : _b.includes('revert')) {
                            return [2 /*return*/, { success: false, error: "SushiSwap quoter reverted: ".concat(error_4.reason || error_4.message) }];
                        }
                        else {
                            return [2 /*return*/, { success: false, error: "SushiSwap quote error: ".concat(error_4.message) }];
                        }
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculate market price from quote (quote tokens per collateral token)
     */
    SushiSwapQuoteProvider.prototype.getMarketPrice = function (amountIn, tokenIn, tokenOut, tokenInDecimals, tokenOutDecimals, feeTier) {
        return __awaiter(this, void 0, void 0, function () {
            var quoteResult, inputAmount, outputAmount, marketPrice, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getQuote(amountIn, tokenIn, tokenOut, feeTier)];
                    case 1:
                        quoteResult = _a.sent();
                        if (!quoteResult.success || !quoteResult.dstAmount) {
                            return [2 /*return*/, { success: false, error: quoteResult.error }];
                        }
                        inputAmount = Number(ethers_1.ethers.utils.formatUnits(amountIn, tokenInDecimals));
                        outputAmount = Number(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, tokenOutDecimals));
                        if (inputAmount <= 0 || outputAmount <= 0) {
                            return [2 /*return*/, { success: false, error: 'Invalid amounts for price calculation' }];
                        }
                        marketPrice = outputAmount / inputAmount;
                        logging_1.logger.debug("SushiSwap market price: 1 ".concat(tokenIn, " = ").concat(marketPrice.toFixed(6), " ").concat(tokenOut));
                        return [2 /*return*/, { success: true, price: marketPrice }];
                    case 2:
                        error_5 = _a.sent();
                        return [2 /*return*/, { success: false, error: "Market price calculation failed: ".concat(error_5.message) }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Estimate gas for a swap (if quoter is available)
     */
    SushiSwapQuoteProvider.prototype.estimateSwapGas = function (amountIn, tokenIn, tokenOut, feeTier) {
        return __awaiter(this, void 0, void 0, function () {
            var quoteResult, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getQuote(amountIn, tokenIn, tokenOut, feeTier)];
                    case 1:
                        quoteResult = _a.sent();
                        return [2 /*return*/, quoteResult.gasEstimate];
                    case 2:
                        error_6 = _a.sent();
                        logging_1.logger.debug("Gas estimation failed: ".concat(error_6));
                        return [2 /*return*/, undefined];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return SushiSwapQuoteProvider;
}());
exports.SushiSwapQuoteProvider = SushiSwapQuoteProvider;
//# sourceMappingURL=sushiswap-quote-provider.js.map