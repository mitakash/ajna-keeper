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
exports.drawDebt = exports.depositQuoteToken = exports.transferErc20 = void 0;
var ethers_1 = require("ethers");
var pool_1 = require("@ajna-finance/sdk/dist/contracts/pool");
var ERC20Pool_json_1 = __importDefault(require("@ajna-finance/sdk/dist/abis/ERC20Pool.json"));
var erc20_abi_json_1 = __importDefault(require("../abis/erc20.abi.json"));
var utils_1 = require("../utils");
var test_utils_1 = require("./test-utils");
var nonce_1 = require("../nonce");
var transferErc20 = function (signer, receiver, tokenAddress, amount) { return __awaiter(void 0, void 0, void 0, function () {
    var contract, tx;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                contract = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                return [4 /*yield*/, contract.transfer(receiver, amount)];
            case 1:
                tx = _a.sent();
                return [4 /*yield*/, tx.wait()];
            case 2: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.transferErc20 = transferErc20;
var depositQuoteToken = function (_a) {
    var pool = _a.pool, owner = _a.owner, amount = _a.amount, price = _a.price;
    return __awaiter(void 0, void 0, void 0, function () {
        var whaleSigner, bucket, amountBn, approveTx, currTimestamp, contract, addQuoteTx;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(owner)];
                case 1:
                    whaleSigner = _b.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(owner, '0x1000000000000000000000000')];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, pool.getBucketByPrice((0, utils_1.decimaledToWei)(price))];
                case 3:
                    bucket = _b.sent();
                    amountBn = (0, utils_1.decimaledToWei)(amount);
                    return [4 /*yield*/, pool.quoteApprove(whaleSigner, amountBn)];
                case 4:
                    approveTx = _b.sent();
                    return [4 /*yield*/, approveTx.verifyAndSubmit()];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(whaleSigner)];
                case 6:
                    _b.sent();
                    return [4 /*yield*/, (0, test_utils_1.latestBlockTimestamp)()];
                case 7:
                    currTimestamp = _b.sent();
                    contract = new ethers_1.Contract(pool.poolAddress, ERC20Pool_json_1.default, whaleSigner);
                    return [4 /*yield*/, (0, pool_1.addQuoteToken)(contract, amountBn, bucket.index, currTimestamp * 2)];
                case 8:
                    addQuoteTx = _b.sent();
                    return [4 /*yield*/, addQuoteTx.verifyAndSubmit()];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(whaleSigner)];
                case 10:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.depositQuoteToken = depositQuoteToken;
var drawDebt = function (_a) {
    var pool = _a.pool, owner = _a.owner, amountToBorrow = _a.amountToBorrow, collateralToPledge = _a.collateralToPledge;
    return __awaiter(void 0, void 0, void 0, function () {
        var signer, collateralAmt, qApproveTx, borrowAmt, drawTx;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(owner)];
                case 1:
                    signer = _b.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(owner, '0x1000000000000000000000000')];
                case 2:
                    _b.sent();
                    collateralAmt = (0, utils_1.decimaledToWei)(collateralToPledge);
                    return [4 /*yield*/, pool.collateralApprove(signer, collateralAmt)];
                case 3:
                    qApproveTx = _b.sent();
                    return [4 /*yield*/, qApproveTx.verifyAndSubmit()];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 5:
                    _b.sent();
                    borrowAmt = (0, utils_1.decimaledToWei)(amountToBorrow);
                    return [4 /*yield*/, pool.drawDebt(signer, borrowAmt, collateralAmt)];
                case 6:
                    drawTx = _b.sent();
                    return [4 /*yield*/, drawTx.verifyAndSubmit()];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, nonce_1.NonceTracker.getNonce(signer)];
                case 8:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.drawDebt = drawDebt;
//# sourceMappingURL=loan-helpers.js.map