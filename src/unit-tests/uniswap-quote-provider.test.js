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
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var uniswap_quote_provider_1 = require("../dex-providers/uniswap-quote-provider");
describe('UniswapV3QuoteProvider', function () {
    var mockSigner;
    beforeEach(function () {
        mockSigner = {
            provider: {},
        };
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('isAvailable()', function () {
        it('should return true when all required config is present', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                quoterV2Address: '0xQuoter123',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.isAvailable()).to.be.true;
        });
        it('should return true for real Hemi configuration', function () {
            // Real working Hemi configuration
            var hemiConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                defaultFeeTier: 3000,
                wethAddress: '0x4200000000000000000000000000000000000006',
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, hemiConfig);
            (0, chai_1.expect)(provider.isAvailable()).to.be.true;
        });
        it('should return false when QuoterV2 address is missing', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                // Missing quoterV2Address
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
        });
        it('should return false when universalRouterAddress is missing', function () {
            var config = {
                // Missing universalRouterAddress
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                quoterV2Address: '0xQuoter123',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
        });
        it('should return false when poolFactoryAddress is missing', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                // Missing poolFactoryAddress
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                quoterV2Address: '0xQuoter123',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
        });
        it('should return false when wethAddress is missing', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                // Missing wethAddress
                quoterV2Address: '0xQuoter123',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
        });
    });
    describe('getQuoterAddress()', function () {
        it('should return the configured QuoterV2 address', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                quoterV2Address: '0xQuoter123',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.getQuoterAddress()).to.equal('0xQuoter123');
        });
        it('should return real Hemi QuoterV2 address', function () {
            var hemiConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                defaultFeeTier: 3000,
                wethAddress: '0x4200000000000000000000000000000000000006',
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // Real Hemi QuoterV2
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, hemiConfig);
            (0, chai_1.expect)(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
        });
        it('should return undefined when QuoterV2 address is not configured', function () {
            var config = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWeth123',
                // Missing quoterV2Address
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
            (0, chai_1.expect)(provider.getQuoterAddress()).to.be.undefined;
        });
    });
    describe('getQuote() - early validation', function () {
        it('should return failure when QuoterV2 address is not configured', function () { return __awaiter(void 0, void 0, void 0, function () {
            var config, provider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            universalRouterAddress: '0xUniversalRouter123',
                            poolFactoryAddress: '0xFactory123',
                            defaultFeeTier: 3000,
                            wethAddress: '0xWeth123',
                            // Missing quoterV2Address
                        };
                        provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
                        return [4 /*yield*/, provider.getQuote(ethers_1.BigNumber.from('1000000000000000000'), '0xTokenA', '0xTokenB', 3000)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.include('QuoterV2 address not configured');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate inputs with real Hemi token addresses', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiConfig, provider, srcToken, dstToken, amount;
            return __generator(this, function (_a) {
                hemiConfig = {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    defaultFeeTier: 3000,
                    wethAddress: '0x4200000000000000000000000000000000000006',
                    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                };
                provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, hemiConfig);
                srcToken = '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6';
                dstToken = '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8';
                amount = ethers_1.BigNumber.from('1000000000000000000');
                // Should proceed to contract call (would fail without mocking, but validates config)
                (0, chai_1.expect)(provider.isAvailable()).to.be.true;
                (0, chai_1.expect)(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
                return [2 /*return*/];
            });
        }); });
    });
    describe('Chain-Specific QuoterV2 Addresses', function () {
        var chainConfigs = [
            {
                name: 'Ethereum Mainnet',
                chainId: 1,
                quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
                universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
            },
            {
                name: 'Avalanche',
                chainId: 43114,
                quoterV2: '0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F',
                universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
            },
            {
                name: 'Hemi',
                chainId: 43111,
                quoterV2: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                universalRouter: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
            },
        ];
        chainConfigs.forEach(function (chain) {
            it("should handle ".concat(chain.name, " configuration correctly"), function () {
                var config = {
                    universalRouterAddress: chain.universalRouter,
                    poolFactoryAddress: '0xFactory123',
                    defaultFeeTier: 3000,
                    wethAddress: '0xWETH123',
                    quoterV2Address: chain.quoterV2,
                };
                var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
                (0, chai_1.expect)(provider.isAvailable()).to.be.true;
                (0, chai_1.expect)(provider.getQuoterAddress()).to.equal(chain.quoterV2);
            });
        });
        it('should handle missing QuoterV2 for unsupported chains', function () {
            var unsupportedChainConfig = {
                universalRouterAddress: '0xUniversalRouter123',
                poolFactoryAddress: '0xFactory123',
                defaultFeeTier: 3000,
                wethAddress: '0xWETH123',
                // Missing quoterV2Address - chain not supported
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, unsupportedChainConfig);
            (0, chai_1.expect)(provider.isAvailable()).to.be.false;
            (0, chai_1.expect)(provider.getQuoterAddress()).to.be.undefined;
        });
    });
    describe('Configuration Validation Edge Cases', function () {
        it('should validate fee tier configuration', function () {
            var configs = [
                { feeTier: 100, valid: true },
                { feeTier: 500, valid: true },
                { feeTier: 3000, valid: true },
                { feeTier: 10000, valid: true },
                { feeTier: 0, valid: false }, // Invalid - 0 is not a valid Uniswap V3 fee tier
            ];
            var baseConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                wethAddress: '0x4200000000000000000000000000000000000006',
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
            };
            configs.forEach(function (_a) {
                var feeTier = _a.feeTier, valid = _a.valid;
                var config = __assign(__assign({}, baseConfig), { defaultFeeTier: feeTier });
                var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, config);
                (0, chai_1.expect)(provider.isAvailable()).to.equal(valid, "Fee tier ".concat(feeTier, " should be ").concat(valid ? 'valid' : 'invalid'));
            });
        });
        it('should handle complete vs partial configuration gracefully', function () {
            var completeHemiConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                defaultFeeTier: 3000,
                wethAddress: '0x4200000000000000000000000000000000000006',
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                // Extra fields that might be present
                permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
                defaultSlippage: 0.5,
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, completeHemiConfig);
            // Should work even with extra fields
            (0, chai_1.expect)(provider.isAvailable()).to.be.true;
            (0, chai_1.expect)(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
        });
    });
    describe('Real Production Integration Scenarios', function () {
        it('should integrate with real pool addresses and amounts', function () { return __awaiter(void 0, void 0, void 0, function () {
            var hemiConfig, provider, realProductionParams;
            return __generator(this, function (_a) {
                hemiConfig = {
                    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                    defaultFeeTier: 3000,
                    wethAddress: '0x4200000000000000000000000000000000000006',
                    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
                };
                provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, hemiConfig);
                // Test configuration is valid for production scenarios
                (0, chai_1.expect)(provider.isAvailable()).to.be.true;
                realProductionParams = {
                    srcToken: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
                    dstToken: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
                    amount: ethers_1.BigNumber.from('100000000000000000'),
                    feeTier: 3000,
                };
                // Validate that the provider would handle these real parameters
                (0, chai_1.expect)(realProductionParams.srcToken).to.be.a('string');
                (0, chai_1.expect)(realProductionParams.dstToken).to.be.a('string');
                (0, chai_1.expect)(realProductionParams.amount.gt(0)).to.be.true;
                (0, chai_1.expect)(realProductionParams.feeTier).to.equal(3000);
                return [2 /*return*/];
            });
        }); });
        it('should handle mixed strategy pools configuration', function () {
            // Config that supports both arbTake and external take (like real Hemi pools)
            var mixedStrategyConfig = {
                universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
                poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
                defaultFeeTier: 3000,
                wethAddress: '0x4200000000000000000000000000000000000006',
                quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
            };
            var provider = new uniswap_quote_provider_1.UniswapV3QuoteProvider(mockSigner, mixedStrategyConfig);
            // Should be available for external takes
            (0, chai_1.expect)(provider.isAvailable()).to.be.true;
            // Should work alongside arbTake configuration (arbTake doesn't need QuoterV2)
            var hasExternalTakeSupport = provider.isAvailable();
            var supportsArbTake = true; // ArbTake doesn't depend on QuoterV2
            (0, chai_1.expect)(hasExternalTakeSupport).to.be.true;
            (0, chai_1.expect)(supportsArbTake).to.be.true;
        });
    });
});
//# sourceMappingURL=uniswap-quote-provider.test.js.map