"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DexRouter = void 0;
var axios_1 = __importDefault(require("axios"));
require("dotenv/config");
var ethers_1 = require("ethers");
var erc20_abi_json_1 = __importDefault(require("./abis/erc20.abi.json"));
var erc20_1 = require("./erc20");
var logging_1 = require("./logging");
var uniswap_1 = require("./uniswap");
var utils_1 = require("./utils");
var universal_router_module_1 = require("./universal-router-module");
var sushiswap_router_module_1 = require("./sushiswap-router-module");
var uniswapV4_router_module_1 = require("./uniswapV4-router-module");
var nonce_1 = require("./nonce");
var config_types_1 = require("./config-types");
var uniswapV4_quote_provider_1 = require("./dex-providers/uniswapV4-quote-provider");
// TODO:
// Why does this log errors and return failure rather than throwing exceptions?
var DexRouter = /** @class */ (function () {
    function DexRouter(signer, options) {
        if (options === void 0) { options = {}; }
        if (!signer)
            logging_1.logger.error('Signer is required');
        var provider = signer.provider;
        if (!provider)
            logging_1.logger.error('No provider available');
        this.signer = signer;
        this.oneInchRouters = options.oneInchRouters || {};
        this.connectorTokens = options.connectorTokens
            ? options.connectorTokens.join(',')
            : '';
    }
    /**
     * AUDIT FIX C-04: Find and NORMALIZE V4 pool key for token pair
     * V4 requires currency0 < currency1 (lexicographic ordering)
     * Returns normalized poolKey or undefined if not found
     */
    DexRouter.prototype.findV4PoolKeyForPair = function (v4, a, b) {
        var pools = v4.pools || {};
        var aLc = a.toLowerCase();
        var bLc = b.toLowerCase();
        for (var _i = 0, _a = Object.keys(pools); _i < _a.length; _i++) {
            var key = _a[_i];
            var k = pools[key];
            if (!k)
                continue;
            var t0 = k.token0.toLowerCase();
            var t1 = k.token1.toLowerCase();
            var m1 = t0 === aLc && t1 === bLc;
            var m2 = t0 === bLc && t1 === aLc;
            if (m1 || m2) {
                // CRITICAL: Normalize the poolKey so currency0 < currency1 (V4 requirement)
                // V4 pools are keyed by ordered addresses - wrong order = different/nonexistent pool
                if (t0 < t1) {
                    // Already normalized
                    return k;
                }
                else {
                    // Need to swap - return normalized copy
                    return {
                        token0: k.token1,
                        token1: k.token0,
                        fee: k.fee,
                        tickSpacing: k.tickSpacing,
                        hooks: k.hooks,
                        sqrtPriceLimitX96: k.sqrtPriceLimitX96,
                    };
                }
            }
        }
        return undefined;
    };
    // All methods stay exactly the same until swap()
    DexRouter.prototype.getRouter = function (chainId) {
        return this.oneInchRouters[chainId];
    };
    DexRouter.prototype.getQuoteFromOneInch = function (chainId, amount, tokenIn, tokenOut) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var url, params, response, error_1, errorMsg;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        url = "".concat(process.env.ONEINCH_API, "/").concat(chainId, "/quote");
                        params = {
                            fromTokenAddress: tokenIn,
                            toTokenAddress: tokenOut,
                            amount: amount.toString(),
                        };
                        if (this.connectorTokens.length > 0) {
                            params['connectorTokens'] = this.connectorTokens;
                        }
                        logging_1.logger.debug("Sending these parameters to 1inch get quote: ".concat(JSON.stringify(params)));
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axios_1.default.get(url, {
                                params: params,
                                headers: {
                                    Accept: 'application/json',
                                    Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                                },
                            })];
                    case 2:
                        response = _c.sent();
                        console.log('1inch quote response:', response.data);
                        return [2 /*return*/, { success: true, dstAmount: response.data.dstAmount }];
                    case 3:
                        error_1 = _c.sent();
                        errorMsg = ((_b = (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.description) || error_1.message;
                        logging_1.logger.error("Failed to get quote from 1inch: ".concat(errorMsg));
                        return [2 /*return*/, { success: false, error: errorMsg }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DexRouter.prototype.getSwapDataFromOneInch = function (chainId, amount, tokenIn, tokenOut, slippage, fromAddress, usePatching) {
        if (usePatching === void 0) { usePatching = false; }
        return __awaiter(this, void 0, void 0, function () {
            var url, params, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = "".concat(process.env.ONEINCH_API, "/").concat(chainId, "/swap");
                        params = {
                            fromTokenAddress: tokenIn,
                            toTokenAddress: tokenOut,
                            amount: amount.toString(),
                            fromAddress: fromAddress,
                            slippage: slippage,
                        };
                        if (this.connectorTokens.length > 0) {
                            params['connectorTokens'] = this.connectorTokens;
                        }
                        if (usePatching) {
                            params['usePatching'] = true; // allow mutations to the swap data
                            params['disableEstimate'] = true; // skip API balance check (collateral will come mid-transaction)
                        }
                        logging_1.logger.debug("Sending these parameters to 1inch: ".concat(JSON.stringify(params)));
                        return [4 /*yield*/, axios_1.default.get(url, {
                                params: params,
                                headers: {
                                    Accept: 'application/json',
                                    Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                                },
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.data.tx ||
                            !response.data.tx.to ||
                            !response.data.tx.data) {
                            logging_1.logger.error('No valid transaction received from 1inch');
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'No valid transaction received from 1inch',
                                }];
                        }
                        return [2 /*return*/, { success: true, data: response.data.tx }];
                }
            });
        });
    };
    // swapWithOneInch stays exactly the same (preserves NonceTracker!)
    DexRouter.prototype.swapWithOneInch = function (chainId, amount, tokenIn, tokenOut, slippage) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var fromAddress, quoteResult, retries, delayMs, _loop_1, this_1, attempt, state_1;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!process.env.ONEINCH_API) {
                            logging_1.logger.error('ONEINCH_API is not configured in the environment variables');
                            return [2 /*return*/, { success: false, error: 'ONEINCH_API is not configured' }];
                        }
                        if (!process.env.ONEINCH_API_KEY) {
                            logging_1.logger.error('ONEINCH_API_KEY is not configured in the environment variables');
                            return [2 /*return*/, { success: false, error: 'ONEINCH_API_KEY is not configured' }];
                        }
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        fromAddress = _d.sent();
                        if (slippage < 0 || slippage > 100) {
                            logging_1.logger.error('Slippage must be between 0 and 100');
                            return [2 /*return*/, { success: false, error: 'Slippage must be between 0 and 100' }];
                        }
                        return [4 /*yield*/, this.getQuoteFromOneInch(chainId, amount, tokenIn, tokenOut)];
                    case 2:
                        quoteResult = _d.sent();
                        if (!quoteResult.success) {
                            return [2 /*return*/, { success: false, error: quoteResult.error }];
                        }
                        logging_1.logger.info("1inch quote: ".concat(amount.toString(), " ").concat(tokenIn, " -> ").concat(quoteResult.dstAmount, " ").concat(tokenOut));
                        retries = 3;
                        delayMs = 2000;
                        _loop_1 = function (attempt) {
                            var swapDataResult, txFrom1inch, tx_1, provider, gasEstimate, gasError_1, receipt, error_2, errorMsg, status_1, waitTime_1;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 7, , 10]);
                                        return [4 /*yield*/, this_1.getSwapDataFromOneInch(chainId, amount, tokenIn, tokenOut, slippage, fromAddress)];
                                    case 1:
                                        swapDataResult = _e.sent();
                                        if (!swapDataResult.success) {
                                            return [2 /*return*/, { value: { success: false, error: swapDataResult.error } }];
                                        }
                                        txFrom1inch = swapDataResult.data;
                                        logging_1.logger.debug("Transaction from 1inch: ".concat(JSON.stringify(txFrom1inch)));
                                        tx_1 = {
                                            to: txFrom1inch.to,
                                            data: txFrom1inch.data,
                                            value: txFrom1inch.value || '0',
                                            gasLimit: txFrom1inch.gas
                                                ? ethers_1.BigNumber.from(txFrom1inch.gas)
                                                : undefined,
                                            gasPrice: txFrom1inch.gasPrice
                                                ? ethers_1.BigNumber.from(txFrom1inch.gasPrice)
                                                : undefined,
                                        };
                                        provider = this_1.signer.provider;
                                        gasEstimate = void 0;
                                        _e.label = 2;
                                    case 2:
                                        _e.trys.push([2, 4, , 5]);
                                        return [4 /*yield*/, provider.estimateGas({
                                                to: tx_1.to,
                                                data: tx_1.data,
                                                value: tx_1.value || '0',
                                                from: fromAddress,
                                            })];
                                    case 3:
                                        gasEstimate = _e.sent();
                                        tx_1.gasLimit = gasEstimate.add(gasEstimate.div(10));
                                        return [3 /*break*/, 5];
                                    case 4:
                                        gasError_1 = _e.sent();
                                        logging_1.logger.error("Failed to estimate gas: ".concat(gasError_1));
                                        return [2 /*return*/, { value: {
                                                    success: false,
                                                    error: "Gas estimation failed: ".concat(gasError_1),
                                                } }];
                                    case 5: return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(this_1.signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                                            var txWithNonce, txResponse;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0:
                                                        txWithNonce = __assign(__assign({}, tx_1), { nonce: nonce });
                                                        return [4 /*yield*/, this.signer.sendTransaction(txWithNonce)];
                                                    case 1:
                                                        txResponse = _a.sent();
                                                        return [4 /*yield*/, txResponse.wait()];
                                                    case 2: return [2 /*return*/, _a.sent()];
                                                }
                                            });
                                        }); })];
                                    case 6:
                                        receipt = _e.sent();
                                        logging_1.logger.info("1inch swap successful: ".concat(amount.toString(), " ").concat(tokenIn, " -> ").concat(tokenOut, " | Tx Hash: ").concat(receipt.transactionHash));
                                        return [2 /*return*/, { value: { success: true, receipt: receipt } }];
                                    case 7:
                                        error_2 = _e.sent();
                                        errorMsg = ((_b = (_a = error_2.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.description) || error_2.message;
                                        status_1 = ((_c = error_2.response) === null || _c === void 0 ? void 0 : _c.status) || 500;
                                        if (!(status_1 === 429 && attempt < retries)) return [3 /*break*/, 9];
                                        waitTime_1 = delayMs * Math.pow(2, attempt - 1);
                                        logging_1.logger.warn("Attempt (".concat(attempt, "/").concat(retries, ") after ").concat(waitTime_1, "ms"));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
                                    case 8:
                                        _e.sent();
                                        return [2 /*return*/, "continue"];
                                    case 9:
                                        logging_1.logger.error("Failed to swap with 1inch: ".concat(errorMsg));
                                        return [2 /*return*/, { value: { success: false, error: errorMsg } }];
                                    case 10: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        attempt = 1;
                        _d.label = 3;
                    case 3:
                        if (!(attempt <= retries)) return [3 /*break*/, 6];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 4:
                        state_1 = _d.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _d.label = 5;
                    case 5:
                        attempt++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, { success: false, error: 'Max retries reached for 1inch swap' }];
                }
            });
        });
    };
    // Keep your existing swapWithSushiswap method exactly as-is
    DexRouter.prototype.swapWithSushiswap = function (chainId, amount, tokenIn, tokenOut, to, slippage, feeAmount, sushiswapSettings) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (!sushiswapSettings) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'SushiSwap configuration not found'
                                }];
                        }
                        return [4 /*yield*/, (0, sushiswap_router_module_1.swapWithSushiswapRouter)(this.signer, tokenIn, amount, tokenOut, slippage, sushiswapSettings.swapRouterAddress, sushiswapSettings.quoterV2Address, feeAmount || sushiswapSettings.defaultFeeTier || 500, sushiswapSettings.factoryAddress)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "SushiSwap swap failed: ".concat(error_3)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    DexRouter.prototype.swapWithUniswapV4 = function (chainId, amount, tokenIn, tokenOut, to, slippage, uniswapV4Settings) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var poolKey, ERC20_ABI_1, tokenInContract, tokenOutContract, tokenInDecimalsRaw, tokenOutDecimalsRaw, tokenInDecimals, tokenOutDecimals, v4Config, quoteProvider, initialized, marketResult, amountInFormatted, expectedOutputValue, quoteError_1, errorMsg, result, error_4, errorMsg;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 11, , 12]);
                        if (!uniswapV4Settings) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Uniswap V4 configuration not found'
                                }];
                        }
                        if (!uniswapV4Settings.router) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Uniswap V4 router address not configured'
                                }];
                        }
                        poolKey = this.findV4PoolKeyForPair(uniswapV4Settings, tokenIn, tokenOut);
                        if (!poolKey) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "No V4 pool configured for pair ".concat(tokenIn, "-").concat(tokenOut)
                                }];
                        }
                        logging_1.logger.info("Using Uniswap V4 pool: ".concat(poolKey.token0.slice(0, 8), ".../").concat(poolKey.token1.slice(0, 8), "... (fee: ").concat(poolKey.fee, ")"));
                        ERC20_ABI_1 = ['function decimals() view returns (uint8)'];
                        tokenInContract = new ethers_1.Contract(tokenIn, ERC20_ABI_1, this.signer);
                        tokenOutContract = new ethers_1.Contract(tokenOut, ERC20_ABI_1, this.signer);
                        return [4 /*yield*/, tokenInContract.decimals()];
                    case 1:
                        tokenInDecimalsRaw = _b.sent();
                        return [4 /*yield*/, tokenOutContract.decimals()];
                    case 2:
                        tokenOutDecimalsRaw = _b.sent();
                        tokenInDecimals = typeof tokenInDecimalsRaw === 'number'
                            ? tokenInDecimalsRaw
                            : tokenInDecimalsRaw.toNumber();
                        tokenOutDecimals = typeof tokenOutDecimalsRaw === 'number'
                            ? tokenOutDecimalsRaw
                            : tokenOutDecimalsRaw.toNumber();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 8, , 9]);
                        // Ensure poolManager is defined for V4Config
                        if (!uniswapV4Settings.poolManager) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Uniswap V4 poolManager address not configured'
                                }];
                        }
                        v4Config = {
                            poolManager: uniswapV4Settings.poolManager,
                            defaultSlippage: uniswapV4Settings.defaultSlippage,
                            pools: uniswapV4Settings.pools,
                            stateView: uniswapV4Settings.stateView,
                        };
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(this.signer, v4Config);
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 4:
                        initialized = _b.sent();
                        if (!initialized) return [3 /*break*/, 6];
                        logging_1.logger.info('✅ V4 QuoteProvider initialized successfully');
                        logging_1.logger.info("   PoolManager: ".concat(quoteProvider.getPoolManagerAddress()));
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amount, tokenIn, tokenOut, poolKey)];
                    case 5:
                        marketResult = _b.sent();
                        if (marketResult.success && marketResult.price) {
                            logging_1.logger.info("\uD83D\uDCCA V4 Market Price: ".concat(marketResult.price.toFixed(8), " ").concat(tokenOut, "/").concat(tokenIn));
                            amountInFormatted = parseFloat(ethers_1.ethers.utils.formatUnits(amount, tokenInDecimals));
                            expectedOutputValue = amountInFormatted * marketResult.price;
                            logging_1.logger.info("\uD83D\uDCB0 Expected output: ~".concat(expectedOutputValue.toFixed(6), " ").concat(tokenOut, " tokens"));
                            // Optional: Add price validation here
                            // Example: Check if price is reasonable
                            if (marketResult.price <= 0) {
                                logging_1.logger.warn("\u26A0\uFE0F  Market price is ".concat(marketResult.price, " - this seems wrong!"));
                                return [2 /*return*/, {
                                        success: false,
                                        error: "Invalid market price: ".concat(marketResult.price)
                                    }];
                            }
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  V4 market price unavailable: ".concat(marketResult.error || 'Unknown error'));
                            logging_1.logger.info('Proceeding with swap anyway (quote is informational)');
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        logging_1.logger.warn('⚠️  V4 QuoteProvider failed to initialize');
                        logging_1.logger.info('Proceeding without price check (quote provider is optional)');
                        _b.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        quoteError_1 = _b.sent();
                        errorMsg = quoteError_1 instanceof Error ? quoteError_1.message : String(quoteError_1);
                        logging_1.logger.warn("\u26A0\uFE0F  V4 quote provider error: ".concat(errorMsg));
                        logging_1.logger.info('Proceeding with swap anyway (quote is informational only)');
                        return [3 /*break*/, 9];
                    case 9:
                        // Execute the swap
                        logging_1.logger.info('🔄 Executing V4 swap...');
                        return [4 /*yield*/, (0, uniswapV4_router_module_1.swapWithUniswapV4Adapter)(this.signer, tokenIn, amount, tokenOut, (_a = slippage !== null && slippage !== void 0 ? slippage : uniswapV4Settings.defaultSlippage) !== null && _a !== void 0 ? _a : 1.0, uniswapV4Settings.router, poolKey, to)];
                    case 10:
                        result = _b.sent();
                        return [2 /*return*/, result];
                    case 11:
                        error_4 = _b.sent();
                        errorMsg = error_4 instanceof Error ? error_4.message : String(error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: "Uniswap V4 swap failed: ".concat(errorMsg)
                            }];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    // MAJOR CHANGE: Update method signature and replace boolean logic with switch/case
    DexRouter.prototype.swap = function (chainId, amount, tokenIn, tokenOut, to, dexProvider, slippage, feeAmount, combinedSettings) {
        var _a, _b, _c;
        if (slippage === void 0) { slippage = 1; }
        if (feeAmount === void 0) { feeAmount = 3000; }
        return __awaiter(this, void 0, void 0, function () {
            var provider, fromAddress, decimals, adjustedAmount, erc20, balance, _d, oneInchRouter, currentAllowance, error_5, result, error_6, error_7;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!chainId || !amount || !tokenIn || !tokenOut || !to) {
                            logging_1.logger.error('Invalid parameters provided to swap');
                            return [2 /*return*/, { success: false, error: 'Invalid parameters provided to swap' }];
                        }
                        if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
                            logging_1.logger.info("Token ".concat(tokenIn, " is already ").concat(tokenOut, ", no swap necessary"));
                            return [2 /*return*/, { success: true }];
                        }
                        provider = this.signer.provider;
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        fromAddress = _e.sent();
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, tokenIn)];
                    case 2:
                        decimals = _e.sent();
                        adjustedAmount = (0, utils_1.tokenChangeDecimals)(amount, 18, decimals);
                        logging_1.logger.debug("Converted ".concat(amount.toString(), " (WAD) to ").concat(adjustedAmount.toString(), " (").concat(decimals, " decimals) for token ").concat(tokenIn));
                        erc20 = new ethers_1.Contract(tokenIn, erc20_abi_json_1.default, provider);
                        return [4 /*yield*/, erc20.balanceOf(fromAddress)];
                    case 3:
                        balance = _e.sent();
                        if (balance.lt(adjustedAmount)) {
                            logging_1.logger.error("Insufficient balance for ".concat(tokenIn, ": ").concat(balance.toString(), " < ").concat(adjustedAmount.toString()));
                            return [2 /*return*/, { success: false, error: "Insufficient balance for ".concat(tokenIn) }];
                        }
                        _d = dexProvider;
                        switch (_d) {
                            case config_types_1.PostAuctionDex.ONEINCH: return [3 /*break*/, 4];
                            case config_types_1.PostAuctionDex.UNISWAP_V3: return [3 /*break*/, 11];
                            case config_types_1.PostAuctionDex.SUSHISWAP: return [3 /*break*/, 19];
                            case config_types_1.PostAuctionDex.UNISWAP_V4: return [3 /*break*/, 21];
                        }
                        return [3 /*break*/, 23];
                    case 4:
                        oneInchRouter = this.oneInchRouters[chainId];
                        if (!oneInchRouter) {
                            logging_1.logger.error("No 1inch router defined for chainId ".concat(chainId));
                            return [2 /*return*/, {
                                    success: false,
                                    error: "No 1inch router defined for chainId ".concat(chainId),
                                }];
                        }
                        return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(this.signer, tokenIn, oneInchRouter)];
                    case 5:
                        currentAllowance = _e.sent();
                        logging_1.logger.debug("Current allowance: ".concat(currentAllowance.toString(), ", Amount: ").concat(adjustedAmount.toString()));
                        if (!currentAllowance.lt(adjustedAmount)) return [3 /*break*/, 9];
                        _e.label = 6;
                    case 6:
                        _e.trys.push([6, 8, , 9]);
                        logging_1.logger.debug("Approving 1inch router ".concat(oneInchRouter, " for token: ").concat(tokenIn));
                        return [4 /*yield*/, (0, erc20_1.approveErc20)(this.signer, tokenIn, oneInchRouter, adjustedAmount)];
                    case 7:
                        _e.sent();
                        logging_1.logger.info("Approval successful for token ".concat(tokenIn));
                        return [3 /*break*/, 9];
                    case 8:
                        error_5 = _e.sent();
                        logging_1.logger.error("Failed to approve token ".concat(tokenIn, " for 1inch: ").concat(error_5));
                        return [2 /*return*/, { success: false, error: "Approval failed: ".concat(error_5) }];
                    case 9: return [4 /*yield*/, this.swapWithOneInch(chainId, adjustedAmount, tokenIn, tokenOut, slippage)];
                    case 10:
                        result = _e.sent();
                        return [2 /*return*/, result];
                    case 11:
                        if (!(((_a = combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.uniswap) === null || _a === void 0 ? void 0 : _a.universalRouterAddress) && ((_b = combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.uniswap) === null || _b === void 0 ? void 0 : _b.permit2Address) && ((_c = combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.uniswap) === null || _c === void 0 ? void 0 : _c.poolFactoryAddress))) return [3 /*break*/, 16];
                        _e.label = 12;
                    case 12:
                        _e.trys.push([12, 14, , 15]);
                        logging_1.logger.info("Using Universal Router for swap");
                        return [4 /*yield*/, (0, universal_router_module_1.swapWithUniversalRouter)(this.signer, tokenIn, adjustedAmount, tokenOut, slippage * 100, // Convert percentage to basis points
                            combinedSettings.uniswap.universalRouterAddress, combinedSettings.uniswap.permit2Address, combinedSettings.uniswap.defaultFeeTier || feeAmount, combinedSettings.uniswap.poolFactoryAddress)];
                    case 13:
                        _e.sent();
                        logging_1.logger.info("Universal Router swap successful: ".concat(adjustedAmount.toString(), " ").concat(tokenIn, " -> ").concat(tokenOut));
                        return [2 /*return*/, { success: true }];
                    case 14:
                        error_6 = _e.sent();
                        logging_1.logger.error("Universal Router swap failed for token: ".concat(tokenIn, ": ").concat(error_6));
                        return [2 /*return*/, { success: false, error: "Universal Router swap failed: ".concat(error_6) }];
                    case 15: return [3 /*break*/, 19];
                    case 16:
                        _e.trys.push([16, 18, , 19]);
                        return [4 /*yield*/, (0, uniswap_1.swapToWeth)(this.signer, tokenIn, adjustedAmount, feeAmount, combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.uniswap)];
                    case 17:
                        _e.sent();
                        logging_1.logger.info("Uniswap V3 swap successful: ".concat(adjustedAmount.toString(), " ").concat(tokenIn, " -> ").concat(tokenOut));
                        return [2 /*return*/, { success: true }];
                    case 18:
                        error_7 = _e.sent();
                        logging_1.logger.error("Uniswap V3 swap failed for token: ".concat(tokenIn, ": ").concat(error_7));
                        return [2 /*return*/, { success: false, error: "Uniswap swap failed: ".concat(error_7) }];
                    case 19: return [4 /*yield*/, this.swapWithSushiswap(chainId, adjustedAmount, tokenIn, tokenOut, to, slippage, feeAmount, combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.sushiswap)];
                    case 20: 
                    // NEW: Add SushiSwap case
                    return [2 /*return*/, _e.sent()];
                    case 21: return [4 /*yield*/, this.swapWithUniswapV4(chainId, adjustedAmount, tokenIn, tokenOut, to, slippage, combinedSettings === null || combinedSettings === void 0 ? void 0 : combinedSettings.uniswapV4)];
                    case 22: return [2 /*return*/, _e.sent()];
                    case 23: return [2 /*return*/, {
                            success: false,
                            error: "Unsupported DEX provider: ".concat(dexProvider)
                        }];
                }
            });
        });
    };
    return DexRouter;
}());
exports.DexRouter = DexRouter;
//# sourceMappingURL=dex-router.js.map