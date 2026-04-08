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
var sdk_1 = require("@ajna-finance/sdk");
var chai_1 = require("chai");
var config_types_1 = require("../config-types");
var loan_helpers_1 = require("./loan-helpers");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var utils_1 = require("../utils");
var setup = function (poolAddress) { return __awaiter(void 0, void 0, void 0, function () {
    var sdk;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                sdk = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                return [4 /*yield*/, sdk.fungiblePoolFactory.getPoolByAddress(poolAddress)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
describe('depositQuoteToken', function () {
    before(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Can deposit into specified pool', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, price, userAddress, priceBn, bucket, balanceBn, balance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    price = 1;
                    userAddress = test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress;
                    return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                            pool: pool,
                            owner: userAddress,
                            amount: 1,
                            price: price,
                        })];
                case 2:
                    _a.sent();
                    priceBn = (0, utils_1.decimaledToWei)(price);
                    return [4 /*yield*/, pool.getBucketByPrice(priceBn)];
                case 3:
                    bucket = _a.sent();
                    return [4 /*yield*/, bucket.lpBalance(userAddress)];
                case 4:
                    balanceBn = _a.sent();
                    balance = (0, utils_1.weiToDecimaled)(balanceBn);
                    (0, chai_1.expect)(balance).greaterThan(0.9).and.lessThan(1.1);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('drawDebt', function () {
    before(function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, setup(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 2:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                            amount: 1,
                            price: 1,
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('can take out a loan', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pool, loan, tp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setup(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 1:
                    pool = _a.sent();
                    return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                            pool: pool,
                            owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                            amountToBorrow: 0.5,
                            collateralToPledge: 1,
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, pool.getLoan(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 3:
                    loan = _a.sent();
                    tp = (0, utils_1.weiToDecimaled)(loan.thresholdPrice);
                    (0, chai_1.expect)(tp).greaterThan(0.4).and.lessThan(0.6);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=loan-helpers.test.js.map