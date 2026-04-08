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
exports.poolSettle = exports.liquidationArbTake = exports.poolKick = exports.poolQuoteApprove = exports.bucketRemoveCollateralToken = exports.bucketRemoveQuoteToken = exports.poolWithdrawBonds = void 0;
var pool_1 = require("@ajna-finance/sdk/dist/contracts/pool");
var constants_1 = require("./constants");
var nonce_1 = require("./nonce");
var erc20_pool_1 = require("@ajna-finance/sdk/dist/contracts/erc20-pool");
var pool_2 = require("@ajna-finance/sdk/dist/contracts/pool");
function poolWithdrawBonds(pool, signer) {
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner, recipient;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = pool.contract.connect(signer);
                    return [4 /*yield*/, signer.getAddress()];
                case 1:
                    recipient = _a.sent();
                    // Use queueTransaction instead of manual nonce management
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, pool_1.withdrawBonds)(contractPoolWithSigner, recipient, constants_1.MAX_UINT_256, {
                                            nonce: nonce.toString(),
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 2:
                    // Use queueTransaction instead of manual nonce management
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.poolWithdrawBonds = poolWithdrawBonds;
function bucketRemoveQuoteToken(bucket, signer, maxAmount) {
    if (maxAmount === void 0) { maxAmount = constants_1.MAX_UINT_256; }
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = bucket.poolContract.connect(signer);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, pool_1.removeQuoteToken)(contractPoolWithSigner, maxAmount, bucket.index, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.bucketRemoveQuoteToken = bucketRemoveQuoteToken;
function bucketRemoveCollateralToken(bucket, signer, maxAmount) {
    if (maxAmount === void 0) { maxAmount = constants_1.MAX_UINT_256; }
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = bucket.poolContract.connect(signer);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, erc20_pool_1.removeCollateral)(contractPoolWithSigner, bucket.index, maxAmount, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.bucketRemoveCollateralToken = bucketRemoveCollateralToken;
function poolQuoteApprove(pool, signer, allowance) {
    return __awaiter(this, void 0, void 0, function () {
        var denormalizedAllowance, _a, _b;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _b = (_a = allowance).div;
                    return [4 /*yield*/, (0, pool_1.quoteTokenScale)(pool.contract)];
                case 1:
                    denormalizedAllowance = _b.apply(_a, [_c.sent()]);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx, txResponse;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, erc20_pool_1.approve)(signer, pool.poolAddress, pool.quoteAddress, denormalizedAllowance, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmitResponse()];
                                    case 2:
                                        txResponse = _a.sent();
                                        // Wait for transaction to be mined (1 confirmation) before returning
                                        // This prevents "insufficient allowance" errors when kick executes before approval is on-chain
                                        return [4 /*yield*/, txResponse.wait(1)];
                                    case 3:
                                        // Wait for transaction to be mined (1 confirmation) before returning
                                        // This prevents "insufficient allowance" errors when kick executes before approval is on-chain
                                        _a.sent();
                                        return [2 /*return*/, txResponse];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.poolQuoteApprove = poolQuoteApprove;
function poolKick(pool, signer, borrower, limitIndex) {
    if (limitIndex === void 0) { limitIndex = constants_1.MAX_FENWICK_INDEX; }
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = pool.contract.connect(signer);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, pool_1.kick)(contractPoolWithSigner, borrower, limitIndex, {
                                            nonce: nonce.toString(),
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.poolKick = poolKick;
function liquidationArbTake(liquidation, signer, bucketIndex) {
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = liquidation.poolContract.connect(signer);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, pool_1.bucketTake)(contractPoolWithSigner, liquidation.borrowerAddress, false, bucketIndex, {
                                            nonce: nonce.toString(),
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.liquidationArbTake = liquidationArbTake;
function poolSettle(pool, signer, borrower, bucketDepth) {
    if (bucketDepth === void 0) { bucketDepth = 50; }
    return __awaiter(this, void 0, void 0, function () {
        var contractPoolWithSigner;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contractPoolWithSigner = pool.contract.connect(signer);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, pool_2.settle)(contractPoolWithSigner, borrower, bucketDepth, {
                                            nonce: nonce.toString(),
                                            gasLimit: 800000 // Conservative gas limit for settlement
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.verifyAndSubmit()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.poolSettle = poolSettle;
//# sourceMappingURL=transactions.js.map