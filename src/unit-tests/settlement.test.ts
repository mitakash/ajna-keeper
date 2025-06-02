import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import { SettlementHandler, tryReactiveSettlement } from '../settlement';
import { KeeperConfig, PoolConfig } from '../config-types';
import subgraph from '../subgraph';
import * as transactions from '../transactions';

// Mock types
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

describe('SettlementHandler Unit Tests', () => {
  let mockPool: MockPool;
  let mockSigner: MockSigner;
  let poolConfig: PoolConfig;
  let config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
  
  let getUnsettledAuctionsStub: sinon.SinonStub;
  let poolSettleStub: sinon.SinonStub;

  beforeEach(() => {
    // Create mock pool
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

    // Mock contract.connect to return itself
    mockPool.contract.connect.returns(mockPool.contract);

    // Create mock signer
    mockSigner = {
      getAddress: sinon.stub().resolves('0xBotAddress123456789012345678901234567890'),
      getTransactionCount: sinon.stub().resolves(10),
    };

    // Create test configs
    poolConfig = {
      name: 'Test Pool',
      address: '0x1234567890123456789012345678901234567890',
      price: { source: 'fixed' as any, value: 1 },
      settlement: {
        enabled: true,
        minAuctionAge: 3600,
        maxBucketDepth: 50,
        maxIterations: 5,
        checkBotIncentive: true,
      },
    } as any;

    config = {
      dryRun: false,
      subgraphUrl: 'http://mock-subgraph',
      delayBetweenActions: 0,
    };

    // Stub external dependencies
    getUnsettledAuctionsStub = sinon.stub(subgraph, 'getUnsettledAuctions');
    poolSettleStub = sinon.stub(transactions, 'poolSettle');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('needsSettlement', () => {
    it('should return false when no active auction exists', async () => {
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

      const result = await handler.needsSettlement('0xBorrower123');
      
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('No active auction');
    });

    it('should return false when debt is zero', async () => {
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from(0),
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

      const result = await handler.needsSettlement('0xBorrower123');
      
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('No debt remaining');
    });

    it('should return false when collateral still exists', async () => {
      mockPool.contract.auctionInfo.resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });

      mockPool.getLiquidation.returns({
        getStatus: async () => ({
          collateral: BigNumber.from('500000000000000000'),
          price: BigNumber.from('1000000000000'),
        }),
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.needsSettlement('0xBorrower123');
      
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('Still has');
      expect(result.reason).to.include('collateral');
    });

    it('should return true for bad debt (collateral=0, debt>0)', async () => {
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

      mockPool.contract.callStatic.settle.resolves();

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.needsSettlement('0xBorrower123');
      
      expect(result.needs).to.be.true;
      expect(result.reason).to.include('Bad debt detected');
    });

    it('should return false when settle call would fail', async () => {
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

      mockPool.contract.callStatic.settle.rejects(new Error('Settlement would fail'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.needsSettlement('0xBorrower123');
      
      expect(result.needs).to.be.false;
      expect(result.reason).to.include('Settlement call would fail');
    });
  });

  describe('checkBotIncentive', () => {
    it('should return true when bot is the kicker', async () => {
      const botAddress = await mockSigner.getAddress();
      
      mockPool.contract.auctionInfo.resolves({
        kicker_: botAddress,
      });

      mockPool.contract.kickerInfo.resolves({
        claimable_: BigNumber.from('500000000000000000'),
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.checkBotIncentive('0xBorrower123');
      
      expect(result.hasIncentive).to.be.true;
      expect(result.reason).to.include('Bot is kicker');
    });

    it('should return false when bot is not the kicker', async () => {
      const botAddress = await mockSigner.getAddress();
      
      mockPool.contract.auctionInfo.resolves({
        kicker_: '0xSomeOtherAddress1234567890123456789012',
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.checkBotIncentive('0xBorrower123');
      
      expect(result.hasIncentive).to.be.false;
      expect(result.reason).to.include('Not the kicker');
    });
  });

  describe('findSettleableAuctions', () => {
    it('should filter out auctions that do not need settlement', async () => {
      // Mock subgraph returning 2 auctions
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [
          { 
            borrower: '0xBorrower1',
            kickTime: '1000000',
            debtRemaining: '1.0',
            collateralRemaining: '0.5',
            neutralPrice: '0.06',
            debt: '1.0',
            collateral: '0.5'
          },
          { 
            borrower: '0xBorrower2',
            kickTime: '1000000',
            debtRemaining: '2.0',
            collateralRemaining: '0.0',
            neutralPrice: '0.05',
            debt: '2.0',
            collateral: '0.0'
          },
        ],
      });

      // Create separate stubs for each borrower to avoid call count issues
      const auctionInfoStub = sinon.stub();
      const getLiquidationStub = sinon.stub();
      const settleCallStub = sinon.stub();

      // Mock first borrower (0xBorrower1) - has collateral, should NOT be settled
      auctionInfoStub.withArgs('0xBorrower1').resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('1000000000000000000'),
      });
      
      getLiquidationStub.withArgs('0xBorrower1').returns({
        getStatus: async () => ({
          collateral: BigNumber.from('500000000000000000'), // Has collateral
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Mock second borrower (0xBorrower2) - no collateral, SHOULD be settled
      auctionInfoStub.withArgs('0xBorrower2').resolves({
        kickTime_: BigNumber.from(Math.floor(Date.now() / 1000)),
        debtToCollateral_: BigNumber.from('2000000000000000000'),
      });
      
      getLiquidationStub.withArgs('0xBorrower2').returns({
        getStatus: async () => ({
          collateral: BigNumber.from(0), // No collateral
          price: BigNumber.from('1000000000000'),
        }),
      });

      // Make sure second borrower's settle call SUCCEEDS
      settleCallStub.withArgs('0xBorrower1', 10).rejects(new Error('Not settleable'));
      settleCallStub.withArgs('0xBorrower2', 10).resolves(); // Should succeed

      // Replace the mocks
      mockPool.contract.auctionInfo = auctionInfoStub;
      mockPool.getLiquidation = getLiquidationStub;
      mockPool.contract.callStatic.settle = settleCallStub;

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.findSettleableAuctions();
      
      expect(result).to.have.length(1);
      expect(result[0].borrower).to.equal('0xBorrower2');
    });

    it('should return empty array when no auctions need settlement', async () => {
      getUnsettledAuctionsStub.resolves({
        liquidationAuctions: [],
      });

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.findSettleableAuctions();
      
      expect(result).to.be.empty;
    });
  });

  describe('settleAuctionCompletely', () => {
    it('should perform dry run without actual settlement', async () => {
      const dryRunConfig = { ...config, dryRun: true };
      
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        dryRunConfig
      );

      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.reason).to.include('Dry run');
      expect(poolSettleStub.called).to.be.false;
    });

    it('should settle successfully in single iteration', async () => {
      poolSettleStub.resolves();
      
      // FIXED: auctionInfo is called AFTER each settlement attempt
      // For single iteration success: first call after settlement should return kickTime = 0
      const auctionInfoStub = sinon.stub();
      auctionInfoStub.onCall(0).resolves({ kickTime_: BigNumber.from(0) }); // After iteration 1 (SUCCESS)
      
      mockPool.contract.auctionInfo = auctionInfoStub;

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.iterations).to.equal(1);
      expect(poolSettleStub.calledOnce).to.be.true;
    });

    it('should handle partial settlement requiring multiple iterations', async () => {
      poolSettleStub.resolves();
      
      // FIXED: Set up the exact call sequence for 3 iterations
      // auctionInfo is called after each settlement attempt
      const auctionInfoStub = sinon.stub();
      auctionInfoStub.onCall(0).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 1 (still exists)
      auctionInfoStub.onCall(1).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 2 (still exists)  
      auctionInfoStub.onCall(2).resolves({ kickTime_: BigNumber.from(0) });   // After iteration 3 (SUCCESS)
      
      mockPool.contract.auctionInfo = auctionInfoStub;

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      expect(result.success).to.be.true;
      expect(result.completed).to.be.true;
      expect(result.iterations).to.equal(3);
      expect(poolSettleStub.calledThrice).to.be.true;
    });

    it('should handle settlement failure', async () => {
      poolSettleStub.rejects(new Error('Settlement transaction failed'));

      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      expect(result.success).to.be.false;
      expect(result.completed).to.be.false;
      expect(result.iterations).to.equal(1);
      expect(result.reason).to.include('Settlement failed');
    });

    it('should give up after max iterations', async () => {
      poolSettleStub.resolves();
      
      // Always return non-zero kickTime to simulate never completing
      mockPool.contract.auctionInfo.resolves({ kickTime_: BigNumber.from(123) });

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

      const result = await handler.settleAuctionCompletely('0xBorrower123');
      
      expect(result.success).to.be.true;
      expect(result.completed).to.be.false;
      expect(result.iterations).to.equal(2);
      expect(result.reason).to.include('Partial settlement after 2 iterations');
    });
  });

  describe('isAuctionOldEnough', () => {
    it('should return true for auction older than minimum age', async () => {
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const oldAuction = {
        borrower: '0xBorrower123',
        kickTime: Date.now() - 7200 * 1000, // 2 hours ago
        debtRemaining: BigNumber.from('1000000000000000000'),
        collateralRemaining: BigNumber.from(0),
      };

      const result = (handler as any).isAuctionOldEnough(oldAuction);
      
      expect(result).to.be.true;
    });

    it('should return false for auction younger than minimum age', async () => {
      const handler = new SettlementHandler(
        mockPool as any,
        mockSigner as any,
        poolConfig as any,
        config
      );

      const youngAuction = {
        borrower: '0xBorrower123',
        kickTime: Date.now() - 1800 * 1000, // 30 minutes ago
        debtRemaining: BigNumber.from('1000000000000000000'),
        collateralRemaining: BigNumber.from(0),
      };

      const result = (handler as any).isAuctionOldEnough(youngAuction);
      
      expect(result).to.be.false;
    });
  });
});

describe('tryReactiveSettlement', () => {
  let mockPool: MockPool;
  let mockSigner: MockSigner;
  let poolConfig: PoolConfig;
  let config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
  let getUnsettledAuctionsStub: sinon.SinonStub;
  let poolSettleStub: sinon.SinonStub;

  beforeEach(() => {
    mockPool = {
      name: 'Test Pool',
      poolAddress: '0x1234567890123456789012345678901234567890',
      contract: {
        auctionInfo: sinon.stub(),
        kickerInfo: sinon.stub(),
        callStatic: { settle: sinon.stub() },
        connect: sinon.stub(),
      },
      getLiquidation: sinon.stub(),
      kickerInfo: sinon.stub(),
    };

    mockPool.contract.connect.returns(mockPool.contract);

    mockSigner = {
      getAddress: sinon.stub().resolves('0xBotAddress123456789012345678901234567890'),
      getTransactionCount: sinon.stub().resolves(10),
    };

    poolConfig = {
      settlement: {
        enabled: true,
        minAuctionAge: 100,
        maxBucketDepth: 50,
        maxIterations: 5,
      },
    } as any;

    config = {
      dryRun: false,
      subgraphUrl: 'http://mock-subgraph',
      delayBetweenActions: 0,
    };

    // Stub external dependencies
    getUnsettledAuctionsStub = sinon.stub(subgraph, 'getUnsettledAuctions');
    poolSettleStub = sinon.stub(transactions, 'poolSettle');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return false when settlement is not enabled', async () => {
    const disabledConfig = {
      settlement: { enabled: false },
    } as any;

    const result = await tryReactiveSettlement({
      pool: mockPool as any,
      poolConfig: disabledConfig,
      signer: mockSigner as any,
      config,
    });

    expect(result).to.be.false;
  });

  it('should return false when no auctions need settlement', async () => {
    getUnsettledAuctionsStub.resolves({
      liquidationAuctions: [],
    });

    const result = await tryReactiveSettlement({
      pool: mockPool as any,
      poolConfig,
      signer: mockSigner as any,
      config,
    });

    expect(result).to.be.false;
  });

  it('should return true when bonds are unlocked after settlement', async () => {
    // Mock subgraph to return a settleable auction
    getUnsettledAuctionsStub.resolves({
      liquidationAuctions: [
        { 
          borrower: '0xBorrower1', 
          kickTime: '1000000', 
          debtRemaining: '1.0', 
          collateralRemaining: '0.0',
          neutralPrice: '0.05',
          debt: '1.0',
          collateral: '0.0'
        },
      ],
    });

    // FIXED: Create a comprehensive auctionInfo stub that handles ALL calls
    const auctionInfoStub = sinon.stub();
    
    // Call 1: needsSettlement() check during findSettleableAuctions()
    auctionInfoStub.onCall(0).resolves({
      kickTime_: BigNumber.from(Math.floor(Date.now() / 1000) - 3700), // Old enough
      debtToCollateral_: BigNumber.from('1000000000000000000'), // Has debt
    });
    
    // Calls 2-6: Settlement iterations (5 total iterations)
    auctionInfoStub.onCall(1).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 1 (partial)
    auctionInfoStub.onCall(2).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 2 (partial)
    auctionInfoStub.onCall(3).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 3 (partial)
    auctionInfoStub.onCall(4).resolves({ kickTime_: BigNumber.from(123) }); // After iteration 4 (partial)
    auctionInfoStub.onCall(5).resolves({ kickTime_: BigNumber.from(0) });   // After iteration 5 (SUCCESS)
    
    mockPool.contract.auctionInfo = auctionInfoStub;

    // Mock liquidation status for needsSettlement() check
    mockPool.getLiquidation.withArgs('0xBorrower1').returns({
      getStatus: async () => ({
        collateral: BigNumber.from(0), // No collateral - needs settlement
        price: BigNumber.from('1000000000000'),
      }),
    });

    // Mock settle call static check to succeed
    mockPool.contract.callStatic.settle.withArgs('0xBorrower1', 10).resolves();

    // Mock the settlement transaction to succeed
    poolSettleStub.resolves();

    // FIXED: Mock bonds properly - return unlocked after settlement
    mockPool.kickerInfo.resolves({ 
      locked: BigNumber.from(0),        // UNLOCKED after settlement
      claimable: BigNumber.from('1000000') 
    });

    const result = await tryReactiveSettlement({
      pool: mockPool as any,
      poolConfig,
      signer: mockSigner as any,
      config,
    });

    expect(result).to.be.true;
  });
});