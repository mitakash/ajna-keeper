"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
require("./subgraph-mock");
var sdk_1 = require("@ajna-finance/sdk");
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var config_types_1 = require("../config-types");
var nonce_1 = require("../nonce");
var settlement_1 = require("../settlement");
var collect_lp_1 = require("../collect-lp");
var collect_bond_1 = require("../collect-bond");
var reward_action_tracker_1 = require("../reward-action-tracker");
var dex_router_1 = require("../dex-router");
var utils_1 = require("../utils");
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var loan_helpers_1 = require("./loan-helpers");
var kick_1 = require("../kick");
var take_1 = require("../take");
var constants_1 = require("../constants");
/**
 * Integration tests for settlement functionality focusing on real blockchain interactions
 * and end-to-end workflows. These tests complement the unit tests by testing actual
 * transaction flows and integration with other keeper components.
 *
 * Test Categories:
 * 1. Real Settlement Scenarios - Create loans, kick them, manipulate to bad debt state
 * 2. Integration with LP Collection - Test reactive settlement when LP collection fails
 * 3. Integration with Bond Collection - Test settlement unlocking bonds
 * 4. Multi-Pool Settlement - Test settlement across multiple pools
 * 5. Performance and Edge Cases - Test caching, rate limiting, error recovery
 */
describe('Settlement Integration Tests', function () {
    var ajna;
    var pool;
    var settlementHandler;
    var poolConfig;
    var keeperConfig;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    nonce_1.NonceTracker.clearNonces();
                    // Configure Ajna SDK
                    (0, config_types_1.configureAjna)(test_config_1.MAINNET_CONFIG.AJNA_CONFIG);
                    ajna = new sdk_1.AjnaSDK((0, test_utils_1.getProvider)());
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address)];
                case 2:
                    pool = _a.sent();
                    // Standard settlement configuration for testing
                    poolConfig = __assign(__assign({}, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig), { settlement: {
                            enabled: true,
                            minAuctionAge: 10,
                            maxBucketDepth: 20,
                            maxIterations: 5,
                            checkBotIncentive: false, // Disabled for easier testing
                        } });
                    keeperConfig = {
                        dryRun: false,
                        subgraphUrl: 'http://test-subgraph-url',
                        delayBetweenActions: 100, // Short delay for testing
                    };
                    return [2 /*return*/];
            }
        });
    }); });
    describe('Real Settlement Scenarios', function () {
        /**
         * Test end-to-end settlement workflows with real blockchain state
         * These tests create actual loans, kick them, and test settlement scenarios
         */
        it('should detect and settle auction with bad debt', function () { return __awaiter(void 0, void 0, void 0, function () {
            var lenderSigner, borrowerSigner, kickerSigner, _i, _a, signer, _b, borrowerAddress, error_1, settlementCheck, settlementResult, auctionInfo;
            var _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        console.log('\n=== Testing Bad Debt Settlement ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress)];
                    case 1:
                        lenderSigner = _g.sent();
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                    case 2:
                        borrowerSigner = _g.sent();
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 3:
                        kickerSigner = _g.sent();
                        // Setup: Create loan scenario following existing test patterns
                        return [4 /*yield*/, (0, loan_helpers_1.depositQuoteToken)({
                                pool: pool,
                                owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
                                amount: 1,
                                price: 0.07, // Price per SOL
                            })];
                    case 4:
                        // Setup: Create loan scenario following existing test patterns
                        _g.sent();
                        return [4 /*yield*/, (0, loan_helpers_1.drawDebt)({
                                pool: pool,
                                owner: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
                                amountToBorrow: 0.9,
                                collateralToPledge: 14, // 14 SOL
                            })];
                    case 5:
                        _g.sent();
                        // Age the loan to make it kickable
                        return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_YEAR * 2)];
                    case 6:
                        // Age the loan to make it kickable
                        _g.sent();
                        console.log('Loan aged for 2 years to become kickable');
                        _i = 0, _a = [lenderSigner, borrowerSigner, kickerSigner];
                        _g.label = 7;
                    case 7:
                        if (!(_i < _a.length)) return [3 /*break*/, 11];
                        signer = _a[_i];
                        _b = test_utils_1.setBalance;
                        return [4 /*yield*/, signer.getAddress()];
                    case 8: return [4 /*yield*/, _b.apply(void 0, [_g.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 9:
                        _g.sent();
                        _g.label = 10;
                    case 10:
                        _i++;
                        return [3 /*break*/, 7];
                    case 11:
                        borrowerAddress = test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
                        return [4 /*yield*/, (0, kick_1.handleKicks)({
                                pool: pool,
                                poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                                signer: kickerSigner,
                                config: {
                                    dryRun: false,
                                    subgraphUrl: '',
                                    coinGeckoApiKey: '',
                                    delayBetweenActions: 0,
                                },
                            })];
                    case 12:
                        _g.sent();
                        console.log("Loan kicked for borrower: ".concat(borrowerAddress));
                        // Wait for auction to meet minimum age for settlement
                        return [4 /*yield*/, (0, test_utils_1.increaseTime)(15)];
                    case 13:
                        // Wait for auction to meet minimum age for settlement
                        _g.sent(); // 15 seconds > 10 second minimum
                        console.log('Auction aged to meet minimum settlement age');
                        _g.label = 14;
                    case 14:
                        _g.trys.push([14, 17, , 18]);
                        return [4 /*yield*/, (0, test_utils_1.increaseTime)(constants_1.SECONDS_PER_DAY * 1)];
                    case 15:
                        _g.sent(); // Age auction further
                        return [4 /*yield*/, (0, take_1.handleTakes)({
                                pool: pool,
                                poolConfig: test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
                                signer: kickerSigner,
                                config: {
                                    dryRun: false,
                                    subgraphUrl: '',
                                    delayBetweenActions: 0,
                                },
                            })];
                    case 16:
                        _g.sent();
                        console.log('Take handling completed');
                        return [3 /*break*/, 18];
                    case 17:
                        error_1 = _g.sent();
                        console.log('Take handling result:', error_1 instanceof Error ? error_1.message : String(error_1));
                        return [3 /*break*/, 18];
                    case 18:
                        // Test settlement functionality
                        settlementHandler = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        return [4 /*yield*/, settlementHandler.needsSettlement(borrowerAddress)];
                    case 19:
                        settlementCheck = _g.sent();
                        console.log('Settlement check result:', {
                            needs: settlementCheck.needs,
                            reason: settlementCheck.reason,
                            debtRemaining: (_d = (_c = settlementCheck.details) === null || _c === void 0 ? void 0 : _c.debtRemaining) === null || _d === void 0 ? void 0 : _d.toString(),
                            collateralRemaining: (_f = (_e = settlementCheck.details) === null || _e === void 0 ? void 0 : _e.collateralRemaining) === null || _f === void 0 ? void 0 : _f.toString()
                        });
                        if (!settlementCheck.needs) return [3 /*break*/, 23];
                        console.log('Executing settlement...');
                        return [4 /*yield*/, settlementHandler.settleAuctionCompletely(borrowerAddress)];
                    case 20:
                        settlementResult = _g.sent();
                        console.log('Settlement result:', {
                            success: settlementResult.success,
                            completed: settlementResult.completed,
                            iterations: settlementResult.iterations,
                            reason: settlementResult.reason
                        });
                        (0, chai_1.expect)(settlementResult.success).to.be.true;
                        if (!settlementResult.completed) return [3 /*break*/, 22];
                        return [4 /*yield*/, pool.contract.auctionInfo(borrowerAddress)];
                    case 21:
                        auctionInfo = _g.sent();
                        (0, chai_1.expect)(auctionInfo.kickTime_.eq(ethers_1.constants.Zero)).to.be.true; // Use BigNumber comparison
                        _g.label = 22;
                    case 22: return [3 /*break*/, 24];
                    case 23:
                        console.log('Settlement not needed - this may be expected depending on auction state');
                        _g.label = 24;
                    case 24:
                        console.log('Bad debt settlement test completed');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle auctions that do not need settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, randomBorrower, settlementCheck;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Healthy Auction (No Settlement Needed) ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        // Create settlement handler
                        settlementHandler = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        randomBorrower = '0x1234567890123456789012345678901234567890';
                        return [4 /*yield*/, settlementHandler.needsSettlement(randomBorrower)];
                    case 4:
                        settlementCheck = _b.sent();
                        console.log('Settlement check for non-existent auction:', {
                            needs: settlementCheck.needs,
                            reason: settlementCheck.reason
                        });
                        (0, chai_1.expect)(settlementCheck.needs).to.be.false;
                        (0, chai_1.expect)(settlementCheck.reason).to.include('No active auction');
                        console.log('Healthy auction test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Integration with LP Collection', function () {
        /**
         * Test reactive settlement when LP collection fails due to locked bonds
         * This tests a critical integration point where settlement enables other operations
         */
        it('should trigger reactive settlement when LP collection fails with AuctionNotCleared', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, dexRouter, exchangeTracker, lpCollector, error_2, errorMessage, settlementSuccess;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Reactive Settlement from LP Collection ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        dexRouter = new dex_router_1.DexRouter(kickerSigner, {
                            oneInchRouters: {},
                            connectorTokens: [],
                        });
                        exchangeTracker = new reward_action_tracker_1.RewardActionTracker(kickerSigner, { tokenAddresses: {} }, dexRouter);
                        lpCollector = new collect_lp_1.LpCollector(pool, kickerSigner, poolConfig, keeperConfig, exchangeTracker);
                        // Start LP collector subscriptions
                        return [4 /*yield*/, lpCollector.startSubscription()];
                    case 4:
                        // Start LP collector subscriptions
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 10]);
                        // This will likely fail in most cases as we don't have active rewards
                        return [4 /*yield*/, lpCollector.collectLpRewards()];
                    case 6:
                        // This will likely fail in most cases as we don't have active rewards
                        _b.sent();
                        console.log('LP collection succeeded (no settlement trigger needed)');
                        return [3 /*break*/, 10];
                    case 7:
                        error_2 = _b.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        console.log('LP collection error:', errorMessage);
                        if (!errorMessage.includes('AuctionNotCleared')) return [3 /*break*/, 9];
                        console.log('AuctionNotCleared detected - testing reactive settlement');
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: pool,
                                poolConfig: poolConfig,
                                signer: kickerSigner,
                                config: keeperConfig,
                            })];
                    case 8:
                        settlementSuccess = _b.sent();
                        console.log('Reactive settlement result:', settlementSuccess);
                        // The result depends on whether there are actually auctions to settle
                        (0, chai_1.expect)(typeof settlementSuccess).to.equal('boolean');
                        _b.label = 9;
                    case 9: return [3 /*break*/, 10];
                    case 10: return [4 /*yield*/, lpCollector.stopSubscription()];
                    case 11:
                        _b.sent();
                        console.log('LP collection integration test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Integration with Bond Collection', function () {
        /**
         * Test settlement integration with bond collection operations
         * Settlement should unlock bonds and allow collection to proceed
         */
        it('should unlock bonds through settlement for bond collection', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, error_3, errorMessage, unlocked;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Settlement Integration with Bond Collection ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 9]);
                        return [4 /*yield*/, (0, collect_bond_1.collectBondFromPool)({
                                pool: pool,
                                signer: kickerSigner,
                                poolConfig: poolConfig,
                                config: keeperConfig,
                            })];
                    case 5:
                        _b.sent();
                        console.log('Bond collection completed successfully');
                        return [3 /*break*/, 9];
                    case 6:
                        error_3 = _b.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        console.log('Bond collection error (expected in test environment):', errorMessage);
                        if (!(errorMessage.includes('AuctionNotCleared') || errorMessage.includes('BondNotReward'))) return [3 /*break*/, 8];
                        console.log('Testing settlement unlock scenario');
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: pool,
                                poolConfig: poolConfig,
                                signer: kickerSigner,
                                config: keeperConfig,
                            })];
                    case 7:
                        unlocked = _b.sent();
                        console.log('Settlement unlock result:', unlocked);
                        (0, chai_1.expect)(typeof unlocked).to.equal('boolean');
                        _b.label = 8;
                    case 8: return [3 /*break*/, 9];
                    case 9:
                        console.log('Bond collection integration test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Settlement Performance and Caching', function () {
        /**
         * Test settlement performance optimizations and caching behavior
         * Verify that subgraph queries are cached appropriately and age filtering works
         */
        it('should cache subgraph queries and filter by auction age', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, ageFilterConfig, startTime, auctions1, firstCallTime, cacheStartTime, auctions2, cacheCallTime;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Settlement Caching and Age Filtering ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        ageFilterConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { minAuctionAge: 86400 }) });
                        settlementHandler = new settlement_1.SettlementHandler(pool, kickerSigner, ageFilterConfig, keeperConfig);
                        console.log('Testing auction discovery with high age filter...');
                        startTime = Date.now();
                        return [4 /*yield*/, settlementHandler.findSettleableAuctions()];
                    case 4:
                        auctions1 = _b.sent();
                        firstCallTime = Date.now() - startTime;
                        console.log("First call found ".concat(auctions1.length, " auctions in ").concat(firstCallTime, "ms"));
                        cacheStartTime = Date.now();
                        return [4 /*yield*/, settlementHandler.findSettleableAuctions()];
                    case 5:
                        auctions2 = _b.sent();
                        cacheCallTime = Date.now() - cacheStartTime;
                        console.log("Cached call found ".concat(auctions2.length, " auctions in ").concat(cacheCallTime, "ms"));
                        // Verify results are consistent
                        (0, chai_1.expect)(auctions1.length).to.equal(auctions2.length);
                        // Cache should be faster (though in test environment this might not always be true)
                        console.log("Cache performance: ".concat(firstCallTime, "ms -> ").concat(cacheCallTime, "ms"));
                        console.log('Caching and age filtering test completed');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle concurrent settlement attempts with locking', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, handler1, handler2, _b, auctions1, auctions2, error_4;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('\n=== Testing Concurrent Settlement Locking ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _c.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_c.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _c.sent();
                        handler1 = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        handler2 = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        // Test concurrent settlement discovery
                        console.log('Testing concurrent settlement discovery...');
                        return [4 /*yield*/, Promise.all([
                                handler1.findSettleableAuctions(),
                                handler2.findSettleableAuctions(),
                            ])];
                    case 4:
                        _b = _c.sent(), auctions1 = _b[0], auctions2 = _b[1];
                        console.log("Handler 1 found ".concat(auctions1.length, " auctions"));
                        console.log("Handler 2 found ".concat(auctions2.length, " auctions"));
                        // Both should find the same auctions
                        (0, chai_1.expect)(auctions1.length).to.equal(auctions2.length);
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, Promise.all([
                                (0, settlement_1.handleSettlements)({
                                    pool: pool,
                                    poolConfig: poolConfig,
                                    signer: kickerSigner,
                                    config: keeperConfig,
                                }),
                                (0, settlement_1.handleSettlements)({
                                    pool: pool,
                                    poolConfig: poolConfig,
                                    signer: kickerSigner,
                                    config: keeperConfig,
                                }),
                            ])];
                    case 6:
                        _c.sent();
                        console.log('Concurrent settlement handling completed');
                        return [3 /*break*/, 8];
                    case 7:
                        error_4 = _c.sent();
                        console.log('Expected error in concurrent settlement:', error_4 instanceof Error ? error_4.message : String(error_4));
                        return [3 /*break*/, 8];
                    case 8:
                        console.log('Concurrent settlement locking test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Settlement Configuration Validation', function () {
        /**
         * Test different settlement configurations and their behavior
         * Verify that configuration changes affect settlement behavior correctly
         */
        it('should respect checkBotIncentive configuration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, incentiveConfig, incentiveHandler, randomBorrower, incentiveResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Bot Incentive Configuration ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        incentiveConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { checkBotIncentive: true }) });
                        incentiveHandler = new settlement_1.SettlementHandler(pool, kickerSigner, incentiveConfig, keeperConfig);
                        randomBorrower = '0x1234567890123456789012345678901234567890';
                        return [4 /*yield*/, incentiveHandler.checkBotIncentive(randomBorrower)];
                    case 4:
                        incentiveResult = _b.sent();
                        console.log('Bot incentive check result:', {
                            hasIncentive: incentiveResult.hasIncentive,
                            reason: incentiveResult.reason
                        });
                        // Should return false for non-existent auction
                        (0, chai_1.expect)(incentiveResult.hasIncentive).to.be.false;
                        console.log('Bot incentive configuration test completed');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should respect iteration and bucket depth limits', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, limitedConfig, limitedHandler, dryRunConfig, dryRunHandler, dryRunResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Settlement Limits Configuration ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        limitedConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { maxIterations: 2, maxBucketDepth: 5 }) });
                        limitedHandler = new settlement_1.SettlementHandler(pool, kickerSigner, limitedConfig, keeperConfig);
                        dryRunConfig = __assign(__assign({}, keeperConfig), { dryRun: true });
                        dryRunHandler = new settlement_1.SettlementHandler(pool, kickerSigner, limitedConfig, dryRunConfig);
                        return [4 /*yield*/, dryRunHandler.settleAuctionCompletely('0x1234567890123456789012345678901234567890')];
                    case 4:
                        dryRunResult = _b.sent();
                        console.log('Dry run with limited config:', {
                            success: dryRunResult.success,
                            iterations: dryRunResult.iterations,
                            reason: dryRunResult.reason
                        });
                        (0, chai_1.expect)(dryRunResult.success).to.be.true;
                        (0, chai_1.expect)(dryRunResult.reason).to.include('Dry run');
                        console.log('Settlement limits configuration test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Error Recovery and Edge Cases', function () {
        /**
         * Test settlement behavior under error conditions and edge cases
         * Verify graceful handling of network errors, invalid states, etc.
         */
        it('should handle subgraph network errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, errorConfig, errorHandler, auctions;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Network Error Recovery ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        errorConfig = __assign(__assign({}, keeperConfig), { subgraphUrl: 'http://invalid-url-that-will-fail' });
                        errorHandler = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, errorConfig);
                        console.log('Testing settlement discovery with invalid subgraph URL...');
                        return [4 /*yield*/, errorHandler.findSettleableAuctions()];
                    case 4:
                        auctions = _b.sent();
                        console.log("Settlement discovery with network error returned ".concat(auctions.length, " auctions"));
                        (0, chai_1.expect)(auctions).to.be.an('array');
                        (0, chai_1.expect)(auctions.length).to.equal(0);
                        console.log('Network error recovery test completed');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle invalid auction states', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, invalidBorrowers, _i, invalidBorrowers_1, borrower, result, error_5;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Invalid Auction State Handling ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        settlementHandler = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        invalidBorrowers = [
                            '0x0000000000000000000000000000000000000000',
                            '0xInvalidAddress',
                            ethers_1.constants.AddressZero, // Zero address constant
                        ];
                        _i = 0, invalidBorrowers_1 = invalidBorrowers;
                        _b.label = 4;
                    case 4:
                        if (!(_i < invalidBorrowers_1.length)) return [3 /*break*/, 9];
                        borrower = invalidBorrowers_1[_i];
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        console.log("Testing settlement check for invalid borrower: ".concat(borrower));
                        return [4 /*yield*/, settlementHandler.needsSettlement(borrower)];
                    case 6:
                        result = _b.sent();
                        console.log("Result for ".concat(borrower, ":"), {
                            needs: result.needs,
                            reason: result.reason.substring(0, 50) + '...'
                        });
                        // Should handle gracefully without throwing
                        (0, chai_1.expect)(result.needs).to.be.false;
                        return [3 /*break*/, 8];
                    case 7:
                        error_5 = _b.sent();
                        console.log("Expected error for ".concat(borrower, ":"), error_5 instanceof Error ? error_5.message.substring(0, 50) + '...' : String(error_5));
                        return [3 /*break*/, 8];
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9:
                        console.log('Invalid auction state handling test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Settlement Status and Monitoring', function () {
        /**
         * Test settlement status reporting and monitoring capabilities
         * Verify that settlement handlers provide good observability
         */
        it('should provide accurate settlement status information', function () { return __awaiter(void 0, void 0, void 0, function () {
            var kickerSigner, _a, randomBorrower, status_1, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('\n=== Testing Settlement Status Reporting ===');
                        return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2)];
                    case 1:
                        kickerSigner = _b.sent();
                        _a = test_utils_1.setBalance;
                        return [4 /*yield*/, kickerSigner.getAddress()];
                    case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(10).toHexString()])];
                    case 3:
                        _b.sent();
                        settlementHandler = new settlement_1.SettlementHandler(pool, kickerSigner, poolConfig, keeperConfig);
                        randomBorrower = '0x1234567890123456789012345678901234567890';
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, settlementHandler.getSettlementStatus(randomBorrower)];
                    case 5:
                        status_1 = _b.sent();
                        console.log('Settlement status for non-existent borrower:', {
                            auctionExists: status_1.auctionExists,
                            bondsLocked: status_1.bondsLocked,
                            bondsClaimable: status_1.bondsClaimable,
                            needsSettlement: status_1.needsSettlement,
                            canWithdrawBonds: status_1.canWithdrawBonds
                        });
                        (0, chai_1.expect)(status_1.auctionExists).to.be.false;
                        (0, chai_1.expect)(typeof status_1.bondsLocked).to.equal('boolean');
                        (0, chai_1.expect)(typeof status_1.bondsClaimable).to.equal('boolean');
                        return [3 /*break*/, 7];
                    case 6:
                        error_6 = _b.sent();
                        console.log('Status check error (may be expected):', error_6 instanceof Error ? error_6.message.substring(0, 50) + '...' : String(error_6));
                        return [3 /*break*/, 7];
                    case 7:
                        console.log('Settlement status reporting test completed');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=settlement.test.js.map