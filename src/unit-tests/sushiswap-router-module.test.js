"use strict";
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
var sushiswapRouterModule = __importStar(require("../sushiswap-router-module"));
var nonce_1 = require("../nonce");
describe('SushiSwap Router Module', function () {
    var swapStub;
    var mockSigner;
    var queueTransactionStub;
    beforeEach(function () {
        // Reset sinon after each test
        sinon_1.default.restore();
        // Create basic mocks - same pattern as universal-router-module.test.ts
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(43111),
            provider: {
                getNetwork: sinon_1.default.stub().resolves({ chainId: 43111, name: 'hemi-test' }),
                estimateGas: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('100000')),
                getGasPrice: sinon_1.default.stub().resolves(ethers_1.BigNumber.from('20000000000')),
                getCode: sinon_1.default.stub().resolves('0x123456'), // Non-empty code
            },
            sendTransaction: sinon_1.default.stub().resolves({
                hash: '0xTestHash',
                wait: sinon_1.default.stub().resolves({ transactionHash: '0xTestHash' }),
            }),
        };
        // Mock NonceTracker - same pattern as universal-router-module.test.ts
        queueTransactionStub = sinon_1.default.stub(nonce_1.NonceTracker, 'queueTransaction').callsFake(function (signer, txFunc) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, txFunc(10)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); });
        // Stub the actual exported function
        swapStub = sinon_1.default.stub(sushiswapRouterModule, 'swapWithSushiswapRouter');
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('swapWithSushiswapRouter', function () {
        it('should execute successful swap with correct parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Return success to simulate a successful call
                        swapStub.resolves({ success: true, receipt: { transactionHash: '0xSuccess' } });
                        return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // tokenAddress
                            ethers_1.BigNumber.from('1000000'), // amount
                            '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // targetTokenAddress
                            2.0, // slippagePercentage
                            '0x33d91116e0370970444B0281AB117e161fEbFcdD', // swapRouterAddress
                            '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C', // quoterV2Address
                            500, // feeTier
                            '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959' // factoryAddress
                            )];
                    case 1:
                        result = _a.sent();
                        // Verify the function was called
                        (0, chai_1.expect)(swapStub.calledOnce).to.be.true;
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.receipt.transactionHash).to.equal('0xSuccess');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle swap failure', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Simulate a failed swap
                        swapStub.resolves({ success: false, error: 'No SushiSwap pool exists' });
                        return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', ethers_1.BigNumber.from('1000000'), '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', 2.0, '0x33d91116e0370970444B0281AB117e161fEbFcdD', '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C', 500, '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.equal('No SushiSwap pool exists');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle exceptions during swap', function () { return __awaiter(void 0, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Simulate an exception
                        swapStub.rejects(new Error('Transaction reverted'));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', ethers_1.BigNumber.from('1000000'), '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', 2.0, '0x33d91116e0370970444B0281AB117e161fEbFcdD', '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C', 500, '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959')];
                    case 2:
                        _a.sent();
                        chai_1.expect.fail('Should have thrown an error');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        (0, chai_1.expect)(error_1.message).to.equal('Transaction reverted');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
    });
    // Test NonceTracker integration - same pattern as universal-router-module.test.ts
    describe('Integration with NonceTracker', function () {
        it('should use NonceTracker.queueTransaction for transactions', function () { return __awaiter(void 0, void 0, void 0, function () {
            var dummyTxFunction, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Restore the original method before this test
                        swapStub.restore();
                        dummyTxFunction = function (nonce) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, { success: true, transactionHash: '0xTest' }];
                            });
                        }); };
                        return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(mockSigner, dummyTxFunction)];
                    case 1:
                        result = _a.sent();
                        // Verify it was called and returned expected result
                        (0, chai_1.expect)(queueTransactionStub.calledOnce).to.be.true;
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.transactionHash).to.equal('0xTest');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=sushiswap-router-module.test.js.map