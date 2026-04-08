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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var sdk_1 = require("@ajna-finance/sdk");
var axios_1 = __importDefault(require("axios"));
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var sinon_1 = __importDefault(require("sinon"));
var contracts_1 = require("../../typechain-types/factories/contracts");
var oneInch = __importStar(require("../1inch"));
var erc20_abi_json_1 = __importDefault(require("../abis/erc20.abi.json"));
var config_types_1 = require("../config-types");
var constants_1 = require("../constants");
var kick_1 = require("../kick");
var take_1 = require("../take");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
require("./subgraph-mock");
var subgraph_mock_1 = require("./subgraph-mock");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
describe('Take with 1inch Integration', function () {
    var provider;
    var axiosGetStub;
    var pool;
    var signer;
    var keeperTakerAddress;
    var borrower;
    var quoteToken;
    var collateralToken;
    var ONE_INCH_QUOTE_RESPONSE = {
        dstAmount: '1000000000000000000',
    };
    var ONE_INCH_SWAP_RESPONSE = {
        tx: {
            to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
            data: '0x12345678deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            value: '0',
            gas: '200000',
        },
    };
    before(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.ONEINCH_API = 'https://api.1inch.io/v6.0';
                    process.env.ONEINCH_API_KEY = 'mock_api_key';
                    provider = (0, test_utils_1.getProvider)();
                    return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var ajna, keeperTakerFactory, address, keeperTaker, signerAddress, quoteWhaleSigner, collateralWhaleSigner, loansToKick, kickSigner;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    axiosGetStub = sinon_1.default.stub(axios_1.default, 'get');
                    axiosGetStub
                        .withArgs(sinon_1.default.match(/\/quote$/), sinon_1.default.match.any)
                        .callsFake(function () { return Promise.resolve({ data: ONE_INCH_QUOTE_RESPONSE }); });
                    axiosGetStub
                        .withArgs(sinon_1.default.match(/\/swap$/), sinon_1.default.match.any)
                        .callsFake(function () { return Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE }); });
                    sinon_1.default
                        .stub(oneInch, 'convertSwapApiResponseToDetailsBytes')
                        .callsFake(function () {
                        var details = {
                            aggregationExecutor: '0x6956C0a5DFE1Ea7Bf71422EaCb6e9D85F7607176',
                            swapDescription: {
                                srcToken: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
                                dstToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                                srcReceiver: '0x1111111254EEB25477B68fb85Ed929f73A960582',
                                dstReceiver: keeperTakerAddress,
                                amount: ethers_1.BigNumber.from('14000000000000000000'),
                                minReturnAmount: ethers_1.BigNumber.from('1000000000000000000'),
                                flags: ethers_1.BigNumber.from('0'),
                            },
                            opaqueData: '0xa9059cbb000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a7640000',
                        };
                        return ethers_1.utils.defaultAbiCoder.encode([
                            '(address,(address,address,address,address,uint256,uint256,uint256),bytes)',
                        ], [
                            [
                                details.aggregationExecutor,
                                [
                                    details.swapDescription.srcToken,
                                    details.swapDescription.dstToken,
                                    details.swapDescription.srcReceiver,
                                    details.swapDescription.dstReceiver,
                                    details.swapDescription.amount,
                                    details.swapDescription.minReturnAmount,
                                    details.swapDescription.flags,
                                ],
                                details.opaqueData,
                            ],
                        ]);
                    });
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK(provider);
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 2:
                    pool = _a.sent();
                    (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
                    (0, subgraph_mock_1.overrideGetLiquidations)((0, subgraph_mock_1.makeGetLiquidationsFromSdk)(pool));
                    (0, subgraph_mock_1.overrideGetHighestMeaningfulBucket)((0, subgraph_mock_1.makeGetHighestMeaningfulBucket)(pool));
                    signer = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect(provider);
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(signer.address, ethers_1.utils.parseEther('100').toHexString())];
                case 3:
                    _a.sent();
                    keeperTakerFactory = new contracts_1.AjnaKeeperTaker__factory(signer);
                    return [4 /*yield*/, signer.getAddress()];
                case 4:
                    address = _a.sent();
                    return [4 /*yield*/, keeperTakerFactory.deploy(address)];
                case 5:
                    keeperTaker = _a.sent();
                    return [4 /*yield*/, keeperTaker.deployed()];
                case 6:
                    _a.sent();
                    keeperTakerAddress = keeperTaker.address;
                    quoteToken = new ethers_1.Contract(pool.quoteAddress, erc20_abi_json_1.default, provider);
                    collateralToken = new ethers_1.Contract(pool.collateralAddress, erc20_abi_json_1.default, provider);
                    return [4 /*yield*/, signer.getAddress()];
                case 7:
                    signerAddress = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(signerAddress, ethers_1.utils.parseEther('100').toHexString())];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(keeperTakerAddress, ethers_1.utils.parseEther('100').toHexString())];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress)];
                case 10:
                    quoteWhaleSigner = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress, ethers_1.utils.parseEther('1000').toHexString())];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, quoteToken
                            .connect(quoteWhaleSigner)
                            .approve(keeperTakerAddress, ethers_1.ethers.constants.MaxUint256)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, quoteToken
                            .connect(quoteWhaleSigner)
                            .approve(pool.poolAddress, ethers_1.ethers.constants.MaxUint256)];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 14:
                    collateralWhaleSigner = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress, ethers_1.utils.parseEther('1000').toHexString())];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, collateralToken
                            .connect(collateralWhaleSigner)
                            .approve(keeperTakerAddress, ethers_1.ethers.constants.MaxUint256)];
                case 16:
                    _a.sent();
                    return [4 /*yield*/, collateralToken
                            .connect(collateralWhaleSigner)
                            .approve(pool.poolAddress, ethers_1.ethers.constants.MaxUint256)];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                            amount: 1,
                            price: 0.07,
                        })];
                case 18:
                    _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                            amountToBorrow: 0.9,
                            collateralToPledge: 14,
                        })];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 365 * 2)];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, kick_1.getLoansToKick)({
                            pool: pool,
                            poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                            config: {
                                subgraphUrl: '',
                                coinGeckoApiKey: '',
                            },
                        }))];
                case 21:
                    loansToKick = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 22:
                    kickSigner = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2, ethers_1.utils.parseEther('100').toHexString())];
                case 23:
                    _a.sent();
                    return [4 /*yield*/, (0, kick_1.kick)({
                            pool: pool,
                            signer: kickSigner,
                            loanToKick: loansToKick[0],
                            config: {
                                dryRun: false,
                            },
                        })];
                case 24:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1)];
                case 25:
                    _a.sent();
                    borrower = test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it.skip('should deploy AjnaKeeperTaker and setup environment', function () { return __awaiter(void 0, void 0, void 0, function () {
        var keeperTaker, _a, liquidationStatus;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    (0, chai_1.expect)(pool.poolAddress).to.equal(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address);
                    (0, chai_1.expect)(signer.address).to.match(/^0x[a-fA-F0-9]{40}$/);
                    (0, chai_1.expect)(keeperTakerAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
                    (0, chai_1.expect)(borrower).to.match(/^0x[a-fA-F0-9]{40}$/);
                    keeperTaker = contracts_1.AjnaKeeperTaker__factory.connect(keeperTakerAddress, signer);
                    _a = chai_1.expect;
                    return [4 /*yield*/, keeperTaker.signer.getAddress()];
                case 1:
                    _a.apply(void 0, [_b.sent()]).to.equal(signer.address);
                    return [4 /*yield*/, pool.getLiquidation(borrower).getStatus()];
                case 2:
                    liquidationStatus = _b.sent();
                    (0, chai_1.expect)(liquidationStatus.collateral.toString()).to.equal('14000000000000000000');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not take liquidation when price is too high', function () { return __awaiter(void 0, void 0, void 0, function () {
        var liquidations;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                        pool: pool,
                        poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 1e-8,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.01,
                                hpbPriceFactor: undefined,
                            } }),
                        signer: signer,
                        config: {
                            subgraphUrl: '',
                            oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                            connectorTokens: [],
                            delayBetweenActions: 1,
                        },
                    }))];
                case 1:
                    liquidations = _a.sent();
                    (0, chai_1.expect)(liquidations.length).to.equal(0);
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: Last transaction fails with revert
    it.skip('should take liquidation when price is appropriate and earn quote tokens', function () { return __awaiter(void 0, void 0, void 0, function () {
        var initialBalance, liquidations, finalBalance, liquidationStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, quoteToken.balanceOf(signer.address)];
                case 1:
                    initialBalance = _a.sent();
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                    minCollateral: 1e-8,
                                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                    marketPriceFactor: 1000000,
                                    hpbPriceFactor: undefined,
                                } }),
                            signer: signer,
                            config: {
                                subgraphUrl: '',
                                oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                                connectorTokens: [],
                                delayBetweenActions: 1,
                            },
                        }))];
                case 2:
                    liquidations = _a.sent();
                    (0, chai_1.expect)(liquidations.length).to.equal(1);
                    (0, chai_1.expect)(liquidations[0].takeStrategy).to.equal(1);
                    return [4 /*yield*/, (0, take_1.takeLiquidation)({
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                    minCollateral: 1e-8,
                                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                    marketPriceFactor: 1000000,
                                } }),
                            signer: signer,
                            liquidation: liquidations[0],
                            config: {
                                dryRun: false,
                                oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                                connectorTokens: [],
                                keeperTaker: keeperTakerAddress,
                                delayBetweenActions: 1,
                            },
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, quoteToken.balanceOf(signer.address)];
                case 4:
                    finalBalance = _a.sent();
                    (0, chai_1.expect)(finalBalance.gt(initialBalance)).to.be.true;
                    return [4 /*yield*/, pool.getLiquidation(borrower).getStatus()];
                case 5:
                    liquidationStatus = _a.sent();
                    (0, chai_1.expect)(liquidationStatus.collateral).to.eq(0);
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: Last transaction fails with revert
    it.skip('should handle collateral mutation between swap and execution', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mutatedCollateral, ONE_INCH_SWAP_RESPONSE_MUTATED, liquidations, initialBalance, finalBalance, liquidationStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mutatedCollateral = ethers_1.BigNumber.from('10000000000000000000');
                    ONE_INCH_SWAP_RESPONSE_MUTATED = {
                        tx: {
                            to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
                            data: '0x12345678deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
                            value: '0',
                            gas: '200000',
                        },
                    };
                    axiosGetStub
                        .withArgs(sinon_1.default.match(/\/swap$/), sinon_1.default.match.any)
                        .callsFake(function (url, config) {
                        var amount = config.params.amount;
                        if (amount === '10000000000000000000') {
                            return Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE_MUTATED });
                        }
                        return Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE });
                    });
                    (0, subgraph_mock_1.overrideGetLiquidations)(function () {
                        return Promise.resolve({
                            pool: {
                                hpb: 0.07,
                                hpbIndex: 4689,
                                liquidationAuctions: [
                                    {
                                        borrower: borrower,
                                    },
                                ],
                            },
                        });
                    });
                    sinon_1.default.stub(pool, 'getLiquidation').returns({
                        getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        price: ethers_1.BigNumber.from('5215788124770'),
                                        collateral: mutatedCollateral,
                                    })];
                            });
                        }); },
                    });
                    return [4 /*yield*/, (0, utils_1.arrayFromAsync)((0, take_1.getLiquidationsToTake)({
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                    minCollateral: 1e-8,
                                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                    marketPriceFactor: 1000000,
                                    hpbPriceFactor: undefined,
                                } }),
                            signer: signer,
                            config: {
                                subgraphUrl: '',
                                oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                                connectorTokens: [],
                                delayBetweenActions: 1,
                            },
                        }))];
                case 1:
                    liquidations = _a.sent();
                    (0, chai_1.expect)(liquidations.length).to.equal(1);
                    (0, chai_1.expect)(liquidations[0].collateral).to.eq(mutatedCollateral);
                    return [4 /*yield*/, quoteToken.balanceOf(signer.address)];
                case 2:
                    initialBalance = _a.sent();
                    return [4 /*yield*/, (0, take_1.takeLiquidation)({
                            pool: pool,
                            poolConfig: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                    minCollateral: 1e-8,
                                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                    marketPriceFactor: 1000000,
                                } }),
                            signer: signer,
                            liquidation: liquidations[0],
                            config: {
                                dryRun: false,
                                oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                                connectorTokens: [],
                                keeperTaker: keeperTakerAddress,
                                delayBetweenActions: 1,
                            },
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, quoteToken.balanceOf(signer.address)];
                case 4:
                    finalBalance = _a.sent();
                    (0, chai_1.expect)(finalBalance.gt(initialBalance)).to.be.true;
                    return [4 /*yield*/, pool.getLiquidation(borrower).getStatus()];
                case 5:
                    liquidationStatus = _a.sent();
                    (0, chai_1.expect)(liquidationStatus.collateral).to.eq(0);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=take-1inch.test.js.map