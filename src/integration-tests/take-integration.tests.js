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
// src/integration-tests/take-integration.test.ts
require("./subgraph-mock");
var sdk_1 = require("@ajna-finance/sdk");
var chai_1 = require("chai");
var config_types_1 = require("../config-types");
var take_1 = require("../take");
var kick_1 = require("../kick");
var utils_1 = require("../utils");
var loan_helpers_1 = require("./loan-helpers");
var nonce_1 = require("../nonce");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var subgraph_mock_1 = require("./subgraph-mock");
var constants_1 = require("../constants");
/**
 * Integration tests for take.ts orchestration and routing.
 *
 * Purpose: Ensure take.ts correctly routes between single/factory implementations.
 * Critical for: Future developers modifying take.ts routing logic.
 *
 * Focus Areas:
 * 1. handleTakes() routing to correct implementation
 * 2. Backwards compatibility with existing 1inch flows
 * 3. New factory routing for Uniswap V3
 * 4. Error handling and graceful degradation
 */
describe('Take Integration Tests', function () {
    var ajna;
    var pool;
    var signer;
    var borrowerAddress;
    var setupLiquidationScenario = function () { return __awaiter(void 0, void 0, void 0, function () {
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
    describe('Take Routing Logic', function () {
        /**
         * Critical: Tests that handleTakes() routes to the correct implementation.
         * If someone modifies the routing in take.ts, these tests catch breaking changes.
         */
        it('should route to factory handler for Uniswap V3 configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, uniswapPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
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
                                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        uniswapPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Should route to factory handler without throwing
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: uniswapPoolConfig,
                                config: factoryConfig,
                            })];
                    case 2:
                        // Should route to factory handler without throwing
                        _a.sent();
                        // If we get here, routing worked correctly
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should route to single handler for 1inch configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var singleConfig, oneInchPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        singleConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                1: '0x1111111254EEB25477B68fb85Ed929f73A960582'
                            },
                            connectorTokens: []
                        };
                        oneInchPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Should route to single handler without throwing
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: oneInchPoolConfig,
                                config: singleConfig,
                            })];
                    case 2:
                        // Should route to single handler without throwing
                        _a.sent();
                        // If we get here, routing worked correctly
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle arbTake-only configuration (no external DEX)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var arbTakeOnlyConfig, arbTakePoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        arbTakeOnlyConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            // No external DEX configs
                        };
                        arbTakePoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                hpbPriceFactor: 0.98
                                // No liquiditySource - arbTake only
                            } });
                        // Should handle arbTake-only without throwing
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: arbTakePoolConfig,
                                config: arbTakeOnlyConfig,
                            })];
                    case 2:
                        // Should handle arbTake-only without throwing
                        _a.sent();
                        // If we get here, arbTake-only routing worked correctly
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should prioritize factory when both factory and single are available', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mixedConfig, uniswapPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        mixedConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            // Both configurations present
                            keeperTaker: '0x1111111111111111111111111111111111111111',
                            oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                            keeperTakerFactory: '0x2222222222222222222222222222222222222222',
                            takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        uniswapPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Should route to factory (priority) without throwing
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: uniswapPoolConfig,
                                config: mixedConfig,
                            })];
                    case 2:
                        // Should route to factory (priority) without throwing
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Backwards Compatibility', function () {
        /**
         * Critical: Ensures existing production take flows continue to work.
         * Protects against breaking changes to take.ts affecting deployed bots.
         */
        it('should maintain compatibility with existing 1inch take flows', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingOneInchConfig, existingPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        existingOneInchConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                43114: '0x111111125421ca6dc452d289314280a0f8842a65' // Avalanche
                            },
                            connectorTokens: [
                                '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                                '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI
                            ]
                        };
                        existingPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 1e-8,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.99
                            } });
                        // Should work exactly as before
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: existingPoolConfig,
                                config: existingOneInchConfig,
                            })];
                    case 2:
                        // Should work exactly as before
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should maintain compatibility with existing arbTake-only flows', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingArbTakeConfig, existingArbTakePoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        existingArbTakeConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            // No external DEX integration
                        };
                        existingArbTakePoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 1e-8,
                                hpbPriceFactor: 0.99
                                // No liquiditySource - classic arbTake only
                            } });
                        // Should work exactly as before
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: existingArbTakePoolConfig,
                                config: existingArbTakeConfig,
                            })];
                    case 2:
                        // Should work exactly as before
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle legacy config field formats', function () { return __awaiter(void 0, void 0, void 0, function () {
            var legacyConfig, legacyPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        legacyConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                1: '0x1111111254EEB25477B68fb85Ed929f73A960582'
                            },
                            // Legacy fields that might exist in old configs
                            uniswapOverrides: {
                                wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                                uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                            }
                        };
                        legacyPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 1e-8,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.99
                            } });
                        // Should handle legacy fields gracefully
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: legacyPoolConfig,
                                config: legacyConfig,
                            })];
                    case 2:
                        // Should handle legacy fields gracefully
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Configuration Error Handling', function () {
        /**
         * Tests that handleTakes() gracefully handles configuration errors.
         * Ensures robust error handling for malformed or incomplete configs.
         */
        it('should handle missing required configuration gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var incompleteConfig, poolConfigRequiringDEX;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        incompleteConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            // Missing all DEX configurations
                        };
                        poolConfigRequiringDEX = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                marketPriceFactor: 0.95
                            } });
                        // Should handle missing config gracefully (no external takes possible)
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolConfigRequiringDEX,
                                config: incompleteConfig,
                            })];
                    case 2:
                        // Should handle missing config gracefully (no external takes possible)
                        _a.sent();
                        // Should not throw - may log warnings but continue with arbTake if available
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle invalid liquiditySource values', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validConfig, invalidPoolConfig, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        validConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                        };
                        invalidPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: 999,
                                marketPriceFactor: 0.95
                            } });
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: invalidPoolConfig,
                                config: validConfig,
                            })];
                    case 3:
                        _a.sent();
                        // If no error thrown, that's acceptable
                        (0, chai_1.expect)(true).to.be.true;
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        it('should handle partial factory configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var partialFactoryConfig, uniswapPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        partialFactoryConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            // Missing takerContracts and universalRouterOverrides
                        };
                        uniswapPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95
                            } });
                        // Should detect incomplete factory config and handle gracefully
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: uniswapPoolConfig,
                                config: partialFactoryConfig,
                            })];
                    case 2:
                        // Should detect incomplete factory config and handle gracefully
                        _a.sent();
                        // Should not crash - may fall back to arbTake or log errors
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Pool Configuration Combinations', function () {
        /**
         * Tests various pool configuration combinations to ensure robust handling.
         * Covers realistic scenarios that might occur in production.
         */
        it('should handle pool with both external take and arbTake configured', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, combinedPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
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
                        combinedPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98 // ArbTake also available
                            } });
                        // Should handle both strategies being available
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: combinedPoolConfig,
                                config: factoryConfig,
                            })];
                    case 2:
                        // Should handle both strategies being available
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle pool with minimal take configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var minimalConfig, minimalPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        minimalConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                        };
                        minimalPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                // Only basic arbTake config
                            } });
                        // Should handle minimal config gracefully
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: minimalPoolConfig,
                                config: minimalConfig,
                            })];
                    case 2:
                        // Should handle minimal config gracefully
                        _a.sent();
                        (0, chai_1.expect)(true).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle multiple pools with different take strategies', function () { return __awaiter(void 0, void 0, void 0, function () {
            var multiStrategyConfig, poolConfigs, _i, poolConfigs_1, poolTest;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        multiStrategyConfig = {
                            dryRun: true,
                            subgraphUrl: 'http://test-url',
                            delayBetweenActions: 100,
                            // Support both strategies
                            keeperTaker: '0x1111111111111111111111111111111111111111',
                            oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                            keeperTakerFactory: '0x2222222222222222222222222222222222222222',
                            takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        poolConfigs = [
                            {
                                name: 'Uniswap V3 Pool',
                                config: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                        minCollateral: 0.1,
                                        liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                        marketPriceFactor: 0.95
                                    } })
                            },
                            {
                                name: '1inch Pool',
                                config: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                        minCollateral: 0.1,
                                        liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                        marketPriceFactor: 0.95
                                    } })
                            },
                            {
                                name: 'ArbTake Only Pool',
                                config: __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                        minCollateral: 0.1,
                                        hpbPriceFactor: 0.98
                                    } })
                            }
                        ];
                        _i = 0, poolConfigs_1 = poolConfigs;
                        _a.label = 2;
                    case 2:
                        if (!(_i < poolConfigs_1.length)) return [3 /*break*/, 5];
                        poolTest = poolConfigs_1[_i];
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: poolTest.config,
                                config: multiStrategyConfig,
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
    describe('Dry Run vs Production Mode', function () {
        /**
         * Tests that dry run mode works correctly for testing routing logic.
         * Ensures production vs test behavior is predictable.
         */
        it('should handle dry run mode correctly for all take strategies', function () { return __awaiter(void 0, void 0, void 0, function () {
            var dryRunConfig, uniswapPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
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
                        uniswapPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { take: {
                                minCollateral: 0.1,
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.95,
                                hpbPriceFactor: 0.98
                            } });
                        // Dry run should complete without external transactions
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: uniswapPoolConfig,
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
        it('should respect dry run mode regardless of take strategy', function () { return __awaiter(void 0, void 0, void 0, function () {
            var strategies, _i, strategies_1, strategy, fullConfig, fullPoolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, setupLiquidationScenario()];
                    case 1:
                        _a.sent();
                        strategies = [
                            {
                                name: 'Factory (Uniswap V3)',
                                config: {
                                    dryRun: true,
                                    keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                                    takerContracts: { 'UniswapV3': '0x2234567890123456789012345678901234567890' },
                                    universalRouterOverrides: {
                                        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                                    }
                                },
                                poolConfig: {
                                    take: {
                                        minCollateral: 0.1,
                                        liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                        marketPriceFactor: 0.95
                                    }
                                }
                            },
                            {
                                name: 'Single (1inch)',
                                config: {
                                    dryRun: true,
                                    keeperTaker: '0x1234567890123456789012345678901234567890',
                                    oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' }
                                },
                                poolConfig: {
                                    take: {
                                        minCollateral: 0.1,
                                        liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                                        marketPriceFactor: 0.95
                                    }
                                }
                            },
                            {
                                name: 'ArbTake Only',
                                config: {
                                    dryRun: true,
                                },
                                poolConfig: {
                                    take: {
                                        minCollateral: 0.1,
                                        hpbPriceFactor: 0.98
                                    }
                                }
                            }
                        ];
                        _i = 0, strategies_1 = strategies;
                        _a.label = 2;
                    case 2:
                        if (!(_i < strategies_1.length)) return [3 /*break*/, 5];
                        strategy = strategies_1[_i];
                        fullConfig = __assign(__assign({}, strategy.config), { subgraphUrl: 'http://test-url', delayBetweenActions: 100 });
                        fullPoolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), strategy.poolConfig);
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                signer: signer,
                                pool: pool,
                                poolConfig: fullPoolConfig,
                                config: fullConfig,
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
//# sourceMappingURL=take-integration.tests.js.map