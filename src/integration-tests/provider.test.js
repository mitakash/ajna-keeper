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
var chai_1 = require("chai");
var test_utils_1 = require("./test-utils");
var utils_1 = require("../utils");
require("dotenv");
var provider_1 = require("../provider");
describe('JsonRpcProvider', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Uses EIP-1559 fee structure', function () { return __awaiter(void 0, void 0, void 0, function () {
        var provider, feeData;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    provider = (0, test_utils_1.getProvider)();
                    return [4 /*yield*/, provider.getFeeData()];
                case 1:
                    feeData = _e.sent();
                    (0, chai_1.expect)((_a = feeData.gasPrice) === null || _a === void 0 ? void 0 : _a.lte((0, utils_1.decimaledToWei)(1e-8)), "gasPrice should be below 10Gwei").to.be.true;
                    (0, chai_1.expect)((_b = feeData.maxFeePerGas) === null || _b === void 0 ? void 0 : _b.lte((0, utils_1.decimaledToWei)(5e-8)), "maxFeePerGas should be below 50Gwei").to.be.true;
                    (0, chai_1.expect)((_c = feeData.maxPriorityFeePerGas) === null || _c === void 0 ? void 0 : _c.lte((0, utils_1.decimaledToWei)(1e-9)), "maxPriorityFeePerGas should be below 1Gwei").to.be.true;
                    (0, chai_1.expect)((_d = feeData.lastBaseFeePerGas) === null || _d === void 0 ? void 0 : _d.lte((0, utils_1.decimaledToWei)(1e-8)), "lastBaseFeePerGas should be below 10Gwei").to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
    it('Uses EIP-1559 fee structure for L2 on Alchemy', function () { return __awaiter(void 0, void 0, void 0, function () {
        var provider, feeData;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    (0, chai_1.expect)(!!process.env.ALCHEMY_API_KEY, 'Put your ALCHEMY_API_KEY in your .env file').to.be.true;
                    provider = new provider_1.JsonRpcProvider("https://base-mainnet.g.alchemy.com/v2/".concat(process.env.ALCHEMY_API_KEY));
                    return [4 /*yield*/, provider.getFeeData()];
                case 1:
                    feeData = _e.sent();
                    (0, chai_1.expect)((_a = feeData.gasPrice) === null || _a === void 0 ? void 0 : _a.lt((0, utils_1.decimaledToWei)(1e-9)), 'gasPrice should be below 1Gwei').to.be.true;
                    (0, chai_1.expect)((_b = feeData.maxFeePerGas) === null || _b === void 0 ? void 0 : _b.lt((0, utils_1.decimaledToWei)(1e-9)), 'maxFeePerGas should be below 1Gwei').to.be.true;
                    (0, chai_1.expect)((_c = feeData.maxPriorityFeePerGas) === null || _c === void 0 ? void 0 : _c.lt((0, utils_1.decimaledToWei)(1e-9)), 'maxPriorityFeePerGas should be below 1Gwei').to.be.true;
                    (0, chai_1.expect)((_d = feeData.lastBaseFeePerGas) === null || _d === void 0 ? void 0 : _d.lt((0, utils_1.decimaledToWei)(1e-9)), 'lastBaseFeePerGas should be below 1Gwei').to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=provider.test.js.map