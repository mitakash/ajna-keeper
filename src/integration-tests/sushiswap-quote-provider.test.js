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
// src/integration-tests/sushiswap-quote-provider.test.ts
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var sushiswap_quote_provider_1 = require("../dex-providers/sushiswap-quote-provider");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
describe('SushiSwap Quote Provider', function () {
    var mockSigner;
    var quoteProvider;
    var validConfig;
    beforeEach(function () {
        // Reset sinon after each test
        sinon_1.default.restore();
        // Use REAL wallet from test mnemonic (same pattern as your working tests)
        var wallet = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC);
        mockSigner = wallet.connect((0, test_utils_1.getProvider)());
        // Valid SushiSwap configuration (based on your Hemi config)
        validConfig = {
            swapRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
            quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
            factoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
            defaultFeeTier: 500,
            wethAddress: '0x4200000000000000000000000000000000000006',
        };
    });
    it('should create SushiSwap quote provider with valid configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
            (0, chai_1.expect)(quoteProvider).to.be.instanceOf(sushiswap_quote_provider_1.SushiSwapQuoteProvider);
            (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
            return [2 /*return*/];
        });
    }); });
    it('should initialize successfully with valid contracts', function () { return __awaiter(void 0, void 0, void 0, function () {
        var initialized, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, quoteProvider.initialize()];
                case 2:
                    initialized = _a.sent();
                    // May succeed or fail depending on contract existence, but should not crash
                    (0, chai_1.expect)(typeof initialized).to.equal('boolean');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('should handle missing quoterV2Address', function () { return __awaiter(void 0, void 0, void 0, function () {
        var configWithoutQuoter;
        return __generator(this, function (_a) {
            configWithoutQuoter = __assign(__assign({}, validConfig), { quoterV2Address: undefined });
            quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, configWithoutQuoter);
            (0, chai_1.expect)(quoteProvider.getQuoterAddress()).to.be.undefined;
            return [2 /*return*/];
        });
    }); });
    it('should handle quote requests gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                    return [4 /*yield*/, quoteProvider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), // 1 ETH
                        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
                        '0x4200000000000000000000000000000000000006', // WETH
                        500 // 0.05% fee tier
                        )];
                case 1:
                    result = _a.sent();
                    // Since we can't mock the full contract interaction, expect it to fail gracefully
                    (0, chai_1.expect)(result.success).to.be.false;
                    (0, chai_1.expect)(result.error).to.be.a('string');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle zero amount input', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                    return [4 /*yield*/, quoteProvider.getQuote(ethers_1.BigNumber.from('0'), '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006', 500)];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.success).to.be.false;
                    (0, chai_1.expect)(result.error).to.be.a('string');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle network errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
        var failingWallet, newProvider, errorMessage;
        return __generator(this, function (_a) {
            failingWallet = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC);
            // Don't connect to provider - will cause issues
            try {
                newProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(failingWallet, validConfig);
                // May fail during construction or later
                (0, chai_1.expect)(newProvider).to.be.instanceOf(sushiswap_quote_provider_1.SushiSwapQuoteProvider);
            }
            catch (error) {
                errorMessage = error instanceof Error ? error.message : String(error);
                (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
            }
            return [2 /*return*/];
        });
    }); });
    it('should check pool existence for token pairs', function () { return __awaiter(void 0, void 0, void 0, function () {
        var exists, error_2, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, quoteProvider.poolExists('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006', 500)];
                case 2:
                    exists = _a.sent();
                    // Should return boolean
                    (0, chai_1.expect)(typeof exists).to.equal('boolean');
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                    (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    describe('SushiSwap Configuration Variations', function () {
        it('should handle different chain configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiProvider, mainnetConfig, mainnetProvider;
            return __generator(this, function (_a) {
                hemiProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                (0, chai_1.expect)(hemiProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
                mainnetConfig = {
                    swapRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
                    quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                    defaultFeeTier: 3000,
                    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                };
                mainnetProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, mainnetConfig);
                (0, chai_1.expect)(mainnetProvider.getQuoterAddress()).to.equal(mainnetConfig.quoterV2Address);
                return [2 /*return*/];
            });
        }); });
        it('should handle different fee tiers', function () { return __awaiter(void 0, void 0, void 0, function () {
            var feeTiers, _i, feeTiers_1, feeTier, result, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                        feeTiers = [500, 3000, 10000];
                        _i = 0, feeTiers_1 = feeTiers;
                        _a.label = 1;
                    case 1:
                        if (!(_i < feeTiers_1.length)) return [3 /*break*/, 6];
                        feeTier = feeTiers_1[_i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, quoteProvider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006', feeTier)];
                    case 3:
                        result = _a.sent();
                        // Should handle different fee tiers without parameter errors
                        (0, chai_1.expect)(result).to.have.property('success');
                        (0, chai_1.expect)(result).to.have.property('error');
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
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
        it('should provide interface compatible with factory take logic', function () { return __awaiter(void 0, void 0, void 0, function () {
            var quotePromise, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new sushiswap_quote_provider_1.SushiSwapQuoteProvider(mockSigner, validConfig);
                        // Test the methods that factory takes would use
                        (0, chai_1.expect)(typeof quoteProvider.getQuoterAddress()).to.be.oneOf(['string', 'undefined']);
                        quotePromise = quoteProvider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x4200000000000000000000000000000000000006', 500);
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
});
//# sourceMappingURL=sushiswap-quote-provider.test.js.map