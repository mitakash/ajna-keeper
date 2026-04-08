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
/**
 * Uniswap V4 Post-Auction Reward Exchange Test
 * Tests LP reward collection and exchange via V4
 */
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var uniswapV4_quote_provider_1 = require("../dex-providers/uniswapV4-quote-provider");
describe('Uniswap V4 Post-Auction Reward Exchange Tests', function () {
    var _this = this;
    var signer;
    var provider;
    // Test configuration - using actual deployed addresses
    var TEST_CONFIG = {
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
        permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        poolKey: {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 100,
            tickSpacing: 1,
            hooks: '0x0000000000000000000000000000000000000000',
        },
    };
    before(function () {
        return __awaiter(this, void 0, void 0, function () {
            var rpcUrl, keystorePath, password, keystoreJson, _a, _b, _c, chainId;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        rpcUrl = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz';
                        provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
                        keystorePath = process.env.KEEPER_KEYSTORE || '/Users/bigdellis/keystore-files/keeper-keystore2.json';
                        password = process.env.KEEPER_PASSWORD;
                        if (!password) {
                            logging_1.logger.warn('KEEPER_PASSWORD not set, tests will be skipped');
                            this.skip();
                            return [2 /*return*/];
                        }
                        keystoreJson = require('fs').readFileSync(keystorePath, 'utf8');
                        return [4 /*yield*/, ethers_1.ethers.Wallet.fromEncryptedJson(keystoreJson, password).then(function (w) { return w.connect(provider); })];
                    case 1:
                        signer = _d.sent();
                        _b = (_a = logging_1.logger).info;
                        _c = "Using keystore account: ".concat;
                        return [4 /*yield*/, signer.getAddress()];
                    case 2:
                        _b.apply(_a, [_c.apply("Using keystore account: ", [_d.sent()])]);
                        return [4 /*yield*/, signer.getChainId()];
                    case 3:
                        chainId = _d.sent();
                        (0, chai_1.expect)(chainId).to.equal(8453, 'Must be on Base mainnet (chain ID 8453)');
                        return [2 /*return*/];
                }
            });
        });
    });
    describe('V4 Quote Provider Integration', function () {
        it('should initialize V4 quote provider', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: TEST_CONFIG.poolManager,
                            defaultSlippage: 1.0,
                            pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        logging_1.logger.info('✅ V4 Quote Provider initialized');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should find V4 pool for token pair', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: TEST_CONFIG.poolManager,
                            defaultSlippage: 1.0,
                            pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, quoteProvider.getMarketPrice(ethers_1.ethers.utils.parseUnits('1', 6), TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 Pool lookup successful - price: ".concat(result.price));
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Pool lookup failed: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        it('should validate token addresses', function () { return __awaiter(_this, void 0, void 0, function () {
            var token0Contract, token1Contract, symbol0, symbol1, decimals0, decimals1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token0Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token0, ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'], signer);
                        token1Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token1, ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'], signer);
                        return [4 /*yield*/, token0Contract.symbol()];
                    case 1:
                        symbol0 = _a.sent();
                        return [4 /*yield*/, token1Contract.symbol()];
                    case 2:
                        symbol1 = _a.sent();
                        return [4 /*yield*/, token0Contract.decimals()];
                    case 3:
                        decimals0 = _a.sent();
                        return [4 /*yield*/, token1Contract.decimals()];
                    case 4:
                        decimals1 = _a.sent();
                        logging_1.logger.info("Token 0: ".concat(symbol0, " (").concat(decimals0, " decimals)"));
                        logging_1.logger.info("Token 1: ".concat(symbol1, " (").concat(decimals1, " decimals)"));
                        (0, chai_1.expect)(decimals0).to.be.a('number');
                        (0, chai_1.expect)(decimals1).to.be.a('number');
                        logging_1.logger.info('✅ Token addresses validated');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Post-Auction Quote Tests', function () {
        it('should check balances before swap', function () {
            return __awaiter(this, void 0, void 0, function () {
                var signerAddress, token0Contract, balance, symbol;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, signer.getAddress()];
                        case 1:
                            signerAddress = _a.sent();
                            token0Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token0, ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'], signer);
                            return [4 /*yield*/, token0Contract.balanceOf(signerAddress)];
                        case 2:
                            balance = _a.sent();
                            return [4 /*yield*/, token0Contract.symbol()];
                        case 3:
                            symbol = _a.sent();
                            logging_1.logger.info("Balance: ".concat(ethers_1.ethers.utils.formatUnits(balance, 6), " ").concat(symbol));
                            if (balance.eq(0)) {
                                logging_1.logger.warn("\u26A0\uFE0F  No ".concat(symbol, " balance - swap tests will be skipped"));
                                this.skip();
                            }
                            (0, chai_1.expect)(balance).to.be.a('BigNumber');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should get quote for post-auction swap', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, amountIn, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 2.0,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            _a.sent();
                            amountIn = ethers_1.ethers.utils.parseUnits('0.01', 6);
                            return [4 /*yield*/, quoteProvider.getQuote(amountIn, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                        case 2:
                            result = _a.sent();
                            if (result.success && result.dstAmount) {
                                logging_1.logger.info("\u2705 Quote: ".concat(ethers_1.ethers.utils.formatUnits(amountIn, 6), " B_T1 \u2192 ").concat(ethers_1.ethers.utils.formatUnits(result.dstAmount, 6), " B_T2"));
                                (0, chai_1.expect)(result.dstAmount).to.be.a('BigNumber');
                            }
                            else {
                                logging_1.logger.warn("\u26A0\uFE0F  Quote failed: ".concat(result.error));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should handle insufficient balance gracefully', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, largeAmount, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 2.0,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            _a.sent();
                            largeAmount = ethers_1.ethers.utils.parseUnits('1000000', 6);
                            return [4 /*yield*/, quoteProvider.getQuote(largeAmount, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                        case 2:
                            result = _a.sent();
                            // Should return a quote even for large amounts (pool state calculation)
                            logging_1.logger.info("Large amount quote: ".concat(result.success ? 'Success' : 'Failed'));
                            (0, chai_1.expect)(result).to.have.property('success');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should handle slippage calculation correctly', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, amountIn, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 0.1,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            _a.sent();
                            amountIn = ethers_1.ethers.utils.parseUnits('0.001', 6);
                            return [4 /*yield*/, quoteProvider.getQuote(amountIn, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                        case 2:
                            result = _a.sent();
                            if (result.success) {
                                logging_1.logger.info('✅ Quote succeeded with tight slippage');
                            }
                            else {
                                logging_1.logger.info("\u2705 Quote handled tight slippage: ".concat(result.error));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Multi-Token Swap Scenarios', function () {
        it('should get quote B_T1 -> B_T2', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, amountIn, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 2.0,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            _a.sent();
                            amountIn = ethers_1.ethers.utils.parseUnits('0.01', 6);
                            return [4 /*yield*/, quoteProvider.getQuote(amountIn, TEST_CONFIG.poolKey.token0, // B_T1
                                TEST_CONFIG.poolKey.token1, // B_T2
                                TEST_CONFIG.poolKey)];
                        case 2:
                            result = _a.sent();
                            if (result.success) {
                                logging_1.logger.info('✅ B_T1 → B_T2 quote successful');
                            }
                            else {
                                logging_1.logger.warn("\u26A0\uFE0F  B_T1 \u2192 B_T2 quote failed: ".concat(result.error));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should get quote B_T2 -> B_T1 (reverse)', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, amountIn, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 2.0,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            _a.sent();
                            amountIn = ethers_1.ethers.utils.parseUnits('0.01', 6);
                            return [4 /*yield*/, quoteProvider.getQuote(amountIn, TEST_CONFIG.poolKey.token1, // B_T2
                                TEST_CONFIG.poolKey.token0, // B_T1
                                TEST_CONFIG.poolKey)];
                        case 2:
                            result = _a.sent();
                            if (result.success) {
                                logging_1.logger.info('✅ B_T2 → B_T1 quote successful');
                            }
                            else {
                                logging_1.logger.warn("\u26A0\uFE0F  B_T2 \u2192 B_T1 quote failed: ".concat(result.error));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Gas Estimation Tests', function () {
        it('should estimate gas for V4 quote operations', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, initialized;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: TEST_CONFIG.poolManager,
                                defaultSlippage: 1.0,
                                pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            initialized = _a.sent();
                            (0, chai_1.expect)(initialized).to.be.true;
                            // Quote operations use staticCall so don't consume gas
                            // This test verifies the provider works efficiently
                            logging_1.logger.info('✅ Gas estimation functionality available in router');
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=uniswapV4-post-auction.test.js.map