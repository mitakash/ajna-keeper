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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kick = exports.approveBalanceForLoanToKick = exports.getLoansToKick = exports.handleKicks = void 0;
var ethers_1 = require("ethers");
var erc20_1 = require("./erc20");
var logging_1 = require("./logging");
var price_1 = require("./price");
var subgraph_1 = __importDefault(require("./subgraph"));
var utils_1 = require("./utils");
var transactions_1 = require("./transactions");
var LIQUIDATION_BOND_MARGIN = 0.01; // How much extra margin to allow for liquidationBond. Expressed as a ratio (0 - 1).
function handleKicks(_a) {
    var _b, e_1, _c, _d;
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var _e, _f, _g, loanToKick, e_1_1;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 7, 8, 13]);
                    _e = true, _f = __asyncValues(getLoansToKick({
                        pool: pool,
                        poolConfig: poolConfig,
                        config: config,
                    }));
                    _h.label = 1;
                case 1: return [4 /*yield*/, _f.next()];
                case 2:
                    if (!(_g = _h.sent(), _b = _g.done, !_b)) return [3 /*break*/, 6];
                    _d = _g.value;
                    _e = false;
                    loanToKick = _d;
                    return [4 /*yield*/, kick({ signer: signer, pool: pool, loanToKick: loanToKick, config: config })];
                case 3:
                    _h.sent();
                    return [4 /*yield*/, (0, utils_1.delay)(config.delayBetweenActions)];
                case 4:
                    _h.sent();
                    _h.label = 5;
                case 5:
                    _e = true;
                    return [3 /*break*/, 1];
                case 6: return [3 /*break*/, 13];
                case 7:
                    e_1_1 = _h.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 8:
                    _h.trys.push([8, , 11, 12]);
                    if (!(!_e && !_b && (_c = _f.return))) return [3 /*break*/, 10];
                    return [4 /*yield*/, _c.call(_f)];
                case 9:
                    _h.sent();
                    _h.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 12: return [7 /*endfinally*/];
                case 13: return [4 /*yield*/, clearAllowances({ pool: pool, signer: signer })];
                case 14:
                    _h.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.handleKicks = handleKicks;
function getLoansToKick(_a) {
    var pool = _a.pool, config = _a.config, poolConfig = _a.poolConfig;
    return __asyncGenerator(this, arguments, function getLoansToKick_1() {
        var subgraphUrl, loans, loanMap, borrowersSortedByBond, getSumEstimatedBond, i, borrower, _b, poolPrices, loanDetails, lup, hpb, thresholdPrice, liquidationBond, debt, neutralPrice, estimatedRemainingBond, limitPrice;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    subgraphUrl = config.subgraphUrl;
                    return [4 /*yield*/, __await(subgraph_1.default.getLoans(subgraphUrl, pool.poolAddress))];
                case 1:
                    loans = (_c.sent()).loans;
                    return [4 /*yield*/, __await(pool.getLoans(loans.map(function (_a) {
                            var borrower = _a.borrower;
                            return borrower;
                        })))];
                case 2:
                    loanMap = _c.sent();
                    borrowersSortedByBond = Array.from(loanMap.keys()).sort(function (borrowerA, borrowerB) {
                        var bondA = (0, utils_1.weiToDecimaled)(loanMap.get(borrowerA).liquidationBond);
                        var bondB = (0, utils_1.weiToDecimaled)(loanMap.get(borrowerB).liquidationBond);
                        return bondB - bondA;
                    });
                    getSumEstimatedBond = function (borrowers) {
                        return borrowers.reduce(function (sum, borrower) { return sum.add(loanMap.get(borrower).liquidationBond); }, ethers_1.constants.Zero);
                    };
                    i = 0;
                    _c.label = 3;
                case 3:
                    if (!(i < borrowersSortedByBond.length)) return [3 /*break*/, 9];
                    borrower = borrowersSortedByBond[i];
                    return [4 /*yield*/, __await(Promise.all([
                            pool.getPrices(),
                            pool.getLoan(borrower),
                        ]))];
                case 4:
                    _b = _c.sent(), poolPrices = _b[0], loanDetails = _b[1];
                    lup = poolPrices.lup, hpb = poolPrices.hpb;
                    thresholdPrice = loanDetails.thresholdPrice, liquidationBond = loanDetails.liquidationBond, debt = loanDetails.debt, neutralPrice = loanDetails.neutralPrice;
                    estimatedRemainingBond = liquidationBond.add(getSumEstimatedBond(borrowersSortedByBond.slice(i + 1)));
                    // If TP is lower than lup, the bond can not be kicked.
                    if (thresholdPrice.lt(lup)) {
                        logging_1.logger.debug("Not kicking loan since TP is lower LUP. borrower: ".concat(borrower, ", TP: ").concat((0, utils_1.weiToDecimaled)(thresholdPrice), ", LUP: ").concat((0, utils_1.weiToDecimaled)(lup)));
                        return [3 /*break*/, 8];
                    }
                    // if loan debt is lower than configured fixed value (denominated in quote token), skip it
                    if ((0, utils_1.weiToDecimaled)(debt) < poolConfig.kick.minDebt) {
                        logging_1.logger.debug("Not kicking loan since debt is too low. borrower: ".concat(borrower, ", debt: ").concat(debt));
                        return [3 /*break*/, 8];
                    }
                    return [4 /*yield*/, __await((0, price_1.getPrice)(poolConfig.price, config.coinGeckoApiKey, poolPrices))];
                case 5:
                    limitPrice = _c.sent();
                    if ((0, utils_1.weiToDecimaled)(neutralPrice) * poolConfig.kick.priceFactor <
                        limitPrice) {
                        logging_1.logger.debug("Not kicking loan since (NP * Factor < Price). pool: ".concat(pool.name, ", borrower: ").concat(borrower, ", NP: ").concat((0, utils_1.weiToDecimaled)(neutralPrice), ", Price: ").concat(limitPrice));
                        return [3 /*break*/, 8];
                    }
                    return [4 /*yield*/, __await({
                            borrower: borrower,
                            liquidationBond: liquidationBond,
                            estimatedRemainingBond: estimatedRemainingBond,
                            limitPrice: limitPrice,
                        })];
                case 6: return [4 /*yield*/, _c.sent()];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    i++;
                    return [3 /*break*/, 3];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.getLoansToKick = getLoansToKick;
/**
 * Approves enough quoteToken to cover the bond of this kick and remaining kicks.
 * @returns True if there is enough balance to cover the next kick. False otherwise.
 */
function approveBalanceForLoanToKick(_a) {
    var pool = _a.pool, signer = _a.signer, loanToKick = _a.loanToKick;
    return __awaiter(this, void 0, void 0, function () {
        var liquidationBond, estimatedRemainingBond, _b, balanceNative, quoteDecimals, balanceWad, allowance, amountToApprove, margin, amountWithMargin, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    liquidationBond = loanToKick.liquidationBond, estimatedRemainingBond = loanToKick.estimatedRemainingBond;
                    return [4 /*yield*/, Promise.all([
                            (0, erc20_1.getBalanceOfErc20)(signer, pool.quoteAddress),
                            (0, erc20_1.getDecimalsErc20)(signer, pool.quoteAddress),
                        ])];
                case 1:
                    _b = _c.sent(), balanceNative = _b[0], quoteDecimals = _b[1];
                    balanceWad = (0, utils_1.tokenChangeDecimals)(balanceNative, quoteDecimals);
                    if (balanceWad.lt(liquidationBond)) {
                        logging_1.logger.debug("Insufficient balance to approve bond. pool: ".concat(pool.name, ", borrower: ").concat(loanToKick.borrower, ", balance: ").concat((0, utils_1.weiToDecimaled)(balanceWad), ", bond: ").concat((0, utils_1.weiToDecimaled)(liquidationBond)));
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.quoteAddress, pool.poolAddress)];
                case 2:
                    allowance = _c.sent();
                    if (!allowance.lt(liquidationBond)) return [3 /*break*/, 6];
                    amountToApprove = estimatedRemainingBond.lt(balanceWad)
                        ? estimatedRemainingBond
                        : liquidationBond;
                    margin = (0, utils_1.decimaledToWei)((0, utils_1.weiToDecimaled)(amountToApprove) * LIQUIDATION_BOND_MARGIN);
                    amountWithMargin = amountToApprove.add(margin);
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    logging_1.logger.debug("Approving quote. pool: ".concat(pool.name, ", amount: ").concat(amountWithMargin));
                    return [4 /*yield*/, (0, transactions_1.poolQuoteApprove)(pool, signer, amountWithMargin)];
                case 4:
                    _c.sent();
                    logging_1.logger.debug("Approved quote. pool: ".concat(pool.name, ", amount: ").concat(amountWithMargin));
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _c.sent();
                    logging_1.logger.error("Failed to approve quote. pool: ".concat(pool.name, ", amount: ").concat(amountWithMargin), error_1);
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/, true];
            }
        });
    });
}
exports.approveBalanceForLoanToKick = approveBalanceForLoanToKick;
function kick(_a) {
    var pool = _a.pool, signer = _a.signer, config = _a.config, loanToKick = _a.loanToKick;
    return __awaiter(this, void 0, void 0, function () {
        var dryRun, borrower, liquidationBond, limitPrice, bondApproved, limitIndex, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dryRun = config.dryRun;
                    borrower = loanToKick.borrower, liquidationBond = loanToKick.liquidationBond, limitPrice = loanToKick.limitPrice;
                    if (dryRun) {
                        logging_1.logger.info("DryRun - Would kick loan - pool: ".concat(pool.name, ", borrower: ").concat(borrower));
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, approveBalanceForLoanToKick({
                            signer: signer,
                            pool: pool,
                            loanToKick: loanToKick,
                        })];
                case 2:
                    bondApproved = _b.sent();
                    if (!bondApproved) {
                        logging_1.logger.info("Failed to approve sufficient bond. Skipping kick of loan. pool: ".concat(pool.name, ", borrower: ").concat(loanToKick.borrower, ", bond: ").concat((0, utils_1.weiToDecimaled)(liquidationBond)));
                        return [2 /*return*/];
                    }
                    logging_1.logger.debug("Kicking loan - pool: ".concat(pool.name, ", borrower: ").concat(borrower));
                    limitIndex = limitPrice > 0
                        ? pool.getBucketByPrice((0, utils_1.decimaledToWei)(limitPrice)).index
                        : undefined;
                    return [4 /*yield*/, (0, transactions_1.poolKick)(pool, signer, borrower, limitIndex)];
                case 3:
                    _b.sent();
                    logging_1.logger.info("Kick transaction confirmed. pool: ".concat(pool.name, ", borrower: ").concat(borrower));
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _b.sent();
                    logging_1.logger.error("Failed to kick loan. pool: ".concat(pool.name, ", borrower: ").concat(borrower, "."), error_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.kick = kick;
/**
 * Sets allowances for this pool to zero if it's current allowance is greater than zero.
 */
function clearAllowances(_a) {
    var pool = _a.pool, signer = _a.signer;
    return __awaiter(this, void 0, void 0, function () {
        var allowance, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.quoteAddress, pool.poolAddress)];
                case 1:
                    allowance = _b.sent();
                    if (!allowance.gt(ethers_1.constants.Zero)) return [3 /*break*/, 5];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    logging_1.logger.debug("Clearing allowance. pool: ".concat(pool.name));
                    return [4 /*yield*/, (0, transactions_1.poolQuoteApprove)(pool, signer, ethers_1.constants.Zero)];
                case 3:
                    _b.sent();
                    logging_1.logger.debug("Cleared allowance. pool: ".concat(pool.name));
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _b.sent();
                    logging_1.logger.error("Failed to clear allowance. pool: ".concat(pool.name), error_3);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=kick.js.map