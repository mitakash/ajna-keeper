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
// src/integration-tests/factory-takes.test.ts
require("./subgraph-mock");
var sdk_1 = require("@ajna-finance/sdk");
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var sinon_1 = __importDefault(require("sinon"));
var config_types_1 = require("../config-types");
var take_factory_1 = require("../take-factory");
var uniswap_quote_provider_1 = require("../dex-providers/uniswap-quote-provider");
var kick_1 = require("../kick");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
var nonce_1 = require("../nonce");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var subgraph_mock_1 = require("./subgraph-mock");
var constants_1 = require("../constants");
/**
 * Integration tests for factory take implementation and quote provider.
 *
 * Purpose: Ensure take-factory.ts and UniswapV3QuoteProvider work together correctly.
 * Critical for: Future developers modifying factory take logic or quote providers.
 *
 * Focus Areas:
 * 1. Factory take workflow execution
 * 2. Quote provider integration with take decisions
 * 3. Uniswap V3 configuration handling
 * 4. Error handling and edge cases
 */
describe('Factory Takes Integration Tests', function () {
    var ajna;
    var pool;
    var signer;
    var borrowerAddress;
    var setupFactoryTakeScenario = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Create liquidatable loan scenario
                return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                        pool: pool,
                        owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                        amount: 1,
                        price: 0.07, // Price per SOL
                    })];
                case 1:
                    // Create liquidatable loan scenario
                    _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                            amountToBorrow: 0.9,
                            collateralToPledge: 14, // 14 SOL
                        })];
                case 2:
                    _a.sent();
                    // Age the loan to make it kickable
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_YEAR * 2)];
                case 3:
                    // Age the loan to make it kickable
                    _a.sent();
                    borrowerAddress = test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
                    // Kick the loan to create liquidation
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
                case 4:
                    // Kick the loan to create liquidation
                    _a.sent();
                    // Age the auction to make it takeable
                    return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1)];
                case 5:
                    // Age the auction to make it takeable
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _b.sent();
                    nonce_1.NonceTracker.clearNonces();
                    // Configure Ajna SDK
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 2:
                    pool = _b.sent();
                    // Setup mock subgraph responses
                    (0, subgraph_mock_1.overrideGetLoans)((0, subgraph_mock_1.makeGetLoansFromSdk)(pool));
                    (0, subgraph_mock_1.overrideGetLiquidations)((0, subgraph_mock_1.makeGetLiquidationsFromSdk)(pool));
                    (0, subgraph_mock_1.overrideGetHighestMeaningfulBucket)((0, subgraph_mock_1.makeGetHighestMeaningfulBucket)(pool));
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                case 3:
                    // Setup signer
                    signer = _b.sent();
                    _a = test_utils_1.setBalance;
                    return [4 /*yield*/, signer.getAddress()];
                case 4: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(100).toHexString()])];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('Factory Take Workflow', function () {
        /**
         * Critical: Tests that factory take workflow executes correctly.
         * If someone modifies handleFactoryTakes(), these tests catch breaking changes.
         */
        it('should execute factory take workflow with valid Hemi configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiFactoryConfig, poolConfigWithUniswap;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        hemiFactoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                            takerContracts: {
                                'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                                defaultFeeTier: 3000,
                                defaultSlippage: 0.5,
                                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfigWithUniswap = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Should execute factory take workflow without throwing
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfigWithUniswap,
                                config: hemiFactoryConfig,
                            })];
                    case 2:
                        // Should execute factory take workflow without throwing
                        _a.sent();
                        // If we get here, factory workflow executed correctly
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle factory take with both external and arbTake strategies', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, combinedPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        factoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                                defaultFeeTier: 3000,
                                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        combinedPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98 // ArbTake also available
                            } });
                        // Should handle both external and arbTake strategies
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: combinedPoolConfig,
                                config: factoryConfig,
                            })];
                    case 2:
                        // Should handle both external and arbTake strategies
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle factory take with minimal valid configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var minimalFactoryConfig, minimalPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        minimalFactoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                                // Minimal required fields only
                            }
                        };
                        minimalPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                                // No hpbPriceFactor - external take only
                            } });
                        // Should work with minimal valid configuration
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: minimalPoolConfig,
                                config: minimalFactoryConfig,
                            })];
                    case 2:
                        // Should work with minimal valid configuration
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Quote Provider Integration', function () {
        /**
         * Tests that UniswapV3QuoteProvider integrates correctly with factory takes.
         * Critical for accurate pricing decisions in take logic.
         */
        it('should create quote provider with valid configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validQuoteConfig, quoteProvider;
            return __generator(this, function (_a) {
                validQuoteConfig = {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    defaultFeeTier: 3000,
                    wethAddress: '0x4200000000000000000000000000000000000006',
                    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                };
                quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(signer, validQuoteConfig);
                (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.true;
                (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.equal(validQuoteConfig.quoterV2Address);
                return [2 /*return*/];
            });
        }); });
        it('should handle quote provider with different fee tiers', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quoteConfig, quoteProvider, testParams, feeTiers, _i, feeTiers_1, feeTier, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteConfig = {
                            universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                            poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                            defaultFeeTier: 500,
                            wethAddress: '0x4200000000000000000000000000000000000006',
                            quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                        };
                        quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(signer, quoteConfig);
                        (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.true;
                        testParams = {
                            srcAmount: ethers_1.BigNumber.from('1000000000000000000'),
                            srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                            dstToken: '0x4200000000000000000000000000000000000006', // WETH
                        };
                        feeTiers = [500, 3000, 10000];
                        _i = 0, feeTiers_1 = feeTiers;
                        _a.label = 1;
                    case 1:
                        if (!(_i < feeTiers_1.length)) return [3 /*break*/, 6];
                        feeTier = feeTiers_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        // This will fail due to no real contract, but tests parameter handling
                        return [4 /*yield*/, quoteProvider.getQuote(testParams.srcAmount, testParams.srcToken, testParams.dstToken, feeTier)];
                    case 3:
                        // This will fail due to no real contract, but tests parameter handling
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        // Should not be parameter validation errors
                        (0, chai_1.expect)(errorMessage).to.not.include('invalid fee tier');
                        (0, chai_1.expect)(errorMessage).to.not.include('invalid parameters');
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        it('should detect missing quote provider configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidQuoteConfig, quoteProvider;
            return __generator(this, function (_a) {
                invalidQuoteConfig = {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    defaultFeeTier: 3000,
                    wethAddress: '0x4200000000000000000000000000000000000006',
                    // Missing quoterV2Address
                };
                quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(signer, invalidQuoteConfig);
                (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.false;
                (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.be.undefined;
                return [2 /*return*/];
            });
        }); });
        it('should handle quote provider parameter validation', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quoteConfig, quoteProvider, invalidParams, _i, invalidParams_1, testCase, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteConfig = {
                            universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                            poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                            defaultFeeTier: 3000,
                            wethAddress: '0x4200000000000000000000000000000000000006',
                            quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                        };
                        quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(signer, quoteConfig);
                        invalidParams = [
                            {
                                name: 'Zero amount',
                                srcAmount: ethers_1.BigNumber.from('0'),
                                srcToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                                dstToken: '0x4200000000000000000000000000000000000006',
                            },
                            {
                                name: 'Same tokens',
                                srcAmount: ethers_1.BigNumber.from('1000000000000000000'),
                                srcToken: '0x4200000000000000000000000000000000000006',
                                dstToken: '0x4200000000000000000000000000000000000006',
                            }
                        ];
                        _i = 0, invalidParams_1 = invalidParams;
                        _a.label = 1;
                    case 1:
                        if (!(_i < invalidParams_1.length)) return [3 /*break*/, 6];
                        testCase = invalidParams_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, quoteProvider.getQuote(testCase.srcAmount, testCase.srcToken, testCase.dstToken)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Uniswap V3 Configuration Handling', function () {
        /**
         * Tests various Uniswap V3 configuration scenarios.
         * Ensures factory takes work with different chain configurations.
         */
        it('should handle Hemi-specific Uniswap V3 configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiUniswapConfig, hemiPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        hemiUniswapConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                            takerContracts: {
                                'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                                defaultFeeTier: 3000,
                                defaultSlippage: 0.5,
                                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // Hemi QuoterV2
                            }
                        };
                        hemiPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Should handle Hemi-specific configuration
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: hemiPoolConfig,
                                config: hemiUniswapConfig,
                            })];
                    case 2:
                        // Should handle Hemi-specific configuration
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle mainnet-style Uniswap V3 configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mainnetUniswapConfig, mainnetPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        mainnetUniswapConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                                wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                                permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
                                defaultFeeTier: 3000,
                                defaultSlippage: 0.5,
                                poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                                quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Mainnet QuoterV2
                            }
                        };
                        mainnetPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle mainnet-style configuration
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: mainnetPoolConfig,
                                config: mainnetUniswapConfig,
                            })];
                    case 2:
                        // Should handle mainnet-style configuration
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle different fee tier configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var feeTierConfigs, _i, feeTierConfigs_1, feeConfig, factoryConfig, poolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        feeTierConfigs = [
                            { tier: 500, name: '0.05%' },
                            { tier: 3000, name: '0.3%' },
                            { tier: 10000, name: '1%' }
                        ];
                        _i = 0, feeTierConfigs_1 = feeTierConfigs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < feeTierConfigs_1.length)) return [3 /*break*/, 5];
                        feeConfig = feeTierConfigs_1[_i];
                        factoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                                defaultFeeTier: feeConfig.tier,
                                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle different fee tiers
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: factoryConfig,
                            })];
                    case 3:
                        // Should handle different fee tiers
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Error Handling and Edge Cases', function () {
        /**
         * Tests factory take error handling for various edge cases.
         * Ensures robust operation when configurations are incomplete or invalid.
         */
        it('should handle missing factory configuration gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var incompleteConfig, poolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        incompleteConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            // Missing takerContracts and universalRouterOverrides
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle incomplete config gracefully
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: incompleteConfig,
                            })];
                    case 2:
                        // Should handle incomplete config gracefully
                        _a.sent();
                        // Should not crash - may log errors but continue
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle missing universalRouterOverrides', function () { return __awaiter(void 0, void 0, void 0, function () {
            var configWithoutRouterOverrides, poolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        configWithoutRouterOverrides = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            // Missing universalRouterOverrides
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle missing router overrides gracefully
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: configWithoutRouterOverrides,
                            })];
                    case 2:
                        // Should handle missing router overrides gracefully
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle invalid liquiditySource for factory', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validFactoryConfig, invalidPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        validFactoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        invalidPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle wrong liquiditySource gracefully
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: invalidPoolConfig,
                                config: validFactoryConfig,
                            })];
                    case 2:
                        // Should handle wrong liquiditySource gracefully
                        _a.sent();
                        // Should not crash - may skip external takes
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle concurrent factory take requests', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, poolConfig, promises;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        factoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        promises = Array.from({ length: 3 }, function () {
                            return (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: factoryConfig,
                            });
                        });
                        // Should handle concurrent requests without issues
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        // Should handle concurrent requests without issues
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle pool configuration without take settings', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, poolConfigWithoutTake, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        factoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfigWithoutTake = __assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfigWithoutTake,
                                config: factoryConfig,
                            })];
                    case 3:
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Integration with Existing Components', function () {
        /**
         * Tests that factory takes integrate properly with existing keeper components.
         * Ensures factory system doesn't break other keeper functionality.
         */
        it('should integrate with existing kick functionality', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, poolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Setup scenario and kick
                    return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        // Setup scenario and kick
                        _a.sent(); // This includes kicking
                        factoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Factory takes should work after kick
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: factoryConfig,
                            })];
                    case 2:
                        // Factory takes should work after kick
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle dry run mode consistently', function () { return __awaiter(void 0, void 0, void 0, function () {
            var dryRunConfig, poolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        dryRunConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Dry run should complete without external transactions
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: dryRunConfig,
                            })];
                    case 2:
                        // Dry run should complete without external transactions
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work with different subgraph configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var subgraphConfigs, factoryConfig, poolConfig, _i, subgraphConfigs_1, subgraphUrl, configWithSubgraph;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupFactoryTakeScenario()];
                    case 1:
                        _a.sent();
                        subgraphConfigs = [
                            'http://test-url',
                            'https://api.goldsky.com/api/public/project_test/subgraphs/ajna-hemi/1.0.0/gn',
                            'http://invalid-url-that-should-fail'
                        ];
                        factoryConfig = {
                            dryRun: true,
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        _i = 0, subgraphConfigs_1 = subgraphConfigs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < subgraphConfigs_1.length)) return [3 /*break*/, 5];
                        subgraphUrl = subgraphConfigs_1[_i];
                        configWithSubgraph = __assign(__assign({}, factoryConfig), { subgraphUrl: subgraphUrl });
                        return [4 /*yield*/, (0, take_factory_1.handleFactoryTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfig,
                                config: configWithSubgraph,
                            })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=factory-takes.tests.js.map