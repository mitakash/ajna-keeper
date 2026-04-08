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
exports.NonceTracker = void 0;
var logging_1 = require("./logging");
var NonceTracker = exports.NonceTracker = /** @class */ (function () {
    function NonceTracker() {
        this.nonces = new Map();
        this.pendingTransactions = new Map();
        if (!NonceTracker.instance) {
            NonceTracker.instance = this;
        }
        return NonceTracker.instance;
    }
    NonceTracker.getNonce = function (signer) {
        return __awaiter(this, void 0, void 0, function () {
            var tracker;
            return __generator(this, function (_a) {
                tracker = new NonceTracker();
                return [2 /*return*/, tracker.getNonce(signer)];
            });
        });
    };
    NonceTracker.resetNonce = function (signer, address) {
        return __awaiter(this, void 0, void 0, function () {
            var tracker;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tracker = new NonceTracker();
                        return [4 /*yield*/, tracker.resetNonce(signer, address)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    NonceTracker.clearNonces = function () {
        var tracker = new NonceTracker();
        tracker.nonces = new Map();
        tracker.pendingTransactions = new Map();
        logging_1.logger.debug('Cleared all nonce tracking data');
    };
    NonceTracker.queueTransaction = function (signer, txFunction) {
        return __awaiter(this, void 0, void 0, function () {
            var tracker;
            return __generator(this, function (_a) {
                tracker = new NonceTracker();
                return [2 /*return*/, tracker.queueTransaction(signer, txFunction)];
            });
        });
    };
    NonceTracker.prototype.getNonce = function (signer) {
        return __awaiter(this, void 0, void 0, function () {
            var address, currentNonce;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, signer.getAddress()];
                    case 1:
                        address = _a.sent();
                        logging_1.logger.debug("Getting nonce for address: ".concat(address));
                        if (!(this.nonces.get(address) === undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.resetNonce(signer, address)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        currentNonce = this.nonces.get(address);
                        logging_1.logger.debug("Using nonce: ".concat(currentNonce));
                        // Increment the stored nonce for next time
                        this.nonces.set(address, currentNonce + 1);
                        return [2 /*return*/, currentNonce];
                }
            });
        });
    };
    NonceTracker.prototype.resetNonce = function (signer, address) {
        return __awaiter(this, void 0, void 0, function () {
            var latestNonce;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, signer.getTransactionCount('pending')];
                    case 1:
                        latestNonce = _a.sent();
                        logging_1.logger.debug("Reset nonce for ".concat(address, " to ").concat(latestNonce));
                        this.nonces.set(address, latestNonce);
                        return [2 /*return*/, latestNonce];
                }
            });
        });
    };
    // Simplified implementation that focuses just on managing nonces correctly
    NonceTracker.prototype.queueTransaction = function (signer, txFunction) {
        return __awaiter(this, void 0, void 0, function () {
            var address, nonce, result, txError_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, signer.getAddress()];
                    case 1:
                        address = _a.sent();
                        logging_1.logger.debug("Queueing transaction for ".concat(address));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 10, , 11]);
                        return [4 /*yield*/, this.getNonce(signer)];
                    case 3:
                        nonce = _a.sent();
                        logging_1.logger.debug("Executing transaction with nonce ".concat(nonce));
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 7, , 9]);
                        return [4 /*yield*/, txFunction(nonce)];
                    case 5:
                        result = _a.sent();
                        // Universal RPC cache refresh delay after every transaction
                        // This prevents race conditions between transaction confirmation and subsequent reads
                        logging_1.logger.debug("Transaction with nonce ".concat(nonce, " completed, adding ").concat(NonceTracker.RPC_CACHE_REFRESH_DELAY, "ms RPC cache refresh delay"));
                        return [4 /*yield*/, this.delay(NonceTracker.RPC_CACHE_REFRESH_DELAY)];
                    case 6:
                        _a.sent();
                        logging_1.logger.debug("Transaction with nonce ".concat(nonce, " completed successfully"));
                        return [2 /*return*/, result];
                    case 7:
                        txError_1 = _a.sent();
                        logging_1.logger.error("Transaction with nonce ".concat(nonce, " failed: ").concat(txError_1));
                        // Reset nonce on failure
                        return [4 /*yield*/, this.resetNonce(signer, address)];
                    case 8:
                        // Reset nonce on failure
                        _a.sent();
                        throw txError_1;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_1 = _a.sent();
                        logging_1.logger.error("Error in queueTransaction: ".concat(error_1));
                        throw error_1;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Simple delay function
     */
    NonceTracker.prototype.delay = function (ms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
            });
        });
    };
    // Universal RPC cache refresh delay - applies to all chains
    NonceTracker.RPC_CACHE_REFRESH_DELAY = 1000; // 1000ms for aggressive RPC caching
    return NonceTracker;
}());
//# sourceMappingURL=nonce.js.map