"use strict";
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
exports.UniswapV4QuoteProvider = void 0;
// src/dex-providers/uniswapV4-quote-provider.ts
/**
 * Uniswap V4 Quote Provider
 * Uses StateView contract for accurate pool state reading
 */
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var uniswapv4_1 = require("../uniswapv4");
var UniswapV4QuoteProvider = /** @class */ (function () {
    function UniswapV4QuoteProvider(signer, config) {
        this.signer = signer;
        this.config = config;
    }
    /**
     * Initialize the quote provider
     * AUDIT FIX H-03: Now supports configurable StateView address per chain
     */
    UniswapV4QuoteProvider.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, addresses, provider, code, error_1, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        _a = this;
                        return [4 /*yield*/, this.signer.getChainId()];
                    case 1:
                        _a.chainId = _b.sent();
                        // AUDIT FIX H-03: Use config.stateView if provided, otherwise fall back to hardcoded addresses
                        if (this.config.stateView) {
                            this.stateViewAddress = this.config.stateView;
                            logging_1.logger.debug("V4: Using configured StateView address: ".concat(this.stateViewAddress));
                        }
                        else {
                            addresses = uniswapv4_1.V4_CHAIN_ADDRESSES[this.chainId];
                            if (!addresses) {
                                logging_1.logger.error("V4: Chain ".concat(this.chainId, " not supported and no stateView configured"));
                                return [2 /*return*/, false];
                            }
                            this.stateViewAddress = addresses.STATE_VIEW;
                            logging_1.logger.debug("V4: Using default StateView for chain ".concat(this.chainId, ": ").concat(this.stateViewAddress));
                        }
                        provider = this.signer.provider;
                        if (!provider) {
                            throw new Error('No provider available');
                        }
                        return [4 /*yield*/, provider.getCode(this.stateViewAddress)];
                    case 2:
                        code = _b.sent();
                        if (code === '0x') {
                            throw new Error("StateView not deployed at ".concat(this.stateViewAddress));
                        }
                        this.stateView = new ethers_1.Contract(this.stateViewAddress, uniswapv4_1.STATE_VIEW_ABI, this.signer);
                        logging_1.logger.debug("V4: StateView initialized at ".concat(this.stateViewAddress));
                        logging_1.logger.debug("V4: PoolManager at ".concat(this.config.poolManager, " on chain ").concat(this.chainId));
                        return [2 /*return*/, true];
                    case 3:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        logging_1.logger.error("V4: Failed to initialize: ".concat(errorMessage));
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get current market price from pool
     */
    UniswapV4QuoteProvider.prototype.getMarketPrice = function (amountIn, tokenIn, tokenOut, poolKey) {
        return __awaiter(this, void 0, void 0, function () {
            var initialized, token0Decimals, token1Decimals, v4PoolKey, poolId, liquidity, slot0Result, sqrtPriceX96, tick, isToken0Input, price, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.stateView) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        initialized = _a.sent();
                        if (!initialized) {
                            return [2 /*return*/, { success: false, error: 'StateView not initialized' }];
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        return [4 /*yield*/, this.getTokenDecimals(poolKey.token0)];
                    case 3:
                        token0Decimals = _a.sent();
                        return [4 /*yield*/, this.getTokenDecimals(poolKey.token1)];
                    case 4:
                        token1Decimals = _a.sent();
                        v4PoolKey = this.convertToV4PoolKey(poolKey);
                        poolId = uniswapv4_1.V4Utils.generatePoolId(v4PoolKey);
                        return [4 /*yield*/, this.stateView.getLiquidity(poolId)];
                    case 5:
                        liquidity = _a.sent();
                        if (liquidity.isZero()) {
                            return [2 /*return*/, { success: false, error: 'Pool has zero in-range liquidity - swap would revert' }];
                        }
                        return [4 /*yield*/, this.stateView.getSlot0(poolId)];
                    case 6:
                        slot0Result = _a.sent();
                        sqrtPriceX96 = slot0Result[0] || slot0Result.sqrtPriceX96;
                        tick = slot0Result[1] || slot0Result.tick;
                        if (sqrtPriceX96.isZero()) {
                            return [2 /*return*/, { success: false, error: 'Pool not initialized or has no liquidity' }];
                        }
                        isToken0Input = tokenIn.toLowerCase() === poolKey.token0.toLowerCase();
                        price = uniswapv4_1.V4Utils.sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals, isToken0Input);
                        logging_1.logger.debug("V4: Pool liquidity=".concat(liquidity.toString(), ", price=").concat(price, " ").concat(tokenOut, "/").concat(tokenIn, " (tick: ").concat(tick, ", token0Dec: ").concat(token0Decimals, ", token1Dec: ").concat(token1Decimals, ", zeroForOne: ").concat(isToken0Input, ")"));
                        return [2 /*return*/, { success: true, price: price, tick: tick }];
                    case 7:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        logging_1.logger.error("V4: Error getting market price: ".concat(errorMessage));
                        return [2 /*return*/, { success: false, error: errorMessage }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get quote for exact input swap
     */
    UniswapV4QuoteProvider.prototype.getQuote = function (amountIn, tokenIn, tokenOut, poolKey) {
        return __awaiter(this, void 0, void 0, function () {
            var priceResult, tokenInDecimals, tokenOutDecimals, amountInNumber, amountOutNumber, feeReduction, priceImpactBuffer, amountOutAfterFees, amountOut, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getMarketPrice(amountIn, tokenIn, tokenOut, poolKey)];
                    case 1:
                        priceResult = _a.sent();
                        if (!priceResult.success || !priceResult.price) {
                            return [2 /*return*/, { success: false, error: priceResult.error }];
                        }
                        return [4 /*yield*/, this.getTokenDecimals(tokenIn)];
                    case 2:
                        tokenInDecimals = _a.sent();
                        return [4 /*yield*/, this.getTokenDecimals(tokenOut)];
                    case 3:
                        tokenOutDecimals = _a.sent();
                        amountInNumber = Number(ethers_1.ethers.utils.formatUnits(amountIn, tokenInDecimals));
                        amountOutNumber = amountInNumber * priceResult.price;
                        feeReduction = (1000000 - poolKey.fee) / 1000000;
                        priceImpactBuffer = 0.99;
                        amountOutAfterFees = amountOutNumber * feeReduction * priceImpactBuffer;
                        amountOut = ethers_1.ethers.utils.parseUnits(amountOutAfterFees.toFixed(tokenOutDecimals), tokenOutDecimals);
                        logging_1.logger.debug("V4: Quote - ".concat(amountInNumber.toFixed(6), " ").concat(tokenIn.slice(0, 8), "... -> ").concat(amountOutAfterFees.toFixed(6), " ").concat(tokenOut.slice(0, 8), "..."));
                        return [2 /*return*/, {
                                success: true,
                                dstAmount: ethers_1.BigNumber.from(amountOut),
                                price: priceResult.price,
                            }];
                    case 4:
                        error_3 = _a.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        logging_1.logger.error("V4: Quote error: ".concat(errorMessage));
                        return [2 /*return*/, { success: false, error: errorMessage }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a pool is profitable for arbitrage
     */
    UniswapV4QuoteProvider.prototype.isProfitable = function (amountIn, tokenIn, tokenOut, poolKey, auctionPrice) {
        return __awaiter(this, void 0, void 0, function () {
            var quoteResult, tokenOutDecimals, tokenInDecimals, amountInNumber, auctionPriceNumber, auctionOutput, auctionOutputWei, expectedProfit, profitable, error_4, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.getQuote(amountIn, tokenIn, tokenOut, poolKey)];
                    case 1:
                        quoteResult = _a.sent();
                        if (!quoteResult.success || !quoteResult.dstAmount) {
                            return [2 /*return*/, { profitable: false, error: quoteResult.error }];
                        }
                        return [4 /*yield*/, this.getTokenDecimals(tokenOut)];
                    case 2:
                        tokenOutDecimals = _a.sent();
                        return [4 /*yield*/, this.getTokenDecimals(tokenIn)];
                    case 3:
                        tokenInDecimals = _a.sent();
                        amountInNumber = Number(ethers_1.ethers.utils.formatUnits(amountIn, tokenInDecimals));
                        auctionPriceNumber = Number(ethers_1.ethers.utils.formatEther(auctionPrice));
                        auctionOutput = amountInNumber * auctionPriceNumber;
                        auctionOutputWei = ethers_1.ethers.utils.parseUnits(auctionOutput.toFixed(tokenOutDecimals), tokenOutDecimals);
                        expectedProfit = quoteResult.dstAmount.sub(auctionOutputWei);
                        profitable = expectedProfit.gt(0);
                        if (profitable) {
                            logging_1.logger.debug("V4: Profitable swap - Market: ".concat(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, tokenOutDecimals), ", Auction: ").concat(ethers_1.ethers.utils.formatUnits(auctionOutputWei, tokenOutDecimals), ", Profit: ").concat(ethers_1.ethers.utils.formatUnits(expectedProfit, tokenOutDecimals)));
                        }
                        return [2 /*return*/, { profitable: profitable, expectedProfit: expectedProfit }];
                    case 4:
                        error_4 = _a.sent();
                        errorMessage = error_4 instanceof Error ? error_4.message : String(error_4);
                        return [2 /*return*/, { profitable: false, error: errorMessage }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Convert config PoolKey to V4 PoolKey format
     */
    UniswapV4QuoteProvider.prototype.convertToV4PoolKey = function (poolKey) {
        return {
            currency0: { addr: poolKey.token0 },
            currency1: { addr: poolKey.token1 },
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks,
        };
    };
    /**
     * Get token decimals from contract
     * CRITICAL: Does NOT default to 18 on error - throws instead to prevent catastrophic pricing errors
     */
    UniswapV4QuoteProvider.prototype.getTokenDecimals = function (tokenAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenContract, decimals, error_5, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                            return [2 /*return*/, 18]; // Native ETH
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        tokenContract = new ethers_1.Contract(tokenAddress, uniswapv4_1.ERC20_ABI, this.signer);
                        return [4 /*yield*/, tokenContract.decimals()];
                    case 2:
                        decimals = _a.sent();
                        return [2 /*return*/, typeof decimals === 'number' ? decimals : decimals.toNumber()];
                    case 3:
                        error_5 = _a.sent();
                        errorMessage = error_5 instanceof Error ? error_5.message : String(error_5);
                        logging_1.logger.error("V4: CRITICAL - Could not get decimals for ".concat(tokenAddress, ": ").concat(errorMessage));
                        throw new uniswapv4_1.V4QuoteError("Failed to get token decimals for ".concat(tokenAddress, ". This would cause catastrophic pricing errors (e.g., USDC has 6 decimals, not 18)."));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if provider is available
     */
    UniswapV4QuoteProvider.prototype.isAvailable = function () {
        return !!this.stateView;
    };
    /**
     * Get the Pool Manager address being used
     */
    UniswapV4QuoteProvider.prototype.getPoolManagerAddress = function () {
        return this.config.poolManager;
    };
    /**
     * Get StateView address
     */
    UniswapV4QuoteProvider.prototype.getStateViewAddress = function () {
        return this.stateViewAddress;
    };
    return UniswapV4QuoteProvider;
}());
exports.UniswapV4QuoteProvider = UniswapV4QuoteProvider;
//# sourceMappingURL=uniswapV4-quote-provider.js.map