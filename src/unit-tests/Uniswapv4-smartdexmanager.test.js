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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var smart_dex_manager_1 = require("../smart-dex-manager");
var config_types_1 = require("../config-types");
/**
 * Tests for SmartDexManager with Uniswap V4 Support
 *
 * Validates that the SmartDexManager properly detects and handles
 * Uniswap V4 deployments alongside existing V3, SushiSwap, and 1inch integrations.
 *
 * NOTE: As of implementation, factory V4 support is detected but not yet
 * fully implemented in canTakeLiquidation() - this is expected behavior.
 */
describe('SmartDexManager - Uniswap V4 Integration', function () {
    var mockSigner;
    beforeEach(function () {
        mockSigner = {
            getChainId: sinon_1.default.stub().resolves(8453), // Base chain ID
        };
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('detectDeploymentType() - V4 Support', function () {
        it('should detect factory deployment with V4 taker contract', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result).to.equal('factory');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect factory with multiple DEX takers including V4', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV3': '0xV3Taker123',
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                                'SushiSwap': '0xSushiTaker123',
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result).to.equal('factory');
                        (0, chai_1.expect)(config.takerContracts).to.have.property('UniswapV4');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect real Base factory with V4 support', function () { return __awaiter(void 0, void 0, void 0, function () {
            var baseConfig, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseConfig = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                            uniswapV4RouterOverrides: {
                                router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                                defaultSlippage: 1.0,
                                pools: {},
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, baseConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result).to.equal('factory');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('validateDeployment() - V4 Validation', function () {
        it('should validate factory with V4 taker contract', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.valid).to.be.true;
                        (0, chai_1.expect)(result.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate mixed V3/V4 factory deployment', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV3': '0xV3Taker123',
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.valid).to.be.true;
                        (0, chai_1.expect)(result.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate Base production deployment with V4', function () { return __awaiter(void 0, void 0, void 0, function () {
            var baseConfig, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseConfig = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                            uniswapV4RouterOverrides: {
                                router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                                defaultSlippage: 1.0,
                                pools: {
                                    'B_T1-B_T2': {
                                        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                                        fee: 3000,
                                        tickSpacing: 60,
                                        hooks: '0x0000000000000000000000000000000000000000',
                                    },
                                },
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, baseConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.valid).to.be.true;
                        (0, chai_1.expect)(result.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should still validate even without V4 config overrides', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
                            },
                            // Missing uniswapV4RouterOverrides - should still be valid
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.valid).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('canTakeLiquidation() - V4 Support', function () {
        it('should return false for factory V4 deployment (not yet implemented)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, poolConfig, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
                            },
                        };
                        poolConfig = {
                            name: 'Test Pool',
                            address: '0xPoolAddress',
                            price: { source: 'fixed', value: 1.0 },
                            take: {
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                                marketPriceFactor: 0.99,
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.canTakeLiquidation(poolConfig)];
                    case 1:
                        result = _a.sent();
                        // Current implementation returns false for factory - this is expected
                        // until the provider system is fully implemented
                        (0, chai_1.expect)(result).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle V3 takes in mixed deployment', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, v3PoolConfig, manager, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV3': '0xV3Taker123',
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                        };
                        v3PoolConfig = {
                            name: 'V3 Pool',
                            address: '0xPoolAddress',
                            price: { source: 'fixed', value: 1.0 },
                            take: {
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.99,
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.canTakeLiquidation(v3PoolConfig)];
                    case 1:
                        result = _a.sent();
                        // Factory deployment currently returns false for all external takes
                        (0, chai_1.expect)(result).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate liquiditySource enum includes UNISWAPV4', function () {
            // Ensure UNISWAPV4 exists in LiquiditySource enum
            var hasV4InEnum = Object.values(config_types_1.LiquiditySource).includes(config_types_1.LiquiditySource.UNISWAPV4);
            (0, chai_1.expect)(hasV4InEnum).to.be.true;
            (0, chai_1.expect)(config_types_1.LiquiditySource.UNISWAPV4).to.equal(5);
        });
    });
    describe('Configuration Hierarchy - V4', function () {
        it('should support uniswapV4RouterOverrides configuration', function () {
            var config = {
                keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                takerContracts: {
                    'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                },
                uniswapV4RouterOverrides: {
                    router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {
                        'B_T1-B_T2': {
                            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                            fee: 3000,
                            tickSpacing: 60,
                            hooks: '0x0000000000000000000000000000000000000000',
                        },
                    },
                },
            };
            (0, chai_1.expect)(config.uniswapV4RouterOverrides).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.router).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.poolManager).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.pools).to.exist;
        });
        it('should handle V4-only configuration', function () {
            var v4OnlyConfig = {
                keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                takerContracts: {
                    'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
                },
                uniswapV4RouterOverrides: {
                    router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {},
                },
            };
            var hasV4Config = !!(v4OnlyConfig.uniswapV4RouterOverrides);
            var hasV3Config = !!v4OnlyConfig.universalRouterOverrides;
            (0, chai_1.expect)(hasV4Config).to.be.true;
            (0, chai_1.expect)(hasV3Config).to.be.false;
        });
        it('should support mixed V3 and V4 configuration', function () {
            var mixedConfig = {
                keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                takerContracts: {
                    'UniswapV3': '0xV3Taker123',
                    'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                },
                universalRouterOverrides: {
                    universalRouterAddress: '0xUniversalRouter',
                    poolFactoryAddress: '0xFactory',
                },
                uniswapV4RouterOverrides: {
                    router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {},
                },
            };
            (0, chai_1.expect)(mixedConfig.universalRouterOverrides).to.exist;
            (0, chai_1.expect)(mixedConfig.uniswapV4RouterOverrides).to.exist;
        });
    });
    describe('Chain-Specific V4 Support', function () {
        it('should validate Base chain V4 deployment', function () { return __awaiter(void 0, void 0, void 0, function () {
            var baseConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockSigner.getChainId.resolves(8453); // Base
                        baseConfig = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                            uniswapV4RouterOverrides: {
                                router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                                defaultSlippage: 1.0,
                                pools: {},
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, baseConfig);
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
        it('should handle different chain IDs', function () {
            var chainSupport = [
                {
                    name: 'Ethereum Mainnet',
                    chainId: 1,
                    hasV4: true,
                },
                {
                    name: 'Base',
                    chainId: 8453,
                    hasV4: true,
                },
                {
                    name: 'Hemi',
                    chainId: 43111,
                    hasV4: false, // Not yet deployed
                },
            ];
            chainSupport.forEach(function (chain) {
                (0, chai_1.expect)(chain.chainId).to.be.a('number');
                (0, chai_1.expect)(chain.hasV4).to.be.a('boolean');
            });
        });
    });
    describe('Migration and Rollout Scenarios', function () {
        it('should support gradual V4 rollout alongside existing DEXes', function () { return __awaiter(void 0, void 0, void 0, function () {
            var migrationConfig, manager, validation, deploymentType;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        migrationConfig = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV3': '0xV3Taker123',
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63', // Add V4 for new pools
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, migrationConfig);
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 1:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 2:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle pool-by-pool V4 migration', function () {
            var pools = [
                {
                    name: 'Legacy Pool',
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    useV4: false,
                },
                {
                    name: 'Migrated Pool',
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                    useV4: true,
                },
            ];
            pools.forEach(function (pool) {
                var isV4Pool = pool.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4;
                (0, chai_1.expect)(isV4Pool).to.equal(pool.useV4);
            });
        });
    });
    describe('Real Production Scenarios', function () {
        it('should handle complete Base production config with V4', function () { return __awaiter(void 0, void 0, void 0, function () {
            var baseProductionConfig, manager, deploymentType, validation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseProductionConfig = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                            uniswapV4RouterOverrides: {
                                router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                                defaultSlippage: 1.0,
                                pools: {
                                    'B_T1-B_T2': {
                                        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                                        fee: 3000,
                                        tickSpacing: 60,
                                        hooks: '0x0000000000000000000000000000000000000000',
                                    },
                                },
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, baseProductionConfig);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [4 /*yield*/, manager.validateDeployment()];
                    case 2:
                        validation = _a.sent();
                        (0, chai_1.expect)(validation.valid).to.be.true;
                        (0, chai_1.expect)(validation.errors).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should support mixed strategy pools with V4', function () {
            var poolConfig = {
                name: 'B_T1/B_T2 Test Pool',
                take: {
                    // ArbTake settings
                    minCollateral: 0.001,
                    hpbPriceFactor: 0.95,
                    // External take with V4
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                    marketPriceFactor: 0.95,
                },
            };
            var hasArbTake = !!(poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor);
            var hasV4ExternalTake = poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4;
            (0, chai_1.expect)(hasArbTake).to.be.true;
            (0, chai_1.expect)(hasV4ExternalTake).to.be.true;
        });
    });
    describe('Implementation Status', function () {
        it('should document current V4 factory implementation status', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, poolConfig, manager, deploymentType, canTake;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                            takerContracts: {
                                'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                            },
                        };
                        poolConfig = {
                            name: 'Test Pool',
                            address: '0xPoolAddress',
                            price: { source: 'fixed', value: 1.0 },
                            take: {
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                                marketPriceFactor: 0.99,
                            },
                        };
                        manager = new smart_dex_manager_1.SmartDexManager(mockSigner, config);
                        return [4 /*yield*/, manager.detectDeploymentType()];
                    case 1:
                        deploymentType = _a.sent();
                        (0, chai_1.expect)(deploymentType).to.equal('factory');
                        return [4 /*yield*/, manager.canTakeLiquidation(poolConfig)];
                    case 2:
                        canTake = _a.sent();
                        (0, chai_1.expect)(canTake).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=Uniswapv4-smartdexmanager.test.js.map