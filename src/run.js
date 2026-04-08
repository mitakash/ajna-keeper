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
exports.startKeeperFromConfig = void 0;
var sdk_1 = require("@ajna-finance/sdk");
var config_types_1 = require("./config-types");
var utils_1 = require("./utils");
var kick_1 = require("./kick");
var take_1 = require("./take");
var collect_bond_1 = require("./collect-bond");
var collect_lp_1 = require("./collect-lp");
var logging_1 = require("./logging");
var reward_action_tracker_1 = require("./reward-action-tracker");
var dex_router_1 = require("./dex-router");
var settlement_1 = require("./settlement");
function startKeeperFromConfig(config) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, provider, signer, ajna, poolMap;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(config.keeperKeystore, config.ethRpcUrl)];
                case 1:
                    _a = _b.sent(), provider = _a.provider, signer = _a.signer;
                    (0, config_types_1.configureAjna)(config.ajna);
                    ajna = new sdk_1.AjnaSDK(provider);
                    logging_1.logger.info('...and pools:');
                    return [4 /*yield*/, getPoolsFromConfig(ajna, config)];
                case 2:
                    poolMap = _b.sent();
                    kickPoolsLoop({ poolMap: poolMap, config: config, signer: signer });
                    takePoolsLoop({ poolMap: poolMap, config: config, signer: signer });
                    settlementLoop({ poolMap: poolMap, config: config, signer: signer });
                    collectBondLoop({ poolMap: poolMap, config: config, signer: signer });
                    collectLpRewardsLoop({ poolMap: poolMap, config: config, signer: signer });
                    return [2 /*return*/];
            }
        });
    });
}
exports.startKeeperFromConfig = startKeeperFromConfig;
function getPoolsFromConfig(ajna, config) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var pools, _i, _b, pool, name_1, fungiblePool;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    pools = new Map();
                    _i = 0, _b = config.pools;
                    _c.label = 1;
                case 1:
                    if (!(_i < _b.length)) return [3 /*break*/, 4];
                    pool = _b[_i];
                    name_1 = (_a = pool.name) !== null && _a !== void 0 ? _a : '(unnamed)';
                    logging_1.logger.info("loading pool ".concat(name_1.padStart(18), " at ").concat(pool.address));
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(pool.address)];
                case 2:
                    fungiblePool = _c.sent();
                    // TODO: Should this be a per-pool multicall?
                    (0, utils_1.overrideMulticall)(fungiblePool, config);
                    pools.set(pool.address, fungiblePool);
                    _c.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, pools];
            }
        });
    });
}
function kickPoolsLoop(_a) {
    var poolMap = _a.poolMap, config = _a.config, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var poolsWithKickSettings, _i, poolsWithKickSettings_1, poolConfig, pool, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    poolsWithKickSettings = config.pools.filter(hasKickSettings);
                    _b.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 10];
                    _i = 0, poolsWithKickSettings_1 = poolsWithKickSettings;
                    _b.label = 2;
                case 2:
                    if (!(_i < poolsWithKickSettings_1.length)) return [3 /*break*/, 8];
                    poolConfig = poolsWithKickSettings_1[_i];
                    pool = poolMap.get(poolConfig.address);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    return [4 /*yield*/, (0, kick_1.handleKicks)({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            config: config,
                        })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _b.sent();
                    logging_1.logger.error("Failed to handle kicks for pool: ".concat(pool.name, "."), error_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenRuns)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 1];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function hasKickSettings(config) {
    return !!config.kick;
}
function takePoolsLoop(_a) {
    var poolMap = _a.poolMap, config = _a.config, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var poolsWithTakeSettings, _i, poolsWithTakeSettings_1, poolConfig, pool, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    poolsWithTakeSettings = config.pools.filter(hasTakeSettings);
                    _b.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 10];
                    _i = 0, poolsWithTakeSettings_1 = poolsWithTakeSettings;
                    _b.label = 2;
                case 2:
                    if (!(_i < poolsWithTakeSettings_1.length)) return [3 /*break*/, 8];
                    poolConfig = poolsWithTakeSettings_1[_i];
                    pool = poolMap.get(poolConfig.address);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    (0, config_types_1.validateTakeSettings)(poolConfig.take, config);
                    return [4 /*yield*/, (0, take_1.handleTakes)({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            config: config,
                        })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _b.sent();
                    logging_1.logger.error("Failed to handle take for pool: ".concat(pool.name, "."), error_2);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenRuns)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 1];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function hasTakeSettings(config) {
    return !!config.take;
}
function collectBondLoop(_a) {
    var poolMap = _a.poolMap, config = _a.config, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var poolsWithCollectBondSettings, _i, poolsWithCollectBondSettings_1, poolConfig, pool, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    poolsWithCollectBondSettings = config.pools.filter(function (_a) {
                        var collectBond = _a.collectBond;
                        return !!collectBond;
                    });
                    _b.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 10];
                    _i = 0, poolsWithCollectBondSettings_1 = poolsWithCollectBondSettings;
                    _b.label = 2;
                case 2:
                    if (!(_i < poolsWithCollectBondSettings_1.length)) return [3 /*break*/, 8];
                    poolConfig = poolsWithCollectBondSettings_1[_i];
                    pool = poolMap.get(poolConfig.address);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 6, , 7]);
                    return [4 /*yield*/, (0, collect_bond_1.collectBondFromPool)({
                            pool: pool,
                            signer: signer,
                            poolConfig: poolConfig,
                            config: {
                                dryRun: config.dryRun,
                                subgraphUrl: config.subgraphUrl,
                                delayBetweenActions: config.delayBetweenActions
                            }
                        })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_3 = _b.sent();
                    logging_1.logger.error("Failed to collect bond from pool: ".concat(pool.name, "."), error_3);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 2];
                case 8: return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenRuns)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 1];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function settlementLoop(_a) {
    var poolMap = _a.poolMap, config = _a.config, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var poolsWithSettlementSettings, startTime, _i, poolsWithSettlementSettings_1, poolConfig, pool, poolError_1, settlementCheckInterval, nextCheck, outerError_1, errorMessage, errorStack;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    poolsWithSettlementSettings = config.pools.filter(hasSettlementSettings);
                    logging_1.logger.info("Settlement loop started with ".concat(poolsWithSettlementSettings.length, " pools"));
                    logging_1.logger.info("Settlement pools: ".concat(poolsWithSettlementSettings.map(function (p) { return p.name; }).join(', ')));
                    _b.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 14];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 11, , 13]);
                    startTime = new Date().toISOString();
                    logging_1.logger.debug("Settlement loop iteration starting at ".concat(startTime));
                    _i = 0, poolsWithSettlementSettings_1 = poolsWithSettlementSettings;
                    _b.label = 3;
                case 3:
                    if (!(_i < poolsWithSettlementSettings_1.length)) return [3 /*break*/, 9];
                    poolConfig = poolsWithSettlementSettings_1[_i];
                    pool = poolMap.get(poolConfig.address);
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 7, , 8]);
                    logging_1.logger.debug("Processing settlement check for pool: ".concat(pool.name));
                    return [4 /*yield*/, (0, settlement_1.handleSettlements)({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            config: {
                                dryRun: config.dryRun,
                                subgraphUrl: config.subgraphUrl,
                                delayBetweenActions: config.delayBetweenActions
                            }
                        })];
                case 5:
                    _b.sent();
                    logging_1.logger.debug("Settlement check completed for pool: ".concat(pool.name));
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    poolError_1 = _b.sent();
                    logging_1.logger.error("Failed to handle settlements for pool: ".concat(pool.name), poolError_1);
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    settlementCheckInterval = Math.max(config.delayBetweenRuns * 5, // 5x normal delay 
                    120000 // Minimum 120 seconds between settlement checks
                    );
                    nextCheck = new Date(Date.now() + settlementCheckInterval).toISOString();
                    logging_1.logger.debug("Settlement loop completed, sleeping for ".concat(settlementCheckInterval / 1000, "s until ").concat(nextCheck));
                    return [4 /*yield*/, (0, utils_1.delay)(settlementCheckInterval)];
                case 10:
                    _b.sent();
                    return [3 /*break*/, 13];
                case 11:
                    outerError_1 = _b.sent();
                    errorMessage = outerError_1 instanceof Error ? outerError_1.message : String(outerError_1);
                    errorStack = outerError_1 instanceof Error ? outerError_1.stack : undefined;
                    logging_1.logger.error("Settlement loop crashed, restarting in 30 seconds: ".concat(errorMessage));
                    if (errorStack) {
                        logging_1.logger.error("Stack trace:", errorStack);
                    }
                    // Wait 30 seconds before restarting the loop to prevent rapid crash loops
                    return [4 /*yield*/, (0, utils_1.delay)(30000)];
                case 12:
                    // Wait 30 seconds before restarting the loop to prevent rapid crash loops
                    _b.sent();
                    logging_1.logger.info("Restarting settlement loop after crash recovery delay");
                    return [3 /*break*/, 13];
                case 13: return [3 /*break*/, 1];
                case 14: return [2 /*return*/];
            }
        });
    });
}
function hasSettlementSettings(config) {
    var _a;
    return !!((_a = config.settlement) === null || _a === void 0 ? void 0 : _a.enabled);
}
function collectLpRewardsLoop(_a) {
    var _b, _c;
    var poolMap = _a.poolMap, config = _a.config, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var poolsWithCollectLpSettings, lpCollectors, dexRouter, exchangeTracker, _i, poolsWithCollectLpSettings_1, poolConfig, pool, collector, _d, poolsWithCollectLpSettings_2, poolConfig, collector, error_4, pool, errorMessage, settled, settlementError_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    poolsWithCollectLpSettings = config.pools.filter(hasCollectLpSettings);
                    lpCollectors = new Map();
                    dexRouter = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: (_b = config === null || config === void 0 ? void 0 : config.oneInchRouters) !== null && _b !== void 0 ? _b : {},
                        connectorTokens: (_c = config === null || config === void 0 ? void 0 : config.connectorTokens) !== null && _c !== void 0 ? _c : [],
                    });
                    exchangeTracker = new reward_action_tracker_1.RewardActionTracker(signer, config, dexRouter);
                    _i = 0, poolsWithCollectLpSettings_1 = poolsWithCollectLpSettings;
                    _e.label = 1;
                case 1:
                    if (!(_i < poolsWithCollectLpSettings_1.length)) return [3 /*break*/, 4];
                    poolConfig = poolsWithCollectLpSettings_1[_i];
                    pool = poolMap.get(poolConfig.address);
                    collector = new collect_lp_1.LpCollector(pool, signer, poolConfig, config, exchangeTracker);
                    lpCollectors.set(poolConfig.address, collector);
                    return [4 /*yield*/, collector.startSubscription()];
                case 2:
                    _e.sent();
                    _e.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    if (!true) return [3 /*break*/, 24];
                    _d = 0, poolsWithCollectLpSettings_2 = poolsWithCollectLpSettings;
                    _e.label = 5;
                case 5:
                    if (!(_d < poolsWithCollectLpSettings_2.length)) return [3 /*break*/, 21];
                    poolConfig = poolsWithCollectLpSettings_2[_d];
                    collector = lpCollectors.get(poolConfig.address);
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 9, , 20]);
                    return [4 /*yield*/, collector.collectLpRewards()];
                case 7:
                    _e.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 8:
                    _e.sent();
                    return [3 /*break*/, 20];
                case 9:
                    error_4 = _e.sent();
                    pool = poolMap.get(poolConfig.address);
                    errorMessage = error_4 instanceof Error ? error_4.message : String(error_4);
                    if (!errorMessage.includes("AuctionNotCleared")) return [3 /*break*/, 18];
                    logging_1.logger.info("AuctionNotCleared detected - attempting settlement for ".concat(pool.name));
                    _e.label = 10;
                case 10:
                    _e.trys.push([10, 16, , 17]);
                    return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            config: {
                                dryRun: config.dryRun,
                                subgraphUrl: config.subgraphUrl,
                                delayBetweenActions: config.delayBetweenActions
                            }
                        })];
                case 11:
                    settled = _e.sent();
                    if (!settled) return [3 /*break*/, 14];
                    logging_1.logger.info("Retrying LP collection after settlement in ".concat(pool.name));
                    return [4 /*yield*/, collector.collectLpRewards()];
                case 12:
                    _e.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 13:
                    _e.sent();
                    return [3 /*break*/, 15];
                case 14:
                    logging_1.logger.warn("Settlement attempted but bonds still locked in ".concat(pool.name));
                    _e.label = 15;
                case 15: return [3 /*break*/, 17];
                case 16:
                    settlementError_1 = _e.sent();
                    logging_1.logger.error("Settlement failed for ".concat(pool.name, ":"), settlementError_1);
                    return [3 /*break*/, 17];
                case 17: return [3 /*break*/, 19];
                case 18:
                    // Handle all other errors normally
                    logging_1.logger.error("Failed to collect LP reward from pool: ".concat(pool.name, "."), error_4);
                    _e.label = 19;
                case 19: return [3 /*break*/, 20];
                case 20:
                    _d++;
                    return [3 /*break*/, 5];
                case 21: return [4 /*yield*/, exchangeTracker.handleAllTokens()];
                case 22:
                    _e.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenRuns)];
                case 23:
                    _e.sent();
                    return [3 /*break*/, 4];
                case 24: return [2 /*return*/];
            }
        });
    });
}
function hasCollectLpSettings(config) {
    return !!config.collectLpReward;
}
//# sourceMappingURL=run.js.map