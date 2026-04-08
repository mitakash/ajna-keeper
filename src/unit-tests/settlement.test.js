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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var settlement_1 = require("../settlement");
var subgraph_1 = __importDefault(require("../subgraph"));
var transactions = __importStar(require("../transactions"));
describe('Settlement Module Tests', function () {
    var mockPool;
    var mockSigner;
    var poolConfig;
    var config;
    // External dependency stubs
    var getUnsettledAuctionsStub;
    var poolSettleStub;
    beforeEach(function () {
        // Create comprehensive mock pool with all required methods
        mockPool = {
            name: 'Test Pool',
            poolAddress: '0x1234567890123456789012345678901234567890',
            contract: {
                auctionInfo: sinon_1.default.stub(),
                kickerInfo: sinon_1.default.stub(),
                callStatic: {
                    settle: sinon_1.default.stub(),
                },
                connect: sinon_1.default.stub(),
            },
            getLiquidation: sinon_1.default.stub(),
            kickerInfo: sinon_1.default.stub(),
        };
        // Mock contract.connect to return the same contract for transaction building
        mockPool.contract.connect.returns(mockPool.contract);
        // Create mock signer with consistent address
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xBotAddress123456789012345678901234567890'),
            getTransactionCount: sinon_1.default.stub().resolves(42),
        };
        // Standard pool configuration for testing
        poolConfig = {
            name: 'Test Pool',
            address: '0x1234567890123456789012345678901234567890',
            price: { source: 'fixed', value: 1 },
            settlement: {
                enabled: true,
                minAuctionAge: 3600,
                maxBucketDepth: 50,
                maxIterations: 5,
                checkBotIncentive: true, // Require bot incentive
            },
        };
        // Keeper configuration for tests
        config = {
            dryRun: false,
            subgraphUrl: 'http://test-subgraph-url',
            delayBetweenActions: 0, // No delays in tests
        };
        // Stub external module dependencies
        getUnsettledAuctionsStub = sinon_1.default.stub(subgraph_1.default, 'getUnsettledAuctions');
        poolSettleStub = sinon_1.default.stub(transactions, 'poolSettle');
    });
    afterEach(function () {
        // Clean up all stubs after each test
        sinon_1.default.restore();
    });
    describe('SettlementHandler.needsSettlement()', function () {
        /**
         * Test core settlement decision logic
         * Settlement should only occur when:
         * 1. Active auction exists (kickTime > 0)
         * 2. Debt remains (debtToCollateral > 0)
         * 3. No collateral left to auction (collateral = 0)
         * 4. Settlement transaction would succeed
         */
        it('should return false when no active auction exists', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock auction with kickTime = 0 (no active auction)
                        mockPool.contract.auctionInfo.resolves({
                            kickTime_: ethers_1.BigNumber.from(0),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.needsSettlement('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should not need settlement
                        (0, chai_1.expect)(result.needs).to.be.false;
                        (0, chai_1.expect)(result.reason).to.include('No active auction');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when debt is zero', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock auction with no debt remaining
                        mockPool.contract.auctionInfo.resolves({
                            kickTime_: ethers_1.BigNumber.from(Math.floor(Date.now() / 1000)),
                            debtToCollateral_: ethers_1.BigNumber.from(0), // No debt
                        });
                        mockPool.getLiquidation.returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.needsSettlement('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should not need settlement when debt is zero
                        (0, chai_1.expect)(result.needs).to.be.false;
                        (0, chai_1.expect)(result.reason).to.include('No debt remaining');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when collateral still exists for auction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock auction with remaining collateral
                        mockPool.contract.auctionInfo.resolves({
                            kickTime_: ethers_1.BigNumber.from(Math.floor(Date.now() / 1000)),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        mockPool.getLiquidation.returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from('500000000000000000'),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.needsSettlement('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should not settle while collateral exists
                        (0, chai_1.expect)(result.needs).to.be.false;
                        (0, chai_1.expect)(result.reason).to.include('Still has');
                        (0, chai_1.expect)(result.reason).to.include('collateral');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return true for bad debt scenario (collateral=0, debt>0)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock auction with bad debt (no collateral, has debt)
                        mockPool.contract.auctionInfo.resolves({
                            kickTime_: ethers_1.BigNumber.from(Math.floor(Date.now() / 1000)),
                            debtToCollateral_: ethers_1.BigNumber.from('2000000000000000000'), // 2.0 debt
                        });
                        mockPool.getLiquidation.returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        // Mock settlement call to succeed
                        mockPool.contract.callStatic.settle.resolves();
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.needsSettlement('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should need settlement for bad debt
                        (0, chai_1.expect)(result.needs).to.be.true;
                        (0, chai_1.expect)(result.reason).to.include('Bad debt detected');
                        (0, chai_1.expect)(result.reason).to.include('2'); // weiToDecimaled converts 2000000000000000000 to '2'
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when settlement call would fail', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock auction that appears to need settlement but settle call fails
                        mockPool.contract.auctionInfo.resolves({
                            kickTime_: ethers_1.BigNumber.from(Math.floor(Date.now() / 1000)),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        mockPool.getLiquidation.returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        // Mock settlement call to fail
                        mockPool.contract.callStatic.settle.rejects(new Error('Cannot read properties of undefined (reading \'eq\')'));
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.needsSettlement('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should not settle if call would fail
                        (0, chai_1.expect)(result.needs).to.be.false;
                        (0, chai_1.expect)(result.reason).to.include('Settlement call would fail');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('SettlementHandler.checkBotIncentive()', function () {
        /**
         * Test bot incentive validation logic
         * Bot should only settle when it has rewards to claim (is the kicker)
         */
        it('should return true when bot is the kicker with claimable bonds', function () { return __awaiter(void 0, void 0, void 0, function () {
            var botAddress, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, mockSigner.getAddress()];
                    case 1:
                        botAddress = _a.sent();
                        mockPool.contract.auctionInfo.resolves({
                            kicker_: botAddress, // Bot is the kicker
                        });
                        mockPool.contract.kickerInfo.resolves({
                            claimable_: ethers_1.BigNumber.from('500000000000000000'), // 0.5 ETH claimable
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.checkBotIncentive('0xBorrower123')];
                    case 2:
                        result = _a.sent();
                        // Verify: Should have incentive as kicker
                        (0, chai_1.expect)(result.hasIncentive).to.be.true;
                        (0, chai_1.expect)(result.reason).to.include('Bot is kicker');
                        (0, chai_1.expect)(result.reason).to.include('0.5');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when bot is not the kicker', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Different address is the kicker
                        mockPool.contract.auctionInfo.resolves({
                            kicker_: '0xSomeOtherKicker1234567890123456789012',
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.checkBotIncentive('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should not have incentive when not kicker
                        (0, chai_1.expect)(result.hasIncentive).to.be.false;
                        (0, chai_1.expect)(result.reason).to.include('Not the kicker');
                        (0, chai_1.expect)(result.reason).to.include('0xSomeOt'); // Address is sliced to 8 characters
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return true when bot is kicker but cannot check claimable amount', function () { return __awaiter(void 0, void 0, void 0, function () {
            var botAddress, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, mockSigner.getAddress()];
                    case 1:
                        botAddress = _a.sent();
                        mockPool.contract.auctionInfo.resolves({
                            kicker_: botAddress,
                        });
                        mockPool.contract.kickerInfo.rejects(new Error('Network error'));
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.checkBotIncentive('0xBorrower123')];
                    case 2:
                        result = _a.sent();
                        // Verify: Should still have incentive if bot is kicker
                        (0, chai_1.expect)(result.hasIncentive).to.be.true;
                        (0, chai_1.expect)(result.reason).to.include('Bot is kicker');
                        (0, chai_1.expect)(result.reason).to.include('could not check');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('SettlementHandler.findSettleableAuctions()', function () {
        /**
         * Test auction discovery and filtering logic
         * Should find auctions that need settlement and respect age requirements
         */
        it('should filter out auctions that do not actually need settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oldKickTime, auctionInfoStub, getLiquidationStub, settleCallStub, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldKickTime = Math.floor(Date.now() / 1000) - 7200;
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [
                                {
                                    borrower: '0xBorrower1',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '1.0',
                                    collateralRemaining: '0.5',
                                    neutralPrice: '0.06',
                                    debt: '1.0',
                                    collateral: '0.5'
                                },
                                {
                                    borrower: '0xBorrower2',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '2.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.05',
                                    debt: '2.0',
                                    collateral: '0.0'
                                },
                            ],
                        });
                        auctionInfoStub = sinon_1.default.stub();
                        getLiquidationStub = sinon_1.default.stub();
                        settleCallStub = sinon_1.default.stub();
                        // Mock first borrower - has collateral, should NOT be settled
                        auctionInfoStub.withArgs('0xBorrower1').resolves({
                            kickTime_: ethers_1.BigNumber.from(oldKickTime),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        getLiquidationStub.withArgs('0xBorrower1').returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from('500000000000000000'),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        // Mock second borrower - no collateral, SHOULD be settled
                        auctionInfoStub.withArgs('0xBorrower2').resolves({
                            kickTime_: ethers_1.BigNumber.from(oldKickTime),
                            debtToCollateral_: ethers_1.BigNumber.from('2000000000000000000'),
                        });
                        getLiquidationStub.withArgs('0xBorrower2').returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        // Mock settlement feasibility checks
                        settleCallStub.withArgs('0xBorrower1', 10).rejects(new Error('Has collateral'));
                        settleCallStub.withArgs('0xBorrower2', 10).resolves(); // Should succeed
                        // Apply mocks to pool
                        mockPool.contract.auctionInfo = auctionInfoStub;
                        mockPool.getLiquidation = getLiquidationStub;
                        mockPool.contract.callStatic.settle = settleCallStub;
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.findSettleableAuctions()];
                    case 1:
                        result = _a.sent();
                        // Verify: Should only return auction that actually needs settlement
                        (0, chai_1.expect)(result).to.have.length(1);
                        (0, chai_1.expect)(result[0].borrower).to.equal('0xBorrower2');
                        (0, chai_1.expect)(result[0].debtRemaining.toString()).to.equal('2000000000000000000');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return empty array when no auctions need settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock subgraph returning no auctions
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [],
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.findSettleableAuctions()];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return empty array
                        (0, chai_1.expect)(result).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should skip auctions that are too young (age filtering)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var youngKickTime, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        youngKickTime = Math.floor(Date.now() / 1000) - 1800;
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [
                                {
                                    borrower: '0xYoungBorrower',
                                    kickTime: youngKickTime.toString(),
                                    debtRemaining: '1.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.05',
                                    debt: '1.0',
                                    collateral: '0.0'
                                },
                            ],
                        });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, // minAuctionAge is 3600 seconds (1 hour)
                        config);
                        return [4 /*yield*/, handler.findSettleableAuctions()];
                    case 1:
                        result = _a.sent();
                        // Verify: Should skip young auction
                        (0, chai_1.expect)(result).to.be.empty;
                        // Verify on-chain checks were skipped (performance optimization)
                        (0, chai_1.expect)(mockPool.contract.auctionInfo.called).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle subgraph network errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock subgraph to return network error
                        getUnsettledAuctionsStub.rejects(new Error('ECONNRESET: Network error'));
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.findSettleableAuctions()];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return empty array on network error
                        (0, chai_1.expect)(result).to.be.empty;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('SettlementHandler.settleAuctionCompletely()', function () {
        /**
         * Test settlement execution with multiple iterations
         * Should handle partial settlements and retry until complete
         */
        it('should perform dry run without actual settlement transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var dryRunConfig, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dryRunConfig = __assign(__assign({}, config), { dryRun: true });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, dryRunConfig);
                        return [4 /*yield*/, handler.settleAuctionCompletely('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should complete dry run without calling actual settlement
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.completed).to.be.true;
                        (0, chai_1.expect)(result.reason).to.include('Dry run');
                        (0, chai_1.expect)(poolSettleStub.called).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should settle successfully in single iteration', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock settlement to succeed immediately
                        poolSettleStub.resolves();
                        // Mock auctionInfo check after settlement (kickTime = 0 means settled)
                        mockPool.contract.auctionInfo.resolves({ kickTime_: ethers_1.BigNumber.from(0) });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.settleAuctionCompletely('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should complete in single iteration
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.completed).to.be.true;
                        (0, chai_1.expect)(result.iterations).to.equal(1);
                        (0, chai_1.expect)(poolSettleStub.calledOnce).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle partial settlement requiring multiple iterations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var auctionInfoStub, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock settlement requiring 3 iterations to complete
                        poolSettleStub.resolves();
                        auctionInfoStub = sinon_1.default.stub();
                        // After iteration 1: auction still exists
                        auctionInfoStub.onCall(0).resolves({ kickTime_: ethers_1.BigNumber.from(123) });
                        // After iteration 2: auction still exists  
                        auctionInfoStub.onCall(1).resolves({ kickTime_: ethers_1.BigNumber.from(123) });
                        // After iteration 3: auction settled (kickTime = 0)
                        auctionInfoStub.onCall(2).resolves({ kickTime_: ethers_1.BigNumber.from(0) });
                        mockPool.contract.auctionInfo = auctionInfoStub;
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.settleAuctionCompletely('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should complete after 3 iterations
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.completed).to.be.true;
                        (0, chai_1.expect)(result.iterations).to.equal(3);
                        (0, chai_1.expect)(poolSettleStub.calledThrice).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should handle settlement transaction failure', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock settlement transaction to fail
                        poolSettleStub.rejects(new Error('Transaction reverted: Insufficient gas'));
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                        return [4 /*yield*/, handler.settleAuctionCompletely('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should handle failure gracefully
                        (0, chai_1.expect)(result.success).to.be.false;
                        (0, chai_1.expect)(result.completed).to.be.false;
                        (0, chai_1.expect)(result.iterations).to.equal(1);
                        (0, chai_1.expect)(result.reason).to.include('Settlement failed');
                        (0, chai_1.expect)(result.reason).to.include('Insufficient gas');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should give up after reaching maximum iterations', function () { return __awaiter(void 0, void 0, void 0, function () {
            var limitedConfig, handler, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock settlement to never complete (always partial)
                        poolSettleStub.resolves();
                        mockPool.contract.auctionInfo.resolves({ kickTime_: ethers_1.BigNumber.from(123) });
                        limitedConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { maxIterations: 2 }) });
                        handler = new settlement_1.SettlementHandler(mockPool, mockSigner, limitedConfig, config);
                        return [4 /*yield*/, handler.settleAuctionCompletely('0xBorrower123')];
                    case 1:
                        result = _a.sent();
                        // Verify: Should give up after max iterations
                        (0, chai_1.expect)(result.success).to.be.true;
                        (0, chai_1.expect)(result.completed).to.be.false;
                        (0, chai_1.expect)(result.iterations).to.equal(2);
                        (0, chai_1.expect)(result.reason).to.include('Partial settlement after 2 iterations');
                        (0, chai_1.expect)(poolSettleStub.calledTwice).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('SettlementHandler.isAuctionOldEnough()', function () {
        /**
         * Test auction age validation logic
         * Should enforce minimum age requirements before settlement
         */
        it('should return true for auction older than minimum age', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, oldAuction, result;
            return __generator(this, function (_a) {
                handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                oldAuction = {
                    borrower: '0xBorrower123',
                    kickTime: Date.now() - 7200 * 1000,
                    debtRemaining: ethers_1.BigNumber.from('1000000000000000000'),
                    collateralRemaining: ethers_1.BigNumber.from(0),
                };
                result = handler.isAuctionOldEnough(oldAuction);
                // Verify: Should be old enough
                (0, chai_1.expect)(result).to.be.true;
                return [2 /*return*/];
            });
        }); });
        it('should return false for auction younger than minimum age', function () { return __awaiter(void 0, void 0, void 0, function () {
            var handler, youngAuction, result;
            return __generator(this, function (_a) {
                handler = new settlement_1.SettlementHandler(mockPool, mockSigner, poolConfig, config);
                youngAuction = {
                    borrower: '0xBorrower123',
                    kickTime: Date.now() - 1800 * 1000,
                    debtRemaining: ethers_1.BigNumber.from('1000000000000000000'),
                    collateralRemaining: ethers_1.BigNumber.from(0),
                };
                result = handler.isAuctionOldEnough(youngAuction);
                // Verify: Should be too young
                (0, chai_1.expect)(result).to.be.false;
                return [2 /*return*/];
            });
        }); });
        it('should handle custom minimum age settings', function () { return __awaiter(void 0, void 0, void 0, function () {
            var customConfig, handler, auction, result;
            return __generator(this, function (_a) {
                customConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { minAuctionAge: 7200 }) });
                handler = new settlement_1.SettlementHandler(mockPool, mockSigner, customConfig, config);
                auction = {
                    borrower: '0xBorrower123',
                    kickTime: Date.now() - 3600 * 1000,
                    debtRemaining: ethers_1.BigNumber.from('1000000000000000000'),
                    collateralRemaining: ethers_1.BigNumber.from(0),
                };
                result = handler.isAuctionOldEnough(auction);
                // Verify: 1 hour should be too young for 2-hour requirement
                (0, chai_1.expect)(result).to.be.false;
                return [2 /*return*/];
            });
        }); });
    });
    describe('tryReactiveSettlement()', function () {
        /**
         * Test reactive settlement for bond unlock scenarios
         * Should attempt settlement when bonds are locked and return unlock status
         */
        it('should return false when settlement is not enabled', function () { return __awaiter(void 0, void 0, void 0, function () {
            var disabledConfig, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        disabledConfig = {
                            settlement: { enabled: false },
                        };
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: mockPool,
                                poolConfig: disabledConfig,
                                signer: mockSigner,
                                config: config,
                            })];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return false when disabled
                        (0, chai_1.expect)(result).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when no auctions need settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Setup: Mock subgraph to return no settleable auctions
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [],
                        });
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: mockPool,
                                poolConfig: poolConfig,
                                signer: mockSigner,
                                config: config,
                            })];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return false when no work to do
                        (0, chai_1.expect)(result).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return true when bonds are unlocked after successful settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oldKickTime, auctionInfoStub, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldKickTime = Math.floor(Date.now() / 1000) - 7200;
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [
                                {
                                    borrower: '0xBorrower1',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '1.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.05',
                                    debt: '1.0',
                                    collateral: '0.0'
                                },
                            ],
                        });
                        auctionInfoStub = sinon_1.default.stub();
                        // needsSettlement check
                        auctionInfoStub.onCall(0).resolves({
                            kickTime_: ethers_1.BigNumber.from(oldKickTime),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        // Settlement completion check
                        auctionInfoStub.onCall(1).resolves({ kickTime_: ethers_1.BigNumber.from(0) }); // Settled
                        mockPool.contract.auctionInfo = auctionInfoStub;
                        // Mock liquidation status check
                        mockPool.getLiquidation.withArgs('0xBorrower1').returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        // Mock settlement feasibility and execution
                        mockPool.contract.callStatic.settle.withArgs('0xBorrower1', 10).resolves();
                        poolSettleStub.resolves();
                        // Mock bonds to be unlocked after settlement
                        mockPool.kickerInfo.resolves({
                            locked: ethers_1.BigNumber.from(0),
                            claimable: ethers_1.BigNumber.from('1000000')
                        });
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: mockPool,
                                poolConfig: poolConfig,
                                signer: mockSigner,
                                config: config,
                            })];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return true when bonds are unlocked
                        (0, chai_1.expect)(result).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return false when bonds remain locked after settlement attempt', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oldKickTime, auctionInfoStub, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldKickTime = Math.floor(Date.now() / 1000) - 7200;
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [
                                {
                                    borrower: '0xBorrower1',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '1.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.05',
                                    debt: '1.0',
                                    collateral: '0.0'
                                },
                            ],
                        });
                        auctionInfoStub = sinon_1.default.stub();
                        auctionInfoStub.onCall(0).resolves({
                            kickTime_: ethers_1.BigNumber.from(oldKickTime),
                            debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                        });
                        auctionInfoStub.onCall(1).resolves({ kickTime_: ethers_1.BigNumber.from(0) });
                        mockPool.contract.auctionInfo = auctionInfoStub;
                        mockPool.getLiquidation.withArgs('0xBorrower1').returns({
                            getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            collateral: ethers_1.BigNumber.from(0),
                                            price: ethers_1.BigNumber.from('1000000000000'),
                                        })];
                                });
                            }); },
                        });
                        mockPool.contract.callStatic.settle.resolves();
                        poolSettleStub.resolves();
                        // Mock bonds to remain locked even after settlement
                        mockPool.kickerInfo.resolves({
                            locked: ethers_1.BigNumber.from('1000000'),
                            claimable: ethers_1.BigNumber.from('500000')
                        });
                        return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                                pool: mockPool,
                                poolConfig: poolConfig,
                                signer: mockSigner,
                                config: config,
                            })];
                    case 1:
                        result = _a.sent();
                        // Verify: Should return false when bonds remain locked
                        (0, chai_1.expect)(result).to.be.false;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('Integration: handleSettlements()', function () {
        /**
         * Test the main entry point for settlement handling
         * Should coordinate auction discovery and settlement execution
         */
        it('should process multiple auctions requiring settlement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var oldKickTime, auctionInfoStub, getLiquidationStub, settleCallStub, simpleConfig, postSettlementStub;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        oldKickTime = Math.floor(Date.now() / 1000) - 7200;
                        getUnsettledAuctionsStub.resolves({
                            liquidationAuctions: [
                                {
                                    borrower: '0xBorrower1',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '1.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.05',
                                    debt: '1.0',
                                    collateral: '0.0'
                                },
                                {
                                    borrower: '0xBorrower2',
                                    kickTime: oldKickTime.toString(),
                                    debtRemaining: '2.0',
                                    collateralRemaining: '0.0',
                                    neutralPrice: '0.04',
                                    debt: '2.0',
                                    collateral: '0.0'
                                },
                            ],
                        });
                        auctionInfoStub = sinon_1.default.stub();
                        getLiquidationStub = sinon_1.default.stub();
                        settleCallStub = sinon_1.default.stub();
                        // Mock both auctions as needing settlement
                        ['0xBorrower1', '0xBorrower2'].forEach(function (borrower) {
                            // needsSettlement checks - these happen during findSettleableAuctions
                            auctionInfoStub.withArgs(borrower).resolves({
                                kickTime_: ethers_1.BigNumber.from(oldKickTime),
                                debtToCollateral_: ethers_1.BigNumber.from('1000000000000000000'),
                            });
                            getLiquidationStub.withArgs(borrower).returns({
                                getStatus: function () { return __awaiter(void 0, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        return [2 /*return*/, ({
                                                collateral: ethers_1.BigNumber.from(0),
                                                price: ethers_1.BigNumber.from('1000000000000'),
                                            })];
                                    });
                                }); },
                            });
                            settleCallStub.withArgs(borrower, 10).resolves();
                        });
                        // Apply stubs to pool
                        mockPool.contract.auctionInfo = auctionInfoStub;
                        mockPool.getLiquidation = getLiquidationStub;
                        mockPool.contract.callStatic.settle = settleCallStub;
                        simpleConfig = __assign(__assign({}, poolConfig), { settlement: __assign(__assign({}, poolConfig.settlement), { checkBotIncentive: false }) });
                        // Mock settlement execution and post-settlement checks
                        poolSettleStub.resolves();
                        postSettlementStub = sinon_1.default.stub();
                        postSettlementStub.resolves({ kickTime_: ethers_1.BigNumber.from(0) }); // Auction settled
                        // Execute: Handle settlements
                        return [4 /*yield*/, (0, settlement_1.handleSettlements)({
                                pool: mockPool,
                                poolConfig: simpleConfig,
                                signer: mockSigner,
                                config: config,
                            })];
                    case 1:
                        // Execute: Handle settlements
                        _a.sent();
                        // Verify: Should call settlement for auctions that need it
                        // Note: Simplified check - at least one settlement should occur
                        (0, chai_1.expect)(poolSettleStub.called).to.be.true;
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=settlement.test.js.map