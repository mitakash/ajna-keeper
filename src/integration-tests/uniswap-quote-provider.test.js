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
var uniswap_quote_provider_1 = require("../dex-providers/uniswap-quote-provider");
describe('Uniswap V3 Quote Provider', function () {
    var mockSigner;
    var quoteProvider;
    var validConfig;
    beforeEach(function () {
        // Reset sinon after each test
        sinon_1.default.restore();
        // Create basic mock signer
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(43114),
            provider: {
                getCode: sinon_1.default.stub().resolves('0x1234'), // Mock contract exists
            }
        };
        // Valid Uniswap V3 configuration (based on your Hemi config)
        validConfig = {
            universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
            poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
            defaultFeeTier: 3000,
            wethAddress: '0x4200000000000000000000000000000000000006',
            quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        };
    });
    it('should create Uniswap V3 quote provider with valid configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, validConfig);
            (0, chai_1.expect)(quoteProvider).to.be.instanceOf(uniswap_quote_provider_1.UniswapV3QuoteProvider);
            (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
            return [2 /*return*/];
        });
    }); });
    it('should detect available configuration correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, validConfig);
            (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.true;
            return [2 /*return*/];
        });
    }); });
    it('should detect incomplete configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
        var incompleteConfig;
        return __generator(this, function (_a) {
            incompleteConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                // Missing required fields
            };
            quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, incompleteConfig);
            (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.false;
            return [2 /*return*/];
        });
    }); });
    it('should handle quote requests gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, validConfig);
                    return [4 /*yield*/, quoteProvider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), // 1 ETH
                        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                        '0x4200000000000000000000000000000000000006', // WETH
                        3000 // 0.3% fee tier
                        )];
                case 1:
                    result = _a.sent();
                    // Since we can't mock the full QuoterV2 contract interaction, expect it to fail gracefully
                    (0, chai_1.expect)(result.success).to.be.false;
                    (0, chai_1.expect)(result.error).to.be.a('string');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle missing QuoterV2 configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
        var configWithoutQuoter, providerWithoutQuoter, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    configWithoutQuoter = {
                        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                        defaultFeeTier: 3000,
                        wethAddress: '0x4200000000000000000000000000000000000006',
                        // Missing quoterV2Address
                    };
                    providerWithoutQuoter = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, configWithoutQuoter);
                    (0, chai_1.expect)(providerWithoutQuoter.isAvailable()).to.be.false;
                    return [4 /*yield*/, providerWithoutQuoter.getQuote(ethers_1.BigNumber.from('1000000000000000000'), '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006')];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.success).to.be.false;
                    (0, chai_1.expect)(result.error).to.include('QuoterV2 address not configured');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle different chain configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
        var hemiProvider, mainnetConfig, mainnetProvider;
        return __generator(this, function (_a) {
            hemiProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, validConfig);
            (0, chai_1.expect)(hemiProvider.isAvailable()).to.be.true;
            (0, chai_1.expect)(hemiProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
            mainnetConfig = {
                universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                defaultFeeTier: 3000,
                wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
            };
            mainnetProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, mainnetConfig);
            (0, chai_1.expect)(mainnetProvider.isAvailable()).to.be.true;
            (0, chai_1.expect)(mainnetProvider.getQuoterAddress()).to.equal(mainnetConfig.quoterV2Address);
            return [2 /*return*/];
        });
    }); });
    it('should provide interface compatible with factory take logic', function () { return __awaiter(void 0, void 0, void 0, function () {
        var quotePromise, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, validConfig);
                    // Test the methods that factory takes would use
                    (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.a('boolean');
                    (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.be.a('string');
                    quotePromise = quoteProvider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006', 3000);
                    (0, chai_1.expect)(quotePromise).to.be.instanceOf(Promise);
                    return [4 /*yield*/, quotePromise];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result).to.have.property('success');
                    (0, chai_1.expect)(result).to.have.property('error');
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=uniswap-quote-provider.test.js.map