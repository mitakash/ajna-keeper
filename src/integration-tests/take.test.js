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
require("./subgraph-mock");
var kick_1 = require("../kick");
var sdk_1 = require("@ajna-finance/sdk");
var test_config_1 = require("./test-config");
var config_types_1 = require("../config-types");
var test_utils_1 = require("./test-utils");
var subgraph_mock_1 = require("./subgraph-mock");
var chai_1 = require("chai");
var take_1 = require("../take");
var ethers_1 = require("ethers");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
var constants_1 = require("../constants");
var nonce_1 = require("../nonce");
var setup = function () { return __awaiter(void 0, void 0, void 0, function () {
    var ajna, pool, loansToKick, signer;
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
                return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, kick_1.getLoansToKick)({
                        pool: pool,
                        poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                        config: {
                            subgraphUrl: '',
                            coinGeckoApiKey: '',
                        },
                    }))];
            case 5:
                loansToKick = _a.sent();
                return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
            case 6:
                signer = _a.sent();
                (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2, '100000000000000000000');
                return [4 /*yield*/, (0, kick_1.kick)({
                        pool: pool,
                        signer: signer,
                        loanToKick: loansToKick[0],
                        config: {
                            dryRun: false,
                        },
                    })];
            case 7:
                _a.sent();
                return [2 /*return*/, { pool: pool, signer: signer }];
        }
    });
}); };
describe('getLiquidationsToArbTake', function () {
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
    it('gets nothing when there arent any kicked loans', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, pool, signer, liquidationsToArbTake;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    _a = _b.sent(), pool = _a.pool, signer = _a.signer;
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                subgraphUrl: '',
                                oneInchRouters: {},
                                connectorTokens: [],
                            },
                        }))];
                case 2:
                    liquidationsToArbTake = _b.sent();
                    (0, chai_1.expect)(liquidationsToArbTake).to.be.empty;
                    return [2 /*return*/];
            }
        });
    }); });
    it('gets loans when there are kicked loans', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, pool, signer, liquidationsToArbTake;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    _a = _b.sent(), pool = _a.pool, signer = _a.signer;
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                subgraphUrl: '',
                                oneInchRouters: {},
                                connectorTokens: [],
                            },
                        }))];
                case 3:
                    liquidationsToArbTake = _b.sent();
                    (0, chai_1.expect)(liquidationsToArbTake.length).equals(1);
                    (0, chai_1.expect)(liquidationsToArbTake[0].borrower).equals(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('arbTakeLiquidation', function () {
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
    it('ArbTakes eligible liquidations and earns lpb', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, signer, liquidationsToArbTake, bucket, loan, lpBalance, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, setup()];
                case 1:
                    pool = (_c.sent()).pool;
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1)];
                case 2:
                    _c.sent(); // Increase timestamp by 1 day.
                    signer = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)());
                    (0, test_utils_1.setBalance)(signer.address, (0, utils_1.decimaledToWei)(100).toHexString());
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                subgraphUrl: '',
                                oneInchRouters: {},
                                connectorTokens: [],
                            },
                        }))];
                case 3:
                    liquidationsToArbTake = _c.sent();
                    return [4 /*yield*/, (0, take_1.arbTakeLiquidation)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            signer: signer,
                            config: {
                                dryRun: false,
                            },
                            liquidation: liquidationsToArbTake[0],
                        })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, pool.getBucketByIndex(liquidationsToArbTake[0].hpbIndex)];
                case 5:
                    bucket = _c.sent();
                    return [4 /*yield*/, pool.getLoan(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 6:
                    loan = _c.sent();
                    _b = (_a = bucket).lpBalance;
                    return [4 /*yield*/, signer.getAddress()];
                case 7: return [4 /*yield*/, _b.apply(_a, [_c.sent()])];
                case 8:
                    lpBalance = _c.sent();
                    (0, chai_1.expect)((0, utils_1.weiToDecimaled)(lpBalance)).to.be.greaterThan(0);
                    (0, chai_1.expect)((0, utils_1.weiToDecimaled)(loan.collateral)).equals(0);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('handleTakesWith1inch', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    nonce_1.NonceTracker.clearNonces();
                    return [2 /*return*/];
            }
        });
    }); });
    it('ArbTakes multiple times to fill multiple buckets in one auction.', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, bucket1, bucket2, signer, AUCTION_WAIT_TIME, bucket1Status, bucket2Status;
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
                    bucket1 = pool.getBucketByPrice((0, utils_1.decimaledToWei)(1));
                    bucket2 = pool.getBucketByIndex(bucket1.index + 1);
                    return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                            amount: 1,
                            price: (0, utils_1.weiToDecimaled)(bucket1.price),
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                            amount: 1,
                            price: (0, utils_1.weiToDecimaled)(bucket2.price),
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                            amountToBorrow: 1.5,
                            collateralToPledge: 1.6,
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_YEAR * 2)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 6:
                    signer = _a.sent();
                    (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2, '100000000000000000000');
                    return [4 /*yield*/, (0, kick_1.handleKicks)({
                            signer: signer,
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            config: {
                                subgraphUrl: '',
                                coinGeckoApiKey: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 7:
                    _a.sent();
                    AUCTION_WAIT_TIME = 60 * 20 * 6 + 2 * 2 * 60 * 60 + 50 * 60;
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(AUCTION_WAIT_TIME)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            signer: signer,
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            config: {
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, bucket1.getStatus()];
                case 10:
                    bucket1Status = _a.sent();
                    (0, chai_1.expect)((0, utils_1.weiToDecimaled)(bucket1Status.deposit)).lessThan(1e-7, 'Bucket 1 should only have dust remaining');
                    return [4 /*yield*/, (0, take_1.handleTakesWith1inch)({
                            signer: signer,
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            config: {
                                subgraphUrl: '',
                                delayBetweenActions: 0,
                            },
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, bucket2.getStatus()];
                case 12:
                    bucket2Status = _a.sent();
                    (0, chai_1.expect)((0, utils_1.weiToDecimaled)(bucket2Status.deposit)).lessThan(0.8, 'Bucket 2 should have less deposit than it started with.');
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=take.test.js.map