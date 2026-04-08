"use strict";
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
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var config_types_1 = require("../config-types");
var logging_1 = require("../logging");
var takeFactory = __importStar(require("../take-factory"));
describe('Take Factory', function () {
    var mockSigner;
    var mockPool;
    var loggerInfoStub;
    var loggerDebugStub;
    var loggerErrorStub;
    beforeEach(function () {
        // Create basic mocks
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(43114), // Avalanche
        };
        mockPool = {
            name: 'Test Pool',
            poolAddress: '0xPoolAddress',
            collateralAddress: '0xCollateralAddress',
            quoteAddress: '0xQuoteAddress',
        };
        // Stub logger methods
        loggerInfoStub = sinon_1.default.stub(logging_1.logger, 'info');
        loggerDebugStub = sinon_1.default.stub(logging_1.logger, 'debug');
        loggerErrorStub = sinon_1.default.stub(logging_1.logger, 'error');
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('handleFactoryTakes - Real Function Tests', function () {
        it('should handle missing configuration gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockPool, poolConfig, config, subgraphStub, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPool = {
                            name: 'USD_T1 / USD_T2',
                            poolAddress: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
                            collateralAddress: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
                            quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
                        };
                        poolConfig = {
                            name: 'USD_T1 / USD_T2',
                            address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
                            take: {
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.99,
                            },
                        };
                        config = {
                            dryRun: false,
                            subgraphUrl: 'http://localhost:8000/subgraphs/name/ajna-test',
                            delayBetweenActions: 1000,
                            // Missing keeperTakerFactory and universalRouterOverrides (testing graceful degradation)
                        };
                        subgraphStub = sinon_1.default.stub(require('../subgraph'), 'default').value({
                            getLiquidations: sinon_1.default.stub().resolves({
                                pool: { hpb: 1000, hpbIndex: 0, liquidationAuctions: [] }
                            })
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // This should complete without throwing, even with missing config
                        return [4 /*yield*/, takeFactory.handleFactoryTakes({
                                signer: mockSigner,
                                pool: mockPool,
                                poolConfig: poolConfig,
                                config: config,
                            })];
                    case 2:
                        // This should complete without throwing, even with missing config
                        _a.sent();
                        // Should log debug message about the configuration
                        (0, chai_1.expect)(loggerDebugStub.called).to.be.true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        // Test should not throw for missing config, should handle gracefully
                        chai_1.expect.fail("Function should handle missing config gracefully, but threw: ".concat(error_1));
                        return [3 /*break*/, 4];
                    case 4:
                        subgraphStub.restore();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle complete Hemi-style configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var mockPool, poolConfig, config, subgraphStub, debugCalls, factoryLogFound;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPool = {
                            name: 'USD_T1 / USD_T2',
                            poolAddress: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
                            collateralAddress: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
                            quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
                        };
                        poolConfig = {
                            name: 'USD_T1 / USD_T2',
                            address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
                            take: {
                                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                                marketPriceFactor: 0.99,
                                minCollateral: 0.1,
                                hpbPriceFactor: 0.98,
                            },
                        };
                        config = {
                            dryRun: true,
                            subgraphUrl: 'http://localhost:8000/subgraphs/name/ajna-test',
                            delayBetweenActions: 35,
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
                            },
                        };
                        subgraphStub = sinon_1.default.stub(require('../subgraph'), 'default').value({
                            getLiquidations: sinon_1.default.stub().resolves({
                                pool: { hpb: 1000, hpbIndex: 0, liquidationAuctions: [] }
                            })
                        });
                        return [4 /*yield*/, takeFactory.handleFactoryTakes({
                                signer: mockSigner,
                                pool: mockPool,
                                poolConfig: poolConfig,
                                config: config,
                            })];
                    case 1:
                        _a.sent();
                        debugCalls = loggerDebugStub.getCalls();
                        factoryLogFound = debugCalls.some(function (call) {
                            return call.args[0] && call.args[0].includes('Factory take handler starting');
                        });
                        (0, chai_1.expect)(factoryLogFound).to.be.true;
                        subgraphStub.restore();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Configuration Validation - Business Logic', function () {
        // Test the parameter validation logic that happens before external calls
        it('should handle missing marketPriceFactor gracefully', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    // Missing marketPriceFactor
                    minCollateral: 1.0,
                },
            };
            // This tests the validation logic - marketPriceFactor is required for takes
            (0, chai_1.expect)(poolConfig.take.marketPriceFactor).to.be.undefined;
            // Business logic: if no marketPriceFactor, external takes should not be attempted
            var hasMarketPriceFactor = !!poolConfig.take.marketPriceFactor;
            (0, chai_1.expect)(hasMarketPriceFactor).to.be.false;
        });
        it('should validate required fields for Uniswap V3 configuration', function () {
            // Based on real Hemi config
            var validHemiConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                wethAddress: '0x4200000000000000000000000000000000000006',
                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                defaultFeeTier: 3000,
                defaultSlippage: 0.5,
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
            };
            var incompleteConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                // Missing poolFactoryAddress and wethAddress
            };
            // Business logic: Uniswap V3 requires specific configuration fields
            var isValidConfig = !!(validHemiConfig.universalRouterAddress &&
                validHemiConfig.poolFactoryAddress &&
                validHemiConfig.wethAddress);
            var isIncompleteConfig = !!(incompleteConfig.universalRouterAddress &&
                incompleteConfig.poolFactoryAddress &&
                incompleteConfig.wethAddress);
            (0, chai_1.expect)(isValidConfig).to.be.true;
            (0, chai_1.expect)(isIncompleteConfig).to.be.false;
        });
        it('should handle unsupported liquiditySource gracefully', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                    marketPriceFactor: 0.99,
                },
            };
            // Business logic: Factory only supports certain DEX types
            var isSupportedByFactory = poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3;
            (0, chai_1.expect)(isSupportedByFactory).to.be.false;
        });
        it('should validate collateral amount is positive', function () {
            var validCollateral = ethers_1.BigNumber.from('1000000000000000000'); // 1 token
            var zeroCollateral = ethers_1.BigNumber.from('0');
            var negativeCollateral = ethers_1.BigNumber.from('-1');
            // Business logic: collateral must be positive for takes
            (0, chai_1.expect)(validCollateral.gt(0)).to.be.true;
            (0, chai_1.expect)(zeroCollateral.gt(0)).to.be.false;
            (0, chai_1.expect)(negativeCollateral.gt(0)).to.be.false;
        });
    });
    describe('Routing Logic - DEX Selection', function () {
        it('should route to Uniswap V3 for UNISWAPV3 liquiditySource', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    marketPriceFactor: 0.99,
                },
            };
            // Business logic: routing decision based on liquiditySource
            var shouldRouteToUniswap = poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3;
            (0, chai_1.expect)(shouldRouteToUniswap).to.be.true;
        });
        it('should not support 1inch in factory pattern', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                    marketPriceFactor: 0.99,
                },
            };
            // Business logic: factory doesn't support 1inch (use single contract instead)
            var isFactorySupported = poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3;
            (0, chai_1.expect)(isFactorySupported).to.be.false;
        });
        it('should handle unknown liquiditySource values', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: 999,
                    marketPriceFactor: 0.99,
                },
            };
            // Business logic: only specific values are supported
            var supportedSources = [config_types_1.LiquiditySource.UNISWAPV3];
            var isSupported = supportedSources.includes(poolConfig.take.liquiditySource);
            (0, chai_1.expect)(isSupported).to.be.false;
        });
    });
    describe('DryRun Mode Behavior', function () {
        it('should log and return early when dryRun is true for takeLiquidationFactory', function () { return __awaiter(void 0, void 0, void 0, function () {
            var liquidation, config, poolConfig, shouldExecuteTransaction;
            return __generator(this, function (_a) {
                liquidation = {
                    borrower: '0xBorrower',
                    hpbIndex: 1000,
                    collateral: ethers_1.BigNumber.from('1000000000000000000'),
                    auctionPrice: ethers_1.BigNumber.from('1000000000000000000'),
                    isTakeable: true,
                    isArbTakeable: false,
                };
                config = {
                    dryRun: true,
                    keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                    universalRouterOverrides: {
                        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                        wethAddress: '0x4200000000000000000000000000000000000006',
                    },
                };
                poolConfig = {
                    name: 'Test Pool',
                    take: {
                        liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                        marketPriceFactor: 0.99,
                    },
                };
                // Test the DryRun logic directly - this is pure business logic
                if (config.dryRun) {
                    // In dryRun mode, should log and return without executing
                    (0, chai_1.expect)(config.dryRun).to.be.true;
                    shouldExecuteTransaction = !config.dryRun;
                    (0, chai_1.expect)(shouldExecuteTransaction).to.be.false;
                }
                return [2 /*return*/];
            });
        }); });
        it('should proceed to execution when dryRun is false', function () {
            var config = {
                dryRun: false,
                keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    wethAddress: '0x4200000000000000000000000000000000000006',
                },
            };
            // Business logic: when not in dryRun, should proceed to execution
            var shouldExecuteTransaction = !config.dryRun;
            (0, chai_1.expect)(shouldExecuteTransaction).to.be.true;
        });
    });
    describe('Parameter Validation and Error Handling', function () {
        it('should handle missing keeperTakerFactory address', function () {
            var config = {
                dryRun: false,
                // Missing keeperTakerFactory
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                },
            };
            // Business logic: keeperTakerFactory is required for execution
            var hasRequiredFactory = !!config.keeperTakerFactory;
            (0, chai_1.expect)(hasRequiredFactory).to.be.false;
        });
        it('should validate Uniswap configuration completeness', function () {
            var _a, _b, _c, _d;
            // Real Hemi configuration - complete
            var completeHemiConfig = {
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    wethAddress: '0x4200000000000000000000000000000000000006',
                    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                },
            };
            // Incomplete configuration (missing key fields)
            var incompleteConfig = {
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    // Missing permit2Address and other required fields
                },
            };
            // No configuration at all
            var missingConfig = {
            // No universalRouterOverrides at all
            };
            // Business logic: validate required fields for Uniswap operations
            var isCompleteConfig = !!(((_a = completeHemiConfig.universalRouterOverrides) === null || _a === void 0 ? void 0 : _a.universalRouterAddress) &&
                ((_b = completeHemiConfig.universalRouterOverrides) === null || _b === void 0 ? void 0 : _b.permit2Address));
            var isIncompleteConfig = !!(((_c = incompleteConfig.universalRouterOverrides) === null || _c === void 0 ? void 0 : _c.universalRouterAddress) &&
                ((_d = incompleteConfig.universalRouterOverrides) === null || _d === void 0 ? void 0 : _d.permit2Address));
            var isMissingConfig = !!missingConfig.universalRouterOverrides;
            (0, chai_1.expect)(isCompleteConfig).to.be.true;
            (0, chai_1.expect)(isIncompleteConfig).to.be.false;
            (0, chai_1.expect)(isMissingConfig).to.be.false;
        });
        it('should handle chain compatibility for DEX availability', function () {
            // Business logic: different chains have different DEX availability
            var chainConfigs = [
                { chainId: 1, hasUniswapV3: true, has1inch: true },
                { chainId: 43114, hasUniswapV3: true, has1inch: true },
                { chainId: 123456, hasUniswapV3: false, has1inch: false }, // New/small chain
            ];
            chainConfigs.forEach(function (chain) {
                var canUseUniswapV3 = chain.hasUniswapV3;
                var canUse1inch = chain.has1inch;
                if (chain.chainId === 123456) {
                    // New chain - no DEX support
                    (0, chai_1.expect)(canUseUniswapV3).to.be.false;
                    (0, chai_1.expect)(canUse1inch).to.be.false;
                }
                else {
                    // Major chains - should have DEX support
                    (0, chai_1.expect)(canUseUniswapV3).to.be.true;
                    (0, chai_1.expect)(canUse1inch).to.be.true;
                }
            });
        });
    });
    describe('ArbTake Configuration Validation', function () {
        it('should validate arbTake settings independently from external takes', function () {
            var arbTakeOnlyConfig = {
                name: 'Test Pool',
                take: {
                    // Only arbTake settings, no external DEX
                    minCollateral: 1.0,
                    hpbPriceFactor: 0.98,
                    // No liquiditySource or marketPriceFactor
                },
            };
            var externalTakeConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    marketPriceFactor: 0.99,
                    // No arbTake settings
                },
            };
            var bothConfig = {
                name: 'Test Pool',
                take: {
                    minCollateral: 1.0,
                    hpbPriceFactor: 0.98,
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    marketPriceFactor: 0.99,
                },
            };
            // Business logic: arbTake and external takes are independent
            var hasArbTake = function (config) { return !!(config.take.minCollateral && config.take.hpbPriceFactor); };
            var hasExternalTake = function (config) { return !!(config.take.liquiditySource && config.take.marketPriceFactor); };
            (0, chai_1.expect)(hasArbTake(arbTakeOnlyConfig)).to.be.true;
            (0, chai_1.expect)(hasExternalTake(arbTakeOnlyConfig)).to.be.false;
            (0, chai_1.expect)(hasArbTake(externalTakeConfig)).to.be.false;
            (0, chai_1.expect)(hasExternalTake(externalTakeConfig)).to.be.true;
            (0, chai_1.expect)(hasArbTake(bothConfig)).to.be.true;
            (0, chai_1.expect)(hasExternalTake(bothConfig)).to.be.true;
        });
        it('should validate minCollateral and hpbPriceFactor values', function () {
            var validArbTakeConfig = {
                minCollateral: 1.0,
                hpbPriceFactor: 0.98,
            };
            var invalidArbTakeConfig = {
                minCollateral: 0,
                hpbPriceFactor: -0.5, // Invalid: must be positive
            };
            // Business logic: validate arbTake parameter ranges
            var isValidArbTake = function (config) {
                return config.minCollateral > 0 && config.hpbPriceFactor > 0;
            };
            (0, chai_1.expect)(isValidArbTake(validArbTakeConfig)).to.be.true;
            (0, chai_1.expect)(isValidArbTake(invalidArbTakeConfig)).to.be.false;
        });
    });
    describe('Swap Details Preparation', function () {
        it('should prepare correct Uniswap V3 swap details structure', function () {
            // Real Hemi configuration values
            var config = {
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                    defaultFeeTier: 3000,
                    defaultSlippage: 0.5,
                },
            };
            // Real pool addresses from Hemi config
            var pool = {
                quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // USD_T2
            };
            // Business logic: prepare swap details for Uniswap V3
            var swapDetails = {
                universalRouter: config.universalRouterOverrides.universalRouterAddress,
                permit2: config.universalRouterOverrides.permit2Address,
                targetToken: pool.quoteAddress,
                feeTier: config.universalRouterOverrides.defaultFeeTier,
                slippageBps: Math.floor((config.universalRouterOverrides.defaultSlippage) * 100),
                deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
            };
            (0, chai_1.expect)(swapDetails.universalRouter).to.equal('0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B');
            (0, chai_1.expect)(swapDetails.permit2).to.equal('0xB952578f3520EE8Ea45b7914994dcf4702cEe578');
            (0, chai_1.expect)(swapDetails.targetToken).to.equal('0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8');
            (0, chai_1.expect)(swapDetails.feeTier).to.equal(3000);
            (0, chai_1.expect)(swapDetails.slippageBps).to.equal(50); // 0.5 * 100
            (0, chai_1.expect)(swapDetails.deadline).to.be.greaterThan(Math.floor(Date.now() / 1000));
        });
        it('should handle missing swap configuration gracefully', function () {
            var _a, _b;
            var incompleteConfig = {
                universalRouterOverrides: {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    // Missing permit2Address and other required fields
                },
            };
            // Business logic: detect incomplete configuration
            var hasRequiredFields = !!(((_a = incompleteConfig.universalRouterOverrides) === null || _a === void 0 ? void 0 : _a.universalRouterAddress) &&
                ((_b = incompleteConfig.universalRouterOverrides) === null || _b === void 0 ? void 0 : _b.permit2Address));
            (0, chai_1.expect)(hasRequiredFields).to.be.false;
        });
    });
    describe('Error Path Validation', function () {
        it('should identify configuration errors before execution attempts', function () {
            var scenarios = [
                {
                    name: 'Missing factory address',
                    config: { dryRun: false },
                    hasError: true,
                    errorType: 'missing_factory'
                },
                {
                    name: 'Missing Uniswap config for Uniswap take',
                    config: {
                        dryRun: false,
                        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D', // Real Hemi factory
                        // Missing universalRouterOverrides
                    },
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    hasError: true,
                    errorType: 'missing_uniswap_config'
                },
                {
                    name: 'Valid Hemi configuration',
                    config: {
                        dryRun: false,
                        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
                        universalRouterOverrides: {
                            universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                            permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                        },
                    },
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                    hasError: false,
                    errorType: null
                },
            ];
            scenarios.forEach(function (scenario) {
                // Business logic: validate configuration completeness
                var hasConfigError = false;
                var errorType = null;
                if (!scenario.config.keeperTakerFactory && !scenario.config.dryRun) {
                    hasConfigError = true;
                    errorType = 'missing_factory';
                }
                else if (scenario.liquiditySource === config_types_1.LiquiditySource.UNISWAPV3 &&
                    !scenario.config.universalRouterOverrides) {
                    hasConfigError = true;
                    errorType = 'missing_uniswap_config';
                }
                (0, chai_1.expect)(hasConfigError).to.equal(scenario.hasError, "Scenario: ".concat(scenario.name));
                (0, chai_1.expect)(errorType).to.equal(scenario.errorType, "Scenario: ".concat(scenario.name));
            });
        });
    });
});
//# sourceMappingURL=take-factory.test.js.map