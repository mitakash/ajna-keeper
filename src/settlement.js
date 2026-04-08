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
exports.tryReactiveSettlement = exports.handleSettlements = exports.SettlementHandler = void 0;
var ethers_1 = require("ethers");
var logging_1 = require("./logging");
var transactions_1 = require("./transactions");
var utils_1 = require("./utils");
var subgraph_1 = __importDefault(require("./subgraph"));
var SettlementHandler = exports.SettlementHandler = /** @class */ (function () {
    function SettlementHandler(pool, signer, poolConfig, config) {
        this.pool = pool;
        this.signer = signer;
        this.poolConfig = poolConfig;
        this.config = config;
        // Add caching properties for optimization
        this.lastSubgraphQuery = 0;
        this.cachedAuctions = [];
        this.QUERY_CACHE_DURATION = 300000; // 5 minutes
    }
    /**
     * Main entry point - handle all settlements for this pool
     */
    SettlementHandler.prototype.handleSettlements = function () {
        return __awaiter(this, void 0, void 0, function () {
            var auctions, _i, auctions_1, auction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logging_1.logger.debug("Checking for settleable auctions in pool: ".concat(this.pool.name));
                        return [4 /*yield*/, this.findSettleableAuctions()];
                    case 1:
                        auctions = _a.sent();
                        if (auctions.length === 0) {
                            logging_1.logger.debug("No settleable auctions found in pool: ".concat(this.pool.name));
                            return [2 /*return*/];
                        }
                        logging_1.logger.info("Found ".concat(auctions.length, " potentially settleable auctions in pool: ").concat(this.pool.name));
                        _i = 0, auctions_1 = auctions;
                        _a.label = 2;
                    case 2:
                        if (!(_i < auctions_1.length)) return [3 /*break*/, 6];
                        auction = auctions_1[_i];
                        return [4 /*yield*/, this.processAuction(auction)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, (0, utils_1.delay)(this.config.delayBetweenActions)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * OPTIMIZED: Find auctions that ACTUALLY need settlement with caching and age filtering
     */
    SettlementHandler.prototype.findSettleableAuctions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, minAge, cacheAge, shouldUseCache, result, actuallySettleable, _i, _a, auction, borrower, kickTime, ageSeconds, settlementCheck, error_1, errorMessage;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        now = Date.now();
                        minAge = this.poolConfig.settlement.minAuctionAge || 3600;
                        cacheAge = now - this.lastSubgraphQuery;
                        shouldUseCache = (cacheAge < this.QUERY_CACHE_DURATION &&
                            this.cachedAuctions.length === 0 &&
                            cacheAge < minAge * 1000 // Don't cache longer than minAge - auctions might become settleable
                        );
                        if (shouldUseCache) {
                            logging_1.logger.debug("Using cached settlement data for ".concat(this.pool.name, " (").concat(Math.round(cacheAge / 1000), "s old)"));
                            return [2 /*return*/, this.cachedAuctions];
                        }
                        logging_1.logger.debug("Querying subgraph for settlement data: ".concat(this.pool.name, " (cache age: ").concat(Math.round(cacheAge / 1000), "s)"));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, subgraph_1.default.getUnsettledAuctions(this.config.subgraphUrl, this.pool.poolAddress)];
                    case 2:
                        result = _b.sent();
                        this.lastSubgraphQuery = now;
                        actuallySettleable = [];
                        _i = 0, _a = result.liquidationAuctions;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        auction = _a[_i];
                        borrower = auction.borrower;
                        kickTime = parseInt(auction.kickTime) * 1000;
                        ageSeconds = (now - kickTime) / 1000;
                        // AGE CHECK FIRST - before expensive on-chain calls
                        if (ageSeconds < minAge) {
                            logging_1.logger.debug("Auction ".concat(borrower.slice(0, 8), " too young (").concat(Math.round(ageSeconds), "s < ").concat(minAge, "s) - skipping on-chain check"));
                            return [3 /*break*/, 5];
                        }
                        logging_1.logger.debug("Checking if auction ".concat(borrower.slice(0, 8), " actually needs settlement (age: ").concat(Math.round(ageSeconds), "s)..."));
                        return [4 /*yield*/, this.needsSettlement(borrower)];
                    case 4:
                        settlementCheck = _b.sent();
                        if (settlementCheck.needs) {
                            logging_1.logger.debug("Auction ".concat(borrower.slice(0, 8), " DOES need settlement: ").concat(settlementCheck.reason));
                            actuallySettleable.push({
                                borrower: auction.borrower,
                                kickTime: kickTime,
                                debtRemaining: ethers_1.ethers.utils.parseEther(auction.debtRemaining || '0'),
                                collateralRemaining: ethers_1.ethers.utils.parseEther(auction.collateralRemaining || '0')
                            });
                        }
                        else {
                            logging_1.logger.debug("Auction ".concat(borrower.slice(0, 8), " does NOT need settlement: ").concat(settlementCheck.reason));
                        }
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        if (actuallySettleable.length > 0) {
                            logging_1.logger.info("Found ".concat(actuallySettleable.length, " auctions that ACTUALLY need settlement in pool: ").concat(this.pool.name));
                        }
                        else {
                            logging_1.logger.debug("No auctions actually need settlement in pool: ".concat(this.pool.name, " (all too young or already settled)"));
                        }
                        this.cachedAuctions = actuallySettleable;
                        return [2 /*return*/, actuallySettleable];
                    case 7:
                        error_1 = _b.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                        // Handle network errors gracefully - don't crash, just return empty and retry later
                        if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT')) {
                            logging_1.logger.warn("Network error querying settlements for ".concat(this.pool.name, ", will retry: ").concat(errorMessage));
                        }
                        else {
                            logging_1.logger.error("Error querying settlements for ".concat(this.pool.name, ":"), error_1);
                        }
                        return [2 /*return*/, []]; // Return empty array, don't crash
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process a single auction for settlement
     */
    SettlementHandler.prototype.processAuction = function (auction) {
        return __awaiter(this, void 0, void 0, function () {
            var borrower, settlementKey, settlementCheck, incentiveCheck, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        borrower = auction.borrower;
                        settlementKey = "".concat(this.pool.poolAddress, "-").concat(borrower);
                        // Check lock before any processing
                        if (SettlementHandler.activeSettlements.has(settlementKey)) {
                            logging_1.logger.debug("Settlement already in progress for ".concat(borrower.slice(0, 8), " in ").concat(this.pool.name, " - skipping duplicate"));
                            return [2 /*return*/];
                        }
                        // Immediately claim the lock
                        SettlementHandler.activeSettlements.add(settlementKey);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 6, 7]);
                        logging_1.logger.debug("Checking settlement for borrower ".concat(borrower.slice(0, 8), " in pool ").concat(this.pool.name));
                        // Check if auction meets age requirement
                        if (!this.isAuctionOldEnough(auction)) {
                            logging_1.logger.debug("Auction for ".concat(borrower.slice(0, 8), " is too young, skipping"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.needsSettlement(borrower)];
                    case 2:
                        settlementCheck = _a.sent();
                        if (!settlementCheck.needs) {
                            logging_1.logger.debug("Settlement not needed for ".concat(borrower.slice(0, 8), ": ").concat(settlementCheck.reason));
                            return [2 /*return*/];
                        }
                        if (!this.poolConfig.settlement.checkBotIncentive) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.checkBotIncentive(borrower)];
                    case 3:
                        incentiveCheck = _a.sent();
                        if (!incentiveCheck.hasIncentive) {
                            logging_1.logger.debug("No bot incentive for ".concat(borrower.slice(0, 8), ": ").concat(incentiveCheck.reason));
                            return [2 /*return*/];
                        }
                        logging_1.logger.debug("Bot incentive confirmed: ".concat(incentiveCheck.reason));
                        _a.label = 4;
                    case 4:
                        // Attempt settlement
                        logging_1.logger.info("SETTLEMENT NEEDED for ".concat(borrower.slice(0, 8), ": ").concat(settlementCheck.reason));
                        return [4 /*yield*/, this.settleAuctionCompletely(borrower)];
                    case 5:
                        result = _a.sent();
                        if (result.success) {
                            logging_1.logger.info("Settlement completed for ".concat(borrower.slice(0, 8), " in ").concat(result.iterations, " iterations"));
                        }
                        else {
                            logging_1.logger.warn("Settlement incomplete for ".concat(borrower.slice(0, 8), " after ").concat(result.iterations, " iterations: ").concat(result.reason));
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        // Always release the lock
                        SettlementHandler.activeSettlements.delete(settlementKey);
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if auction is old enough to settle based on config
     */
    SettlementHandler.prototype.isAuctionOldEnough = function (auction) {
        var minAge = this.poolConfig.settlement.minAuctionAge || 3600; // Default 1 hour
        var ageSeconds = (Date.now() - auction.kickTime) / 1000;
        return ageSeconds >= minAge;
    };
    /**
     * Check if an auction needs settlement
     */
    SettlementHandler.prototype.needsSettlement = function (borrower) {
        return __awaiter(this, void 0, void 0, function () {
            var auctionInfo, kickTime, liquidationStatus, collateralAmount, debt, details, poolWithSigner, settleError_1, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.pool.contract.auctionInfo(borrower)];
                    case 1:
                        auctionInfo = _a.sent();
                        kickTime = auctionInfo.kickTime_;
                        if (kickTime.eq(0)) {
                            return [2 /*return*/, { needs: false, reason: "No active auction (kickTime = 0)" }];
                        }
                        return [4 /*yield*/, this.pool.getLiquidation(borrower).getStatus()];
                    case 2:
                        liquidationStatus = _a.sent();
                        collateralAmount = liquidationStatus.collateral;
                        debt = auctionInfo.debtToCollateral_;
                        details = {
                            debtRemaining: debt,
                            collateralRemaining: collateralAmount,
                            auctionPrice: liquidationStatus.price,
                            kickTime: kickTime.toNumber()
                        };
                        // Settlement logic: only when collateral = 0 AND debt > 0
                        if (debt.eq(0)) {
                            return [2 /*return*/, {
                                    needs: false,
                                    reason: "No debt remaining - auction fully covered",
                                    details: details
                                }];
                        }
                        if (collateralAmount.gt(0)) {
                            return [2 /*return*/, {
                                    needs: false,
                                    reason: "Still has ".concat((0, utils_1.weiToDecimaled)(collateralAmount), " collateral to auction"),
                                    details: details
                                }];
                        }
                        if (!(collateralAmount.eq(0) && debt.gt(0))) return [3 /*break*/, 6];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        poolWithSigner = this.pool.contract.connect(this.signer);
                        return [4 /*yield*/, poolWithSigner.callStatic.settle(borrower, 10)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, {
                                needs: true,
                                reason: "Bad debt detected: ".concat((0, utils_1.weiToDecimaled)(debt), " debt with 0 collateral"),
                                details: details
                            }];
                    case 5:
                        settleError_1 = _a.sent();
                        return [2 /*return*/, {
                                needs: false,
                                reason: "Settlement call would fail: ".concat(settleError_1 instanceof Error ? settleError_1.message.slice(0, 100) : String(settleError_1)),
                                details: details
                            }];
                    case 6: return [2 /*return*/, {
                            needs: false,
                            reason: "Unexpected state",
                            details: details
                        }];
                    case 7:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                needs: false,
                                reason: "Error checking settlement: ".concat(error_2 instanceof Error ? error_2.message : String(error_2))
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if bot has incentive to settle (kicker bonds/rewards)
     */
    SettlementHandler.prototype.checkBotIncentive = function (borrower) {
        return __awaiter(this, void 0, void 0, function () {
            var botAddress, auctionInfo, kicker, isKicker, kickerInfo, claimable, kickerError_1, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        botAddress = _a.sent();
                        return [4 /*yield*/, this.pool.contract.auctionInfo(borrower)];
                    case 2:
                        auctionInfo = _a.sent();
                        kicker = auctionInfo.kicker_;
                        isKicker = kicker.toLowerCase() === botAddress.toLowerCase();
                        if (!isKicker) return [3 /*break*/, 6];
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, this.pool.contract.kickerInfo(botAddress)];
                    case 4:
                        kickerInfo = _a.sent();
                        claimable = kickerInfo.claimable_;
                        return [2 /*return*/, {
                                hasIncentive: true,
                                reason: "Bot is kicker with ".concat((0, utils_1.weiToDecimaled)(claimable), " claimable bond")
                            }];
                    case 5:
                        kickerError_1 = _a.sent();
                        return [2 /*return*/, {
                                hasIncentive: true,
                                reason: "Bot is kicker (could not check claimable amount)"
                            }];
                    case 6: return [2 /*return*/, {
                            hasIncentive: false,
                            reason: "Not the kicker (kicker: ".concat(kicker.slice(0, 8), ")")
                        }];
                    case 7:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                hasIncentive: false,
                                reason: "Error checking incentive: ".concat(error_3 instanceof Error ? error_3.message : String(error_3))
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Settle an auction completely with multiple iterations if needed
     */
    SettlementHandler.prototype.settleAuctionCompletely = function (borrower) {
        return __awaiter(this, void 0, void 0, function () {
            var maxIterations, bucketDepth, iteration, auctionInfo, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxIterations = this.poolConfig.settlement.maxIterations || 10;
                        bucketDepth = this.poolConfig.settlement.maxBucketDepth || 50;
                        if (this.config.dryRun) {
                            logging_1.logger.info("DRY RUN: Would settle ".concat(borrower.slice(0, 8), " in up to ").concat(maxIterations, " iterations"));
                            return [2 /*return*/, {
                                    success: true,
                                    completed: true,
                                    iterations: 1,
                                    reason: "Dry run - settlement skipped"
                                }];
                        }
                        iteration = 1;
                        _a.label = 1;
                    case 1:
                        if (!(iteration <= maxIterations)) return [3 /*break*/, 9];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        logging_1.logger.debug("Settlement iteration ".concat(iteration, "/").concat(maxIterations, " for ").concat(borrower.slice(0, 8)));
                        // Attempt settlement
                        return [4 /*yield*/, (0, transactions_1.poolSettle)(this.pool, this.signer, borrower, bucketDepth)];
                    case 3:
                        // Attempt settlement
                        _a.sent();
                        return [4 /*yield*/, this.pool.contract.auctionInfo(borrower)];
                    case 4:
                        auctionInfo = _a.sent();
                        if (auctionInfo.kickTime_.eq(0)) {
                            return [2 /*return*/, {
                                    success: true,
                                    completed: true,
                                    iterations: iteration,
                                    reason: "Auction fully settled and removed"
                                }];
                        }
                        logging_1.logger.debug("Partial settlement completed, auction still exists - need iteration ".concat(iteration + 1));
                        if (!(iteration < maxIterations)) return [3 /*break*/, 6];
                        return [4 /*yield*/, (0, utils_1.delay)(this.config.delayBetweenActions)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_4 = _a.sent();
                        logging_1.logger.error("Settlement iteration ".concat(iteration, " failed for ").concat(borrower.slice(0, 8), ":"), error_4);
                        return [2 /*return*/, {
                                success: false,
                                completed: false,
                                iterations: iteration,
                                reason: "Settlement failed: ".concat(error_4 instanceof Error ? error_4.message : String(error_4))
                            }];
                    case 8:
                        iteration++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/, {
                            success: true,
                            completed: false,
                            iterations: maxIterations,
                            reason: "Partial settlement after ".concat(maxIterations, " iterations - may need more")
                        }];
                }
            });
        });
    };
    /**
     * Get current settlement status for debugging
     */
    SettlementHandler.prototype.getSettlementStatus = function (borrower) {
        return __awaiter(this, void 0, void 0, function () {
            var signerAddress, auctionInfo, locked, claimable;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        signerAddress = _b.sent();
                        return [4 /*yield*/, this.pool.contract.auctionInfo(borrower)];
                    case 2:
                        auctionInfo = _b.sent();
                        return [4 /*yield*/, this.pool.kickerInfo(signerAddress)];
                    case 3:
                        locked = (_a = _b.sent(), _a.locked), claimable = _a.claimable;
                        return [2 /*return*/, {
                                auctionExists: !auctionInfo.kickTime_.eq(0),
                                bondsLocked: !locked.eq(0),
                                bondsClaimable: claimable.gt(0),
                                needsSettlement: !auctionInfo.kickTime_.eq(0),
                                canWithdrawBonds: locked.eq(0) && claimable.gt(0)
                            }];
                }
            });
        });
    };
    // ADD: Global lock to prevent duplicate processing
    SettlementHandler.activeSettlements = new Set();
    return SettlementHandler;
}());
/**
 * Handle settlements for a pool (main entry point)
 */
function handleSettlements(_a) {
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var handler;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    handler = new SettlementHandler(pool, signer, poolConfig, config);
                    return [4 /*yield*/, handler.handleSettlements()];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.handleSettlements = handleSettlements;
/**
 * Reactive settlement with early exit for high minAge
 */
function tryReactiveSettlement(_a) {
    var _b;
    var pool = _a.pool, poolConfig = _a.poolConfig, signer = _a.signer, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var handler, auctions, signerAddress, locked, bondsUnlocked;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!((_b = poolConfig.settlement) === null || _b === void 0 ? void 0 : _b.enabled)) {
                        return [2 /*return*/, false];
                    }
                    handler = new SettlementHandler(pool, signer, poolConfig, config);
                    return [4 /*yield*/, handler.findSettleableAuctions()];
                case 1:
                    auctions = _c.sent();
                    if (auctions.length === 0) {
                        logging_1.logger.debug("No auctions need settlement in ".concat(pool.name, " - bonds locked for normal reasons"));
                        return [2 /*return*/, false];
                    }
                    logging_1.logger.info("Bonds locked in ".concat(pool.name, ", attempting reactive settlement..."));
                    return [4 /*yield*/, handler.handleSettlements()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, signer.getAddress()];
                case 3:
                    signerAddress = _c.sent();
                    return [4 /*yield*/, pool.kickerInfo(signerAddress)];
                case 4:
                    locked = (_c.sent()).locked;
                    bondsUnlocked = locked.eq(0);
                    if (bondsUnlocked) {
                        logging_1.logger.info("Reactive settlement successful - bonds unlocked in ".concat(pool.name));
                    }
                    else {
                        logging_1.logger.warn("Reactive settlement completed but bonds still locked in ".concat(pool.name));
                    }
                    return [2 /*return*/, bondsUnlocked];
            }
        });
    });
}
exports.tryReactiveSettlement = tryReactiveSettlement;
//# sourceMappingURL=settlement.js.map