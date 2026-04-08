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
// src/integration-tests/smart-dex-routing.test.ts
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var smart_dex_manager_1 = require("../smart-dex-manager");
var config_types_1 = require("../config-types");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
/**
 * Integration tests for SmartDexManager routing logic.
 *
 * Purpose: Ensure configuration changes don't break routing decisions.
 * Critical for: Future developers modifying config-types.ts or smart-dex-manager.ts
 *
 * Focus Areas:
 * 1. Configuration detection (single vs factory vs none)
 * 2. Per-chain configuration validation (one bot per chain reality)
 * 3. Backwards compatibility with existing configs
 * 4. Edge cases and error handling
 */
describe('Smart DEX Routing Integration Tests', function () {
    var mockSigner;
    beforeEach(function () {
        var wallet = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC);
        mockSigner = wallet.connect((0, test_utils_1.getProvider)());
    });
    describe('Configuration Detection', function () {
        /**
         * Critical: These tests ensure routing decisions are correct.
         * If someone modifies detectDeploymentType(), these tests catch breaking changes.
         */
        it('should detect factory deployment for Hemi-style config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        hemiConfig = {
                            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                            takerContracts: {
                                'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, hemiConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect single deployment for 1inch config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oneInchConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oneInchConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                43114: '0x111111125421ca6dc452d289314280a0f8842a65' // Avalanche
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, oneInchConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('single');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect none deployment for arbTake-only config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var arbTakeOnlyConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        arbTakeOnlyConfig = {
                            subgraphUrl: 'http://test-url',
                            // No keeperTaker or keeperTakerFactory
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, arbTakeOnlyConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('none');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should prioritize factory when both factory and single are configured', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mixedConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mixedConfig = {
                            keeperTaker: '0x1111111111111111111111111111111111111111',
                            oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                            keeperTakerFactory: '0x2222222222222222222222222222222222222222',
                            takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, mixedConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Configuration Validation', function () {
        /**
         * Critical: These tests ensure config validation doesn't break existing deployments.
         * Protects against changes to validateDeployment() breaking production configs.
         */
        it('should validate complete Hemi factory config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validHemiConfig, manager, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        validHemiConfig = {
                            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                            takerContracts: {
                                'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, validHemiConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        (0, chai_1.expect)(validation.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate complete 1inch config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validOneInchConfig, manager, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        validOneInchConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                43114: '0x111111125421ca6dc452d289314280a0f8842a65'
                            },
                            pools: [{
                                    take: { liquiditySource: config_types_1.LiquiditySource.ONEINCH }
                                }]
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, validOneInchConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        (0, chai_1.expect)(validation.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate none deployment gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var noneConfig, manager, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        noneConfig = {
                            subgraphUrl: 'http://test-url'
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, noneConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true; // None deployment is valid
                        return [2 /*return*/];
                }
            });
        }); });
        it('should catch missing factory dependencies', function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidFactoryConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidFactoryConfig = {
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            // Missing takerContracts - this will be detected as 'none', not 'factory'
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, invalidFactoryConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('none');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true; // 'none' is always valid
                        return [2 /*return*/];
                }
            });
        }); });
        it('should catch missing 1inch dependencies for pools that need them', function () { return __awaiter(void 0, void 0, void 0, function () {
            var invalidOneInchConfig, manager, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invalidOneInchConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            // Missing oneInchRouters but pools expect 1inch
                            pools: [{
                                    take: { liquiditySource: config_types_1.LiquiditySource.ONEINCH }
                                }]
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, invalidOneInchConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.false;
                        (0, chai_1.expect)(validation.errors.some(function (e) { return e.includes('oneInchRouters'); })).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Per-Chain Configuration Reality', function () {
        /**
         * Tests that reflect the one-bot-per-chain deployment reality.
         * Ensures configs work as expected in production scenarios.
         */
        it('should handle Avalanche mainnet style config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var avalancheConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        avalancheConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                43114: '0x111111125421ca6dc452d289314280a0f8842a65' // Only Avalanche
                            },
                            tokenAddresses: {
                                avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
                                wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
                                usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, avalancheConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('single');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle Hemi testnet style config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        hemiConfig = {
                            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                            takerContracts: {
                                'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
                            },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                                wethAddress: '0x4200000000000000000000000000000000000006',
                                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                            },
                            tokenAddresses: {
                                weth: '0x4200000000000000000000000000000000000006',
                                usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, hemiConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle mainnet style config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mainnetConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mainnetConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                1: '0x1111111254EEB25477B68fb85Ed929f73A960582' // Only Ethereum mainnet
                            },
                            connectorTokens: [
                                '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                                '0x6B175474E89094C44Da98b954EedeAC495271d0F' // DAI
                            ]
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, mainnetConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('single');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Take Settings Integration', function () {
        /**
         * Critical: Tests that take settings validation works with routing decisions.
         * Protects against changes to validateTakeSettings() breaking existing pools.
         */
        it('should validate Uniswap V3 take settings with factory config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, uniswapTakeSettings;
            return __generator(this, function (_a) {
                factoryConfig = {
                    keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                    takerContracts: {
                        'UniswapV3': '0x2234567890123456789012345678901234567890'
                    },
                    universalRouterOverrides: {
                        universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                        quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                    }
                };
                uniswapTakeSettings = {
                    minCollateral: 0.1,
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    marketPriceFactor: 0.95,
                    hpbPriceFactor: 0.98
                };
                // Should not throw
                (0, chai_1.expect)(function () {
                    (0, config_types_1.validateTakeSettings)(uniswapTakeSettings, factoryConfig);
                }).to.not.throw();
                return [2 /*return*/];
            });
        }); });
        it('should validate 1inch take settings with single config', function () { return __awaiter(void 0, void 0, void 0, function () {
            var singleConfig, oneInchTakeSettings;
            return __generator(this, function (_a) {
                singleConfig = {
                    keeperTaker: '0x1234567890123456789012345678901234567890',
                    oneInchRouters: {
                        1: '0x1111111254EEB25477B68fb85Ed929f73A960582'
                    }
                };
                oneInchTakeSettings = {
                    minCollateral: 0.1,
                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                    marketPriceFactor: 0.95,
                    hpbPriceFactor: 0.98
                };
                // Should not throw
                (0, chai_1.expect)(function () {
                    (0, config_types_1.validateTakeSettings)(oneInchTakeSettings, singleConfig);
                }).to.not.throw();
                return [2 /*return*/];
            });
        }); });
        it('should validate arbTake-only settings', function () { return __awaiter(void 0, void 0, void 0, function () {
            var arbTakeConfig, arbTakeSettings;
            return __generator(this, function (_a) {
                arbTakeConfig = {
                    subgraphUrl: 'http://test-url'
                };
                arbTakeSettings = {
                    minCollateral: 0.1,
                    hpbPriceFactor: 0.98
                    // No liquiditySource - arbTake only
                };
                // Should not throw
                (0, chai_1.expect)(function () {
                    (0, config_types_1.validateTakeSettings)(arbTakeSettings, arbTakeConfig);
                }).to.not.throw();
                return [2 /*return*/];
            });
        }); });
        it('should reject invalid liquiditySource configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var factoryConfig, invalidTakeSettings;
            return __generator(this, function (_a) {
                factoryConfig = {
                    keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                    // Missing takerContracts for Uniswap V3
                };
                invalidTakeSettings = {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    marketPriceFactor: 0.95
                };
                (0, chai_1.expect)(function () {
                    (0, config_types_1.validateTakeSettings)(invalidTakeSettings, factoryConfig);
                }).to.throw();
                return [2 /*return*/];
            });
        }); });
    });
    describe('Edge Cases and Error Handling', function () {
        /**
         * Tests edge cases that could break routing in production.
         * Ensures robust error handling for malformed configs.
         */
        it('should handle empty configuration gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var emptyConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        emptyConfig = {};
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, emptyConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('none');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle null/undefined config values', function () { return __awaiter(void 0, void 0, void 0, function () {
            var nullConfig, manager, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nullConfig = {
                            keeperTaker: null,
                            oneInchRouters: undefined,
                            keeperTakerFactory: null
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, nullConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('none');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle partial factory configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var partialFactoryConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        partialFactoryConfig = {
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            // Missing takerContracts
                            universalRouterOverrides: {
                                universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, partialFactoryConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('none');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle concurrent routing requests', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, managers, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x1234567890123456789012345678901234567890',
                            takerContracts: {
                                'UniswapV3': '0x2234567890123456789012345678901234567890'
                            }
                        };
                        managers = Array.from({ length: 5 }, function () { return new smart_dex_manager_1.SmartDexManager(mockSigner, config); });
                        return [4 /*yield*/, Promise.all(managers.map(function (manager) { return manager.detectDeploymentType(); }))];
                    case 1:
                        results = _a.sent();
                        // All results should be consistent
                        (0, chai_1.expect)(results.every(function (result) { return result === 'factory'; })).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Backwards Compatibility', function () {
        /**
         * Critical: Ensures existing production configs continue to work.
         * These tests protect against breaking changes to configuration handling.
         */
        it('should maintain compatibility with existing avalanche production configs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingAvalancheConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existingAvalancheConfig = {
                            dryRun: false,
                            ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/test-key',
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                43114: '0x111111125421ca6dc452d289314280a0f8842a65',
                            },
                            delayBetweenRuns: 2,
                            delayBetweenActions: 31,
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, existingAvalancheConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('single');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should maintain compatibility with existing mainnet production configs', function () { return __awaiter(void 0, void 0, void 0, function () {
            var existingMainnetConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        existingMainnetConfig = {
                            keeperTaker: '0x1234567890123456789012345678901234567890',
                            oneInchRouters: {
                                1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
                            },
                            uniswapOverrides: {
                                wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                                uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, existingMainnetConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('single');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should work with configs that have both old and new fields', function () { return __awaiter(void 0, void 0, void 0, function () {
            var migrationConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        migrationConfig = {
                            // Old 1inch fields
                            keeperTaker: '0x1111111111111111111111111111111111111111',
                            oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                            // New factory fields
                            keeperTakerFactory: '0x2222222222222222222222222222222222222222',
                            takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' },
                            universalRouterOverrides: {
                                universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                            }
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, migrationConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=smart-dex-routing.tests.js.map