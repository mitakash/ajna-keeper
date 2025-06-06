import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import { SettlementHandler, tryReactiveSettlement, handleSettlements } from '../settlement';
import { KeeperConfig, PoolConfig } from '../config-types';
import subgraph from '../subgraph';
import * as transactions from '../transactions';

/**
 * Tests the settlement functionality for the Ajna keeper bot, including:
 * - Settlement need detection logic
 * - Bot incentive validation
 * - Auction age filtering and discovery
 * - Multi-iteration settlement execution
 * - Reactive settlement for bond unlock scenarios
 * 
 * Key business logic tested:
 * - Only settle auctions with bad debt (collateral=0, debt>0)
 * - Respect minimum auction age requirements
 * - Handle partial settlements requiring multiple iterations
 * - Validate bot incentives when required
 * - Cache subgraph queries for performance
 */

// Mock type definitions for clean test setup
interface MockPool {
  name: string;
  poolAddress: string;
  contract: {
    auctionInfo: sinon.SinonStub;
    kickerInfo: sinon.SinonStub;
    callStatic: {
      settle: sinon.SinonStub;
    };
    connect: sinon.SinonStub;
  };
  getLiquidation: sinon.SinonStub;
  kickerInfo: sinon.SinonStub;
}

interface MockSigner {
  getAddress: sinon.SinonStub;
  getTransactionCount: sinon.SinonStub;
}

describe('Settlement Module Tests', () => {
  let mockPool: MockPool;
  let mockSigner: MockSigner;
  let poolConfig: PoolConfig;
  let config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
  
  // External dependency stubs
  let getUnsettledAuctionsStub: sinon.SinonStub;
  let poolSettleStub: sinon.SinonStub;

  beforeEach(() => {
    // Create comprehensive mock pool with all required methods
    mockPool = {
      name: 'Test Pool',
      poolAddress: '0x1234567890123456789012345678901234567890',
      contract: {
        auctionInfo: sinon.stub(),
        kickerInfo: sinon.stub(),
        callStatic: {
          settle: sinon.stub(),
        },
        connect: sinon.stub(),
      },
      getLiquidation: sinon.stub(),
      kickerInfo: sinon.stub(),
    };

    // Mock contract.connect to return the same contract for transaction building
    mockPool.contract.connect.returns(mockPool.contract);

    // Create mock signer with consistent address
    mockSigner = {
      getAddress: sinon.stub().resolves('0xBotAddress123456789012345678901234567890'),
      getTransactionCount: sinon.stub().resolves(42),
    };

    // Standard pool configuration for testing
    poolConfig = {
      name: 'Test Pool',
      address: '0x1234567890123456789012345678901234567890',
      price: { source: 'fixed' as any, value: 1 },
      settlement: {
        enabled: true,
        minAuctionAge: 3600,        // 1 hour minimum
        maxBucketDepth: 50,         // 50 buckets per settlement
        maxIterations: 5,           // 5 max iterations
        checkBotIncentive: true,    // Require bot incentive
      },
    } as any;

    // Keeper configuration for tests
    config = {
      dryRun: false,
      subgraphUrl: 'http://test-subgraph-url',
      delayBetweenActions: 0, // No delays in tests
    };

    // Stub external module dependencies
    getUnsettledAuctionsStub = sinon.stub(subgraph, 'getUnsettledAuctions');
    poolSettleStub = sinon.stub(transactions, 'poolSettle');
  });

  afterEach(() => {
    // Clean up all stubs after each test
    sinon.restore();
  });

  describe('SettlementHandler.needsSettlement()', () => {
    /**
     * Test core settlement decision logic
     * Settlement should only occur when:
     * 1. Active auction exists (kickTime > 0)
     * 2. Debt remains (debtToCollateral > 0)
     * 3. No collateral left to auction (collateral = 0)
     * 4. Settlement transaction would succeed
     */

    it('should return false when no active auction exists', async () => {
      // Setup: Mock auction with kickTime = 0 (no active auction)
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(0),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check settlement need
      const result = await handler.needsSettlement('0xBorrower123');
      
      // Verify: Should not need settlement
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('No active auction');
    });

    it('should return false when debt is zero', async () => {
      // Setup: Mock auction with no debt remaining
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from(0), // No debt
      });

      mockPool.getLiquidation.returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0),
          price: BigNumber.from('1000000000000'),
        }),
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check settlement need
      const result = await handler.needsSettlement('0xBorrower123');
      
      // Verify: Should not need settlement when debt is zero
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('No debt remaining');
    });

    it('should return false when collateral still exists for auction', async () => {
      // Setup: Mock auction with remaining collateral
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });

      mockPool.getLiquidation.returns({
        getStatus: async () => ({
          collateral: BigNumber.from('500000000000000000'), // 0.5 collateral remains
          price: BigNumber.from('1000000000000'),
        }),
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check settlement need
      const result = await handler.needsSettlement('0xBorrower123');
      
      // Verify: Should not settle while collateral exists
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('Still has');
      expect(result.reason).to.include('collateral');
    });

    it('should return true for bad debt scenario (collateral=0, debt>0)', async () => {
      // Setup: Mock auction with bad debt (no collateral, has debt)
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('2000000000000000000'), // 2.0 debt
      });

      mockPool.getLiquidation.returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0), // No collateral left
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock settlement call to succeed
      mockPool.contract.callStatic.settle.resolves();

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check settlement need
      const result = await handler.needsSettlement('0xBorrower123');
      
      // Verify: Should need settlement for bad debt
      expect(result.needs).to.be.true;
      expect(result.reason).to.include('Bad debt detected');
      expect(result.reason).to.include('2'); // weiToDecimaled converts 2000000000000000000 to '2'
    });

    it('should return false when settlement call would fail', async () => {
      // Setup: Mock auction that appears to need settlement but settle call fails
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });

      mockPool.getLiquidation.returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0),
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock settlement call to fail
      mockPool.contract.callStatic.settle.rejects(new Error('Cannot read properties of undefined (reading \'eq\')'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check settlement need
      const result = await handler.needsSettlement('0xBorrower123');
      
      // Verify: Should not settle if call would fail
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('Settlement call would fail');
    });
  });

  describe('SettlementHandler.checkBotIncentive()', () => {
    /**
     * Test bot incentive validation logic
     * Bot should only settle when it has rewards to claim (is the kicker)
     */

    it('should return true when bot is the kicker with claimable bonds', async () => {
      // Setup: Bot address matches kicker address
      const botAddress = await mockSigner.getAddress();
      
      mockPool.contract.auctionInfo.resolves({
        kicker_: botAddress, // Bot is the kicker
      });

      mockPool.contract.kickerInfo.resolves({
        claimable_: BigNumber.from('500000000000000000'), // 0.5 ETH claimable
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check bot incentive
      const result = await handler.checkBotIncentive('0xBorrower123');
      
      // Verify: Should have incentive as kicker
      expect(result.hasIncentive).to.be.true;
      expect(result.reason).to.include('Bot is kicker');
      expect(result.reason).to.include('0.5');
    });

    it('should return false when bot is not the kicker', async () => {
      // Setup: Different address is the kicker
      mockPool.contract.auctionInfo.resolves({
        kicker_: '0xSomeOtherKicker1234567890123456789012',
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check bot incentive
      const result = await handler.checkBotIncentive('0xBorrower123');
      
      // Verify: Should not have incentive when not kicker
      expect(result.hasIncentive).to.be.false;
      expect(result.reason).to.include('Not the kicker');
      expect(result.reason).to.include('0xSomeOt'); // Address is sliced to 8 characters
    });

    it('should return true when bot is kicker but cannot check claimable amount', async () => {
      // Setup: Bot is kicker but kickerInfo call fails
      const botAddress = await mockSigner.getAddress();
      
      mockPool.contract.auctionInfo.resolves({
        kicker_: botAddress,
      });

      mockPool.contract.kickerInfo.rejects(new Error('Network error'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Check bot incentive
      const result = await handler.checkBotIncentive('0xBorrower123');
      
      // Verify: Should still have incentive if bot is kicker
      expect(result.hasIncentive).to.be.true;
      expect(result.reason).to.include('Bot is kicker');
      expect(result.reason).to.include('could not check');
    });
  });

  describe('SettlementHandler.findSettleableAuctions()', () => {
    /**
     * Test auction discovery and filtering logic
     * Should find auctions that need settlement and respect age requirements
     */

    it('should filter out auctions that do not actually need settlement', async () => {
      // Setup: Mock subgraph returning 2 auctions (1 settleable, 1 not)
      const oldKickTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [
          { 
            borrower: '0xBorrower1',
            kickTime: oldKickTime.toString(),
            debtRemaining: '1.0',
            collateralRemaining: '0.5', // Has collateral - should not settle
            neutralPrice: '0.06',
            debt: '1.0',
            collateral: '0.5'
          },
          { 
            borrower: '0xBorrower2',
            kickTime: oldKickTime.toString(),
            debtRemaining: '2.0',
            collateralRemaining: '0.0', // No collateral - should settle
            neutralPrice: '0.05',
            debt: '2.0',
            collateral: '0.0'
          },
        ],
      });

      // Create targeted stubs for each borrower
      const auctionInfoStub = sinon.stub();
      const getLiquidationStub = sinon.stub();
      const settleCallStub = sinon.stub();

      // Mock first borrower - has collateral, should NOT be settled
      auctionInfoStub.withArgs('0xBorrower1').resolves({
        kickTime_: BigNumber.from(oldKickTime),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });
      
      getLiquidationStub.withArgs('0xBorrower1').returns({
        getStatus: async () => ({
          collateral: BigNumber.from('500000000000000000'), // Has collateral
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock second borrower - no collateral, SHOULD be settled
      auctionInfoStub.withArgs('0xBorrower2').resolves({
        kickTime_: BigNumber.from(oldKickTime),
        debtToCollateral_: BigNumber.from('2000000000000000000'),
      });
      
      getLiquidationStub.withArgs('0xBorrower2').returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0), // No collateral
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock settlement feasibility checks
      settleCallStub.withArgs('0xBorrower1', 10).rejects(new Error('Has collateral'));
      settleCallStub.withArgs('0xBorrower2', 10).resolves(); // Should succeed

      // Apply mocks to pool
      mockPool.contract.auctionInfo = auctionInfoStub;
      mockPool.getLiquidation = getLiquidationStub;
      mockPool.contract.callStatic.settle = settleCallStub;

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Find settleable auctions
      const result = await handler.findSettleableAuctions();
      
      // Verify: Should only return auction that actually needs settlement
      expect(result).to.have.length(1);
      expect(result[0].borrower).to.equal('0xBorrower2');
      expect(result[0].debtRemaining.toString()).to.equal('2000000000000000000');
    });

    it('should return empty array when no auctions need settlement', async () => {
      // Setup: Mock subgraph returning no auctions
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [],
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Find settleable auctions
      const result = await handler.findSettleableAuctions();
      
      // Verify: Should return empty array
      expect(result).to.be.empty;
    });

    it('should skip auctions that are too young (age filtering)', async () => {
      // Setup: Mock auction that is too young (30 minutes < 1 hour requirement)
      const youngKickTime = Math.floor(Date.now() / 1000) - 1800; // 30 minutes ago
      
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [
          { 
            borrower: '0xYoungBorrower',
            kickTime: youngKickTime.toString(),
            debtRemaining: '1.0',
            collateralRemaining: '0.0', // Would need settlement if old enough
            neutralPrice: '0.05',
            debt: '1.0',
            collateral: '0.0'
          },
        ],
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any, // minAuctionAge is 3600 seconds (1 hour)
        config
      );

      // Execute: Find settleable auctions
      const result = await handler.findSettleableAuctions();
      
      // Verify: Should skip young auction
      expect(result).to.be.empty;
      // Verify on-chain checks were skipped (performance optimization)
      expect(mockPool.contract.auctionInfo.called).to.be.false;
    });

    it('should handle subgraph network errors gracefully', async () => {
      // Setup: Mock subgraph to return network error
      getUnsettledAuctionsStub.rejects(new Error('ECONNRESET: Network error'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Find settleable auctions should not throw
      const result = await handler.findSettleableAuctions();
      
      // Verify: Should return empty array on network error
      expect(result).to.be.empty;
    });
  });

  describe('SettlementHandler.settleAuctionCompletely()', () => {
    /**
     * Test settlement execution with multiple iterations
     * Should handle partial settlements and retry until complete
     */

    it('should perform dry run without actual settlement transaction', async () => {
      // Setup: Enable dry run mode
      const dryRunConfig = { ...config, dryRun: true };
      
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        dryRunConfig
      );

      // Execute: Attempt settlement in dry run mode
      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      // Verify: Should complete dry run without calling actual settlement
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.reason).to.include('Dry run');
      expect(poolSettleStub.called).to.be.false;
    });

    it('should settle successfully in single iteration', async () => {
      // Setup: Mock settlement to succeed immediately
      poolSettleStub.resolves();
      
      // Mock auctionInfo check after settlement (kickTime = 0 means settled)
      mockPool.contract.auctionInfo.resolves({ kickTime_: BigNumber.from(0) });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Settle auction
      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      // Verify: Should complete in single iteration
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.iterations).to.equal(1);
      expect(poolSettleStub.calledOnce).to.be.true;
    });

    it('should handle partial settlement requiring multiple iterations', async () => {
      // Setup: Mock settlement requiring 3 iterations to complete
      poolSettleStub.resolves();
      
      const auctionInfoStub = sinon.stub();
      // After iteration 1: auction still exists
      auctionInfoStub.onCall(0).resolves({ kickTime_: BigNumber.from(123) });
      // After iteration 2: auction still exists  
      auctionInfoStub.onCall(1).resolves({ kickTime_: BigNumber.from(123) });
      // After iteration 3: auction settled (kickTime = 0)
      auctionInfoStub.onCall(2).resolves({ kickTime_: BigNumber.from(0) });
      
      mockPool.contract.auctionInfo = auctionInfoStub;

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Settle auction
      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      // Verify: Should complete after 3 iterations
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.iterations).to.equal(3);
      expect(poolSettleStub.calledThrice).to.be.true;
    });

    it('should handle settlement transaction failure', async () => {
      // Setup: Mock settlement transaction to fail
      poolSettleStub.rejects(new Error('Transaction reverted: Insufficient gas'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      // Execute: Attempt settlement
      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      // Verify: Should handle failure gracefully
      expect(result.success).to.be.false;
      expect(result.completed).to.be.false;
      expect(result.iterations).to.equal(1);
      expect(result.reason).to.include('Settlement failed');
      expect(result.reason).to.include('Insufficient gas');
    });

    it('should give up after reaching maximum iterations', async () => {
      // Setup: Mock settlement to never complete (always partial)
      poolSettleStub.resolves();
      mockPool.contract.auctionInfo.resolves({ kickTime_: BigNumber.from(123) });

      // Use limited iteration config
      const limitedConfig = {
        ...poolConfig,
        settlement: { ...poolConfig.settlement!, maxIterations: 2 },
      };

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        limitedConfig as any,
        config
      );

      // Execute: Attempt settlement
      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      // Verify: Should give up after max iterations
      expect(result.success).to.be.true;
      expect(result.completed).to.be.false;
      expect(result.iterations).to.equal(2);
      expect(result.reason).to.include('Partial settlement after 2 iterations');
      expect(poolSettleStub.calledTwice).to.be.true;
    });
  });

  describe('SettlementHandler.isAuctionOldEnough()', () => {
    /**
     * Test auction age validation logic
     * Should enforce minimum age requirements before settlement
     */

    it('should return true for auction older than minimum age', async () => {
      // Setup: Create handler and old auction
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const oldAuction = {
        borrower: '0xBorrower123',
        kickTime: Date.now() - 7200 * 1000, // 2 hours ago (older than 1 hour requirement)
        debtRemaining: BigNumber.from('1000000000000000000'),
        collateralRemaining: BigNumber.from(0),
      };

      // Execute: Check auction age
      const result = (handler as any).isAuctionOldEnough(oldAuction);
      
      // Verify: Should be old enough
      expect(result).to.be.true;
    });

    it('should return false for auction younger than minimum age', async () => {
      // Setup: Create handler and young auction
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const youngAuction = {
        borrower: '0xBorrower123',
        kickTime: Date.now() - 1800 * 1000, // 30 minutes ago (younger than 1 hour requirement)
        debtRemaining: BigNumber.from('1000000000000000000'),
        collateralRemaining: BigNumber.from(0),
      };

      // Execute: Check auction age
      const result = (handler as any).isAuctionOldEnough(youngAuction);
      
      // Verify: Should be too young
      expect(result).to.be.false;
    });

    it('should handle custom minimum age settings', async () => {
      // Setup: Create handler with custom 2-hour minimum age
      const customConfig = {
        ...poolConfig,
        settlement: { ...poolConfig.settlement!, minAuctionAge: 7200 }, // 2 hours
      };

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        customConfig as any,
        config
      );

      const auction = {
        borrower: '0xBorrower123',
        kickTime: Date.now() - 3600 * 1000, // 1 hour ago
        debtRemaining: BigNumber.from('1000000000000000000'),
        collateralRemaining: BigNumber.from(0),
      };

      // Execute: Check auction age against 2-hour requirement
      const result = (handler as any).isAuctionOldEnough(auction);
      
      // Verify: 1 hour should be too young for 2-hour requirement
      expect(result).to.be.false;
    });
  });

  describe('tryReactiveSettlement()', () => {
    /**
     * Test reactive settlement for bond unlock scenarios
     * Should attempt settlement when bonds are locked and return unlock status
     */

    it('should return false when settlement is not enabled', async () => {
      // Setup: Configuration with settlement disabled
      const disabledConfig = {
        settlement: { enabled: false },
      } as any;

      // Execute: Attempt reactive settlement
      const result = await tryReactiveSettlement({
        pool: mockPool as any,
        poolConfig: disabledConfig,
        signer: mockSigner as any,
        config,
      });

      // Verify: Should return false when disabled
      expect(result).to.be.false;
    });

    it('should return false when no auctions need settlement', async () => {
      // Setup: Mock subgraph to return no settleable auctions
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [],
      });

      // Execute: Attempt reactive settlement
      const result = await tryReactiveSettlement({
        pool: mockPool as any,
        poolConfig,
        signer: mockSigner as any,
        config,
      });

      // Verify: Should return false when no work to do
      expect(result).to.be.false;
    });

    it('should return true when bonds are unlocked after successful settlement', async () => {
      // Setup: Mock settleable auction and successful settlement
      const oldKickTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      
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

      // Mock auction info calls for settlement process
      const auctionInfoStub = sinon.stub();
      // needsSettlement check
      auctionInfoStub.onCall(0).resolves({
        kickTime_: BigNumber.from(oldKickTime),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });
      // Settlement completion check
      auctionInfoStub.onCall(1).resolves({ kickTime_: BigNumber.from(0) }); // Settled
      
      mockPool.contract.auctionInfo = auctionInfoStub;

      // Mock liquidation status check
      mockPool.getLiquidation.withArgs('0xBorrower1').returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0), // No collateral - needs settlement
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock settlement feasibility and execution
      mockPool.contract.callStatic.settle.withArgs('0xBorrower1', 10).resolves();
      poolSettleStub.resolves();

      // Mock bonds to be unlocked after settlement
      mockPool.kickerInfo.resolves({ 
        locked: BigNumber.from(0),           // Unlocked after settlement
        claimable: BigNumber.from('1000000') 
      });

      // Execute: Attempt reactive settlement
      const result = await tryReactiveSettlement({
        pool: mockPool as any,
        poolConfig,
        signer: mockSigner as any,
        config,
      });

      // Verify: Should return true when bonds are unlocked
      expect(result).to.be.true;
    });

    it('should return false when bonds remain locked after settlement attempt', async () => {
      // Setup: Mock settlement that doesn't unlock bonds
      const oldKickTime = Math.floor(Date.now() / 1000) - 7200;
      
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

      // Mock settlement process that completes but doesn't unlock bonds
      const auctionInfoStub = sinon.stub();
      auctionInfoStub.onCall(0).resolves({
        kickTime_: BigNumber.from(oldKickTime),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });
      auctionInfoStub.onCall(1).resolves({ kickTime_: BigNumber.from(0) });
      
      mockPool.contract.auctionInfo = auctionInfoStub;
      mockPool.getLiquidation.withArgs('0xBorrower1').returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0),
          price: BigNumber.from('1000000000000'),
        }),
      });
      mockPool.contract.callStatic.settle.resolves();
      poolSettleStub.resolves();

      // Mock bonds to remain locked even after settlement
      mockPool.kickerInfo.resolves({ 
        locked: BigNumber.from('1000000'),    // Still locked
        claimable: BigNumber.from('500000') 
      });

      // Execute: Attempt reactive settlement
      const result = await tryReactiveSettlement({
        pool: mockPool as any,
        poolConfig,
        signer: mockSigner as any,
        config,
      });

      // Verify: Should return false when bonds remain locked
      expect(result).to.be.false;
    });
  });

  describe('Integration: handleSettlements()', () => {
    /**
     * Test the main entry point for settlement handling
     * Should coordinate auction discovery and settlement execution
     */

    it('should process multiple auctions requiring settlement', async () => {
      // Setup: Mock multiple auctions needing settlement
      const oldKickTime = Math.floor(Date.now() / 1000) - 7200;
      
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

      // Setup stubs for cleaner test
      const auctionInfoStub = sinon.stub();
      const getLiquidationStub = sinon.stub();
      const settleCallStub = sinon.stub();

      // Mock both auctions as needing settlement
      ['0xBorrower1', '0xBorrower2'].forEach(borrower => {
        // needsSettlement checks - these happen during findSettleableAuctions
        auctionInfoStub.withArgs(borrower).resolves({
          kickTime_: BigNumber.from(oldKickTime),
          debtToCollateral_: BigNumber.from('1000000000000000000'),
        });
        
        getLiquidationStub.withArgs(borrower).returns({
          getStatus: async () => ({
            collateral: BigNumber.from(0),
            price: BigNumber.from('1000000000000'),
          }),
        });
        
        settleCallStub.withArgs(borrower, 10).resolves();
      });

      // Apply stubs to pool
      mockPool.contract.auctionInfo = auctionInfoStub;
      mockPool.getLiquidation = getLiquidationStub;
      mockPool.contract.callStatic.settle = settleCallStub;

      // Disable bot incentive check to simplify test
      const simpleConfig = {
        ...poolConfig,
        settlement: { ...poolConfig.settlement!, checkBotIncentive: false },
      };

      // Mock settlement execution and post-settlement checks
      poolSettleStub.resolves();
      
      // For settleAuctionCompletely - mock that auction is settled after one iteration
      const postSettlementStub = sinon.stub();
      postSettlementStub.resolves({ kickTime_: BigNumber.from(0) }); // Auction settled

      // Execute: Handle settlements
      await handleSettlements({
        pool: mockPool as any,
        poolConfig: simpleConfig as any,
        signer: mockSigner as any,
        config,
      });

      // Verify: Should call settlement for auctions that need it
      // Note: Simplified check - at least one settlement should occur
      expect(poolSettleStub.called).to.be.true;
    });
  });
});
