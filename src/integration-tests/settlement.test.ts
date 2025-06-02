import './subgraph-mock';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { expect } from 'chai';
import { configureAjna } from '../config-types';
import { NonceTracker } from '../nonce';
import { SettlementHandler } from '../settlement';
import { decimaledToWei } from '../utils';
import { MAINNET_CONFIG } from './test-config';
import {
  getProvider,
  impersonateSigner,
  resetHardhat,
  setBalance,
} from './test-utils';

describe('Settlement Simple Tests', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  /**
   * TEST 1: Basic Settlement Handler Creation
   * Just test that we can create a settlement handler and call methods
   */
  it('should create settlement handler and test basic functionality', async () => {
    console.log('\nTEST 1: Basic Settlement Handler');
    
    // Setup pool
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    
    const kickerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      decimaledToWei(100).toHexString()
    );
    
    // Create settlement handler with proper config
    const poolConfig = {
      ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      settlement: {
        enabled: true,
        minAuctionAge: 0,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    };
    
    const handler = new SettlementHandler(
      pool,
      kickerSigner,
      poolConfig as any,
      {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      }
    );
    
    // Test basic functionality
    const borrower = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
    
    // Test needsSettlement method
    const settlementCheck = await handler.needsSettlement(borrower);
    console.log('Settlement check result:', settlementCheck);
    
    // This should work regardless of whether settlement is actually needed
    expect(settlementCheck).to.have.property('needs');
    expect(settlementCheck).to.have.property('reason');
    
    console.log('Basic handler test completed');
  });

  /**
   * TEST 2: Dry Run Settlement
   * Test dry run mode which should always work
   */
  it('should handle dry run settlement', async () => {
    console.log('\nTEST 2: Dry Run Settlement');
    
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    
    const kickerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      decimaledToWei(100).toHexString()
    );
    
    const poolConfig = {
      ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      settlement: {
        enabled: true,
        minAuctionAge: 0,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    };
    
    const handler = new SettlementHandler(
      pool,
      kickerSigner,
      poolConfig as any,
      {
        dryRun: true, // DRY RUN MODE
        subgraphUrl: '',
        delayBetweenActions: 0,
      }
    );
    
    // Test dry run settlement - this should always succeed
    const borrower = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
    const result = await handler.settleAuctionCompletely(borrower);
    
    console.log('Dry run result:', result);
    
    // Dry run should always succeed
    expect(result.success).to.be.true;
    expect(result.reason).to.include('Dry run');
    
    console.log('Dry run test completed');
  });

  /**
   * TEST 3: Find Settleable Auctions
   * Test the auction finding functionality
   */
  it('should find settleable auctions', async () => {
    console.log('\nTEST 3: Find Settleable Auctions');
    
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    
    const kickerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      decimaledToWei(100).toHexString()
    );
    
    const poolConfig = {
      ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      settlement: {
        enabled: true,
        minAuctionAge: 0,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    };
    
    const handler = new SettlementHandler(
      pool,
      kickerSigner,
      poolConfig as any,
      {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      }
    );
    
    // Test finding settleable auctions
    const auctions = await handler.findSettleableAuctions();
    console.log('Found auctions:', auctions.length);
    
    // This should work without error
    expect(Array.isArray(auctions)).to.be.true;
    
    console.log('Find auctions test completed');
  });
});
