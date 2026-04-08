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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sinon_1 = __importDefault(require("sinon"));
var nonce_1 = require("../nonce");
var ethers_1 = require("ethers");
var chai_1 = require("chai");
describe('NonceTracker', function () {
    var signer = ethers_1.Wallet.createRandom();
    beforeEach(function () {
        nonce_1.NonceTracker.clearNonces();
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('gets initial nonce', function () { return __awaiter(void 0, void 0, void 0, function () {
        var nonce;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sinon_1.default.stub(signer, 'getTransactionCount').resolves(10);
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 1:
                    nonce = _a.sent();
                    (0, chai_1.expect)(nonce).equals(10);
                    return [2 /*return*/];
            }
        });
    }); });
    it('increments nonce every time it is called', function () { return __awaiter(void 0, void 0, void 0, function () {
        var secondNonce;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sinon_1.default.stub(signer, 'getTransactionCount').resolves(10);
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 2:
                    secondNonce = _a.sent();
                    (0, chai_1.expect)(secondNonce).equals(11);
                    return [2 /*return*/];
            }
        });
    }); });
    it('resets nonce when resetNonce is called', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c, nonceAfterReset;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    sinon_1.default.stub(signer, 'getTransactionCount').resolves(10);
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 2:
                    _d.sent();
                    _b = (_a = nonce_1.NonceTracker).resetNonce;
                    _c = [signer];
                    return [4 /*yield*/, signer.getAddress()];
                case 3:
                    _b.apply(_a, _c.concat([_d.sent()]));
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 4:
                    nonceAfterReset = _d.sent();
                    (0, chai_1.expect)(nonceAfterReset).equals(10);
                    return [2 /*return*/];
            }
        });
    }); });
    it('resets nonce when transaction fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        var address, txFunction, error_1, nextNonce;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signer.getAddress()];
                case 1:
                    address = _a.sent();
                    sinon_1.default.stub(signer, 'getTransactionCount').resolves(10);
                    // First, let's get a nonce and increment it
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 2:
                    // First, let's get a nonce and increment it
                    _a.sent(); // Should be 10
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 3:
                    _a.sent(); // Should be 11
                    txFunction = function (nonce) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            throw new Error('Transaction failed');
                        });
                    }); };
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, txFunction)];
                case 5:
                    _a.sent();
                    // Should not reach here
                    chai_1.expect.fail('Transaction should have failed');
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    return [3 /*break*/, 7];
                case 7: return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 8:
                    nextNonce = _a.sent();
                    (0, chai_1.expect)(nextNonce).to.equal(10);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=nonce.test.js.map