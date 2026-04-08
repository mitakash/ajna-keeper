"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var axios_1 = __importDefault(require("axios"));
var chai_1 = __importStar(require("chai"));
var chai_as_promised_1 = __importDefault(require("chai-as-promised"));
var ethers_1 = require("ethers");
var sinon_1 = __importDefault(require("sinon"));
var dex_router_1 = require("../dex-router");
var config_types_1 = require("../config-types");
var erc20 = __importStar(require("../erc20"));
var test_config_1 = require("../integration-tests/test-config");
var logging_1 = require("../logging");
var nonce_1 = require("../nonce");
chai_1.default.use(chai_as_promised_1.default);
var CustomContract = /** @class */ (function (_super) {
    __extends(CustomContract, _super);
    function CustomContract(address, abi, provider) {
        var _this = _super.call(this, address, abi, provider) || this;
        _this.liquidity = sinon_1.default.stub();
        _this.slot0 = sinon_1.default.stub();
        _this.decimals = sinon_1.default.stub();
        _this.exactInputSingle = sinon_1.default.stub();
        _this.hash = sinon_1.default.stub();
        _this.balanceOf = sinon_1.default.stub();
        return _this;
    }
    return CustomContract;
}(ethers_1.Contract));
describe('DexRouter', function () {
    var contractStub;
    var signer;
    var mockProvider;
    var dexRouter;
    var axiosGetStub;
    var loggerErrorStub;
    var chainId = 43114;
    var amount = ethers_1.BigNumber.from('1000000000000000000');
    var tokenIn = test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    var tokenOut = test_config_1.MAINNET_CONFIG.WETH_ADDRESS;
    var to = test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress;
    var fromAddress = '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C';
    var slippage = 1;
    var feeAmount = 3000;
    beforeEach(function () {
        process.env.ONEINCH_API = 'https://api.1inch.io/v5.0';
        process.env.ONEINCH_API_KEY = 'api_key';
        mockProvider = new ethers_1.providers.JsonRpcProvider();
        mockProvider.estimateGas = sinon_1.default.stub().resolves(ethers_1.BigNumber.from('100000'));
        mockProvider.getResolver = sinon_1.default.stub().resolves(null);
        mockProvider.getNetwork = sinon_1.default
            .stub()
            .resolves({ chainId: chainId, name: 'mockNetwork' });
        mockProvider.call = sinon_1.default.stub().callsFake(function (tx) {
            if (tx.data === '0x313ce567') {
                return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
            }
            if (tx.data ===
                '0x70a08231' +
                    ethers_1.ethers.utils.defaultAbiCoder
                        .encode(['address'], [fromAddress])
                        .slice(2)) {
                return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers_1.BigNumber.from('50000000')]);
            }
            throw new Error('Unexpected call');
        });
        signer = {
            provider: mockProvider,
            getAddress: sinon_1.default.stub().resolves(fromAddress),
            sendTransaction: sinon_1.default
                .stub()
                .resolves({ wait: sinon_1.default.stub().resolves({}) }),
        };
        contractStub = new CustomContract(tokenIn, [], mockProvider);
        sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
            return contractStub;
        });
        sinon_1.default.stub(nonce_1.NonceTracker, 'queueTransaction').callsFake(function (signer, txFunc) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, txFunc(10)];
                    case 1: 
                    // Simply execute the transaction function with a dummy nonce
                    return [2 /*return*/, _a.sent()];
                }
            });
        }); });
        dexRouter = new dex_router_1.DexRouter(signer, {
            oneInchRouters: {
                1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
                8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',
                43114: '0x1111111254EEB25477B68fb85Ed929f73A960582',
            },
        });
        sinon_1.default.stub(logging_1.logger, 'info');
        loggerErrorStub = sinon_1.default.stub(logging_1.logger, 'error');
        sinon_1.default.stub(logging_1.logger, 'debug');
        axiosGetStub = sinon_1.default.stub(axios_1.default, 'get').resolves({
            data: {
                tx: {
                    to: '0x1inchRouter',
                    data: '0xdata',
                    value: '0',
                    gas: '100000',
                },
            },
        });
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('constructor', function () {
        it('should log error if signer is undefined', function () {
            var threwError = false;
            try {
                new dex_router_1.DexRouter(undefined);
            }
            catch (error) {
                threwError = true;
                (0, chai_1.expect)(error.message).to.include("Cannot read properties of undefined (reading 'provider')");
            }
            (0, chai_1.expect)(threwError).to.be.true;
            (0, chai_1.expect)(loggerErrorStub.calledWith('Signer is required')).to.be.true;
        });
        it('should log error if provider is unavailable', function () {
            var invalidSigner = { provider: undefined };
            (0, chai_1.expect)(function () { return new dex_router_1.DexRouter(invalidSigner); }).to.not.throw();
            (0, chai_1.expect)(loggerErrorStub.calledWith('No provider available')).to.be.true;
        });
    });
    describe('swap', function () {
        it('should log error if amount is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, dexRouter.swap(chainId, undefined, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.UNISWAP_V3)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal('Invalid parameters provided to swap');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should log error if tokenIn is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, dexRouter.swap(chainId, amount, undefined, tokenOut, to, config_types_1.PostAuctionDex.UNISWAP_V3)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal('Invalid parameters provided to swap');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should log error if tokenOut is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, undefined, to, config_types_1.PostAuctionDex.UNISWAP_V3)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal('Invalid parameters provided to swap');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should log error if to is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, undefined, config_types_1.PostAuctionDex.UNISWAP_V3)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal('Invalid parameters provided to swap');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should log error if balance is insufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
            var erc20ContractStub, getDecimalsStub, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        erc20ContractStub = new CustomContract(tokenIn, [], mockProvider);
                        erc20ContractStub.balanceOf
                            .withArgs(fromAddress)
                            .resolves(ethers_1.BigNumber.from('50000000'));
                        sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
                            if (address === tokenIn)
                                return erc20ContractStub;
                            throw new Error("Unexpected contract address: ".concat(address));
                        });
                        getDecimalsStub = sinon_1.default.stub(erc20, 'getDecimalsErc20').resolves(8);
                        return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.UNISWAP_V3)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal("Insufficient balance for ".concat(tokenIn));
                        (0, chai_1.expect)(getDecimalsStub.calledOnce).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        describe('useOneInch = true', function () {
            beforeEach(function () {
                mockProvider.call.callsFake(function (tx) {
                    if (tx.data === '0x313ce567') {
                        return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
                    }
                    if (tx.data ===
                        '0x70a08231' +
                            ethers_1.ethers.utils.defaultAbiCoder
                                .encode(['address'], [fromAddress])
                                .slice(2)) {
                        return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers_1.BigNumber.from('100000000')] // 1 WBTC
                        );
                    }
                    throw new Error('Unexpected call');
                });
            });
            it('should approve token if allowance is insufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
                var erc20ContractStub, getDecimalsStub, getAllowanceStub, approveStub, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            erc20ContractStub = new CustomContract(tokenIn, [], mockProvider);
                            erc20ContractStub.balanceOf
                                .withArgs(fromAddress)
                                .resolves(ethers_1.BigNumber.from('100000000')); // 1 WBTC
                            sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
                                if (address === tokenIn)
                                    return erc20ContractStub;
                                throw new Error("Unexpected contract address: ".concat(address));
                            });
                            getDecimalsStub = sinon_1.default
                                .stub(erc20, 'getDecimalsErc20')
                                .resolves(8);
                            getAllowanceStub = sinon_1.default
                                .stub(erc20, 'getAllowanceOfErc20')
                                .resolves(ethers_1.BigNumber.from('1'));
                            approveStub = sinon_1.default.stub(erc20, 'approveErc20').resolves();
                            axiosGetStub
                                .onCall(0)
                                .resolves({ data: { dstAmount: '900000000000000000' } });
                            axiosGetStub.onCall(1).resolves({
                                data: {
                                    tx: {
                                        to: '0x1inchRouter',
                                        data: '0xdata',
                                        value: '0',
                                        gas: '100000',
                                    },
                                },
                            });
                            return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.ONEINCH, slippage, feeAmount)];
                        case 1:
                            result = _a.sent();
                            console.log('Result (approve insufficient):', result);
                            if (!result.success) {
                                console.log('Error details (approve insufficient):', result.error);
                            }
                            (0, chai_1.expect)(result.success).to.be.true;
                            (0, chai_1.expect)(getDecimalsStub.calledOnce).to.be.true;
                            (0, chai_1.expect)(getAllowanceStub.calledOnce).to.be.true;
                            (0, chai_1.expect)(approveStub.calledOnce).to.be.true;
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should skip approval if allowance is sufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
                var erc20ContractStub, getDecimalsStub, getAllowanceStub, approveStub, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            erc20ContractStub = new CustomContract(tokenIn, [], mockProvider);
                            erc20ContractStub.balanceOf
                                .withArgs(fromAddress)
                                .resolves(ethers_1.BigNumber.from('100000000')); // 1 WBTC
                            sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
                                if (address === tokenIn)
                                    return erc20ContractStub;
                                throw new Error("Unexpected contract address: ".concat(address));
                            });
                            getDecimalsStub = sinon_1.default
                                .stub(erc20, 'getDecimalsErc20')
                                .resolves(8);
                            getAllowanceStub = sinon_1.default
                                .stub(erc20, 'getAllowanceOfErc20')
                                .resolves(ethers_1.BigNumber.from('100000000'));
                            approveStub = sinon_1.default.stub(erc20, 'approveErc20');
                            axiosGetStub
                                .onCall(0)
                                .resolves({ data: { dstAmount: '900000000000000000' } });
                            axiosGetStub.onCall(1).resolves({
                                data: {
                                    tx: {
                                        to: '0x1inchRouter',
                                        data: '0xdata',
                                        value: '0',
                                        gas: '100000',
                                    },
                                },
                            });
                            return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.ONEINCH, slippage, feeAmount)];
                        case 1:
                            result = _a.sent();
                            console.log('Result (skip approval):', result);
                            if (!result.success) {
                                console.log('Error details (skip approval):', result.error);
                            }
                            (0, chai_1.expect)(result.success).to.be.true;
                            (0, chai_1.expect)(getDecimalsStub.calledOnce).to.be.true;
                            (0, chai_1.expect)(approveStub.notCalled).to.be.true;
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should log error if approval fails', function () { return __awaiter(void 0, void 0, void 0, function () {
                var erc20ContractStub, getDecimalsStub, getAllowanceStub, approveStub, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            erc20ContractStub = new CustomContract(tokenIn, [], mockProvider);
                            erc20ContractStub.balanceOf
                                .withArgs(fromAddress)
                                .resolves(ethers_1.BigNumber.from('100000000')); // 1 WBTC
                            sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
                                if (address === tokenIn)
                                    return erc20ContractStub;
                                throw new Error("Unexpected contract address: ".concat(address));
                            });
                            getDecimalsStub = sinon_1.default
                                .stub(erc20, 'getDecimalsErc20')
                                .resolves(8);
                            getAllowanceStub = sinon_1.default
                                .stub(erc20, 'getAllowanceOfErc20')
                                .resolves(ethers_1.BigNumber.from('0'));
                            approveStub = sinon_1.default
                                .stub(erc20, 'approveErc20')
                                .rejects(new Error('Approval failed'));
                            return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.ONEINCH, slippage, feeAmount)];
                        case 1:
                            result = _a.sent();
                            (0, chai_1.expect)(result.success).to.be.false;
                            (0, chai_1.expect)(result.error).to.include('Approval failed');
                            (0, chai_1.expect)(getDecimalsStub.calledOnce).to.be.true;
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should call swapWithOneInch and execute transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
                var erc20ContractStub, getDecimalsStub, getAllowanceStub, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            erc20ContractStub = new CustomContract(tokenIn, [], mockProvider);
                            erc20ContractStub.balanceOf
                                .withArgs(fromAddress)
                                .resolves(ethers_1.BigNumber.from('100000000')); // 1 WBTC
                            sinon_1.default.stub(ethers_1.ethers, 'Contract').callsFake(function (address, abi, provider) {
                                if (address === tokenIn)
                                    return erc20ContractStub;
                                throw new Error("Unexpected contract address: ".concat(address));
                            });
                            getDecimalsStub = sinon_1.default
                                .stub(erc20, 'getDecimalsErc20')
                                .resolves(8);
                            getAllowanceStub = sinon_1.default
                                .stub(erc20, 'getAllowanceOfErc20')
                                .resolves(ethers_1.BigNumber.from('100000000'));
                            axiosGetStub
                                .onCall(0)
                                .resolves({ data: { dstAmount: '900000000000000000' } });
                            axiosGetStub.onCall(1).resolves({
                                data: {
                                    tx: {
                                        to: '0x1inchRouter',
                                        data: '0xdata',
                                        value: '0',
                                        gas: '100000',
                                    },
                                },
                            });
                            return [4 /*yield*/, dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, config_types_1.PostAuctionDex.ONEINCH, slippage, feeAmount)];
                        case 1:
                            result = _a.sent();
                            console.log('Result (execute transaction):', result);
                            if (!result.success) {
                                console.log('Error details (execute transaction):', result.error);
                            }
                            (0, chai_1.expect)(result.success).to.be.true;
                            (0, chai_1.expect)(axiosGetStub.calledTwice).to.be.true;
                            (0, chai_1.expect)(getDecimalsStub.calledOnce).to.be.true;
                            (0, chai_1.expect)(axiosGetStub
                                .getCall(0)
                                .calledWith("".concat(process.env.ONEINCH_API, "/").concat(chainId, "/quote"), {
                                params: {
                                    fromTokenAddress: tokenIn,
                                    toTokenAddress: tokenOut,
                                    amount: '100000000',
                                },
                                headers: {
                                    Accept: 'application/json',
                                    Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                                },
                            })).to.be.true;
                            (0, chai_1.expect)(axiosGetStub
                                .getCall(1)
                                .calledWith("".concat(process.env.ONEINCH_API, "/").concat(chainId, "/swap"), {
                                params: {
                                    fromTokenAddress: tokenIn,
                                    toTokenAddress: tokenOut,
                                    amount: '100000000',
                                    fromAddress: fromAddress,
                                    slippage: slippage,
                                },
                                headers: {
                                    Accept: 'application/json',
                                    Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                                },
                            })).to.be.true;
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    });
    describe('swapWithOneInch', function () {
        beforeEach(function () {
            mockProvider.call.callsFake(function (tx) {
                if (tx.data === '0x313ce567') {
                    return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
                }
                if (tx.data ===
                    '0x70a08231' +
                        ethers_1.ethers.utils.defaultAbiCoder
                            .encode(['address'], [fromAddress])
                            .slice(2)) {
                    return ethers_1.ethers.utils.defaultAbiCoder.encode(['uint256'], [ethers_1.BigNumber.from('100000000')]);
                }
                throw new Error('Unexpected call');
            });
        });
        it('should execute swap with 1inch successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        axiosGetStub.onCall(0).resolves({
                            data: {
                                toTokenAmount: '900000000000000000',
                                protocols: [],
                            },
                        });
                        axiosGetStub.onCall(1).resolves({
                            data: {
                                tx: {
                                    to: '0x1inchRouter',
                                    data: '0xdata',
                                    value: '0',
                                    gas: '100000',
                                },
                            },
                        });
                        return [4 /*yield*/, dexRouter['swapWithOneInch'](chainId, ethers_1.BigNumber.from('100000000'), tokenIn, tokenOut, slippage)];
                    case 1:
                        result = _a.sent();
                        console.log('Result (1inch swap):', result);
                        if (!result.success) {
                            console.log('Error details (1inch swap):', result.error);
                        }
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(axiosGetStub.calledTwice).to.be.true;
                        (0, chai_1.expect)(axiosGetStub
                            .getCall(0)
                            .calledWith("".concat(process.env.ONEINCH_API, "/").concat(chainId, "/quote"), {
                            params: {
                                fromTokenAddress: tokenIn,
                                toTokenAddress: tokenOut,
                                amount: '100000000',
                            },
                            headers: {
                                Accept: 'application/json',
                                Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                            },
                        })).to.be.true;
                        (0, chai_1.expect)(axiosGetStub
                            .getCall(1)
                            .calledWith("".concat(process.env.ONEINCH_API, "/").concat(chainId, "/swap"), {
                            params: {
                                fromTokenAddress: tokenIn,
                                toTokenAddress: tokenOut,
                                amount: '100000000',
                                fromAddress: fromAddress,
                                slippage: slippage,
                            },
                            headers: {
                                Accept: 'application/json',
                                Authorization: "Bearer ".concat(process.env.ONEINCH_API_KEY),
                            },
                        })).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should log error if axios fails', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        axiosGetStub.rejects(new Error('API error'));
                        return [4 /*yield*/, dexRouter['swapWithOneInch'](chainId, amount, tokenIn, tokenOut, slippage)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result).to.deep.equal({ success: false, error: 'API error' });
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=dex-router.test.js.map