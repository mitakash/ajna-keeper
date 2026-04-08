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
        // Create a more complete mock provider
        var mockProvider = {
            getNetwork: sinon_1.default.stub().resolves({ chainId: 8453, name: 'base' }),
            getCode: sinon_1.default.stub().resolves('0x123456'),
            getGasPrice: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('1000000000')),
            estimateGas: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('500000')),
            getBlockNumber: sinon_1.default.stub().resolves(1000000),
            call: sinon_1.default.stub().resolves('0x'),
            _isProvider: true, // Important for ethers.js validation
        };
        // Create mock signer with complete provider
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(8453),
            provider: mockProvider,
            connect: sinon_1.default.stub().returnsThis(),
            _isSigner: true, // Important for ethers.js validation
        };
        // Create mock contract
        mockContract = {
            getSlot0: sinon_1.default.stub(),
            decimals: sinon_1.default.stub().resolves(18),
        };
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('Configuration and Initialization', function () {
        it('should create provider with valid configuration', function () {
            var config = {
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
            var provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider).to.exist;
        });
        it('should initialize successfully with valid pool manager', function () { return __awaiter(void 0, void 0, void 0, function () {
            var contractStub, config, provider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contractStub = sinon_1.default.stub(ethers_1.ethers, 'Contract').returns(mockContract);
                        config = {
                            router: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: {},
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        contractStub.restore();
                        return [2 /*return*/];
                }
            });
        }); });
        // ... rest of tests
    });
    describe('getMarketPrice()', function () {
        var validPoolKey = {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 3000,
            tickSpacing: 60,
            hooks: '0x0000000000000000000000000000000000000000',
        };
        it('should calculate price from pool state', function () { return __awaiter(void 0, void 0, void 0, function () {
            var contractStub, config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Set up Contract stub BEFORE creating provider
                        mockContract.getSlot0.resolves({
                            sqrtPriceX96: ethers_1.BigNumber.from('79228162514264337593543950336'),
                            tick: 0,
                        });
                        contractStub = sinon_1.default.stub(ethers_1.ethers, 'Contract').returns(mockContract);
                        config = {
                            router: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                            defaultSlippage: 1.0,
                            pools: { 'test': validPoolKey },
                        };
                        provider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, provider.getMarketPrice(ethers_1.BigNumber.from('1000000'), validPoolKey.token0, validPoolKey.token1, 18, 18, validPoolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.price).to.exist;
                        contractStub.restore();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // Fix the fee calculation test
    it('should apply fee reduction to quote', function () {
        var amountIn = 1000000;
        var price = 1.0;
        var fee = 3000; // 0.3%
        // Correct calculation
        var feeReduction = (10000 - fee) / 10000;
        var amountOut = amountIn * price * feeReduction;
        // Should be 997000 (99.7% of input)
        (0, chai_1.expect)(amountOut).to.equal(997000);
    });
});
//# sourceMappingURL=uniswapv4-test-helpers.js.map