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
var sdk_1 = require("@ajna-finance/sdk");
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var collect_lp_1 = require("../collect-lp");
var config_types_1 = require("../config-types");
var dex_router_1 = require("../dex-router");
var erc20_1 = require("../erc20");
var kick_1 = require("../kick");
var nonce_1 = require("../nonce");
var reward_action_tracker_1 = require("../reward-action-tracker");
var take_1 = require("../take");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
require("./subgraph-mock");
var subgraph_mock_1 = require("./subgraph-mock");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var constants_1 = require("../constants");
var setup = function () { return __awaiter(void 0, void 0, void 0, function () {
    var ajna, pool, signer;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
            case 1:
                pool = _a.sent();
                (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
                (0, subgraph_mock_1.overrideGetLiquidations)((0, subgraph_mock_1.makeGetLiquidationsFromSdk)(pool));
                (0, subgraph_mock_1.overrideGetHighestMeaningfulBucket)((0, subgraph_mock_1.makeGetHighestMeaningfulBucket)(pool));
                return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                        pool: pool,
                        owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                        amount: 1,
                        price: 0.07,
                    })];
            case 2:
                _a.sent();
                return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                        pool: pool,
                        owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                        amountToBorrow: 0.9,
                        collateralToPledge: 14,
                    })];
            case 3:
                _a.sent();
                return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_YEAR * 2)];
            case 4:
                _a.sent();
                return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
            case 5:
                signer = _a.sent();
                return [4 /*yield*/, (0, kick_1.handleKicks)({
                        pool: pool,
                        poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                        signer: signer,
                        config: {
                            dryRun: false,
                            subgraphUrl: '',
                            coinGeckoApiKey: '',
                            delayBetweenActions: 0,
                        },
                    })];
            case 6:
                _a.sent();
                return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1.5)];
            case 7:
                _a.sent();
                return [2 /*return*/, pool];
        }
    });
}); };
describe('LpCollector subscription', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Tracks taker reward after BucketTake', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, dexRouter, lpCollector;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2)];
                case 2:
                    signer = _a.sent();
                    dexRouter = new dex_router_1.DexRouter(signer);
                    lpCollector = new collect_lp_1.LpCollector(pool, signer, {
                        collectLpReward: {
                            redeemFirst: config_types_1.TokenToCollect.QUOTE,
                            minAmountQuote: 0,
                            minAmountCollateral: 0,
                        },
                    }, {}, new reward_action_tracker_1.RewardActionTracker(signer, {
                        uniswapOverrides: {
                            wethAddress: test_config_1.MAINNET_CONFIG.WETH_ADDRESS,
                            uniswapV3Router: test_config_1.MAINNET_CONFIG.UNISWAP_V3_ROUTER,
                        },
                        delayBetweenActions: 0,
                        pools: [],
                    }, dexRouter));
                    return [4 /*yield*/, lpCollector.startSubscription()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var entries, rewardLp;
                            var _a;
                            return __generator(this, function (_b) {
                                entries = Array.from(lpCollector.lpMap.entries());
                                rewardLp = (_a = entries === null || entries === void 0 ? void 0 : entries[0]) === null || _a === void 0 ? void 0 : _a[1];
                                return [2 /*return*/, !!rewardLp && rewardLp.gt(ethers_1.constants.Zero)];
                            });
                        }); })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, lpCollector.stopSubscription()];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Does not track bucket takes of other users', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, wallet, noActionSigner, dexRouter, lpCollector, takerSigner, entries;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    wallet = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC);
                    noActionSigner = wallet.connect((0, test_utils_1.getProvider)());
                    dexRouter = new dex_router_1.DexRouter(noActionSigner);
                    lpCollector = new collect_lp_1.LpCollector(pool, noActionSigner, {
                        collectLpReward: {
                            redeemFirst: config_types_1.TokenToCollect.QUOTE,
                            minAmountQuote: 0,
                            minAmountCollateral: 0,
                        },
                    }, {}, new reward_action_tracker_1.RewardActionTracker(noActionSigner, {
                        uniswapOverrides: {
                            wethAddress: test_config_1.MAINNET_CONFIG.WETH_ADDRESS,
                            uniswapV3Router: test_config_1.MAINNET_CONFIG.UNISWAP_V3_ROUTER,
                        },
                        delayBetweenActions: 0,
                        pools: [],
                    }, dexRouter));
                    return [4 /*yield*/, lpCollector.startSubscription()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 3:
                    takerSigner = _a.sent();
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: takerSigner,
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(5)];
                case 5:
                    _a.sent();
                    entries = Array.from(lpCollector.lpMap.entries());
                    (0, chai_1.expect)(entries.length).equals(0);
                    return [4 /*yield*/, lpCollector.stopSubscription()];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Tracks rewards for kicker', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, kickerSigner, dexRouter, lpCollector, takerSigner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 2:
                    kickerSigner = _a.sent();
                    dexRouter = new dex_router_1.DexRouter(kickerSigner);
                    lpCollector = new collect_lp_1.LpCollector(pool, kickerSigner, {
                        collectLpReward: {
                            redeemFirst: config_types_1.TokenToCollect.QUOTE,
                            minAmountQuote: 0,
                            minAmountCollateral: 0,
                        },
                    }, {}, new reward_action_tracker_1.RewardActionTracker(kickerSigner, {
                        uniswapOverrides: {
                            wethAddress: test_config_1.MAINNET_CONFIG.WETH_ADDRESS,
                            uniswapV3Router: test_config_1.MAINNET_CONFIG.UNISWAP_V3_ROUTER,
                        },
                        delayBetweenActions: 0,
                        pools: [],
                    }, dexRouter));
                    return [4 /*yield*/, lpCollector.startSubscription()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(5)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2)];
                case 5:
                    takerSigner = _a.sent();
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: takerSigner,
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var entries, rewardLp;
                            var _a;
                            return __generator(this, function (_b) {
                                entries = Array.from(lpCollector.lpMap.entries());
                                rewardLp = (_a = entries === null || entries === void 0 ? void 0 : entries[0]) === null || _a === void 0 ? void 0 : _a[1];
                                return [2 /*return*/, !!rewardLp && rewardLp.gt(ethers_1.constants.Zero)];
                            });
                        }); })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, lpCollector.stopSubscription()];
                case 8:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('LpCollector collections', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: Refactor this into two tests, one redeeming quote first and another redeeming collateral first
    it('Collects tracked rewards', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, dexRouter, lpCollector, liquidation, settleTx, balanceBeforeCollection, balanceAfterCollection;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 2:
                    signer = _a.sent();
                    dexRouter = new dex_router_1.DexRouter(signer);
                    lpCollector = new collect_lp_1.LpCollector(pool, signer, {
                        collectLpReward: {
                            redeemFirst: config_types_1.TokenToCollect.QUOTE,
                            minAmountQuote: 0,
                            minAmountCollateral: 0,
                        },
                    }, {}, new reward_action_tracker_1.RewardActionTracker(signer, {
                        uniswapOverrides: {
                            wethAddress: test_config_1.MAINNET_CONFIG.WETH_ADDRESS,
                            uniswapV3Router: test_config_1.MAINNET_CONFIG.UNISWAP_V3_ROUTER,
                        },
                        delayBetweenActions: 0,
                        pools: [],
                    }, dexRouter));
                    return [4 /*yield*/, lpCollector.startSubscription()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var entries, rewardLp;
                            var _a;
                            return __generator(this, function (_b) {
                                entries = Array.from(lpCollector.lpMap.entries());
                                rewardLp = (_a = entries === null || entries === void 0 ? void 0 : entries[0]) === null || _a === void 0 ? void 0 : _a[1];
                                return [2 /*return*/, !!rewardLp && rewardLp.gt(ethers_1.constants.Zero)];
                            });
                        }); })];
                case 5:
                    _a.sent();
                    liquidation = pool.getLiquidation(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress);
                    return [4 /*yield*/, liquidation.settle(signer)];
                case 6:
                    settleTx = _a.sent();
                    return [4 /*yield*/, settleTx.verifyAndSubmit()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(signer, pool.quoteAddress)];
                case 9:
                    balanceBeforeCollection = _a.sent();
                    return [4 /*yield*/, lpCollector.collectLpRewards()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(signer, pool.quoteAddress)];
                case 11:
                    balanceAfterCollection = _a.sent();
                    (0, chai_1.expect)(balanceAfterCollection.gt(balanceBeforeCollection)).to.be.true;
                    return [4 /*yield*/, lpCollector.stopSubscription()];
                case 12:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=collect-lp.test.js.map