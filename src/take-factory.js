"use strict";
// src/take-factory.ts
// Official Uniswap V3 quotes using QuoterV2 contract (the CORRECT approach)
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeWithUniswapV4Factory = exports.findV4PoolKeyForPair = exports.checkUniswapV4Quote = exports.handleFactoryTakes = void 0;
var subgraph_1 = __importDefault(require("./subgraph"));
var utils_1 = require("./utils");
var config_types_1 = require("./config-types");
var logging_1 = require("./logging");
var transactions_1 = require("./transactions");
var ethers_1 = require("ethers");
var nonce_1 = require("./nonce");
var typechain_types_1 = require("../typechain-types");
// Import the Uniswap V3 quote provider (FIXED PATH)
var uniswap_quote_provider_1 = require("./dex-providers/uniswap-quote-provider");
var sushiswap_quote_provider_1 = require("./dex-providers/sushiswap-quote-provider");
var uniswapV4_quote_provider_1 = require("./dex-providers/uniswapV4-quote-provider");
var erc20_1 = require("./erc20");
/**
 * Handle takes using factory pattern (Uniswap V3, future DEXs)
 * Completely separate from existing 1inch logic
 */
function handleFactoryTakes(_a) {
    var _b, e_1, _c, _d;
    var signer = _a.signer, pool = _a.pool, poolConfig = _a.poolConfig, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var _e, _f, _g, liquidation, e_1_1;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    logging_1.logger.debug("Factory take handler starting for pool: ".concat(pool.name));
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 10, 11, 16]);
                    _e = true, _f = __asyncValues(getLiquidationsToTakeFactory({
                        pool: pool,
                        poolConfig: poolConfig,
                        signer: signer,
                        config: config,
                    }));
                    _h.label = 2;
                case 2: return [4 /*yield*/, _f.next()];
                case 3:
                    if (!(_g = _h.sent(), _b = _g.done, !_b)) return [3 /*break*/, 9];
                    _d = _g.value;
                    _e = false;
                    liquidation = _d;
                    if (!liquidation.isTakeable) return [3 /*break*/, 6];
                    return [4 /*yield*/, takeLiquidationFactory({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 4:
                    _h.sent();
                    if (!liquidation.isArbTakeable) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 5:
                    _h.sent();
                    _h.label = 6;
                case 6:
                    if (!liquidation.isArbTakeable) return [3 /*break*/, 8];
                    return [4 /*yield*/, arbTakeLiquidationFactory({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 7:
                    _h.sent();
                    _h.label = 8;
                case 8:
                    _e = true;
                    return [3 /*break*/, 2];
                case 9: return [3 /*break*/, 16];
                case 10:
                    e_1_1 = _h.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 16];
                case 11:
                    _h.trys.push([11, , 14, 15]);
                    if (!(!_e && !_b && (_c = _f.return))) return [3 /*break*/, 13];
                    return [4 /*yield*/, _c.call(_f)];
                case 12:
                    _h.sent();
                    _h.label = 13;
                case 13: return [3 /*break*/, 15];
                case 14:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 15: return [7 /*endfinally*/];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.handleFactoryTakes = handleFactoryTakes;
/**
 * Get liquidations using factory-compatible quote sources
 */
function getLiquidationsToTakeFactory(_a) {
    var _b;
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, config = _a.config;
    return __asyncGenerator(this, arguments, function getLiquidationsToTakeFactory_1() {
        var _c, hpb, hpbIndex, liquidationAuctions, _i, liquidationAuctions_1, auction, borrower, liquidationStatus, price, collateral, isTakeable, isArbTakeable, arbHpbIndex, minDeposit, arbTakeCheck, strategyLog;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, __await(subgraph_1.default.getLiquidations(config.subgraphUrl, pool.poolAddress, (_b = poolConfig.take.minCollateral) !== null && _b !== void 0 ? _b : 0))];
                case 1:
                    _c = (_d.sent()).pool, hpb = _c.hpb, hpbIndex = _c.hpbIndex, liquidationAuctions = _c.liquidationAuctions;
                    _i = 0, liquidationAuctions_1 = liquidationAuctions;
                    _d.label = 2;
                case 2:
                    if (!(_i < liquidationAuctions_1.length)) return [3 /*break*/, 12];
                    auction = liquidationAuctions_1[_i];
                    borrower = auction.borrower;
                    return [4 /*yield*/, __await(pool.getLiquidation(borrower).getStatus())];
                case 3:
                    liquidationStatus = _d.sent();
                    price = Number((0, utils_1.weiToDecimaled)(liquidationStatus.price));
                    collateral = liquidationStatus.collateral;
                    isTakeable = false;
                    isArbTakeable = false;
                    arbHpbIndex = 0;
                    if (!(poolConfig.take.marketPriceFactor && poolConfig.take.liquiditySource)) return [3 /*break*/, 5];
                    return [4 /*yield*/, __await(checkIfTakeableFactory(pool, price, collateral, poolConfig, config, signer))];
                case 4:
                    isTakeable = _d.sent();
                    _d.label = 5;
                case 5:
                    if (!(poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor)) return [3 /*break*/, 7];
                    minDeposit = poolConfig.take.minCollateral / hpb;
                    return [4 /*yield*/, __await(checkIfArbTakeableFactory(pool, price, collateral, poolConfig, config.subgraphUrl, minDeposit.toString(), signer))];
                case 6:
                    arbTakeCheck = _d.sent();
                    isArbTakeable = arbTakeCheck.isArbTakeable;
                    arbHpbIndex = arbTakeCheck.hpbIndex;
                    _d.label = 7;
                case 7:
                    if (!(isTakeable || isArbTakeable)) return [3 /*break*/, 10];
                    strategyLog = isTakeable && !isArbTakeable ? 'factory take'
                        : !isTakeable && isArbTakeable ? 'arbTake'
                            : isTakeable && isArbTakeable ? 'factory take and arbTake'
                                : 'none';
                    logging_1.logger.debug("Found liquidation to ".concat(strategyLog, " - pool: ").concat(pool.name, ", borrower: ").concat(borrower, ", price: ").concat(price));
                    return [4 /*yield*/, __await({
                            borrower: borrower,
                            hpbIndex: arbHpbIndex,
                            collateral: collateral,
                            auctionPrice: liquidationStatus.price,
                            isTakeable: isTakeable,
                            isArbTakeable: isArbTakeable,
                        })];
                case 8: return [4 /*yield*/, _d.sent()];
                case 9:
                    _d.sent();
                    return [3 /*break*/, 11];
                case 10:
                    logging_1.logger.debug("Factory: Not taking liquidation since price ".concat(price, " is too high - pool: ").concat(pool.name, ", borrower: ").concat(borrower));
                    _d.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if external take is profitable using factory DEX sources
 */
function checkIfTakeableFactory(pool, price, collateral, poolConfig, config, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!poolConfig.take.marketPriceFactor) {
                        return [2 /*return*/, false];
                    }
                    if (!collateral.gt(0)) {
                        logging_1.logger.debug("Factory: Invalid collateral amount: ".concat(collateral.toString(), " for pool ").concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3)) return [3 /*break*/, 3];
                    return [4 /*yield*/, checkUniswapV3Quote(pool, price, collateral, poolConfig, config, signer)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.SUSHISWAP)) return [3 /*break*/, 5];
                    return [4 /*yield*/, checkSushiSwapQuote(pool, price, collateral, poolConfig, config, signer)];
                case 4: return [2 /*return*/, _a.sent()];
                case 5:
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4)) return [3 /*break*/, 7];
                    return [4 /*yield*/, checkUniswapV4Quote(pool, price, collateral, poolConfig, config, signer)];
                case 6: return [2 /*return*/, _a.sent()];
                case 7:
                    // Future: Add other DEX sources here
                    logging_1.logger.debug("Factory: Unsupported liquidity source: ".concat(poolConfig.take.liquiditySource));
                    return [2 /*return*/, false];
                case 8:
                    error_1 = _a.sent();
                    logging_1.logger.error("Factory: Failed to check takeability for pool ".concat(pool.name, ": ").concat(error_1));
                    return [2 /*return*/, false];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * PHASE 3: Real Uniswap V3 quote check using OFFICIAL QuoterV2 contract
 * Uses the same method as Uniswap's frontend - guaranteed accurate prices
 */
function checkUniswapV3Quote(pool, auctionPrice, collateral, poolConfig, config, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var routerConfig, quoteProvider, quoterAddress, collateralDecimals, quoteDecimals, collateralInTokenDecimals, quoteResult, collateralAmount, quoteAmount, officialMarketPrice, marketPriceFactor, takeablePrice, profitable, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.universalRouterOverrides) {
                        logging_1.logger.debug("Factory: No universalRouterOverrides configured for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    routerConfig = config.universalRouterOverrides;
                    // Validate required configuration
                    if (!routerConfig.universalRouterAddress || !routerConfig.poolFactoryAddress || !routerConfig.wethAddress) {
                        logging_1.logger.debug("Factory: Missing required router configuration for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(signer, {
                        universalRouterAddress: routerConfig.universalRouterAddress,
                        poolFactoryAddress: routerConfig.poolFactoryAddress,
                        defaultFeeTier: routerConfig.defaultFeeTier || 3000,
                        wethAddress: routerConfig.wethAddress,
                        quoterV2Address: routerConfig.quoterV2Address, // NEW: Pass from config
                    });
                    // Check if the quote provider found a QuoterV2 contract
                    if (!quoteProvider.isAvailable()) {
                        logging_1.logger.debug("Factory: UniswapV3QuoteProvider not available for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    quoterAddress = quoteProvider.getQuoterAddress();
                    logging_1.logger.debug("Factory: Using QuoterV2 at ".concat(quoterAddress, " for pool ").concat(pool.name));
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 2:
                    collateralDecimals = _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.quoteAddress)];
                case 3:
                    quoteDecimals = _a.sent();
                    collateralInTokenDecimals = (0, erc20_1.convertWadToTokenDecimals)(collateral, collateralDecimals);
                    // PHASE 3: Get OFFICIAL quote from Uniswap V3 QuoterV2 contract
                    logging_1.logger.debug("Factory: Getting official Uniswap V3 quote for ".concat(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals), " collateral in pool ").concat(pool.name));
                    return [4 /*yield*/, quoteProvider.getQuote(collateralInTokenDecimals, pool.collateralAddress, pool.quoteAddress, routerConfig.defaultFeeTier)];
                case 4:
                    quoteResult = _a.sent();
                    if (!quoteResult.success || !quoteResult.dstAmount) {
                        logging_1.logger.debug("Factory: Failed to get official Uniswap V3 quote for pool ".concat(pool.name, ": ").concat(quoteResult.error));
                        return [2 /*return*/, false];
                    }
                    collateralAmount = Number(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals));
                    quoteAmount = Number(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, quoteDecimals));
                    if (collateralAmount <= 0 || quoteAmount <= 0) {
                        logging_1.logger.debug("Factory: Invalid amounts - collateral: ".concat(collateralAmount, ", quote: ").concat(quoteAmount, " for pool ").concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    officialMarketPrice = quoteAmount / collateralAmount;
                    marketPriceFactor = poolConfig.take.marketPriceFactor;
                    if (!marketPriceFactor) {
                        logging_1.logger.debug("Factory: No marketPriceFactor configured for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    takeablePrice = officialMarketPrice * marketPriceFactor;
                    profitable = auctionPrice <= takeablePrice;
                    logging_1.logger.debug("Price check: pool=".concat(pool.name, ", auction=").concat(auctionPrice.toFixed(4), ", market=").concat(officialMarketPrice.toFixed(4), ", takeable=").concat(takeablePrice.toFixed(4), ", profitable=").concat(profitable));
                    return [2 /*return*/, profitable];
                case 5:
                    error_2 = _a.sent();
                    logging_1.logger.error("Factory: Error getting official Uniswap V3 quote for pool ".concat(pool.name, ": ").concat(error_2));
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check SushiSwap V3 profitability using official QuoterV2 contract
 */
function checkSushiSwapQuote(pool, auctionPrice, collateral, poolConfig, config, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var sushiConfig, quoteProvider, initialized, collateralDecimals, quoteDecimals, collateralInTokenDecimals, quoteResult, collateralAmount, quoteAmount, marketPrice, marketPriceFactor, takeablePrice, profitable, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!config.sushiswapRouterOverrides) {
                        logging_1.logger.debug("Factory: No sushiswapRouterOverrides configured for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    sushiConfig = config.sushiswapRouterOverrides;
                    // Validate required configuration
                    if (!sushiConfig.swapRouterAddress || !sushiConfig.factoryAddress || !sushiConfig.wethAddress) {
                        logging_1.logger.debug("Factory: Missing required SushiSwap configuration for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(signer, {
                        swapRouterAddress: sushiConfig.swapRouterAddress,
                        quoterV2Address: sushiConfig.quoterV2Address,
                        factoryAddress: sushiConfig.factoryAddress,
                        defaultFeeTier: sushiConfig.defaultFeeTier || 500,
                        wethAddress: sushiConfig.wethAddress,
                    });
                    return [4 /*yield*/, quoteProvider.initialize()];
                case 2:
                    initialized = _a.sent();
                    if (!initialized) {
                        logging_1.logger.debug("Factory: SushiSwap quote provider not available for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 3:
                    collateralDecimals = _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.quoteAddress)];
                case 4:
                    quoteDecimals = _a.sent();
                    collateralInTokenDecimals = (0, erc20_1.convertWadToTokenDecimals)(collateral, collateralDecimals);
                    // Get official quote from SushiSwap QuoterV2 contract
                    logging_1.logger.debug("Factory: Getting SushiSwap quote for ".concat(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals), " collateral in pool ").concat(pool.name));
                    return [4 /*yield*/, quoteProvider.getQuote(collateralInTokenDecimals, pool.collateralAddress, pool.quoteAddress, sushiConfig.defaultFeeTier)];
                case 5:
                    quoteResult = _a.sent();
                    if (!quoteResult.success || !quoteResult.dstAmount) {
                        logging_1.logger.debug("Factory: Failed to get SushiSwap quote for pool ".concat(pool.name, ": ").concat(quoteResult.error));
                        return [2 /*return*/, false];
                    }
                    collateralAmount = Number(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals));
                    quoteAmount = Number(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, quoteDecimals));
                    if (collateralAmount <= 0 || quoteAmount <= 0) {
                        logging_1.logger.debug("Factory: Invalid amounts - collateral: ".concat(collateralAmount, ", quote: ").concat(quoteAmount, " for pool ").concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    marketPrice = quoteAmount / collateralAmount;
                    marketPriceFactor = poolConfig.take.marketPriceFactor;
                    if (!marketPriceFactor) {
                        logging_1.logger.debug("Factory: No marketPriceFactor configured for pool ".concat(pool.name));
                        return [2 /*return*/, false];
                    }
                    takeablePrice = marketPrice * marketPriceFactor;
                    profitable = auctionPrice <= takeablePrice;
                    logging_1.logger.debug("SushiSwap price check: pool=".concat(pool.name, ", auction=").concat(auctionPrice.toFixed(4), ", market=").concat(marketPrice.toFixed(4), ", takeable=").concat(takeablePrice.toFixed(4), ", profitable=").concat(profitable));
                    return [2 /*return*/, profitable];
                case 6:
                    error_3 = _a.sent();
                    logging_1.logger.error("Factory: Error getting SushiSwap quote for pool ".concat(pool.name, ": ").concat(error_3));
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// AUDIT FIX NEW-04: Module-level provider cache keyed by poolManager+stateView+chainId.
// Previously a fresh UniswapV4QuoteProvider was instantiated (+ initialize() called) for
// EVERY liquidation candidate in a pool, generating O(n) redundant getCode() RPC calls per
// keeper cycle. Now we re-use a single initialized instance per unique V4 config.
var _v4QuoteProviderCache = new Map();
function getOrCreateV4QuoteProvider(signer, v4) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, qp, ok;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cacheKey = "".concat(v4.poolManager, ":").concat((_a = v4.stateView) !== null && _a !== void 0 ? _a : 'default');
                    if (_v4QuoteProviderCache.has(cacheKey)) {
                        cached = _v4QuoteProviderCache.get(cacheKey);
                        if (cached.isAvailable())
                            return [2 /*return*/, cached];
                        // Provider exists but failed to initialize previously - retry
                    }
                    qp = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                        poolManager: v4.poolManager,
                        defaultSlippage: (_b = v4.defaultSlippage) !== null && _b !== void 0 ? _b : 0.5,
                        pools: v4.pools,
                        stateView: v4.stateView,
                    });
                    return [4 /*yield*/, qp.initialize()];
                case 1:
                    ok = _c.sent();
                    if (!ok) {
                        logging_1.logger.error("Factory: V4 QuoteProvider failed to initialize (poolManager=".concat(v4.poolManager, ")"));
                        return [2 /*return*/, null];
                    }
                    _v4QuoteProviderCache.set(cacheKey, qp);
                    return [2 /*return*/, qp];
            }
        });
    });
}
function checkUniswapV4Quote(pool, auctionPrice, collateral, poolConfig, config, signer) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var v4, tokenIn, tokenOut, poolKey, collateralDecimals, inAmtTokenDec, qp, mr, marketPrice, marketPriceFactor, takeablePrice, profitable, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    v4 = config.uniswapV4RouterOverrides;
                    if (!v4 || !v4.router || !v4.pools) {
                        logging_1.logger.debug("Factory: Missing uniswapV4RouterOverrides configuration");
                        return [2 /*return*/, false];
                    }
                    tokenIn = pool.collateralAddress;
                    tokenOut = pool.quoteAddress;
                    poolKey = findV4PoolKeyForPair(v4, tokenIn, tokenOut);
                    if (!poolKey) {
                        logging_1.logger.debug("Factory: No Uni v4 poolKey configured for ".concat(tokenIn, "/").concat(tokenOut));
                        return [2 /*return*/, false];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, tokenIn)];
                case 2:
                    collateralDecimals = _b.sent();
                    inAmtTokenDec = (0, erc20_1.convertWadToTokenDecimals)(collateral, collateralDecimals);
                    // AUDIT FIX H-04: Do NOT fallback poolManager to router - they are different contracts!
                    if (!v4.poolManager) {
                        logging_1.logger.error("Factory: V4 poolManager address not configured - required for quote provider");
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, getOrCreateV4QuoteProvider(signer, v4)];
                case 3:
                    qp = _b.sent();
                    if (!qp)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, qp.getMarketPrice(inAmtTokenDec, tokenIn, tokenOut, poolKey)];
                case 4:
                    mr = _b.sent();
                    if (!mr.success || mr.price === undefined) {
                        logging_1.logger.debug("Factory: Uni v4 quote unavailable: ".concat((_a = mr.error) !== null && _a !== void 0 ? _a : 'unknown error'));
                        return [2 /*return*/, false];
                    }
                    marketPrice = mr.price;
                    marketPriceFactor = poolConfig.take.marketPriceFactor;
                    takeablePrice = marketPrice * marketPriceFactor;
                    profitable = auctionPrice <= takeablePrice;
                    logging_1.logger.debug("Uni v4 price check: auction=".concat(auctionPrice.toFixed(6), ", market=").concat(marketPrice.toFixed(6), ", takeable=").concat(takeablePrice.toFixed(6), ", profitable=").concat(profitable));
                    return [2 /*return*/, profitable];
                case 5:
                    e_2 = _b.sent();
                    logging_1.logger.debug("Factory: Uni v4 quote failed: ".concat(e_2));
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.checkUniswapV4Quote = checkUniswapV4Quote;
// helper: pick poolKey from overrides by address pair
// IMPORTANT: Returns a NORMALIZED poolKey where currency0 < currency1 (V4 requirement)
function findV4PoolKeyForPair(v4, a, b) {
    if (!v4.pools)
        return undefined; // narrow away the {}
    var aLc = a.toLowerCase();
    var bLc = b.toLowerCase();
    var entries = Object.values(v4.pools); // now typed
    var found = entries.find(function (k) {
        var t0 = k.token0.toLowerCase();
        var t1 = k.token1.toLowerCase();
        return (t0 === aLc && t1 === bLc) || (t0 === bLc && t1 === aLc);
    });
    if (!found)
        return undefined;
    // CRITICAL: Normalize the poolKey so currency0 < currency1 (V4 requirement)
    // V4 pools are keyed by ordered addresses - wrong order = different/nonexistent pool
    var token0Lc = found.token0.toLowerCase();
    var token1Lc = found.token1.toLowerCase();
    if (token0Lc < token1Lc) {
        // Already normalized
        return found;
    }
    else {
        // Need to swap - return normalized copy
        return {
            token0: found.token1,
            token1: found.token0,
            fee: found.fee,
            tickSpacing: found.tickSpacing,
            hooks: found.hooks,
            sqrtPriceLimitX96: found.sqrtPriceLimitX96,
        };
    }
}
exports.findV4PoolKeyForPair = findV4PoolKeyForPair;
/**
 * ArbTake check (same logic as existing, copied to avoid dependencies)
 */
function checkIfArbTakeableFactory(pool, price, collateral, poolConfig, subgraphUrl, minDeposit, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var collateralDecimals, minCollateral, buckets, hmbIndex, hmbPrice, safeFactor, maxArbPrice, isArbTakeable;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!poolConfig.take.minCollateral || !poolConfig.take.hpbPriceFactor) {
                        return [2 /*return*/, { isArbTakeable: false, hpbIndex: 0 }];
                    }
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 1:
                    collateralDecimals = _a.sent();
                    minCollateral = ethers_1.ethers.BigNumber.from((0, utils_1.decimaledToWei)(poolConfig.take.minCollateral, collateralDecimals));
                    if (collateral.lt(minCollateral)) {
                        logging_1.logger.debug("Factory: Collateral ".concat(collateral, " below minCollateral ").concat(minCollateral, " for pool: ").concat(pool.name));
                        return [2 /*return*/, { isArbTakeable: false, hpbIndex: 0 }];
                    }
                    return [4 /*yield*/, subgraph_1.default.getHighestMeaningfulBucket(subgraphUrl, pool.poolAddress, minDeposit)];
                case 2:
                    buckets = (_a.sent()).buckets;
                    if (buckets.length === 0) {
                        return [2 /*return*/, { isArbTakeable: false, hpbIndex: 0 }];
                    }
                    hmbIndex = buckets[0].bucketIndex;
                    hmbPrice = Number((0, utils_1.weiToDecimaled)(pool.getBucketByIndex(hmbIndex).price));
                    safeFactor = Math.min(poolConfig.take.hpbPriceFactor, 1.0);
                    maxArbPrice = hmbPrice * safeFactor;
                    isArbTakeable = price < maxArbPrice;
                    if (!isArbTakeable && price < hmbPrice * 1.01) {
                        // Close but not safe - log for visibility
                        logging_1.logger.debug("Factory: ArbTake skipped - price ".concat(price.toFixed(6), " too close to bucket ").concat(hmbPrice.toFixed(6), " (need < ").concat(maxArbPrice.toFixed(6), ")"));
                    }
                    return [2 /*return*/, {
                            isArbTakeable: isArbTakeable,
                            hpbIndex: hmbIndex,
                        }];
            }
        });
    });
}
/**
 * Execute external take using factory pattern
 */
function takeLiquidationFactory(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var borrower, dryRun, keeperTakerFactory;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    borrower = liquidation.borrower;
                    dryRun = config.dryRun, keeperTakerFactory = config.keeperTakerFactory;
                    if (dryRun) {
                        logging_1.logger.info("DryRun - would Factory Take - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower, " using ").concat(poolConfig.take.liquiditySource));
                        return [2 /*return*/];
                    }
                    if (!keeperTakerFactory) {
                        logging_1.logger.error('Factory: keeperTakerFactory address not configured');
                        return [2 /*return*/];
                    }
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3)) return [3 /*break*/, 2];
                    return [4 /*yield*/, takeWithUniswapV3Factory({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 2:
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4)) return [3 /*break*/, 4];
                    return [4 /*yield*/, takeWithUniswapV4Factory({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 4:
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.SUSHISWAP)) return [3 /*break*/, 6];
                    return [4 /*yield*/, takeWithSushiSwapFactory({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    logging_1.logger.error("Factory: Unsupported liquidity source: ".concat(poolConfig.take.liquiditySource));
                    _b.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * FIXED: Execute Uniswap V3 take via factory
 * Now follows 1inch pattern - sends WAD amounts to smart contract
 */
function takeWithUniswapV3Factory(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var factory, minimalAmountOut, swapDetails, encodedSwapDetails, error_4;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    factory = typechain_types_1.AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory, signer);
                    if (!config.universalRouterOverrides) {
                        logging_1.logger.error('Factory: universalRouterOverrides required for UniswapV3 takes');
                        return [2 /*return*/];
                    }
                    minimalAmountOut = ethers_1.BigNumber.from(1);
                    logging_1.logger.debug("Factory: Executing Uniswap V3 take for pool ".concat(pool.name, ":\n") +
                        "  Collateral (WAD): ".concat(liquidation.collateral.toString(), "\n") +
                        "  Auction Price (WAD): ".concat(liquidation.auctionPrice.toString(), "\n") +
                        "  Minimal Amount Out: ".concat(minimalAmountOut.toString(), " (let Ajna enforce)"));
                    swapDetails = {
                        universalRouter: config.universalRouterOverrides.universalRouterAddress,
                        permit2: config.universalRouterOverrides.permit2Address,
                        targetToken: pool.quoteAddress,
                        feeTier: config.universalRouterOverrides.defaultFeeTier || 3000,
                        amountOutMinimum: minimalAmountOut,
                        deadline: Math.floor(Date.now() / 1000) + 1800,
                    };
                    encodedSwapDetails = ethers_1.ethers.utils.defaultAbiCoder.encode(['(address,address,address,uint24,uint256,uint256)'], // UniswapV3SwapDetails struct
                    [[
                            swapDetails.universalRouter,
                            swapDetails.permit2,
                            swapDetails.targetToken,
                            swapDetails.feeTier,
                            swapDetails.amountOutMinimum,
                            swapDetails.deadline
                        ]]);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    logging_1.logger.debug("Factory: Sending Uniswap V3 Take Tx - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(liquidation.borrower));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, factory.takeWithAtomicSwap(pool.poolAddress, liquidation.borrower, liquidation.auctionPrice, // WAD amount
                                        liquidation.collateral, // WAD amount
                                        Number(poolConfig.take.liquiditySource), // LiquiditySource.UNISWAPV3 = 2
                                        swapDetails.universalRouter, encodedSwapDetails, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 2:
                    _b.sent();
                    logging_1.logger.info("Factory Uniswap V3 Take successful - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(liquidation.borrower));
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _b.sent();
                    logging_1.logger.error("Factory: Failed to Uniswap V3 Take. pool: ".concat(pool.name, ", borrower: ").concat(liquidation.borrower), error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute SushiSwap take via factory
 */
/**
 * FIXED: Execute SushiSwap take via factory
 * Now follows 1inch pattern - sends WAD amounts to smart contract
 */
function takeWithSushiSwapFactory(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var factory, minimalAmountOut, swapDetails, encodedSwapDetails, error_5;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    factory = typechain_types_1.AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory, signer);
                    if (!config.sushiswapRouterOverrides) {
                        logging_1.logger.error('Factory: sushiswapRouterOverrides required for SushiSwap takes');
                        return [2 /*return*/];
                    }
                    minimalAmountOut = ethers_1.BigNumber.from(1);
                    logging_1.logger.debug("Factory: Using WAD amounts for SushiSwap pool ".concat(pool.name, ":\n") +
                        "  Collateral (WAD): ".concat(liquidation.collateral.toString(), "\n") +
                        "  Auction Price (WAD): ".concat(liquidation.auctionPrice.toString(), "\n") +
                        "  Minimal Amount Out: ".concat(minimalAmountOut.toString(), " (let Ajna enforce)"));
                    swapDetails = {
                        swapRouter: config.sushiswapRouterOverrides.swapRouterAddress,
                        targetToken: pool.quoteAddress,
                        feeTier: config.sushiswapRouterOverrides.defaultFeeTier || 500,
                        amountOutMinimum: minimalAmountOut,
                        deadline: Math.floor(Date.now() / 1000) + 1800,
                    };
                    encodedSwapDetails = ethers_1.ethers.utils.defaultAbiCoder.encode(['uint24', 'uint256', 'uint256'], // feeTier, amountOutMinimum, deadline  
                    [swapDetails.feeTier, swapDetails.amountOutMinimum, swapDetails.deadline]);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    logging_1.logger.debug("Factory: Sending SushiSwap Take Tx - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(liquidation.borrower));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, factory.takeWithAtomicSwap(pool.poolAddress, liquidation.borrower, liquidation.auctionPrice, // WAD amount
                                        liquidation.collateral, // WAD amount  
                                        Number(poolConfig.take.liquiditySource), // LiquiditySource.SUSHISWAP = 3
                                        swapDetails.swapRouter, encodedSwapDetails, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 2:
                    _b.sent();
                    logging_1.logger.info("Factory SushiSwap Take successful - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(liquidation.borrower));
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _b.sent();
                    logging_1.logger.error("Factory: Failed to SushiSwap Take. pool: ".concat(pool.name, ", borrower: ").concat(liquidation.borrower), error_5);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function takeWithUniswapV4Factory(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var v4, factory, tokenIn, tokenOut, poolKey, expectedQuoteWad, quoteDecimals, quoteScale, amountOutMin, encodedSwapDetails, error_6;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    v4 = config.uniswapV4RouterOverrides;
                    if (!v4 || !v4.router) {
                        logging_1.logger.error('Factory: uniswapV4RouterOverrides.router is required for Uni v4 takes');
                        return [2 /*return*/];
                    }
                    factory = typechain_types_1.AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory, signer);
                    tokenIn = pool.collateralAddress;
                    tokenOut = pool.quoteAddress;
                    poolKey = findV4PoolKeyForPair(v4, tokenIn, tokenOut);
                    if (!poolKey) {
                        logging_1.logger.error("Factory: No Uni v4 poolKey configured for ".concat(tokenIn, "/").concat(tokenOut));
                        return [2 /*return*/];
                    }
                    // Defensive check: Ensure auction price is not zero
                    if (liquidation.auctionPrice.isZero()) {
                        logging_1.logger.error("Factory: Cannot take with zero auction price - auction may have decayed completely. pool=".concat(pool.name, ", borrower=").concat(liquidation.borrower));
                        return [2 /*return*/];
                    }
                    expectedQuoteWad = liquidation.collateral.mul(liquidation.auctionPrice).div(ethers_1.ethers.constants.WeiPerEther);
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, tokenOut)];
                case 1:
                    quoteDecimals = _b.sent();
                    quoteScale = ethers_1.ethers.BigNumber.from(10).pow(18 - quoteDecimals);
                    amountOutMin = expectedQuoteWad.add(quoteScale.sub(1)).div(quoteScale);
                    logging_1.logger.debug("V4 Take: quoteNeeded=".concat(amountOutMin.toString(), " (exact, no buffer - profitability check ensures margin)"));
                    encodedSwapDetails = ethers_1.ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint24,int24,address)', 'uint256'], [
                        [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
                        amountOutMin,
                    ]);
                    logging_1.logger.debug("Factory: Uni v4 take\n" +
                        "  pool=".concat(pool.name, "\n") +
                        "  borrower=".concat(liquidation.borrower, "\n") +
                        "  router=".concat(v4.router, "\n") +
                        "  poolKey=(".concat(poolKey.token0, ", ").concat(poolKey.token1, ", fee=").concat(poolKey.fee, ", ts=").concat(poolKey.tickSpacing, ", hooks=").concat(poolKey.hooks, ")"));
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, factory.takeWithAtomicSwap(pool.poolAddress, liquidation.borrower, liquidation.auctionPrice, // WAD
                                        liquidation.collateral, // WAD
                                        Number(config_types_1.LiquiditySource.UNISWAPV4), // 5
                                        v4.router, // Unused by V4 taker, but required by interface
                                        encodedSwapDetails, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 3:
                    _b.sent();
                    logging_1.logger.info("Factory Uni v4 take successful - pool=".concat(pool.poolAddress, ", borrower=").concat(liquidation.borrower));
                    return [3 /*break*/, 5];
                case 4:
                    error_6 = _b.sent();
                    logging_1.logger.error("Factory: Failed to Uni v4 Take. pool: ".concat(pool.name, ", borrower: ").concat(liquidation.borrower), error_6);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.takeWithUniswapV4Factory = takeWithUniswapV4Factory;
/**
 * ArbTake using existing logic (same as original)
 */
function arbTakeLiquidationFactory(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var borrower, hpbIndex, dryRun, liquidationSdk, error_7;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    borrower = liquidation.borrower, hpbIndex = liquidation.hpbIndex;
                    dryRun = config.dryRun;
                    if (dryRun) {
                        logging_1.logger.info("DryRun - would Factory ArbTake - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    logging_1.logger.debug("Factory: Sending ArbTake Tx - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower, ", hpbIndex: ").concat(hpbIndex));
                    liquidationSdk = pool.getLiquidation(borrower);
                    return [4 /*yield*/, (0, transactions_1.liquidationArbTake)(liquidationSdk, signer, hpbIndex)];
                case 2:
                    _b.sent();
                    logging_1.logger.info("Factory ArbTake successful - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                    return [3 /*break*/, 4];
                case 3:
                    error_7 = _b.sent();
                    logging_1.logger.error("Factory: Failed to ArbTake. pool: ".concat(pool.name, ", borrower: ").concat(borrower), error_7);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=take-factory.js.map