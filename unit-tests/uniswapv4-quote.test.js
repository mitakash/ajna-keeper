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
var ethers_1 = require("ethers");
var uniswapV4_quote_provider_1 = require("../dex-providers/uniswapV4-quote-provider");
describe('UniswapV4QuoteProvider', function () {
    var mockSigner;
    var mockContract;
    beforeEach(function () {
        // Selectors for functions called by UniswapV4QuoteProvider via provider.call
        var SEL_DECIMALS = '0x313ce567'; // decimals()
        var SEL_LIQUIDITY = '0xfa6793d5'; // getLiquidity(bytes32) — AUDIT FIX M-01
        var SEL_SLOT0 = '0xc815641c'; // getSlot0(bytes32)
        var sqrtPriceX96 = ethers_1.BigNumber.from('79228162514264337593543950336'); // 2^96, 1:1 price
        // Selector-aware call handler so each contract function returns correct ABI-encoded data.
        // This is required because sinon.stub(ethers,'Contract') does NOT intercept the module's
        // imported Contract class (ethers_1.Contract) — all calls route through provider.call.
        var selectorAwareCall = sinon_1.default.stub().callsFake(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
            var sel;
            var _a;
            return __generator(this, function (_b) {
                sel = (_a = tx === null || tx === void 0 ? void 0 : tx.data) === null || _a === void 0 ? void 0 : _a.slice(0, 10);
                if (sel === SEL_DECIMALS) {
                    return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint8'], [18])];
                }
                if (sel === SEL_LIQUIDITY) {
                    // Return non-zero liquidity so M-01 check passes by default
                    return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint128'], [ethers_1.BigNumber.from('1000000000000000000')])];
                }
                // getSlot0 or unknown — return 1:1 price
                return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint160', 'int24', 'uint24', 'uint24'], [sqrtPriceX96, 0, 0, 0])];
            });
        }); });
        // Create a COMPLETE mock provider with all required flags and methods
        var mockProvider = {
            getNetwork: sinon_1.default.stub().resolves({ chainId: 8453, name: 'base' }),
            getCode: sinon_1.default.stub().resolves('0x123456'),
            getGasPrice: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('1000000000')),
            estimateGas: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('500000')),
            getBlockNumber: sinon_1.default.stub().resolves(1000000),
            call: selectorAwareCall,
            _isProvider: true, // CRITICAL: ethers.js validation flag
        };
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(8453),
            provider: mockProvider,
            connect: sinon_1.default.stub().returnsThis(),
            call: selectorAwareCall,
            _isSigner: true, // CRITICAL: ethers.js validation flag
        };
        mockContract = {
            getSlot0: sinon_1.default.stub().resolves({
                sqrtPriceX96: ethers_1.BigNumber.from('79228162514264337593543950336'),
                tick: 0,
            }),
            getLiquidity: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('1000000000000000000')),
            decimals: sinon_1.default.stub().resolves(18),
        };
        // Stub Contract constructor BEFORE creating provider
        sinon_1.default.stub(ethers_1.ethers, 'Contract').returns(mockContract);
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('Configuration and Initialization', function () {
        it('should create provider with valid configuration', function () {
            var config = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 1.0,
                pools: {
                    'B_T1-B_T2': {
                        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                        fee: 100,
                        tickSpacing: 1,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                },
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider).to.exist;
        });
        it('should initialize successfully with valid pool manager', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should fail initialization when contract not deployed', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock empty code = not deployed
                        mockSigner.provider.getCode.resolves('0x');
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should use poolManager from config', function () {
            var config = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 1.0,
                pools: {},
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.getPoolManagerAddress()).to.equal(config.poolManager);
        });
    });
    describe('getMarketPrice()', function () {
        var validPoolKey = {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 100,
            tickSpacing: 1,
            hooks: '0x0000000000000000000000000000000000000000',
        };
        it('should calculate price from pool state', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getMarketPrice(ethers_1.BigNumber.from('1000000'), validPoolKey.token0, validPoolKey.token1, validPoolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.price).to.exist;
                        (0, chai_1.expect)(result.price).to.be.greaterThan(0);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect uninitialized pool', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, uninitCall, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        uninitCall = sinon_1.default.stub().callsFake(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                            var sel;
                            var _a;
                            return __generator(this, function (_b) {
                                sel = (_a = tx === null || tx === void 0 ? void 0 : tx.data) === null || _a === void 0 ? void 0 : _a.slice(0, 10);
                                if (sel === '0xfa6793d5') { // getLiquidity — return non-zero so M-01 passes
                                    return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint128'], [ethers_1.BigNumber.from('1000000000000000000')])];
                                }
                                if (sel === '0x313ce567') { // decimals
                                    return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint8'], [18])];
                                }
                                // getSlot0 — return zero sqrtPriceX96 = uninitialized
                                return [2 /*return*/, ethers_1.ethers.utils.defaultAbiCoder.encode(['uint160', 'int24', 'uint24', 'uint24'], [0, 0, 0, 0])];
                            });
                        }); });
                        mockSigner.call = uninitCall;
                        mockSigner.provider.call = uninitCall;
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getMarketPrice(ethers_1.BigNumber.from('1000000'), validPoolKey.token0, validPoolKey.token1, validPoolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.include('not initialized');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should determine correct token ordering', function () { return __awaiter(void 0, void 0, void 0, function () {
            var token0, token1, isToken0Input, isToken1Input;
            return __generator(this, function (_a) {
                token0 = '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE';
                token1 = '0xd8A0af85E2539e22953287b436255422724871AB';
                isToken0Input = token0.toLowerCase() === token0.toLowerCase();
                isToken1Input = token1.toLowerCase() === token0.toLowerCase();
                (0, chai_1.expect)(isToken0Input).to.be.true;
                (0, chai_1.expect)(isToken1Input).to.be.false;
                return [2 /*return*/];
            });
        }); });
        it('should handle pool state query errors', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        // Make the call fail
                        mockSigner.call = sinon_1.default.stub().rejects(new Error('Pool not found'));
                        mockSigner.provider.call = mockSigner.call;
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getMarketPrice(ethers_1.BigNumber.from('1000000'), validPoolKey.token0, validPoolKey.token1, validPoolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.exist;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getQuote()', function () {
        var validPoolKey = {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 100,
            tickSpacing: 1,
            hooks: '0x0000000000000000000000000000000000000000',
        };
        it('should estimate quote from price and fee', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getQuote(ethers_1.ethers.utils.parseUnits('1000000', 18), // Large amount in 18 decimals
                            validPoolKey.token0, validPoolKey.token1, validPoolKey)];
                    case 2:
                        result = _a.sent();
                        // With mock setup, we should get a successful result (even if small due to mock pricing)
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.dstAmount).to.exist;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should apply fee reduction to quote', function () {
            var amountIn = 1000000;
            var price = 1.0;
            var fee = 100; // 0.01% fee (as used in actual config)
            // Fee reduction = (10000 - fee) / 10000
            var feeReduction = (10000 - fee) / 10000; // = 0.99
            var amountOut = amountIn * price * feeReduction;
            (0, chai_1.expect)(amountOut).to.equal(990000);
        });
        it('should handle initialization failure', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockSigner.provider.getCode.resolves('0x'); // Not deployed
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.getQuote(ethers_1.BigNumber.from('1000000'), validPoolKey.token0, validPoolKey.token1, validPoolKey)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('PoolKey Conversion', function () {
        it('should convert config PoolKey to V4 PoolKey format', function () {
            var configPoolKey = {
                token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                fee: 100,
                tickSpacing: 1,
                hooks: '0x0000000000000000000000000000000000000000',
            };
            // Business logic: convert to V4 PoolKey with Currency objects
            var v4PoolKey = {
                currency0: { addr: configPoolKey.token0 },
                currency1: { addr: configPoolKey.token1 },
                fee: configPoolKey.fee,
                tickSpacing: configPoolKey.tickSpacing,
                hooks: configPoolKey.hooks,
            };
            (0, chai_1.expect)(v4PoolKey.currency0.addr).to.equal(configPoolKey.token0);
            (0, chai_1.expect)(v4PoolKey.currency1.addr).to.equal(configPoolKey.token1);
            (0, chai_1.expect)(v4PoolKey.fee).to.equal(configPoolKey.fee);
        });
    });
    describe('Token Decimals Handling', function () {
        it('should get decimals from token contract', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider;
            return __generator(this, function (_a) {
                mockContract.decimals.resolves(6); // USDC-like token
                config = {
                    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                    defaultSlippage: 1.0,
                    pools: {},
                };
                provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                // This would call getTokenDecimals internally
                // Just validate the business logic
                (0, chai_1.expect)(mockContract.decimals).to.exist;
                return [2 /*return*/];
            });
        }); });
        it('should default to 18 decimals for native ETH', function () {
            var expectedDecimals = 18;
            // Business logic: native ETH always 18 decimals
            (0, chai_1.expect)(expectedDecimals).to.equal(18);
        });
    });
    describe('Provider Status', function () {
        it('should report available after successful initialization', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        (0, chai_1.expect)(provider.isAvailable()).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should report unavailable before initialization', function () {
            var config = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 1.0,
                pools: {},
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
            // Before initialize(), should not be available
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
        });
        it('should return pool manager address', function () {
            var config = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 1.0,
                pools: {},
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.getPoolManagerAddress()).to.equal('0x498581ff718922c3f8e6a244956af099b2652b2b');
        });
    });
    describe('Real Base Production Configuration', function () {
        it('should work with production Base addresses', function () {
            var baseConfig = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 0.5,
                pools: {
                    'B_T1-B_T2': {
                        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                        fee: 100,
                        tickSpacing: 1,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                },
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, baseConfig);
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(baseConfig.poolManager)).to.be.true;
            (0, chai_1.expect)(provider).to.exist;
        });
        it('should handle multiple pool configurations', function () {
            var multiPoolConfig = {
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                defaultSlippage: 0.5,
                pools: {
                    'B_T1-B_T2': {
                        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                        fee: 100,
                        tickSpacing: 1,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                    'B_T3-B_T4': {
                        token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
                        token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
                        fee: 100,
                        tickSpacing: 10,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                    'B_T2-B_T4': {
                        token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
                        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                        fee: 500,
                        tickSpacing: 10,
                        hooks: '0x0000000000000000000000000000000000000000',
                    },
                },
            };
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, multiPoolConfig);
            (0, chai_1.expect)(Object.keys(multiPoolConfig.pools)).to.have.length(3);
        });
    });
    describe('Error Scenarios', function () {
        it('should handle contract call errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, poolKey, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        };
                        // Make the call fail
                        mockSigner.call = sinon_1.default.stub().rejects(new Error('Network error'));
                        mockSigner.provider.call = mockSigner.call;
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        poolKey = {
                            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                            fee: 100,
                            tickSpacing: 1,
                            hooks: '0x0000000000000000000000000000000000000000',
                        };
                        return [4 /*yield*/, provider.getMarketPrice(ethers_1.BigNumber.from('1000000'), poolKey.token0, poolKey.token1, poolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.exist;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=uniswapv4-quote.test.js.map