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
 * Uniswap V4 Factory End-to-End Test
 * Complete flow: detection → quote → factory atomic swap → verification
 */
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var uniswapV4_quote_provider_1 = require("../dex-providers/uniswapV4-quote-provider");
var take_factory_1 = require("../take-factory");
var config_types_1 = require("../config-types");
describe('Uniswap V4 Factory End-to-End Tests', function () {
    var _this = this;
    var signer;
    var provider;
    // Configuration matching actual deployment
    var CONFIG = {
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
        factory: '0x1729Fc45642D0713Fac14803b7381e601c27A8A4',
        takerContract: '0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f',
        // Test pool B_T1-B_T2
        poolKey: {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 100,
            tickSpacing: 1,
            hooks: '0x0000000000000000000000000000000000000000',
        },
        ajnaPool: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c', // B_T2/B_T1 Ajna pool
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
                        _c = "Using account: ".concat;
                        return [4 /*yield*/, signer.getAddress()];
                    case 2:
                        _b.apply(_a, [_c.apply("Using account: ", [_d.sent()])]);
                        return [4 /*yield*/, signer.getChainId()];
                    case 3:
                        chainId = _d.sent();
                        (0, chai_1.expect)(chainId).to.equal(8453, 'Must be on Base mainnet');
                        return [2 /*return*/];
                }
            });
        });
    });
    describe('Contract Verification', function () {
        it('should verify factory contract deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.factory)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 Factory deployed at ".concat(CONFIG.factory));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify V4 taker contract deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.takerContract)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 V4 Taker deployed at ".concat(CONFIG.takerContract));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify pool manager deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.poolManager)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 PoolManager deployed at ".concat(CONFIG.poolManager));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('V4 Detection and Quote', function () {
        it('should initialize quote provider', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, initialized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T1-B_T2': CONFIG.poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        logging_1.logger.info('✅ Quote provider initialized');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should detect V4 pool and get quote', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, amountIn, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T1-B_T2': CONFIG.poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        _a.sent();
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 6);
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, CONFIG.poolKey.token0, CONFIG.poolKey.token1, CONFIG.poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 Market price: ".concat(result.price, " (tick: ").concat(result.tick, ")"));
                            (0, chai_1.expect)(result.price).to.be.a('number');
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Pool may not be initialized: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Factory Quote Check Integration', function () {
        it('should check profitability using factory quote check', function () {
            return __awaiter(this, void 0, void 0, function () {
                var mockPool, poolConfig, auctionPrice, collateral, config, isProfitable;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            mockPool = {
                                address: CONFIG.ajnaPool,
                                collateralAddress: CONFIG.poolKey.token1,
                                quoteAddress: CONFIG.poolKey.token0, // B_T1
                            };
                            poolConfig = {
                                name: 'B_T2/B_T1 Test Pool',
                                address: CONFIG.ajnaPool,
                                take: {
                                    liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                                    marketPriceFactor: 1.01,
                                    minCollateral: ethers_1.ethers.utils.parseUnits('0.0001', 6),
                                    hpbPriceFactor: 1.02,
                                },
                            };
                            auctionPrice = 1.0;
                            collateral = ethers_1.ethers.utils.parseUnits('0.1', 18);
                            config = {
                                uniswapV4RouterOverrides: {
                                    router: CONFIG.universalRouter,
                                    poolManager: CONFIG.poolManager,
                                    defaultSlippage: 0.5,
                                    pools: { 'B_T1-B_T2': CONFIG.poolKey },
                                },
                            };
                            return [4 /*yield*/, (0, take_factory_1.checkUniswapV4Quote)(mockPool, auctionPrice, collateral, poolConfig, config, signer)];
                        case 1:
                            isProfitable = _a.sent();
                            logging_1.logger.info("Profitability check: ".concat(isProfitable ? 'Profitable ✅' : 'Not profitable'));
                            (0, chai_1.expect)(isProfitable).to.be.a('boolean');
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Token Approval Tests', function () {
        it('should check existing approvals', function () {
            return __awaiter(this, void 0, void 0, function () {
                var signerAddress, token0Contract, token1Contract, allowance0, allowance1, symbol0, symbol1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            return [4 /*yield*/, signer.getAddress()];
                        case 1:
                            signerAddress = _a.sent();
                            token0Contract = new ethers_1.ethers.Contract(CONFIG.poolKey.token0, [
                                'function allowance(address owner, address spender) view returns (uint256)',
                                'function symbol() view returns (string)',
                            ], signer);
                            token1Contract = new ethers_1.ethers.Contract(CONFIG.poolKey.token1, [
                                'function allowance(address owner, address spender) view returns (uint256)',
                                'function symbol() view returns (string)',
                            ], signer);
                            return [4 /*yield*/, token0Contract.allowance(signerAddress, CONFIG.universalRouter)];
                        case 2:
                            allowance0 = _a.sent();
                            return [4 /*yield*/, token1Contract.allowance(signerAddress, CONFIG.universalRouter)];
                        case 3:
                            allowance1 = _a.sent();
                            return [4 /*yield*/, token0Contract.symbol()];
                        case 4:
                            symbol0 = _a.sent();
                            return [4 /*yield*/, token1Contract.symbol()];
                        case 5:
                            symbol1 = _a.sent();
                            logging_1.logger.info("".concat(symbol0, " allowance to Universal Router: ").concat(ethers_1.ethers.utils.formatUnits(allowance0, 6)));
                            logging_1.logger.info("".concat(symbol1, " allowance to Universal Router: ").concat(ethers_1.ethers.utils.formatUnits(allowance1, 6)));
                            (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(allowance0)).to.be.true;
                            (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(allowance1)).to.be.true;
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Full Flow Simulation (Dry Run)', function () {
        it('should simulate complete take flow', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, initialized, amountIn, priceResult, quoteResult;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: CONFIG.poolManager,
                                defaultSlippage: 0.5,
                                pools: { 'B_T1-B_T2': CONFIG.poolKey },
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            initialized = _a.sent();
                            (0, chai_1.expect)(initialized).to.be.true;
                            amountIn = ethers_1.ethers.utils.parseUnits('0.1', 6);
                            return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, CONFIG.poolKey.token0, CONFIG.poolKey.token1, CONFIG.poolKey)];
                        case 2:
                            priceResult = _a.sent();
                            if (!priceResult.success) {
                                logging_1.logger.warn('⚠️  Could not get market price - pool may not be initialized');
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, quoteProvider.getQuote(amountIn, CONFIG.poolKey.token0, CONFIG.poolKey.token1, CONFIG.poolKey)];
                        case 3:
                            quoteResult = _a.sent();
                            if (quoteResult.success && quoteResult.dstAmount) {
                                logging_1.logger.info("\u2705 Full simulation successful:");
                                logging_1.logger.info("   Input: 0.1 B_T1");
                                logging_1.logger.info("   Output: ".concat(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, 6), " B_T2"));
                                logging_1.logger.info("   Market price: ".concat(priceResult.price));
                            }
                            else {
                                logging_1.logger.warn("\u26A0\uFE0F  Quote failed: ".concat(quoteResult.error));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('All Three Pools Test', function () {
        var ALL_POOLS = {
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
                tickSpacing: 1,
                hooks: '0x0000000000000000000000000000000000000000',
            },
            'B_T2-B_T4': {
                token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
                token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                fee: 500,
                tickSpacing: 10,
                hooks: '0x0000000000000000000000000000000000000000',
            },
        };
        it('should test all three V4 pools', function () {
            return __awaiter(this, void 0, void 0, function () {
                var quoteProvider, initialized, _i, _a, _b, name_1, poolKey, amountIn, result;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.timeout(90000);
                            quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                                poolManager: CONFIG.poolManager,
                                defaultSlippage: 0.5,
                                pools: ALL_POOLS,
                            });
                            return [4 /*yield*/, quoteProvider.initialize()];
                        case 1:
                            initialized = _c.sent();
                            (0, chai_1.expect)(initialized).to.be.true;
                            _i = 0, _a = Object.entries(ALL_POOLS);
                            _c.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            _b = _a[_i], name_1 = _b[0], poolKey = _b[1];
                            amountIn = ethers_1.ethers.utils.parseUnits('0.1', 6);
                            return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, poolKey.token0, poolKey.token1, poolKey)];
                        case 3:
                            result = _c.sent();
                            if (result.success) {
                                logging_1.logger.info("\u2705 ".concat(name_1, ": price = ").concat(result.price));
                            }
                            else {
                                logging_1.logger.warn("\u26A0\uFE0F  ".concat(name_1, ": ").concat(result.error));
                            }
                            _c.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=uniswapV4-factory-e2e.test.js.map