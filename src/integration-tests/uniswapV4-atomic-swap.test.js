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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Uniswap V4 Atomic Swap Integration Test
 * Tests the complete atomic swap flow during auction takes
 */
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var uniswapV4_quote_provider_1 = require("../dex-providers/uniswapV4-quote-provider");
var uniswapV4_router_module_1 = require("../uniswapV4-router-module");
describe('Uniswap V4 Atomic Swap Integration Tests', function () {
    var _this = this;
    var signer;
    var provider;
    // Test configuration - using actual deployed addresses
    var TEST_CONFIG = {
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
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
    describe('Quote Provider Tests', function () {
        it('should initialize quote provider successfully', function () { return __awaiter(_this, void 0, void 0, function () {
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
                        (0, chai_1.expect)(quoteProvider.isAvailable()).to.be.true;
                        logging_1.logger.info('✅ Quote provider initialized successfully');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should get market price from V4 pool', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, amountIn, result;
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
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 6);
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 Market price: ".concat(result.price, " (tick: ").concat(result.tick, ")"));
                            (0, chai_1.expect)(result.price).to.be.a('number');
                            (0, chai_1.expect)(result.tick).to.be.a('number');
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Pool may not be initialized: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Profitability Check Tests', function () {
        it('should check if swap is profitable at current market price', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, amountIn, auctionPrice, result;
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
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 6);
                        auctionPrice = ethers_1.ethers.utils.parseEther('1.0');
                        return [4 /*yield*/, quoteProvider.isProfitable(amountIn, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey, auctionPrice)];
                    case 2:
                        result = _a.sent();
                        if (result.profitable) {
                            logging_1.logger.info("\u2705 Swap is profitable! Expected profit: ".concat(ethers_1.ethers.utils.formatUnits(result.expectedProfit, 6)));
                        }
                        else if (result.error) {
                            logging_1.logger.warn("\u26A0\uFE0F  Could not determine profitability: ".concat(result.error));
                        }
                        else {
                            logging_1.logger.info('Swap is not profitable at current prices');
                        }
                        (0, chai_1.expect)(result).to.have.property('profitable');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Token Balance Tests', function () {
        it('should check token balances', function () {
            return __awaiter(this, void 0, void 0, function () {
                var signerAddress, token0Contract, token1Contract, balance0, balance1, symbol0, symbol1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, signer.getAddress()];
                        case 1:
                            signerAddress = _a.sent();
                            token0Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token0, ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'], signer);
                            token1Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token1, ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'], signer);
                            return [4 /*yield*/, token0Contract.balanceOf(signerAddress)];
                        case 2:
                            balance0 = _a.sent();
                            return [4 /*yield*/, token1Contract.balanceOf(signerAddress)];
                        case 3:
                            balance1 = _a.sent();
                            return [4 /*yield*/, token0Contract.symbol()];
                        case 4:
                            symbol0 = _a.sent();
                            return [4 /*yield*/, token1Contract.symbol()];
                        case 5:
                            symbol1 = _a.sent();
                            logging_1.logger.info("Token balances for ".concat(signerAddress, ":"));
                            logging_1.logger.info("  ".concat(symbol0, ": ").concat(ethers_1.ethers.utils.formatUnits(balance0, 6)));
                            logging_1.logger.info("  ".concat(symbol1, ": ").concat(ethers_1.ethers.utils.formatUnits(balance1, 6)));
                            (0, chai_1.expect)(balance0).to.be.a('BigNumber');
                            (0, chai_1.expect)(balance1).to.be.a('BigNumber');
                            if (balance0.eq(0)) {
                                logging_1.logger.warn("\u26A0\uFE0F  No ".concat(symbol0, " balance - swap test will be skipped"));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should execute V4 swap successfully (if sufficient balance)', function () {
            return __awaiter(this, void 0, void 0, function () {
                var signerAddress, amountIn, token0Contract, balance, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(120000); // 2 minutes
                            return [4 /*yield*/, signer.getAddress()];
                        case 1:
                            signerAddress = _a.sent();
                            amountIn = ethers_1.ethers.utils.parseUnits('0.01', 6);
                            token0Contract = new ethers_1.ethers.Contract(TEST_CONFIG.poolKey.token0, ['function balanceOf(address) view returns (uint256)'], signer);
                            return [4 /*yield*/, token0Contract.balanceOf(signerAddress)];
                        case 2:
                            balance = _a.sent();
                            if (balance.lt(amountIn)) {
                                logging_1.logger.warn('⚠️  Insufficient balance for swap test - skipping');
                                this.skip();
                                return [2 /*return*/];
                            }
                            // Execute swap
                            logging_1.logger.info('Executing V4 swap...');
                            return [4 /*yield*/, (0, uniswapV4_router_module_1.swapWithUniswapV4)(signer, TEST_CONFIG.poolKey.token0, amountIn, TEST_CONFIG.poolKey.token1, 1.0, // 1% slippage
                                TEST_CONFIG.poolKey, signerAddress, TEST_CONFIG.poolManager, TEST_CONFIG.universalRouter)];
                        case 3:
                            result = _a.sent();
                            (0, chai_1.expect)(result.success).to.be.true;
                            (0, chai_1.expect)(result.receipt).to.exist;
                            if (result.receipt) {
                                logging_1.logger.info("\u2705 Swap successful! Tx: ".concat(result.receipt.transactionHash));
                                logging_1.logger.info("   Gas used: ".concat(result.receipt.gasUsed.toString()));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Error Handling Tests', function () {
        it('should handle insufficient liquidity gracefully', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, largeAmount, result;
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
                        largeAmount = ethers_1.ethers.utils.parseUnits('1000000000', 6);
                        return [4 /*yield*/, quoteProvider.getQuote(largeAmount, TEST_CONFIG.poolKey.token0, TEST_CONFIG.poolKey.token1, TEST_CONFIG.poolKey)];
                    case 2:
                        result = _a.sent();
                        // Should either fail gracefully or return a quote
                        logging_1.logger.info("Large amount quote result: ".concat(result.success ? 'Success' : 'Failed'));
                        (0, chai_1.expect)(result).to.have.property('success');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle invalid token pair gracefully', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, fakePoolKey, result;
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
                        fakePoolKey = __assign(__assign({}, TEST_CONFIG.poolKey), { token0: '0x0000000000000000000000000000000000000001', token1: '0x0000000000000000000000000000000000000002' });
                        return [4 /*yield*/, quoteProvider.getMarketPrice(ethers_1.ethers.utils.parseUnits('1', 6), fakePoolKey.token0, fakePoolKey.token1, fakePoolKey)];
                    case 2:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        logging_1.logger.info("\u2705 Invalid pair handled: ".concat(result.error));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Multi-Pool Configuration', function () {
        it('should work with multiple pool configurations', function () { return __awaiter(_this, void 0, void 0, function () {
            var multiPoolConfig, quoteProvider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        multiPoolConfig = {
                            poolManager: TEST_CONFIG.poolManager,
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
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, multiPoolConfig);
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        logging_1.logger.info('✅ Multi-pool configuration initialized');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=uniswapV4-atomic-swap.test.js.map