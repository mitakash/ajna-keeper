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
var loan_helpers_1 = require("./loan-helpers");
var subgraph_mock_1 = require("./subgraph-mock");
var chai_1 = require("chai");
var utils_1 = require("../utils");
var ethers_1 = require("ethers");
var erc20_1 = require("../erc20");
var constants_1 = require("../constants");
describe('getLoansToKick', function () {
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
    it('Returns empty array when all loans are in good health.', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, loansToKick;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
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
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, kick_1.getLoansToKick)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            config: {
                                subgraphUrl: '',
                                coinGeckoApiKey: '',
                            },
                        }))];
                case 4:
                    loansToKick = _a.sent();
                    (0, chai_1.expect)(loansToKick).to.be.empty;
                    return [2 /*return*/];
            }
        });
    }); });
    it('Returns loan when loan is in bad health', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, loansToKick;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
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
                    (0, chai_1.expect)(loansToKick.length).equals(1);
                    (0, chai_1.expect)(loansToKick[0].borrower).equals(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('kick', function () {
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
    it('Kicks loan', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, loansToKick, signer, loan;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
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
                    return [4 /*yield*/, pool.getLoan(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 8:
                    loan = _a.sent();
                    (0, chai_1.expect)(loan.isKicked).to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('approveBalanceForLoanToKick', function () {
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
    it('Fails when there is insufficient balance', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, quoteWhaleSigner, signer, loanToKick, approved, allowance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress)];
                case 2:
                    quoteWhaleSigner = _a.sent();
                    signer = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(signer.address, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, erc20_1.transferErc20)(quoteWhaleSigner, pool.quoteAddress, signer.address, (0, utils_1.decimaledToWei)(1))];
                case 5:
                    _a.sent();
                    loanToKick = {
                        borrower: '0x0000000000000000000000000000000000000000',
                        liquidationBond: (0, utils_1.decimaledToWei)(10),
                        estimatedRemainingBond: (0, utils_1.decimaledToWei)(50),
                        limitPrice: 1,
                    };
                    return [4 /*yield*/, (0, kick_1.approveBalanceForLoanToKick)({
                            pool: pool,
                            signer: signer,
                            loanToKick: loanToKick,
                        })];
                case 6:
                    approved = _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.quoteAddress, pool.poolAddress)];
                case 7:
                    allowance = _a.sent();
                    (0, chai_1.expect)(approved).to.be.false;
                    (0, chai_1.expect)(allowance.eq(ethers_1.constants.Zero)).to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
    it('Approves bond when there is sufficient balance for one bond', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, quoteWhaleSigner, signer, loanToKick, approved, allowance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress)];
                case 2:
                    quoteWhaleSigner = _a.sent();
                    signer = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(signer.address, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, erc20_1.transferErc20)(quoteWhaleSigner, pool.quoteAddress, signer.address, (0, utils_1.decimaledToWei)(20))];
                case 5:
                    _a.sent();
                    loanToKick = {
                        borrower: '0x0000000000000000000000000000000000000000',
                        liquidationBond: (0, utils_1.decimaledToWei)(10),
                        estimatedRemainingBond: (0, utils_1.decimaledToWei)(50),
                        limitPrice: 1,
                    };
                    return [4 /*yield*/, (0, kick_1.approveBalanceForLoanToKick)({
                            pool: pool,
                            signer: signer,
                            loanToKick: loanToKick,
                        })];
                case 6:
                    approved = _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.quoteAddress, pool.poolAddress)];
                case 7:
                    allowance = _a.sent();
                    (0, chai_1.expect)(approved, 'approval returns true').to.be.true;
                    (0, chai_1.expect)(allowance.gte((0, utils_1.decimaledToWei)(10)) && allowance.lte((0, utils_1.decimaledToWei)(11)), 'allowance is roughly 10 WETH').to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
    it('Approves bond when there is sufficient balance for all bonds', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, pool, quoteWhaleSigner, signer, loanToKick, approved, allowance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress)];
                case 2:
                    quoteWhaleSigner = _a.sent();
                    signer = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(signer.address, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress, (0, utils_1.decimaledToWei)(100).toHexString())];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, erc20_1.transferErc20)(quoteWhaleSigner, pool.quoteAddress, signer.address, (0, utils_1.decimaledToWei)(60))];
                case 5:
                    _a.sent();
                    loanToKick = {
                        borrower: '0x0000000000000000000000000000000000000000',
                        liquidationBond: (0, utils_1.decimaledToWei)(10),
                        estimatedRemainingBond: (0, utils_1.decimaledToWei)(50),
                        limitPrice: 1,
                    };
                    return [4 /*yield*/, (0, kick_1.approveBalanceForLoanToKick)({
                            pool: pool,
                            signer: signer,
                            loanToKick: loanToKick,
                        })];
                case 6:
                    approved = _a.sent();
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.quoteAddress, pool.poolAddress)];
                case 7:
                    allowance = _a.sent();
                    (0, chai_1.expect)(approved, 'approval returns true').to.be.true;
                    (0, chai_1.expect)(allowance.gte((0, utils_1.decimaledToWei)(50)) && allowance.lt((0, utils_1.decimaledToWei)(51)), 'Allowance is roughly 50 Weth').to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=kick.test.js.map