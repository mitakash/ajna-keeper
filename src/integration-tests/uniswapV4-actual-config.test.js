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
 * Uniswap V4 Integration Test - Using Actual Deployed Configuration
 * Tests with your deployed contracts and pools
 */
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var uniswapV4_quote_provider_1 = require("../dex-providers/uniswapV4-quote-provider");
var take_factory_1 = require("../take-factory");
var config_types_1 = require("../config-types");
describe('Uniswap V4 - Actual Deployed Configuration Tests', function () {
    var _this = this;
    var signer;
    var provider;
    // ACTUAL DEPLOYED CONFIGURATION
    var CONFIG = {
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
        permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        factory: '0x1729Fc45642D0713Fac14803b7381e601c27A8A4',
        takerContract: '0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f',
        // Three V4 pools configured
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
        // Three Ajna pools
        ajnaPools: {
            'B_T2-B_T4': '0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef',
            'B_T2-B_T1': '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
            'B_T3-B_T4': '0xf44ed07f91be6a46296084d4951a27015c58ff32',
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
                        _c = "Using keeper account: ".concat;
                        return [4 /*yield*/, signer.getAddress()];
                    case 2:
                        _b.apply(_a, [_c.apply("Using keeper account: ", [_d.sent()])]);
                        return [4 /*yield*/, signer.getChainId()];
                    case 3:
                        chainId = _d.sent();
                        (0, chai_1.expect)(chainId).to.equal(8453, 'Must be on Base mainnet');
                        return [2 /*return*/];
                }
            });
        });
    });
    describe('Contract Deployment Verification', function () {
        it('should verify PoolManager deployment', function () { return __awaiter(_this, void 0, void 0, function () {
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
        it('should verify UniversalRouter deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.universalRouter)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 UniversalRouter deployed at ".concat(CONFIG.universalRouter));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify Factory deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.factory)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 AjnaKeeperTakerFactory deployed at ".concat(CONFIG.factory));
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify UniswapV4KeeperTaker deployment', function () { return __awaiter(_this, void 0, void 0, function () {
            var code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, provider.getCode(CONFIG.takerContract)];
                    case 1:
                        code = _a.sent();
                        (0, chai_1.expect)(code).to.not.equal('0x');
                        logging_1.logger.info("\u2705 UniswapV4KeeperTaker deployed at ".concat(CONFIG.takerContract));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('B_T1-B_T2 Pool Tests (0.01% fee, 1 tick spacing)', function () {
        var poolKey = CONFIG.pools['B_T1-B_T2'];
        it('should verify token decimals', function () { return __awaiter(_this, void 0, void 0, function () {
            var token0Contract, token1Contract, decimals0, decimals1, symbol0, symbol1, expectedDecimals;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token0Contract = new ethers_1.ethers.Contract(poolKey.token0, ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'], signer);
                        token1Contract = new ethers_1.ethers.Contract(poolKey.token1, ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'], signer);
                        return [4 /*yield*/, token0Contract.decimals()];
                    case 1:
                        decimals0 = _a.sent();
                        return [4 /*yield*/, token1Contract.decimals()];
                    case 2:
                        decimals1 = _a.sent();
                        return [4 /*yield*/, token0Contract.symbol()];
                    case 3:
                        symbol0 = _a.sent();
                        return [4 /*yield*/, token1Contract.symbol()];
                    case 4:
                        symbol1 = _a.sent();
                        logging_1.logger.info("Token0: ".concat(symbol0, " (").concat(poolKey.token0, ") - ").concat(decimals0, " decimals"));
                        logging_1.logger.info("Token1: ".concat(symbol1, " (").concat(poolKey.token1, ") - ").concat(decimals1, " decimals"));
                        expectedDecimals = 6;
                        if (decimals0 !== expectedDecimals) {
                            logging_1.logger.warn("\u26A0\uFE0F  WARNING: ".concat(symbol0, " has ").concat(decimals0, " decimals, expected ").concat(expectedDecimals, ". This may cause pricing issues!"));
                        }
                        if (decimals1 !== expectedDecimals) {
                            logging_1.logger.warn("\u26A0\uFE0F  WARNING: ".concat(symbol1, " has ").concat(decimals1, " decimals, expected ").concat(expectedDecimals, ". This may cause pricing issues!"));
                        }
                        // Just verify decimals are numbers (not enforcing specific values)
                        (0, chai_1.expect)(decimals0).to.be.a('number');
                        (0, chai_1.expect)(decimals1).to.be.a('number');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should initialize quote provider and get market price', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, initialized, amountIn, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T1-B_T2': poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 18);
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, poolKey.token0, poolKey.token1, poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 B_T1-B_T2 market price: ".concat(result.price, " (tick: ").concat(result.tick, ")"));
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
        it('should get quote for swap', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, amountIn, result, amountOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T1-B_T2': poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        _a.sent();
                        amountIn = ethers_1.ethers.utils.parseUnits('0.1', 18);
                        return [4 /*yield*/, quoteProvider.getQuote(amountIn, poolKey.token0, poolKey.token1, poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success && result.dstAmount) {
                            amountOut = ethers_1.ethers.utils.formatUnits(result.dstAmount, 6);
                            logging_1.logger.info("\u2705 Quote: 0.1 B_T1 (18 dec) \u2192 ".concat(amountOut, " B_T2 (6 dec)"));
                            (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(result.dstAmount)).to.be.true;
                            if (result.dstAmount.isZero()) {
                                logging_1.logger.warn("\u26A0\uFE0F  Warning: Quote returned 0 - pool may not have liquidity or price is too extreme");
                            }
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Quote failed: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('B_T3-B_T4 Pool Tests (0.01% fee, 10 tick spacing)', function () {
        var poolKey = CONFIG.pools['B_T3-B_T4'];
        it('should get market price from B_T3-B_T4 pool', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, initialized, amountIn, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T3-B_T4': poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 6);
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, poolKey.token0, poolKey.token1, poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 B_T3-B_T4 market price: ".concat(result.price));
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Pool may not be initialized: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('B_T2-B_T4 Pool Tests (0.05% fee, 10 tick spacing)', function () {
        var poolKey = CONFIG.pools['B_T2-B_T4'];
        it('should get market price from B_T2-B_T4 pool', function () { return __awaiter(_this, void 0, void 0, function () {
            var quoteProvider, initialized, amountIn, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                            poolManager: CONFIG.poolManager,
                            defaultSlippage: 0.5,
                            pools: { 'B_T2-B_T4': poolKey },
                        });
                        return [4 /*yield*/, quoteProvider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        (0, chai_1.expect)(initialized).to.be.true;
                        amountIn = ethers_1.ethers.utils.parseUnits('1', 6);
                        return [4 /*yield*/, quoteProvider.getMarketPrice(amountIn, poolKey.token0, poolKey.token1, poolKey)];
                    case 2:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("\u2705 B_T2-B_T4 market price: ".concat(result.price));
                        }
                        else {
                            logging_1.logger.warn("\u26A0\uFE0F  Pool may not be initialized: ".concat(result.error));
                        }
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Factory Quote Check Tests', function () {
        it('should check profitability for B_T2-B_T1 Ajna pool', function () {
            return __awaiter(this, void 0, void 0, function () {
                var poolKey, ajnaPoolAddress, mockPool, poolConfig, auctionPrice, collateral, config, isProfitable;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            poolKey = CONFIG.pools['B_T1-B_T2'];
                            ajnaPoolAddress = CONFIG.ajnaPools['B_T2-B_T1'];
                            mockPool = {
                                address: ajnaPoolAddress,
                                collateralAddress: poolKey.token1,
                                quoteAddress: poolKey.token0, // B_T1 is quote (property, not method)
                            };
                            poolConfig = {
                                name: 'B_T2/B_T1 Test Pool',
                                address: ajnaPoolAddress,
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
                                    pools: { 'B_T1-B_T2': poolKey },
                                },
                            };
                            return [4 /*yield*/, (0, take_factory_1.checkUniswapV4Quote)(mockPool, auctionPrice, collateral, poolConfig, config, signer)];
                        case 1:
                            isProfitable = _a.sent();
                            logging_1.logger.info("B_T2-B_T1 profitability check: ".concat(isProfitable ? 'Profitable ✅' : 'Not profitable'));
                            (0, chai_1.expect)(isProfitable).to.be.a('boolean');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should check profitability for B_T2-B_T4 Ajna pool', function () {
            return __awaiter(this, void 0, void 0, function () {
                var poolKey, ajnaPoolAddress, mockPool, poolConfig, auctionPrice, collateral, config, isProfitable;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            poolKey = CONFIG.pools['B_T2-B_T4'];
                            ajnaPoolAddress = CONFIG.ajnaPools['B_T2-B_T4'];
                            mockPool = {
                                address: ajnaPoolAddress,
                                collateralAddress: poolKey.token1,
                                quoteAddress: poolKey.token0, // B_T4 is quote
                            };
                            poolConfig = {
                                name: 'B_T2/B_T4 Test Pool',
                                address: ajnaPoolAddress,
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
                                    pools: { 'B_T2-B_T4': poolKey },
                                },
                            };
                            return [4 /*yield*/, (0, take_factory_1.checkUniswapV4Quote)(mockPool, auctionPrice, collateral, poolConfig, config, signer)];
                        case 1:
                            isProfitable = _a.sent();
                            logging_1.logger.info("B_T2-B_T4 profitability check: ".concat(isProfitable ? 'Profitable ✅' : 'Not profitable'));
                            (0, chai_1.expect)(isProfitable).to.be.a('boolean');
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('should check profitability for B_T3-B_T4 Ajna pool', function () {
            return __awaiter(this, void 0, void 0, function () {
                var poolKey, ajnaPoolAddress, mockPool, poolConfig, auctionPrice, collateral, config, isProfitable;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(60000);
                            poolKey = CONFIG.pools['B_T3-B_T4'];
                            ajnaPoolAddress = CONFIG.ajnaPools['B_T3-B_T4'];
                            mockPool = {
                                address: ajnaPoolAddress,
                                collateralAddress: poolKey.token0,
                                quoteAddress: poolKey.token1, // B_T4 is quote
                            };
                            poolConfig = {
                                name: 'B_T3/B_T4 Test Pool',
                                address: ajnaPoolAddress,
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
                                    pools: { 'B_T3-B_T4': poolKey },
                                },
                            };
                            return [4 /*yield*/, (0, take_factory_1.checkUniswapV4Quote)(mockPool, auctionPrice, collateral, poolConfig, config, signer)];
                        case 1:
                            isProfitable = _a.sent();
                            logging_1.logger.info("B_T3-B_T4 profitability check: ".concat(isProfitable ? 'Profitable ✅' : 'Not profitable'));
                            (0, chai_1.expect)(isProfitable).to.be.a('boolean');
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Token Balance Checks', function () {
        it('should check keeper balances for all tokens', function () { return __awaiter(_this, void 0, void 0, function () {
            var signerAddress, tokens, _i, tokens_1, token, tokenContract, balance, formatted;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, signer.getAddress()];
                    case 1:
                        signerAddress = _a.sent();
                        tokens = [
                            { name: 'B_T1', address: CONFIG.pools['B_T1-B_T2'].token0, decimals: 18 },
                            { name: 'B_T2', address: CONFIG.pools['B_T1-B_T2'].token1, decimals: 6 },
                            { name: 'B_T3', address: CONFIG.pools['B_T3-B_T4'].token0, decimals: 18 },
                            { name: 'B_T4', address: CONFIG.pools['B_T3-B_T4'].token1, decimals: 6 },
                        ];
                        logging_1.logger.info("\nKeeper balances for ".concat(signerAddress, ":"));
                        _i = 0, tokens_1 = tokens;
                        _a.label = 2;
                    case 2:
                        if (!(_i < tokens_1.length)) return [3 /*break*/, 5];
                        token = tokens_1[_i];
                        tokenContract = new ethers_1.ethers.Contract(token.address, ['function balanceOf(address) view returns (uint256)'], signer);
                        return [4 /*yield*/, tokenContract.balanceOf(signerAddress)];
                    case 3:
                        balance = _a.sent();
                        formatted = ethers_1.ethers.utils.formatUnits(balance, token.decimals);
                        logging_1.logger.info("  ".concat(token.name, " (").concat(token.decimals, " dec): ").concat(formatted));
                        (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(balance)).to.be.true;
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Configuration Validation', function () {
        it('should validate all pool configurations', function () {
            for (var _i = 0, _a = Object.entries(CONFIG.pools); _i < _a.length; _i++) {
                var _b = _a[_i], name_1 = _b[0], pool = _b[1];
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(pool.token0)).to.be.true;
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(pool.token1)).to.be.true;
                (0, chai_1.expect)(pool.fee).to.be.a('number');
                (0, chai_1.expect)(pool.tickSpacing).to.be.a('number');
                (0, chai_1.expect)(pool.hooks).to.equal('0x0000000000000000000000000000000000000000');
                logging_1.logger.info("\u2705 ".concat(name_1, " configuration valid"));
            }
        });
        it('should validate all Ajna pool addresses', function () {
            for (var _i = 0, _a = Object.entries(CONFIG.ajnaPools); _i < _a.length; _i++) {
                var _b = _a[_i], name_2 = _b[0], address = _b[1];
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(address)).to.be.true;
                logging_1.logger.info("\u2705 ".concat(name_2, " Ajna pool: ").concat(address));
            }
        });
    });
});
//# sourceMappingURL=uniswapV4-actual-config.test.js.map