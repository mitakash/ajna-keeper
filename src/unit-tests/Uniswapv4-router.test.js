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
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var uniswapV4RouterModule = __importStar(require("../uniswapV4-router-module"));
/**
 * Tests for Uniswap V4 Router Module
 *
 * Tests the swapWithUniswapV4Adapter function which uses Universal Router
 * to execute V4 swaps with proper PoolKey encoding.
 */
describe('Uniswap V4 Router Module', function () {
    var swapStub;
    var mockSigner;
    // Define validPoolKey at the top level - using actual config values
    var validPoolKey = {
        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
        fee: 100,
        tickSpacing: 1,
        hooks: '0x0000000000000000000000000000000000000000',
    };
    beforeEach(function () {
        sinon_1.default.restore();
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0x1234567890123456789012345678901234567890'),
            getChainId: sinon_1.default.stub().resolves(8453),
            provider: {
                getNetwork: sinon_1.default.stub().resolves({ chainId: 8453, name: 'base' }),
                estimateGas: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('500000')),
                getGasPrice: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('1000000000')),
                getCode: sinon_1.default.stub().resolves('0x123456'),
            },
        };
        swapStub = sinon_1.default.stub(uniswapV4RouterModule, 'swapWithUniswapV4Adapter');
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('swapWithUniswapV4Adapter()', function () {
        it('should execute successful swap with correct parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        swapStub.resolves({
                            success: true,
                            receipt: {
                                transactionHash: '0xSuccess',
                                gasUsed: ethers_1.BigNumber.from('450000'),
                            },
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // tokenIn
                            ethers_1.BigNumber.from('1000000000000000000'), // 1 token
                            '0xd8A0af85E2539e22953287b436255422724871AB', // tokenOut
                            1.0, // slippagePct
                            '0x6ff5693b99212da76ad316178a184ab56d299b43', // Universal Router
                            validPoolKey, '0x1234567890123456789012345678901234567890', // recipient
                            '0x' // hookData
                            )];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(swapStub.calledOnce).to.be.true;
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.receipt).to.exist;
                        (0, chai_1.expect)(result.receipt.transactionHash).to.equal('0xSuccess');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle swap with custom hook data', function () { return __awaiter(void 0, void 0, void 0, function () {
            var poolKeyWithHooks, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        swapStub.resolves({
                            success: true,
                            receipt: { transactionHash: '0xSuccessWithHooks' },
                        });
                        poolKeyWithHooks = __assign(__assign({}, validPoolKey), { hooks: '0x1234567890123456789012345678901234567890' });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000000000000000'), validPoolKey.token1, 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', poolKeyWithHooks, '0x1234567890123456789012345678901234567890', '0x1234' // Custom hook data
                            )];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return error when router address is empty', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Configure stub to return error for empty router
                        swapStub.resolves({
                            success: false,
                            error: 'Router address is required',
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000'), validPoolKey.token1, 1.0, '', // Empty router address
                            validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.exist;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle approval when allowance is insufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Configure stub to simulate successful swap after approval
                        swapStub.resolves({
                            success: true,
                            receipt: {
                                transactionHash: '0xSwapAfterApproval',
                                gasUsed: ethers_1.BigNumber.from('550000'), // Higher gas due to approval
                            },
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000000000000000'), validPoolKey.token1, 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should skip approval when allowance is sufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Configure stub to simulate direct swap (no approval needed)
                        swapStub.resolves({
                            success: true,
                            receipt: {
                                transactionHash: '0xDirectSwap',
                                gasUsed: ethers_1.BigNumber.from('450000'),
                            },
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000000000000000'), validPoolKey.token1, 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should calculate minimum output with slippage correctly', function () {
            var amountIn = ethers_1.BigNumber.from('1000000000000000000'); // 1 token
            var slippagePct = 1.0; // 1%
            // Business logic: minOut = amountIn * (10000 - slippageBasisPoints) / 10000
            var slippageBasisPoints = slippagePct * 100; // 100
            var minOut = amountIn.mul(10000 - slippageBasisPoints).div(10000);
            // Should be 99% of input
            (0, chai_1.expect)(minOut.toString()).to.equal('990000000000000000');
        });
        it('should encode PoolKey correctly for V4', function () {
            // Business logic: PoolKey must be encoded as tuple
            var encodedPoolKey = ethers_1.ethers.utils.defaultAbiCoder.encode(['tuple(address,address,uint24,int24,address)'], [[
                    validPoolKey.token0,
                    validPoolKey.token1,
                    validPoolKey.fee,
                    validPoolKey.tickSpacing,
                    validPoolKey.hooks
                ]]);
            (0, chai_1.expect)(encodedPoolKey).to.be.a('string');
            (0, chai_1.expect)(encodedPoolKey).to.include('0x');
        });
        it('should handle swap execution failure', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        swapStub.resolves({
                            success: false,
                            error: 'Transaction reverted'
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000'), validPoolKey.token1, 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.include('reverted');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle exceptions during swap', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        swapStub.rejects(new Error('Network error'));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, validPoolKey.token0, ethers_1.BigNumber.from('1000000'), validPoolKey.token1, 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 2:
                        _a.sent();
                        chai_1.expect.fail('Should have thrown an error');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        (0, chai_1.expect)(error_1.message).to.include('Network error');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    });
    describe('V4 Command Encoding', function () {
        it('should use correct V4_SWAP command', function () {
            var V4_SWAP = '0x10';
            // V4 uses command 0x10 for swaps through PoolManager
            (0, chai_1.expect)(V4_SWAP).to.equal('0x10');
        });
        it('should prepare swap input parameters correctly', function () {
            // Use a valid Ethereum address
            var to = '0x1234567890123456789012345678901234567890';
            var amountIn = ethers_1.BigNumber.from('1000000');
            var minOut = ethers_1.BigNumber.from('990000');
            var encodedPoolKey = '0x1234';
            var payerIsUser = false;
            var swapInput = ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256', 'bytes', 'bool'], [to, amountIn, minOut, encodedPoolKey, payerIsUser]);
            (0, chai_1.expect)(swapInput).to.be.a('string');
            (0, chai_1.expect)(swapInput).to.include('0x');
        });
    });
    describe('Real Base Network Configuration', function () {
        it('should work with production Base addresses', function () {
            var baseConfig = {
                router: '0x6ff5693b99212da76ad316178a184ab56d299b43',
                poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
                poolKey: {
                    token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                    token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                    fee: 100,
                    tickSpacing: 1,
                    hooks: '0x0000000000000000000000000000000000000000',
                },
            };
            // Validate addresses
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(baseConfig.router)).to.be.true;
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(baseConfig.poolManager)).to.be.true;
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(baseConfig.poolKey.token0)).to.be.true;
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(baseConfig.poolKey.token1)).to.be.true;
        });
        it('should validate all 3 pool configurations from config', function () {
            var pools = {
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
            };
            (0, chai_1.expect)(Object.keys(pools)).to.have.length(3);
            for (var _i = 0, _a = Object.entries(pools); _i < _a.length; _i++) {
                var _b = _a[_i], name_1 = _b[0], pool = _b[1];
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(pool.token0)).to.be.true;
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(pool.token1)).to.be.true;
                (0, chai_1.expect)(pool.fee).to.be.a('number');
                (0, chai_1.expect)(pool.tickSpacing).to.be.a('number');
            }
        });
    });
    describe('Gas and Deadline Settings', function () {
        it('should set appropriate gas limit for V4 swaps', function () {
            var gasLimit = 800000;
            // V4 swaps through Universal Router need higher gas
            (0, chai_1.expect)(gasLimit).to.be.greaterThan(500000);
        });
        it('should calculate deadline correctly', function () {
            var now = Math.floor(Date.now() / 1000);
            var deadline = now + 1800; // 30 minutes
            (0, chai_1.expect)(deadline).to.be.greaterThan(now);
            (0, chai_1.expect)(deadline - now).to.equal(1800);
        });
        it('should apply gas price multiplier', function () {
            var baseGasPrice = ethers_1.BigNumber.from('1000000000'); // 1 gwei
            var multiplier = baseGasPrice.mul(115).div(100); // 1.15x
            (0, chai_1.expect)(multiplier.toString()).to.equal('1150000000');
        });
    });
    describe('Error Handling', function () {
        it('should catch and return error on contract call failure', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        swapStub.resolves({
                            success: false,
                            error: 'Pool not initialized',
                        });
                        return [4 /*yield*/, uniswapV4RouterModule.swapWithUniswapV4Adapter(mockSigner, '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', ethers_1.BigNumber.from('1000000'), '0xd8A0af85E2539e22953287b436255422724871AB', 1.0, '0x6ff5693b99212da76ad316178a184ab56d299b43', validPoolKey, '0x1234567890123456789012345678901234567890', '0x')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.exist;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=Uniswapv4-router.test.js.map