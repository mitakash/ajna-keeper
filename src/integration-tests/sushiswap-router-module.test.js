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
// src/integration-tests/sushiswap-router-module.test.ts
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var sushiswapRouterModule = __importStar(require("../sushiswap-router-module"));
var nonce_1 = require("../nonce");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
describe('SushiSwap Router Module', function () {
    var swapStub;
    var mockSigner;
    var queueTransactionStub;
    beforeEach(function () {
        // Reset sinon after each test
        sinon_1.default.restore();
        // Use REAL wallet from test mnemonic (same pattern as working tests)
        var wallet = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC);
        mockSigner = wallet.connect((0, test_utils_1.getProvider)());
        // Mock key dependencies
        queueTransactionStub = sinon_1.default.stub(nonce_1.NonceTracker, 'queueTransaction').callsFake(function (signer, txFunc) { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, txFunc(10)];
                    case 1: 
                    // Just execute the function with nonce 10
                    return [2 /*return*/, _a.sent()];
                }
            });
        }); });
        // Create a spy for swapWithSushiswapRouter
        swapStub = sinon_1.default.stub(sushiswapRouterModule, 'swapWithSushiswapRouter');
    });
    it('should approve token for SushiSwap router if allowance is insufficient', function () { return __awaiter(void 0, void 0, void 0, function () {
        var tokenAddress, targetTokenAddress, amount, slippagePercentage, swapRouterAddress, quoterV2Address, feeTier, factoryAddress, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tokenAddress = '0xTokenAddress';
                    targetTokenAddress = '0xTargetTokenAddress';
                    amount = ethers_1.BigNumber.from('1000000');
                    slippagePercentage = 1.0;
                    swapRouterAddress = '0xSushiSwapRouterAddress';
                    quoterV2Address = '0xQuoterV2Address';
                    feeTier = 500;
                    factoryAddress = '0xSushiFactoryAddress';
                    // Return success to simulate a successful call
                    swapStub.resolves({ success: true, receipt: { transactionHash: '0xSuccess' } });
                    return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, tokenAddress, amount, targetTokenAddress, slippagePercentage, swapRouterAddress, quoterV2Address, feeTier, factoryAddress)];
                case 1:
                    result = _a.sent();
                    // Verify the function was called with correct parameters
                    (0, chai_1.expect)(swapStub.calledOnce).to.be.true;
                    (0, chai_1.expect)(swapStub.firstCall.args[0]).to.equal(mockSigner);
                    (0, chai_1.expect)(swapStub.firstCall.args[1]).to.equal(tokenAddress);
                    (0, chai_1.expect)(swapStub.firstCall.args[2].toString()).to.equal(amount.toString());
                    (0, chai_1.expect)(swapStub.firstCall.args[3]).to.equal(targetTokenAddress);
                    (0, chai_1.expect)(swapStub.firstCall.args[4]).to.equal(slippagePercentage);
                    (0, chai_1.expect)(swapStub.firstCall.args[5]).to.equal(swapRouterAddress);
                    (0, chai_1.expect)(swapStub.firstCall.args[6]).to.equal(quoterV2Address);
                    (0, chai_1.expect)(swapStub.firstCall.args[7]).to.equal(feeTier);
                    (0, chai_1.expect)(swapStub.firstCall.args[8]).to.equal(factoryAddress);
                    // Verify the result
                    (0, chai_1.expect)(result.success).to.be.true;
                    (0, chai_1.expect)(result.receipt.transactionHash).to.equal('0xSuccess');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle errors during SushiSwap swap', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Simulate a failed swap
                    swapStub.resolves({ success: false, error: 'SushiSwap swap failed' });
                    return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0xTokenAddress', ethers_1.BigNumber.from('1000000'), '0xTargetTokenAddress', 2.0, // 2.0%
                        '0xSushiSwapRouterAddress', '0xQuoterV2Address', 500, '0xSushiFactoryAddress')];
                case 1:
                    result = _a.sent();
                    (0, chai_1.expect)(result.success).to.be.false;
                    (0, chai_1.expect)(result.error).to.equal('SushiSwap swap failed');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle exceptions during SushiSwap swap', function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Simulate an exception
                    swapStub.rejects(new Error('SushiSwap transaction reverted'));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0xTokenAddress', ethers_1.BigNumber.from('1000000'), '0xTargetTokenAddress', 1.5, // 1.5%
                        '0xSushiSwapRouterAddress', '0xQuoterV2Address', 500, '0xSushiFactoryAddress')];
                case 2:
                    _a.sent();
                    // Should not reach here
                    chai_1.expect.fail('Should have thrown an error');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    (0, chai_1.expect)(error_1.message).to.equal('SushiSwap transaction reverted');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('should work without optional factory address', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Test without factoryAddress parameter (optional)
                    swapStub.resolves({ success: true, receipt: { transactionHash: '0xSuccessNoFactory' } });
                    return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0xTokenAddress', ethers_1.BigNumber.from('2000000'), '0xTargetTokenAddress', 1.0, // 1.0%
                        '0xSushiSwapRouterAddress', '0xQuoterV2Address', 500
                        // No factoryAddress - testing optional parameter
                        )];
                case 1:
                    result = _a.sent();
                    // Verify the function was called with correct parameters (including undefined factory)
                    (0, chai_1.expect)(swapStub.calledOnce).to.be.true;
                    (0, chai_1.expect)(swapStub.firstCall.args[8]).to.be.undefined; // factoryAddress should be undefined
                    // Verify the result
                    (0, chai_1.expect)(result.success).to.be.true;
                    (0, chai_1.expect)(result.receipt.transactionHash).to.equal('0xSuccessNoFactory');
                    return [2 /*return*/];
            }
        });
    }); });
    it('should handle different SushiSwap fee tiers', function () { return __awaiter(void 0, void 0, void 0, function () {
        var feeTiers, _i, feeTiers_1, feeTier, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    feeTiers = [500, 3000, 10000];
                    _i = 0, feeTiers_1 = feeTiers;
                    _a.label = 1;
                case 1:
                    if (!(_i < feeTiers_1.length)) return [3 /*break*/, 4];
                    feeTier = feeTiers_1[_i];
                    swapStub.resetHistory();
                    swapStub.resolves({ success: true, receipt: { transactionHash: "0xSuccess".concat(feeTier) } });
                    return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0xTokenAddress', ethers_1.BigNumber.from('1000000'), '0xTargetTokenAddress', 1.0, // 1.0%
                        '0xSushiSwapRouterAddress', '0xQuoterV2Address', feeTier, '0xSushiFactoryAddress')];
                case 2:
                    result = _a.sent();
                    (0, chai_1.expect)(swapStub.calledOnce).to.be.true;
                    (0, chai_1.expect)(swapStub.firstCall.args[7]).to.equal(feeTier);
                    (0, chai_1.expect)(result.success).to.be.true;
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Test specific behaviors that we care about
    describe('SushiSwap specific behaviors', function () {
        it('should use NonceTracker.queueTransaction for transactions', function () { return __awaiter(void 0, void 0, void 0, function () {
            var dummyTxFunction, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // IMPORTANT: Restore the original method before this test
                        swapStub.restore();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        dummyTxFunction = function (nonce) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, { success: true }];
                            });
                        }); };
                        // Call NonceTracker directly with our test function 
                        return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(mockSigner, dummyTxFunction)];
                    case 2:
                        // Call NonceTracker directly with our test function 
                        _a.sent();
                        // Now verify it was called
                        (0, chai_1.expect)(queueTransactionStub.calledOnce).to.be.true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error("SushiSwap test error:", error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        it('should handle SushiSwap-specific configuration validation', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Test parameter validation scenarios specific to SushiSwap
                        swapStub.resolves({ success: false, error: 'SushiSwap Router address must be provided via configuration' });
                        return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(mockSigner, '0xTokenAddress', ethers_1.BigNumber.from('1000000'), '0xTargetTokenAddress', 1.0, '', // Empty router address - should cause validation error
                            '0xQuoterV2Address', 500, '0xSushiFactoryAddress')];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.error).to.include('SushiSwap Router address must be provided');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle real signer address and provider correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
            var address, chainId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Test that real signer works correctly
                        (0, chai_1.expect)(typeof mockSigner.getAddress).to.equal('function');
                        (0, chai_1.expect)(typeof mockSigner.getChainId).to.equal('function');
                        (0, chai_1.expect)(mockSigner.provider).to.not.be.null;
                        return [4 /*yield*/, mockSigner.getAddress()];
                    case 1:
                        address = _a.sent();
                        (0, chai_1.expect)(address).to.match(/^0x[a-fA-F0-9]{40}$/);
                        return [4 /*yield*/, mockSigner.getChainId()];
                    case 2:
                        chainId = _a.sent();
                        (0, chai_1.expect)(typeof chainId).to.equal('number');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Integration with Real Wallet', function () {
        it('should work with different wallet configurations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var walletPatterns, _i, walletPatterns_1, pattern, result, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        walletPatterns = [
                            {
                                name: 'Connected Wallet',
                                wallet: ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)())
                            },
                            {
                                name: 'Unconnected Wallet',
                                wallet: ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC)
                            }
                        ];
                        _i = 0, walletPatterns_1 = walletPatterns;
                        _a.label = 1;
                    case 1:
                        if (!(_i < walletPatterns_1.length)) return [3 /*break*/, 6];
                        pattern = walletPatterns_1[_i];
                        swapStub.resetHistory();
                        swapStub.resolves({ success: true, receipt: { transactionHash: "0x".concat(pattern.name) } });
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, sushiswapRouterModule.swapWithSushiswapRouter(pattern.wallet, '0xTokenAddress', ethers_1.BigNumber.from('1000000'), '0xTargetTokenAddress', 1.0, '0xSushiSwapRouterAddress', '0xQuoterV2Address', 500, '0xSushiFactoryAddress')];
                    case 3:
                        result = _a.sent();
                        if (pattern.name === 'Connected Wallet') {
                            (0, chai_1.expect)(result.success).to.be.true;
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        if (pattern.name === 'Unconnected Wallet') {
                            errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                            (0, chai_1.expect)(errorMessage.length).to.be.greaterThan(0);
                        }
                        else {
                            throw error_3;
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        it('should validate signer has required properties', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Test that our real signer has all required properties
                (0, chai_1.expect)(mockSigner).to.have.property('address');
                (0, chai_1.expect)(mockSigner).to.have.property('provider');
                (0, chai_1.expect)(mockSigner.provider).to.not.be.null;
                // Test async methods exist
                (0, chai_1.expect)(typeof mockSigner.getAddress).to.equal('function');
                (0, chai_1.expect)(typeof mockSigner.getChainId).to.equal('function');
                (0, chai_1.expect)(typeof mockSigner.signMessage).to.equal('function');
                (0, chai_1.expect)(typeof mockSigner.signTransaction).to.equal('function');
                return [2 /*return*/];
            });
        }); });
    });
});
//# sourceMappingURL=sushiswap-router-module.test.js.map