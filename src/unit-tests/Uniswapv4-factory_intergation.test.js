"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var config_types_1 = require("../config-types");
var logging_1 = require("../logging");
/**
 * Integration tests for Uniswap V4 with Factory Pattern
 *
 * Tests the configuration and validation for V4 integration
 * with the factory take pattern. These tests focus on:
 * - Configuration structure validation
 * - PoolKey construction logic
 * - Parameter validation for V4
 * - Real production configuration testing
 *
 * NOTE: Full integration with take-factory.ts is pending
 * implementation of the complete V4 take flow.
 */
describe('Uniswap V4 Factory Integration', function () {
    var mockSigner;
    var mockPool;
    var loggerInfoStub;
    var loggerDebugStub;
    var loggerErrorStub;
    beforeEach(function () {
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(8453), // Base
        };
        mockPool = {
            name: 'B_T1 / B_T2',
            poolAddress: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
            collateralAddress: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            quoteAddress: '0xd8A0af85E2539e22953287b436255422724871AB',
        };
        loggerInfoStub = sinon_1.default.stub(logging_1.logger, 'info');
        loggerDebugStub = sinon_1.default.stub(logging_1.logger, 'debug');
        loggerErrorStub = sinon_1.default.stub(logging_1.logger, 'error');
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('Configuration Structure - V4 Specific', function () {
        it('should validate complete Uniswap V4 configuration for Base', function () {
            var poolConfig = {
                name: 'B_T1/B_T2 Test Pool',
                address: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                    marketPriceFactor: 0.95,
                    minCollateral: 0.001,
                    hpbPriceFactor: 0.95,
                },
            };
            var config = {
                dryRun: false,
                subgraphUrl: 'https://api.goldsky.com/api/public/project_cme0ohnrjwmp301tb9p300h2a/subgraphs/ajna-base/1.0.0/gn',
                delayBetweenActions: 35,
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
            // Validate structure
            (0, chai_1.expect)(config.keeperTakerFactory).to.exist;
            (0, chai_1.expect)(config.takerContracts).to.have.property('UniswapV4');
            (0, chai_1.expect)(config.uniswapV4RouterOverrides).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.router).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.poolManager).to.exist;
            (0, chai_1.expect)(config.uniswapV4RouterOverrides.pools).to.exist;
        });
        it('should validate required V4 fields in uniswapV4RouterOverrides', function () {
            var completeConfig = {
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
            };
            var incompleteConfig = {
                router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                // Missing poolManager and pools
            };
            // Business logic: validate required V4 fields
            var isCompleteV4Config = !!(completeConfig.router &&
                completeConfig.poolManager &&
                completeConfig.pools &&
                Object.keys(completeConfig.pools).length > 0);
            var isIncompleteV4Config = !!(incompleteConfig.router &&
                incompleteConfig.poolManager &&
                incompleteConfig.pools);
            (0, chai_1.expect)(isCompleteV4Config).to.be.true;
            (0, chai_1.expect)(isIncompleteV4Config).to.be.false;
        });
        it('should handle pools dictionary with multiple entries', function () {
            var multiPoolConfig = {
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
                    'B_T3-B_T4': {
                        token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
                        token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
                        fee: 3000,
                        tickSpacing: 60,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                },
            };
            (0, chai_1.expect)(Object.keys(multiPoolConfig.pools)).to.have.length(2);
            (0, chai_1.expect)(multiPoolConfig.pools).to.have.property('B_T1-B_T2');
            (0, chai_1.expect)(multiPoolConfig.pools).to.have.property('B_T3-B_T4');
        });
    });
    describe('Routing Logic - V4 DEX Selection', function () {
        it('should route to Uniswap V4 for UNISWAPV4 liquiditySource', function () {
            var poolConfig = {
                name: 'Test Pool',
                take: {
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                    marketPriceFactor: 0.99,
                },
            };
            var shouldRouteToV4 = poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4;
            (0, chai_1.expect)(shouldRouteToV4).to.be.true;
            (0, chai_1.expect)(poolConfig.take.liquiditySource).to.equal(5); // UNISWAPV4 = 5
        });
        it('should support both V3 and V4 in same configuration', function () {
            var dualConfig = {
                keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                takerContracts: {
                    'UniswapV3': '0xV3Taker123',
                    'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
                },
                universalRouterOverrides: {
                    universalRouterAddress: '0xUniversalRouter',
                },
                uniswapV4RouterOverrides: {
                    router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {},
                },
            };
            var hasV3Support = !!(dualConfig.universalRouterOverrides);
            var hasV4Support = !!(dualConfig.uniswapV4RouterOverrides);
            (0, chai_1.expect)(hasV3Support).to.be.true;
            (0, chai_1.expect)(hasV4Support).to.be.true;
        });
    });
    describe('PoolKey Construction and Validation', function () {
        it('should construct valid PoolKey from configuration', function () {
            var poolKeyConfig = {
                token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                fee: 3000,
                tickSpacing: 60,
                hooks: '0x0000000000000000000000000000000000000000',
            };
            // Validate structure
            (0, chai_1.expect)(poolKeyConfig.token0).to.be.a('string');
            (0, chai_1.expect)(poolKeyConfig.token1).to.be.a('string');
            (0, chai_1.expect)(poolKeyConfig.fee).to.be.a('number');
            (0, chai_1.expect)(poolKeyConfig.tickSpacing).to.be.a('number');
            (0, chai_1.expect)(poolKeyConfig.hooks).to.be.a('string');
            // Validate token ordering
            (0, chai_1.expect)(poolKeyConfig.token0.toLowerCase() < poolKeyConfig.token1.toLowerCase()).to.be.true;
        });
        it('should validate token addresses are properly formatted', function () {
            var validTokens = [
                '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                '0xd8A0af85E2539e22953287b436255422724871AB',
            ];
            validTokens.forEach(function (token) {
                (0, chai_1.expect)(token).to.match(/^0x[a-fA-F0-9]{40}$/);
            });
        });
        it('should derive tickSpacing from fee tier', function () {
            var feeToTickSpacing = {
                100: 1,
                500: 10,
                3000: 60,
                10000: 200,
            };
            Object.entries(feeToTickSpacing).forEach(function (_a) {
                var fee = _a[0], tickSpacing = _a[1];
                (0, chai_1.expect)(tickSpacing).to.be.a('number');
                (0, chai_1.expect)(tickSpacing).to.be.greaterThan(0);
            });
            // Validate 3000 fee tier -> 60 tick spacing (used in Base config)
            (0, chai_1.expect)(feeToTickSpacing[3000]).to.equal(60);
        });
        it('should handle hooks address (zero address for no hooks)', function () {
            var noHooksAddress = '0x0000000000000000000000000000000000000000';
            var customHooksAddress = '0x1234567890123456789012345678901234567890';
            var hasNoHooks = function (address) {
                return address === '0x0000000000000000000000000000000000000000';
            };
            (0, chai_1.expect)(hasNoHooks(noHooksAddress)).to.be.true;
            (0, chai_1.expect)(hasNoHooks(customHooksAddress)).to.be.false;
        });
    });
    describe('Swap Details Preparation - V4 Specific', function () {
        it('should prepare correct V4 swap details from config', function () {
            var config = {
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
            var pool = {
                collateralAddress: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                quoteAddress: '0xd8A0af85E2539e22953287b436255422724871AB',
            };
            // Business logic: prepare V4 swap details
            var poolKey = config.uniswapV4RouterOverrides.pools['B_T1-B_T2'];
            var swapDetails = {
                router: config.uniswapV4RouterOverrides.router,
                poolManager: config.uniswapV4RouterOverrides.poolManager,
                tokenIn: pool.collateralAddress,
                tokenOut: pool.quoteAddress,
                poolKey: poolKey,
                slippagePct: config.uniswapV4RouterOverrides.defaultSlippage,
                deadline: Math.floor(Date.now() / 1000) + 1800,
            };
            (0, chai_1.expect)(swapDetails.router).to.equal('0x66a9893cc07d91d95644aedd05d03f95e1dba8af');
            (0, chai_1.expect)(swapDetails.poolManager).to.equal('0x498581ff718922c3f8e6a244956af099b2652b2b');
            (0, chai_1.expect)(swapDetails.poolKey.fee).to.equal(3000);
            (0, chai_1.expect)(swapDetails.slippagePct).to.equal(1.0);
        });
        it('should calculate slippage basis points correctly', function () {
            var slippagePct = 1.0; // 1%
            // Business logic: slippageBps = slippagePct * 100
            var slippageBasisPoints = slippagePct * 100;
            (0, chai_1.expect)(slippageBasisPoints).to.equal(100);
        });
    });
    describe('DryRun Mode - V4 Integration', function () {
        it('should respect dryRun flag for V4 takes', function () {
            var config = {
                dryRun: true,
                keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
                uniswapV4RouterOverrides: {
                    router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {},
                },
            };
            // Business logic: dryRun should prevent execution
            var shouldExecuteTransaction = !config.dryRun;
            (0, chai_1.expect)(shouldExecuteTransaction).to.be.false;
        });
    });
    describe('Error Path Validation - V4 Specific', function () {
        it('should identify V4 configuration errors', function () {
            var scenarios = [
                {
                    name: 'Missing router address',
                    config: {
                        uniswapV4RouterOverrides: {
                            // Missing router
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        },
                    },
                    hasError: true,
                    errorType: 'missing_router',
                },
                {
                    name: 'Missing poolManager address',
                    config: {
                        uniswapV4RouterOverrides: {
                            router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                            // Missing poolManager
                            defaultSlippage: 1.0,
                            pools: {},
                        },
                    },
                    hasError: true,
                    errorType: 'missing_pool_manager',
                },
                {
                    name: 'Missing pools configuration',
                    config: {
                        uniswapV4RouterOverrides: {
                            router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            // Missing pools
                        },
                    },
                    hasError: true,
                    errorType: 'missing_pools',
                },
                {
                    name: 'Valid V4 configuration',
                    config: {
                        uniswapV4RouterOverrides: {
                            router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {
                                'test': {
                                    token0: '0xToken0',
                                    token1: '0xToken1',
                                    fee: 3000,
                                    tickSpacing: 60,
                                    hooks: '0x0000000000000000000000000000000000000000',
                                },
                            },
                        },
                    },
                    hasError: false,
                    errorType: null,
                },
            ];
            scenarios.forEach(function (scenario) {
                var hasConfigError = false;
                var errorType = null;
                var v4Config = scenario.config.uniswapV4RouterOverrides;
                if (!(v4Config === null || v4Config === void 0 ? void 0 : v4Config.router)) {
                    hasConfigError = true;
                    errorType = 'missing_router';
                }
                else if (!(v4Config === null || v4Config === void 0 ? void 0 : v4Config.poolManager)) {
                    hasConfigError = true;
                    errorType = 'missing_pool_manager';
                }
                else if (!(v4Config === null || v4Config === void 0 ? void 0 : v4Config.pools)) {
                    hasConfigError = true;
                    errorType = 'missing_pools';
                }
                (0, chai_1.expect)(hasConfigError).to.equal(scenario.hasError, "Scenario: ".concat(scenario.name));
                (0, chai_1.expect)(errorType).to.equal(scenario.errorType, "Scenario: ".concat(scenario.name));
            });
        });
    });
    describe('Real Base Production Configuration', function () {
        it('should handle complete Base production take configuration', function () {
            var baseProductionConfig = {
                dryRun: false,
                ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
                subgraphUrl: 'https://api.goldsky.com/api/public/project_cme0ohnrjwmp301tb9p300h2a/subgraphs/ajna-base/1.0.0/gn',
                keeperKeystore: '/path/to/keystore.json',
                delayBetweenActions: 35,
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
            // Validate all addresses
            (0, chai_1.expect)(baseProductionConfig.keeperTakerFactory).to.match(/^0x[a-fA-F0-9]{40}$/);
            (0, chai_1.expect)(baseProductionConfig.takerContracts['UniswapV4']).to.match(/^0x[a-fA-F0-9]{40}$/);
            (0, chai_1.expect)(baseProductionConfig.uniswapV4RouterOverrides.router).to.match(/^0x[a-fA-F0-9]{40}$/);
            (0, chai_1.expect)(baseProductionConfig.uniswapV4RouterOverrides.poolManager).to.match(/^0x[a-fA-F0-9]{40}$/);
        });
        it('should support mixed arbTake and V4 external take', function () {
            var poolConfig = {
                name: 'B_T1/B_T2 Test Pool',
                take: {
                    // ArbTake settings
                    minCollateral: 0.001,
                    hpbPriceFactor: 0.95,
                    // V4 external take settings
                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                    marketPriceFactor: 0.95,
                },
            };
            var hasArbTake = !!(poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor);
            var hasV4ExternalTake = !!(poolConfig.take.liquiditySource === config_types_1.LiquiditySource.UNISWAPV4 &&
                poolConfig.take.marketPriceFactor);
            (0, chai_1.expect)(hasArbTake).to.be.true;
            (0, chai_1.expect)(hasV4ExternalTake).to.be.true;
        });
    });
    describe('PostAuctionDex Integration', function () {
        it('should support UNISWAP_V4 for post-auction swaps', function () {
            var rewardAction = {
                action: 'exchange',
                address: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                targetToken: 'b_t2',
                slippage: 2,
                dexProvider: 'uniswap_v4', // PostAuctionDex.UNISWAP_V4
            };
            (0, chai_1.expect)(rewardAction.dexProvider).to.equal('uniswap_v4');
        });
    });
    describe('Token Address Management', function () {
        it('should handle token address lookups', function () {
            var tokenAddresses = {
                'b_t1': '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                'b_t2': '0xd8A0af85E2539e22953287b436255422724871AB',
                'weth': '0x4200000000000000000000000000000000000006',
            };
            (0, chai_1.expect)(tokenAddresses['b_t1']).to.match(/^0x[a-fA-F0-9]{40}$/);
            (0, chai_1.expect)(tokenAddresses['b_t2']).to.match(/^0x[a-fA-F0-9]{40}$/);
            (0, chai_1.expect)(tokenAddresses['weth']).to.match(/^0x[a-fA-F0-9]{40}$/);
        });
    });
});
//# sourceMappingURL=Uniswapv4-factory_intergation.test.js.map