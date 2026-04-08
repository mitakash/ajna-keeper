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
exports.arbTakeLiquidation = exports.takeLiquidation = exports.getLiquidationsToTake = exports.handleTakesWith1inch = exports.handleTakes = void 0;
var subgraph_1 = __importDefault(require("./subgraph"));
var utils_1 = require("./utils");
var config_types_1 = require("./config-types");
var logging_1 = require("./logging");
var transactions_1 = require("./transactions");
var dex_router_1 = require("./dex-router");
var ethers_1 = require("ethers");
var _1inch_1 = require("./1inch");
var typechain_types_1 = require("../typechain-types");
var erc20_1 = require("./erc20");
var nonce_1 = require("./nonce");
var smart_dex_manager_1 = require("./smart-dex-manager");
var take_factory_1 = require("./take-factory");
function handleTakes(_a) {
    var signer = _a.signer, pool = _a.pool, poolConfig = _a.poolConfig, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var dexManager, deploymentType, validation, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    dexManager = new smart_dex_manager_1.SmartDexManager(signer, config);
                    return [4 /*yield*/, dexManager.detectDeploymentType()];
                case 1:
                    deploymentType = _c.sent();
                    return [4 /*yield*/, dexManager.validateDeployment()];
                case 2:
                    validation = _c.sent();
                    logging_1.logger.debug("Detection Results - Type: ".concat(deploymentType, ", Valid: ").concat(validation.valid));
                    if (!validation.valid) {
                        logging_1.logger.error("Configuration errors: ".concat(validation.errors.join(', ')));
                    }
                    _b = deploymentType;
                    switch (_b) {
                        case 'single': return [3 /*break*/, 3];
                        case 'factory': return [3 /*break*/, 5];
                        case 'none': return [3 /*break*/, 7];
                    }
                    return [3 /*break*/, 9];
                case 3:
                    // EXISTING 1inch path - zero changes to existing code
                    logging_1.logger.debug("Using single contract (1inch) take handler for pool: ".concat(pool.name));
                    return [4 /*yield*/, handleTakesWith1inch({
                            signer: signer,
                            pool: pool,
                            poolConfig: poolConfig,
                            config: config,
                        })];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 5:
                    // NEW factory path - completely separate code
                    logging_1.logger.debug("Using factory (multi-DEX) take handler for pool: ".concat(pool.name));
                    return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                            signer: signer,
                            pool: pool,
                            poolConfig: poolConfig,
                            config: {
                                dryRun: config.dryRun,
                                subgraphUrl: config.subgraphUrl,
                                delayBetweenActions: config.delayBetweenActions,
                                keeperTakerFactory: config.keeperTakerFactory,
                                takerContracts: config.takerContracts,
                                universalRouterOverrides: config.universalRouterOverrides,
                                sushiswapRouterOverrides: config.sushiswapRouterOverrides,
                                uniswapV4RouterOverrides: config.uniswapV4RouterOverrides,
                            },
                        })];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 7:
                    // External DEX unavailable, but arbTake should still work!
                    // Use the existing 1inch handler since it already supports arbTake fallback
                    logging_1.logger.warn("External DEX integration unavailable for pool ".concat(pool.name, " - checking arbTake only"));
                    return [4 /*yield*/, handleTakesWith1inch({
                            signer: signer,
                            pool: pool,
                            poolConfig: poolConfig,
                            config: config,
                        })];
                case 8:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.handleTakes = handleTakes;
/**
 * Handle liquidations for all scenarios: 1inch external takes, factory takes, and arbTake-only
 *
 * Despite the name, this function handles multiple take strategies:
 * - External takes via 1inch (when keeperTaker contract is available)
 * - External takes via factory system (when keeperTakerFactory + takerContracts available)
 * - ArbTake-only (when no external DEX contracts deployed)
 * - LP reward collection and settlement (works in all scenarios)
 *
 * The function automatically skips external takes when they're not profitable or possible,
 * and falls back to arbTake when configured. This provides a unified interface for
 * all liquidation scenarios while maintaining backward compatibility.
 */
function handleTakesWith1inch(_a) {
    var _b, e_1, _c, _d;
    var signer = _a.signer, pool = _a.pool, poolConfig = _a.poolConfig, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var _e, _f, _g, liquidation, e_1_1;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 9, 10, 15]);
                    _e = true, _f = __asyncValues(getLiquidationsToTake({
                        pool: pool,
                        poolConfig: poolConfig,
                        signer: signer,
                        config: config,
                    }));
                    _h.label = 1;
                case 1: return [4 /*yield*/, _f.next()];
                case 2:
                    if (!(_g = _h.sent(), _b = _g.done, !_b)) return [3 /*break*/, 8];
                    _d = _g.value;
                    _e = false;
                    liquidation = _d;
                    if (!liquidation.isTakeable) return [3 /*break*/, 5];
                    return [4 /*yield*/, takeLiquidation({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 3:
                    _h.sent();
                    if (!liquidation.isArbTakeable) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 4:
                    _h.sent();
                    _h.label = 5;
                case 5:
                    if (!liquidation.isArbTakeable) return [3 /*break*/, 7];
                    return [4 /*yield*/, arbTakeLiquidation({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            liquidation: liquidation,
                            config: config,
                        })];
                case 6:
                    _h.sent();
                    _h.label = 7;
                case 7:
                    _e = true;
                    return [3 /*break*/, 1];
                case 8: return [3 /*break*/, 15];
                case 9:
                    e_1_1 = _h.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 15];
                case 10:
                    _h.trys.push([10, , 13, 14]);
                    if (!(!_e && !_b && (_c = _f.return))) return [3 /*break*/, 12];
                    return [4 /*yield*/, _c.call(_f)];
                case 11:
                    _h.sent();
                    _h.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 14: return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
exports.handleTakesWith1inch = handleTakesWith1inch;
function checkIfArbTakeable(pool, price, collateral, poolConfig, subgraphUrl, minDeposit, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var collateralDecimals, minCollateral, buckets, hmbIndex, hmbPrice, maxArbPrice;
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
                        logging_1.logger.debug("Collateral ".concat(collateral, " below minCollateral ").concat(minCollateral, " for pool: ").concat(pool.name));
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
                    maxArbPrice = hmbPrice * poolConfig.take.hpbPriceFactor;
                    return [2 /*return*/, {
                            isArbTakeable: price < maxArbPrice,
                            hpbIndex: hmbIndex,
                        }];
            }
        });
    });
}
function checkIfTakeable(pool, price, collateral, poolConfig, config, signer, oneInchRouters, connectorTokens) {
    return __awaiter(this, void 0, void 0, function () {
        var chainId, dexRouter, collateralDecimals, collateralInTokenDecimals, quoteResult, amountOut, quoteDecimals, collateralAmount, quoteAmount, marketPrice, takeablePrice, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (poolConfig.take.liquiditySource !== config_types_1.LiquiditySource.ONEINCH ||
                        !poolConfig.take.marketPriceFactor) {
                        return [2 /*return*/, { isTakeable: false }];
                    }
                    if (!collateral.gt(0)) {
                        logging_1.logger.debug("Invalid collateral amount: ".concat(collateral.toString(), " for pool ").concat(pool.name));
                        return [2 /*return*/, { isTakeable: false }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, signer.getChainId()];
                case 2:
                    chainId = _a.sent();
                    if (!oneInchRouters || !oneInchRouters[chainId]) {
                        logging_1.logger.debug("No 1inch router configured for chainId ".concat(chainId, " in pool ").concat(pool.name));
                        return [2 /*return*/, { isTakeable: false }];
                    }
                    // Pause between getting a quote for each liquidation to avoid 1inch rate limit
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 3:
                    // Pause between getting a quote for each liquidation to avoid 1inch rate limit
                    _a.sent();
                    dexRouter = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: oneInchRouters !== null && oneInchRouters !== void 0 ? oneInchRouters : {},
                        connectorTokens: connectorTokens !== null && connectorTokens !== void 0 ? connectorTokens : [],
                    });
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 4:
                    collateralDecimals = _a.sent();
                    collateralInTokenDecimals = (0, erc20_1.convertWadToTokenDecimals)(collateral, collateralDecimals);
                    return [4 /*yield*/, dexRouter.getQuoteFromOneInch(chainId, collateralInTokenDecimals, pool.collateralAddress, pool.quoteAddress)];
                case 5:
                    quoteResult = _a.sent();
                    if (!quoteResult.success) {
                        logging_1.logger.debug("No valid quote data for collateral ".concat(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals), " in pool ").concat(pool.name, ": ").concat(quoteResult.error));
                        return [2 /*return*/, { isTakeable: false }];
                    }
                    amountOut = ethers_1.ethers.BigNumber.from(quoteResult.dstAmount);
                    if (amountOut.isZero()) {
                        logging_1.logger.debug("Zero amountOut for collateral ".concat(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals), " in pool ").concat(pool.name));
                        return [2 /*return*/, { isTakeable: false }];
                    }
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.quoteAddress)];
                case 6:
                    quoteDecimals = _a.sent();
                    collateralAmount = Number(ethers_1.ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals) // ← Use converted amount
                    );
                    quoteAmount = Number(ethers_1.ethers.utils.formatUnits(amountOut, quoteDecimals));
                    marketPrice = quoteAmount / collateralAmount;
                    takeablePrice = marketPrice * poolConfig.take.marketPriceFactor;
                    logging_1.logger.debug("Market price: ".concat(marketPrice, ", takeablePrice: ").concat(takeablePrice, ", liquidation price: ").concat(price, " for pool ").concat(pool.name));
                    return [2 /*return*/, { isTakeable: price <= takeablePrice }];
                case 7:
                    error_1 = _a.sent();
                    logging_1.logger.error("Failed to fetch quote data for pool ".concat(pool.name, ": ").concat(error_1));
                    return [2 /*return*/, { isTakeable: false }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function getLiquidationsToTake(_a) {
    var _b;
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, config = _a.config;
    return __asyncGenerator(this, arguments, function getLiquidationsToTake_1() {
        var subgraphUrl, oneInchRouters, connectorTokens, _c, hpb, hpbIndex, liquidationAuctions, _i, liquidationAuctions_1, auction, borrower, liquidationStatus, price, collateral, isTakeable, isArbTakeable, arbHpbIndex, minDeposit, arbTakeCheck, strategyLog;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    subgraphUrl = config.subgraphUrl, oneInchRouters = config.oneInchRouters, connectorTokens = config.connectorTokens;
                    return [4 /*yield*/, __await(subgraph_1.default.getLiquidations(subgraphUrl, pool.poolAddress, (_b = poolConfig.take.minCollateral) !== null && _b !== void 0 ? _b : 0))];
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
                    // Skip auctions with zero or effectively zero price (auction has decayed too far)
                    // This can happen after ~72+ hours when the Dutch auction price reaches 0
                    if (price <= 0 || liquidationStatus.price.isZero()) {
                        logging_1.logger.debug("Skipping auction for borrower ".concat(borrower, " - price has decayed to 0 (auction likely needs settlement)"));
                        return [3 /*break*/, 11];
                    }
                    isTakeable = false;
                    isArbTakeable = false;
                    arbHpbIndex = 0;
                    if (!(poolConfig.take.marketPriceFactor && poolConfig.take.liquiditySource)) return [3 /*break*/, 5];
                    return [4 /*yield*/, __await(checkIfTakeable(pool, price, collateral, poolConfig, config, signer, oneInchRouters, connectorTokens))];
                case 4:
                    isTakeable = (_d.sent()).isTakeable;
                    _d.label = 5;
                case 5:
                    if (!(poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor)) return [3 /*break*/, 7];
                    minDeposit = poolConfig.take.minCollateral / hpb;
                    return [4 /*yield*/, __await(checkIfArbTakeable(pool, price, collateral, poolConfig, subgraphUrl, minDeposit.toString(), signer))];
                case 6:
                    arbTakeCheck = _d.sent();
                    isArbTakeable = arbTakeCheck.isArbTakeable;
                    arbHpbIndex = arbTakeCheck.hpbIndex;
                    _d.label = 7;
                case 7:
                    if (!(isTakeable || isArbTakeable)) return [3 /*break*/, 10];
                    strategyLog = isTakeable && !isArbTakeable ? 'take'
                        : !isTakeable && isArbTakeable ? 'arbTake'
                            : isTakeable && isArbTakeable ? 'take and arbTake'
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
                    logging_1.logger.debug("Not taking liquidation since price ".concat(price, " is too high - pool: ").concat(pool.name, ", borrower: ").concat(borrower));
                    _d.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.getLiquidationsToTake = getLiquidationsToTake;
function takeLiquidation(_a) {
    var _b, _c;
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var borrower, dryRun, keeperTaker_1, dexRouter_1, collateralDecimals, collateralInTokenDecimals, swapData_1, _d, _e, _f, _g, _h, _j, _k, _l, error_2;
        var _this = this;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    borrower = liquidation.borrower;
                    dryRun = config.dryRun;
                    if (!dryRun) return [3 /*break*/, 1];
                    logging_1.logger.info("DryRun - would Take - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower, " using ").concat(poolConfig.take.liquiditySource));
                    return [3 /*break*/, 12];
                case 1:
                    if (!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.ONEINCH)) return [3 /*break*/, 11];
                    keeperTaker_1 = typechain_types_1.AjnaKeeperTaker__factory.connect(config.keeperTaker, signer);
                    // pause between getting the 1inch quote and requesting the swap to avoid 1inch rate limit
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 2:
                    // pause between getting the 1inch quote and requesting the swap to avoid 1inch rate limit
                    _m.sent();
                    dexRouter_1 = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: (_b = config.oneInchRouters) !== null && _b !== void 0 ? _b : {},
                        connectorTokens: (_c = config.connectorTokens) !== null && _c !== void 0 ? _c : [],
                    });
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 3:
                    collateralDecimals = _m.sent();
                    collateralInTokenDecimals = (0, erc20_1.convertWadToTokenDecimals)(liquidation.collateral, collateralDecimals);
                    _e = (_d = dexRouter_1).getSwapDataFromOneInch;
                    return [4 /*yield*/, signer.getChainId()];
                case 4: return [4 /*yield*/, _e.apply(_d, [_m.sent(), collateralInTokenDecimals,
                        pool.collateralAddress,
                        pool.quoteAddress,
                        1,
                        keeperTaker_1.address,
                        true])];
                case 5:
                    swapData_1 = _m.sent();
                    // Log transaction parameters for debugging
                    _g = (_f = logging_1.logger).debug;
                    _h = "Preparing takeWithAtomicSwap transaction:\n" +
                        "  Pool: ".concat(pool.poolAddress, "\n") +
                        "  Borrower: ".concat(liquidation.borrower, "\n") +
                        "  Auction Price (WAD): ".concat(liquidation.auctionPrice.toString(), "\n") +
                        "  Collateral (WAD): ".concat(liquidation.collateral.toString(), "\n") +
                        "  Collateral (Token Decimals): ".concat(collateralInTokenDecimals.toString(), "\n") +
                        "  Liquidity Source: ".concat(poolConfig.take.liquiditySource, "\n");
                    _j = "  1inch Router: ".concat;
                    _l = (_k = dexRouter_1).getRouter;
                    return [4 /*yield*/, signer.getChainId()];
                case 6:
                    // Log transaction parameters for debugging
                    _g.apply(_f, [_h +
                            _j.apply("  1inch Router: ", [_l.apply(_k, [_m.sent()]), "\n"]) +
                            "  Swap Data Length: ".concat(swapData_1.data.length, " chars")]);
                    _m.label = 7;
                case 7:
                    _m.trys.push([7, 9, , 10]);
                    logging_1.logger.debug("Sending Take Tx - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx, _a, _b, _c, _d, _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        _b = (_a = keeperTaker_1).takeWithAtomicSwap;
                                        _c = [pool.poolAddress,
                                            liquidation.borrower,
                                            liquidation.auctionPrice,
                                            liquidation.collateral,
                                            Number(poolConfig.take.liquiditySource)];
                                        _e = (_d = dexRouter_1).getRouter;
                                        return [4 /*yield*/, signer.getChainId()];
                                    case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([_e.apply(_d, [_f.sent()]),
                                            (0, _1inch_1.convertSwapApiResponseToDetailsBytes)(swapData_1.data),
                                            { nonce: nonce.toString() }]))];
                                    case 2:
                                        tx = _f.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 3: return [2 /*return*/, _f.sent()];
                                }
                            });
                        }); })];
                case 8:
                    _m.sent();
                    logging_1.logger.info("Take successful - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                    return [3 /*break*/, 10];
                case 9:
                    error_2 = _m.sent();
                    logging_1.logger.error("Failed to Take. pool: ".concat(pool.name, ", borrower: ").concat(borrower), error_2);
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 12];
                case 11:
                    logging_1.logger.error("Valid liquidity source not configured. Skipping liquidation of poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower, "."));
                    _m.label = 12;
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.takeLiquidation = takeLiquidation;
function arbTakeLiquidation(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, liquidation = _a.liquidation, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var borrower, hpbIndex, dryRun, liquidationSdk, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    borrower = liquidation.borrower, hpbIndex = liquidation.hpbIndex;
                    dryRun = config.dryRun;
                    if (!dryRun) return [3 /*break*/, 1];
                    logging_1.logger.info("DryRun - would ArbTake - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                    return [3 /*break*/, 4];
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    logging_1.logger.debug("Sending ArbTake Tx - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower, ", hpbIndex: ").concat(hpbIndex));
                    liquidationSdk = pool.getLiquidation(borrower);
                    return [4 /*yield*/, (0, transactions_1.liquidationArbTake)(liquidationSdk, signer, hpbIndex)];
                case 2:
                    _b.sent();
                    logging_1.logger.info("ArbTake successful - poolAddress: ".concat(pool.poolAddress, ", borrower: ").concat(borrower));
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _b.sent();
                    logging_1.logger.error("Failed to ArbTake. pool: ".concat(pool.name, ", borrower: ").concat(borrower), error_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.arbTakeLiquidation = arbTakeLiquidation;
//# sourceMappingURL=take.js.map