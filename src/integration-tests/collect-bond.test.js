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
Object.defineProperty(exports, "__esModule", { value: true });
require("./subgraph-mock");
var sdk_1 = require("@ajna-finance/sdk");
var test_config_1 = require("./test-config");
var config_types_1 = require("../config-types");
var test_utils_1 = require("./test-utils");
var subgraph_mock_1 = require("./subgraph-mock");
var chai_1 = require("chai");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
var collect_bond_1 = require("../collect-bond");
var kick_1 = require("../kick");
var take_1 = require("../take");
var nonce_1 = require("../nonce");
var constants_1 = require("../constants");
var getAmountWithdrawn = function (pool, signer) { return __awaiter(void 0, void 0, void 0, function () {
    var signerAddress, poolContract, bondEvtFilter, evts, amountWithdrawn;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, signer.getAddress()];
            case 1:
                signerAddress = _a.sent();
                poolContract = sdk_1.ERC20Pool__factory.connect(pool.poolAddress, signer);
                bondEvtFilter = poolContract.filters.BondWithdrawn(signerAddress);
                return [4 /*yield*/, poolContract.queryFilter(bondEvtFilter, test_config_1.MAINNET_CONFIG.BLOCK_NUMBER)];
            case 2:
                evts = _a.sent();
                amountWithdrawn = evts.reduce(function (sum, evt) { return sum + (0, utils_1.weiToDecimaled)(evt.args.amount); }, 0);
                return [2 /*return*/, amountWithdrawn];
        }
    });
}); };
var setup = function () { return __awaiter(void 0, void 0, void 0, function () {
    var ajna, pool;
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
                return [2 /*return*/, pool];
        }
    });
}); };
describe('collectBondFromPool', function () {
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
    it('Does nothing when there is no bond', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, amtWithdraw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 2:
                    signer = _a.sent();
                    return [4 /*yield*/, (0, collect_bond_1.collectBondFromPool)({
                            signer: signer,
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { settlement: {
                                    enabled: true,
                                    minAuctionAge: 3600,
                                    maxBucketDepth: 50,
                                    maxIterations: 10,
                                    checkBotIncentive: false,
                                } }),
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            }
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, getAmountWithdrawn(pool, signer)];
                case 4:
                    amtWithdraw = _a.sent();
                    (0, chai_1.expect)(amtWithdraw).equals(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('Does nothing when there is a locked bond', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, amtWithdraw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 2:
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
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, collect_bond_1.collectBondFromPool)({
                            signer: signer,
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { settlement: {
                                    enabled: true,
                                    minAuctionAge: 3600,
                                    maxBucketDepth: 50,
                                    maxIterations: 10,
                                    checkBotIncentive: false,
                                } }),
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            }
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, getAmountWithdrawn(pool, signer)];
                case 5:
                    amtWithdraw = _a.sent();
                    (0, chai_1.expect)(amtWithdraw).equals(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('Collects bond when a bond is available', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, liquidation, settleTx, amtWithdrawn;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 2:
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
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 2)];
                case 4:
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
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 2)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, pool.getLiquidation(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 7:
                    liquidation = _a.sent();
                    return [4 /*yield*/, liquidation.settle(signer)];
                case 8:
                    settleTx = _a.sent();
                    return [4 /*yield*/, settleTx.verifyAndSubmit()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, (0, collect_bond_1.collectBondFromPool)({
                            signer: signer,
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { settlement: {
                                    enabled: true,
                                    minAuctionAge: 3600,
                                    maxBucketDepth: 50,
                                    maxIterations: 10,
                                    checkBotIncentive: false,
                                } }),
                            config: {
                                dryRun: false,
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            }
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, getAmountWithdrawn(pool, signer)];
                case 12:
                    amtWithdrawn = _a.sent();
                    (0, chai_1.expect)(amtWithdrawn).greaterThan(0);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=collect-bond.test.js.map