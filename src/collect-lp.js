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
exports.LpCollector = void 0;
var sdk_1 = require("@ajna-finance/sdk");
var ethers_1 = require("ethers");
var config_types_1 = require("./config-types");
var logging_1 = require("./logging");
var transactions_1 = require("./transactions");
var utils_1 = require("./utils");
/**
 * Collects lp rewarded from BucketTakes without collecting the user's deposits or loans.
 */
var LpCollector = /** @class */ (function () {
    function LpCollector(pool, signer, poolConfig, config, exchangeTracker) {
        var _this = this;
        this.pool = pool;
        this.signer = signer;
        this.poolConfig = poolConfig;
        this.config = config;
        this.exchangeTracker = exchangeTracker;
        this.lpMap = new Map(); // Map<bucketIndexString, rewardLp>
        this.started = false;
        this.onTakerAwardEvent = function (taker, kicker, lpAwardedTaker, lpAwardedKicker, evt) { return __awaiter(_this, void 0, void 0, function () {
            var bucketIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getBucketTakeBucketIndex(evt)];
                    case 1:
                        bucketIndex = _a.sent();
                        this.addReward(bucketIndex, lpAwardedTaker);
                        return [2 /*return*/];
                }
            });
        }); };
        this.onKickerAwardEvent = function (taker, kicker, lpAwardedTaker, lpAwardedKicker, evt) { return __awaiter(_this, void 0, void 0, function () {
            var bucketIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getBucketTakeBucketIndex(evt)];
                    case 1:
                        bucketIndex = _a.sent();
                        this.addReward(bucketIndex, lpAwardedKicker);
                        return [2 /*return*/];
                }
            });
        }); };
        this.getBucketTakeBucketIndex = function (evt) { return __awaiter(_this, void 0, void 0, function () {
            var poolContract, tx, parsedTransaction, _a, borrower, depositTake, index;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        poolContract = sdk_1.ERC20Pool__factory.connect(this.pool.poolAddress, this.signer);
                        return [4 /*yield*/, evt.getTransaction()];
                    case 1:
                        tx = _b.sent();
                        parsedTransaction = poolContract.interface.parseTransaction(tx);
                        if (parsedTransaction.functionFragment.name !== 'bucketTake') {
                            throw new Error("Cannot get bucket index from transaction: ".concat(parsedTransaction.functionFragment.name));
                        }
                        _a = parsedTransaction.args, borrower = _a[0], depositTake = _a[1], index = _a[2];
                        return [2 /*return*/, index];
                }
            });
        }); };
        var poolContract = sdk_1.ERC20Pool__factory.connect(this.pool.poolAddress, this.signer);
        this.poolContract = poolContract;
        this.takerAwardEvt = (function () { return __awaiter(_this, void 0, void 0, function () {
            var signerAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        signerAddress = _a.sent();
                        return [2 /*return*/, poolContract.filters.BucketTakeLPAwarded(signerAddress)];
                }
            });
        }); })();
        this.kickerAwardEvt = (function () { return __awaiter(_this, void 0, void 0, function () {
            var signerAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        signerAddress = _a.sent();
                        return [2 /*return*/, poolContract.filters.BucketTakeLPAwarded(undefined, signerAddress)];
                }
            });
        }); })();
    }
    LpCollector.prototype.startSubscription = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.started) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.subscribeToLpRewards()];
                    case 1:
                        _a.sent();
                        this.started = true;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    LpCollector.prototype.stopSubscription = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.started) {
                    this.stopSubscriptionToLpRewards();
                    this.started = false;
                }
                return [2 /*return*/];
            });
        });
    };
    LpCollector.prototype.collectLpRewards = function () {
        return __awaiter(this, void 0, void 0, function () {
            var lpMapEntries, _i, lpMapEntries_1, _a, bucketIndex, rewardLp, lpConsumed;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.started)
                            throw new Error('Must start subscriptions before collecting rewards');
                        lpMapEntries = Array.from(this.lpMap.entries()).filter(function (_a) {
                            var bucketIndex = _a[0], rewardLp = _a[1];
                            return rewardLp.gt(ethers_1.constants.Zero);
                        });
                        _i = 0, lpMapEntries_1 = lpMapEntries;
                        _b.label = 1;
                    case 1:
                        if (!(_i < lpMapEntries_1.length)) return [3 /*break*/, 4];
                        _a = lpMapEntries_1[_i], bucketIndex = _a[0], rewardLp = _a[1];
                        return [4 /*yield*/, this.collectLpRewardFromBucket(bucketIndex, rewardLp)];
                    case 2:
                        lpConsumed = _b.sent();
                        this.subtractReward(bucketIndex, lpConsumed);
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Collects the lpReward from bucket. Returns amount of lp used.
     * @param bucketIndex
     * @param rewardLp
     * @resolves the amount of lp used while redeeming rewards.
     */
    LpCollector.prototype.collectLpRewardFromBucket = function (bucketIndex, rewardLp) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, redeemFirst, minAmountQuote, minAmountCollateral, rewardActionQuote, rewardActionCollateral, signerAddress, bucket, _b, exchangeRate, deposit, collateral, _c, lpBalance, depositRedeemable, collateralRedeemable, reedemed, collateralToWithdraw, _d, _e, remainingLp, remainingQuote, quoteToWithdraw, _f, _g, quoteToWithdraw, _h, _j, remainingLp, remainingCollateral, collateralToWithdraw, _k, _l;
            var _m, _o;
            return __generator(this, function (_p) {
                switch (_p.label) {
                    case 0:
                        _a = this.poolConfig.collectLpReward, redeemFirst = _a.redeemFirst, minAmountQuote = _a.minAmountQuote, minAmountCollateral = _a.minAmountCollateral, rewardActionQuote = _a.rewardActionQuote, rewardActionCollateral = _a.rewardActionCollateral;
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        signerAddress = _p.sent();
                        bucket = this.pool.getBucketByIndex(bucketIndex);
                        return [4 /*yield*/, bucket.getStatus()];
                    case 2:
                        _b = _p.sent(), exchangeRate = _b.exchangeRate, deposit = _b.deposit, collateral = _b.collateral;
                        return [4 /*yield*/, bucket.getPosition(signerAddress)];
                    case 3:
                        _c = _p.sent(), lpBalance = _c.lpBalance, depositRedeemable = _c.depositRedeemable, collateralRedeemable = _c.collateralRedeemable;
                        if (lpBalance.lt(rewardLp))
                            rewardLp = lpBalance;
                        reedemed = ethers_1.constants.Zero;
                        if (!(redeemFirst === config_types_1.TokenToCollect.COLLATERAL)) return [3 /*break*/, 10];
                        collateralToWithdraw = (0, sdk_1.min)(collateralRedeemable, collateral);
                        if (!collateralToWithdraw.gt((0, utils_1.decimaledToWei)(minAmountCollateral))) return [3 /*break*/, 6];
                        _e = (_d = reedemed).add;
                        return [4 /*yield*/, this.redeemCollateral(bucket, bucketIndex, collateralToWithdraw, exchangeRate, rewardActionCollateral)];
                    case 4:
                        reedemed = _e.apply(_d, [_p.sent()]);
                        return [4 /*yield*/, bucket.getStatus()];
                    case 5:
                        (_m = _p.sent(), exchangeRate = _m.exchangeRate, deposit = _m.deposit, collateral = _m.collateral);
                        _p.label = 6;
                    case 6:
                        remainingLp = rewardLp.sub(reedemed);
                        if (remainingLp.lte(ethers_1.constants.Zero)) {
                            return [2 /*return*/, reedemed]; // All LP already redeemed
                        }
                        return [4 /*yield*/, bucket.lpToQuoteTokens(remainingLp)];
                    case 7:
                        remainingQuote = _p.sent();
                        quoteToWithdraw = (0, sdk_1.min)(remainingQuote, deposit);
                        if (!quoteToWithdraw.gt((0, utils_1.decimaledToWei)(minAmountQuote))) return [3 /*break*/, 9];
                        _g = (_f = reedemed).add;
                        return [4 /*yield*/, this.redeemQuote(bucket, quoteToWithdraw, exchangeRate, rewardActionQuote)];
                    case 8:
                        reedemed = _g.apply(_f, [_p.sent()]);
                        _p.label = 9;
                    case 9: return [3 /*break*/, 16];
                    case 10:
                        quoteToWithdraw = (0, sdk_1.min)(depositRedeemable, deposit);
                        if (!quoteToWithdraw.gt((0, utils_1.decimaledToWei)(minAmountQuote))) return [3 /*break*/, 13];
                        _j = (_h = reedemed).add;
                        return [4 /*yield*/, this.redeemQuote(bucket, quoteToWithdraw, exchangeRate, rewardActionQuote)];
                    case 11:
                        reedemed = _j.apply(_h, [_p.sent()]);
                        return [4 /*yield*/, bucket.getStatus()];
                    case 12:
                        (_o = _p.sent(), exchangeRate = _o.exchangeRate, deposit = _o.deposit, collateral = _o.collateral);
                        _p.label = 13;
                    case 13:
                        remainingLp = rewardLp.sub(reedemed);
                        if (remainingLp.lte(ethers_1.constants.Zero)) {
                            return [2 /*return*/, reedemed]; // All LP already redeemed
                        }
                        return [4 /*yield*/, bucket.lpToCollateral(remainingLp)];
                    case 14:
                        remainingCollateral = _p.sent();
                        collateralToWithdraw = (0, sdk_1.min)(remainingCollateral, collateral);
                        if (!collateralToWithdraw.gt((0, utils_1.decimaledToWei)(minAmountCollateral))) return [3 /*break*/, 16];
                        _l = (_k = reedemed).add;
                        return [4 /*yield*/, this.redeemCollateral(bucket, bucketIndex, collateralToWithdraw, exchangeRate, rewardActionCollateral)];
                    case 15:
                        reedemed = _l.apply(_k, [_p.sent()]);
                        _p.label = 16;
                    case 16: return [2 /*return*/, reedemed];
                }
            });
        });
    };
    LpCollector.prototype.redeemQuote = function (bucket, quoteToWithdraw, exchangeRate, rewardActionQuote) {
        return __awaiter(this, void 0, void 0, function () {
            var signerAddress, lpBalanceBefore, lpBalanceAfter, lpUsed, error_1, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.config.dryRun) return [3 /*break*/, 1];
                        logging_1.logger.info("DryRun - Would collect LP reward as ".concat(quoteToWithdraw.toNumber(), " quote. pool: ").concat(this.pool.name));
                        return [3 /*break*/, 7];
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        logging_1.logger.debug("Collecting LP reward as quote. pool: ".concat(this.pool.name));
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 2:
                        signerAddress = _a.sent();
                        return [4 /*yield*/, bucket.getPosition(signerAddress)];
                    case 3:
                        lpBalanceBefore = (_a.sent()).lpBalance;
                        return [4 /*yield*/, (0, transactions_1.bucketRemoveQuoteToken)(bucket, this.signer, quoteToWithdraw)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, bucket.getPosition(signerAddress)];
                    case 5:
                        lpBalanceAfter = (_a.sent()).lpBalance;
                        logging_1.logger.info("Collected LP reward as quote. pool: ".concat(this.pool.name, ", amount: ").concat((0, utils_1.weiToDecimaled)(quoteToWithdraw)));
                        if (rewardActionQuote) {
                            this.exchangeTracker.addToken(rewardActionQuote, this.pool.quoteAddress, quoteToWithdraw);
                        }
                        lpUsed = lpBalanceBefore.sub(lpBalanceAfter);
                        if (lpUsed.lt(0)) {
                            logging_1.logger.warn("Negative LP calculation detected in redeemQuote, using zero instead. Pool: ".concat(this.pool.name, ", lpBefore: ").concat(lpBalanceBefore.toString(), ", lpAfter: ").concat(lpBalanceAfter.toString()));
                            return [2 /*return*/, ethers_1.constants.Zero];
                        }
                        // Return the actual LP used
                        return [2 /*return*/, lpUsed];
                    case 6:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        if (errorMessage.includes("AuctionNotCleared")) {
                            logging_1.logger.debug("Re-throwing AuctionNotCleared error from ".concat(this.pool.name, " to trigger reactive settlement"));
                            throw error_1; // Re-throw to outer catch block
                        }
                        logging_1.logger.error("Failed to collect LP reward as quote. pool: ".concat(this.pool.name), error_1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, ethers_1.constants.Zero];
                }
            });
        });
    };
    LpCollector.prototype.redeemCollateral = function (bucket, bucketIndex, collateralToWithdraw, exchangeRate, rewardActionCollateral) {
        return __awaiter(this, void 0, void 0, function () {
            var signerAddress, lpBalanceBefore, lpBalanceAfter, lpUsed, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.config.dryRun) return [3 /*break*/, 1];
                        logging_1.logger.info("DryRun - Would collect LP reward as ".concat(collateralToWithdraw.toNumber(), " collateral. pool: ").concat(this.pool.name));
                        return [3 /*break*/, 7];
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        logging_1.logger.debug("Collecting LP reward as collateral. pool ".concat(this.pool.name));
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 2:
                        signerAddress = _a.sent();
                        return [4 /*yield*/, bucket.getPosition(signerAddress)];
                    case 3:
                        lpBalanceBefore = (_a.sent()).lpBalance;
                        return [4 /*yield*/, (0, transactions_1.bucketRemoveCollateralToken)(bucket, this.signer, collateralToWithdraw)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, bucket.getPosition(signerAddress)];
                    case 5:
                        lpBalanceAfter = (_a.sent()).lpBalance;
                        logging_1.logger.info("Collected LP reward as collateral. pool: ".concat(this.pool.name, ", token: ").concat(this.pool.collateralSymbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(collateralToWithdraw)));
                        if (rewardActionCollateral) {
                            this.exchangeTracker.addToken(rewardActionCollateral, this.pool.collateralAddress, collateralToWithdraw);
                        }
                        lpUsed = lpBalanceBefore.sub(lpBalanceAfter);
                        if (lpUsed.lt(0)) {
                            logging_1.logger.warn("Negative LP calculation detected in redeemCollateral, using zero instead. Pool: ".concat(this.pool.name, ", lpBefore: ").concat(lpBalanceBefore.toString(), ", lpAfter: ").concat(lpBalanceAfter.toString()));
                            return [2 /*return*/, ethers_1.constants.Zero];
                        }
                        // Return the actual LP used 
                        return [2 /*return*/, lpUsed];
                    case 6:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        if (errorMessage.includes("AuctionNotCleared")) {
                            logging_1.logger.debug("Re-throwing AuctionNotCleared error from ".concat(this.pool.name, " to trigger reactive settlement"));
                            throw error_2; // Re-throw to outer catch block
                        }
                        logging_1.logger.error("Failed to collect LP reward as collateral. pool: ".concat(this.pool.name), error_2);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/, ethers_1.constants.Zero];
                }
            });
        });
    };
    LpCollector.prototype.subscribeToLpRewards = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _b = (_a = this.poolContract).on;
                        return [4 /*yield*/, this.takerAwardEvt];
                    case 1:
                        _b.apply(_a, [_e.sent(), this.onTakerAwardEvent]);
                        _d = (_c = this.poolContract).on;
                        return [4 /*yield*/, this.kickerAwardEvt];
                    case 2:
                        _d.apply(_c, [_e.sent(), this.onKickerAwardEvent]);
                        return [2 /*return*/];
                }
            });
        });
    };
    LpCollector.prototype.stopSubscriptionToLpRewards = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _b = (_a = this.poolContract).off;
                        return [4 /*yield*/, this.takerAwardEvt];
                    case 1:
                        _b.apply(_a, [_e.sent(), this.onTakerAwardEvent]);
                        _d = (_c = this.poolContract).off;
                        return [4 /*yield*/, this.kickerAwardEvt];
                    case 2:
                        _d.apply(_c, [_e.sent(), this.onKickerAwardEvent]);
                        return [2 /*return*/];
                }
            });
        });
    };
    LpCollector.prototype.addReward = function (index, rewardLp) {
        var _a;
        if (rewardLp.eq(ethers_1.constants.Zero))
            return;
        var bucketIndex = parseInt(index.toString());
        var prevReward = (_a = this.lpMap.get(bucketIndex)) !== null && _a !== void 0 ? _a : ethers_1.constants.Zero;
        var sumReward = prevReward.add(rewardLp);
        logging_1.logger.info("Received LP Rewards in pool: ".concat(this.pool.name, ", bucketIndex: ").concat(index, ", rewardLp: ").concat(rewardLp));
        this.lpMap.set(bucketIndex, sumReward);
    };
    LpCollector.prototype.subtractReward = function (bucketIndex, lp) {
        var _a;
        var prevReward = (_a = this.lpMap.get(bucketIndex)) !== null && _a !== void 0 ? _a : ethers_1.constants.Zero;
        var newReward = prevReward.sub(lp);
        if (newReward.lte(ethers_1.constants.Zero)) {
            this.lpMap.delete(bucketIndex);
        }
        else {
            this.lpMap.set(bucketIndex, newReward);
        }
    };
    return LpCollector;
}());
exports.LpCollector = LpCollector;
//# sourceMappingURL=collect-lp.js.map