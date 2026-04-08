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
exports.makeGetHighestMeaningfulBucket = exports.overrideGetHighestMeaningfulBucket = exports.makeGetLiquidationsFromSdk = exports.overrideGetLiquidations = exports.makeGetLoansFromSdk = exports.overrideGetLoans = void 0;
var sdk_1 = require("@ajna-finance/sdk");
var subgraph_1 = __importDefault(require("../subgraph"));
var test_utils_1 = require("./test-utils");
var utils_1 = require("../utils");
var test_config_1 = require("./test-config");
var logging_1 = require("../logging");
function overrideGetLoans(fn) {
    var originalGetLoans = subgraph_1.default.getLoans;
    var undoFn = function () {
        subgraph_1.default.getLoans = originalGetLoans;
    };
    subgraph_1.default.getLoans = fn;
    return undoFn;
}
exports.overrideGetLoans = overrideGetLoans;
var makeGetLoansFromSdk = function (pool) {
    return function (subgraphUrl, poolAddress) { return __awaiter(void 0, void 0, void 0, function () {
        var loansMap, borrowerLoanTuple, loans;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getLoansMap(pool)];
                case 1:
                    loansMap = _a.sent();
                    borrowerLoanTuple = Array.from(loansMap.entries());
                    loans = borrowerLoanTuple
                        .filter(function (_a) {
                        var _ = _a[0], _b = _a[1], isKicked = _b.isKicked, thresholdPrice = _b.thresholdPrice;
                        return !isKicked;
                    })
                        .map(function (_a) {
                        var borrower = _a[0], thresholdPrice = _a[1].thresholdPrice;
                        return ({
                            borrower: borrower,
                            thresholdPrice: (0, utils_1.weiToDecimaled)(thresholdPrice),
                        });
                    });
                    return [2 /*return*/, {
                            loans: loans,
                        }];
            }
        });
    }); };
};
exports.makeGetLoansFromSdk = makeGetLoansFromSdk;
function getLoansMap(pool) {
    return __awaiter(this, void 0, void 0, function () {
        var loansCount, poolContract, borrowers, i, borrower;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, pool.getStats()];
                case 1:
                    loansCount = (_a.sent()).loansCount;
                    poolContract = sdk_1.ERC20Pool__factory.connect(pool.poolAddress, (0, test_utils_1.getProvider)());
                    borrowers = [];
                    i = 1;
                    _a.label = 2;
                case 2:
                    if (!(i < loansCount + 1)) return [3 /*break*/, 5];
                    return [4 /*yield*/, poolContract.loanInfo(i)];
                case 3:
                    borrower = (_a.sent())[0];
                    borrowers.push(borrower);
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [4 /*yield*/, pool.getLoans(borrowers)];
                case 6: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function overrideGetLiquidations(fn) {
    var originalGetLiquidations = subgraph_1.default.getLiquidations;
    var undoFn = function () {
        subgraph_1.default.getLiquidations = originalGetLiquidations;
    };
    subgraph_1.default.getLiquidations = fn;
    return undoFn;
}
exports.overrideGetLiquidations = overrideGetLiquidations;
function makeGetLiquidationsFromSdk(pool) {
    var _this = this;
    return function (subgraphUrl, poolAddress, minCollateral) { return __awaiter(_this, void 0, void 0, function () {
        var _a, hpb, hpbIndex, poolContract, events, borrowers, _i, events_1, evt, borrower, liquidationAuctions, _b, borrowers_1, borrower, liquidation, liquidationStatus, e_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, pool.getPrices()];
                case 1:
                    _a = _c.sent(), hpb = _a.hpb, hpbIndex = _a.hpbIndex;
                    poolContract = sdk_1.ERC20Pool__factory.connect(pool.poolAddress, (0, test_utils_1.getProvider)());
                    return [4 /*yield*/, poolContract.queryFilter(poolContract.filters.Kick(), test_config_1.MAINNET_CONFIG.BLOCK_NUMBER)];
                case 2:
                    events = _c.sent();
                    borrowers = [];
                    for (_i = 0, events_1 = events; _i < events_1.length; _i++) {
                        evt = events_1[_i];
                        borrower = evt.args.borrower;
                        borrowers.push(borrower);
                    }
                    liquidationAuctions = [];
                    _b = 0, borrowers_1 = borrowers;
                    _c.label = 3;
                case 3:
                    if (!(_b < borrowers_1.length)) return [3 /*break*/, 9];
                    borrower = borrowers_1[_b];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, pool.getLiquidation(borrower)];
                case 5:
                    liquidation = _c.sent();
                    return [4 /*yield*/, liquidation.getStatus()];
                case 6:
                    liquidationStatus = _c.sent();
                    if ((0, utils_1.weiToDecimaled)(liquidationStatus.collateral) > minCollateral) {
                        liquidationAuctions.push({
                            borrower: borrower,
                        });
                    }
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _c.sent();
                    logging_1.logger.debug("Failed to find auction for borrower: ".concat(borrower, ", pool: ").concat(pool.name));
                    return [3 /*break*/, 8];
                case 8:
                    _b++;
                    return [3 /*break*/, 3];
                case 9: return [2 /*return*/, {
                        pool: {
                            hpb: (0, utils_1.weiToDecimaled)(hpb),
                            hpbIndex: hpbIndex,
                            liquidationAuctions: liquidationAuctions,
                        },
                    }];
            }
        });
    }); };
}
exports.makeGetLiquidationsFromSdk = makeGetLiquidationsFromSdk;
function overrideGetHighestMeaningfulBucket(fn) {
    var originalGetBucket = subgraph_1.default.getHighestMeaningfulBucket;
    var undoFn = function () {
        subgraph_1.default.getHighestMeaningfulBucket = originalGetBucket;
    };
    subgraph_1.default.getHighestMeaningfulBucket = fn;
    return undoFn;
}
exports.overrideGetHighestMeaningfulBucket = overrideGetHighestMeaningfulBucket;
function makeGetHighestMeaningfulBucket(pool) {
    var _this = this;
    return function (subgraphUrl, poolAddress, minDeposit) { return __awaiter(_this, void 0, void 0, function () {
        var poolContract, events, indices, _i, events_2, evt, index, ascIndices, _a, ascIndices_1, index, bucket, deposit;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    poolContract = sdk_1.ERC20Pool__factory.connect(pool.poolAddress, (0, test_utils_1.getProvider)());
                    return [4 /*yield*/, poolContract.queryFilter(poolContract.filters.AddQuoteToken(), test_config_1.MAINNET_CONFIG.BLOCK_NUMBER)];
                case 1:
                    events = _b.sent();
                    indices = new Set();
                    for (_i = 0, events_2 = events; _i < events_2.length; _i++) {
                        evt = events_2[_i];
                        index = evt.args.index;
                        indices.add(parseInt(index.toString()));
                    }
                    ascIndices = Array.from(indices).sort();
                    _a = 0, ascIndices_1 = ascIndices;
                    _b.label = 2;
                case 2:
                    if (!(_a < ascIndices_1.length)) return [3 /*break*/, 5];
                    index = ascIndices_1[_a];
                    bucket = pool.getBucketByIndex(index);
                    return [4 /*yield*/, bucket.getStatus()];
                case 3:
                    deposit = (_b.sent()).deposit;
                    if (deposit.gte((0, utils_1.decimaledToWei)(parseFloat(minDeposit)))) {
                        return [2 /*return*/, {
                                buckets: [{ bucketIndex: index }],
                            }];
                    }
                    _b.label = 4;
                case 4:
                    _a++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, { buckets: [] }];
            }
        });
    }); };
}
exports.makeGetHighestMeaningfulBucket = makeGetHighestMeaningfulBucket;
//# sourceMappingURL=subgraph-mock.js.map