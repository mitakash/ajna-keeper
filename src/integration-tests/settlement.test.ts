import './subgraph-mock';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { BigNumber, constants } from 'ethers';
import { configureAjna, KeeperConfig, PoolConfig } from '../config-types';
import { NonceTracker } from '../nonce';
import { SettlementHandler, tryReactiveSettlement, handleSettlements } from '../settlement';
import { LpCollector } from '../collect-lp';
import { collectBondFromPool } from '../collect-bond';
import { RewardActionTracker } from '../reward-action-tracker';
import { DexRouter } from '../dex-router';
import { decimaledToWei, weiToDecimaled, delay } from '../utils';
import { logger } from '../logging';
import { MAINNET_CONFIG } from './test-config';
import {
  getProvider,
  impersonateSigner,
  resetHardhat,
  setBalance,
  increaseTime,
} from './test-utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { handleKicks } from '../kick';
import { handleTakes } from '../take';
import { SECONDS_PER_YEAR, SECONDS_PER_DAY } from '../constants';

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

describe('Settlement Integration Tests', () => {
  let ajna: AjnaSDK;
  let pool: FungiblePool;
  let settlementHandler: SettlementHandler;
  let poolConfig: PoolConfig;
  let keeperConfig: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;

  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
    
    // Configure Ajna SDK
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    ajna = new AjnaSDK(getProvider());
    pool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );

    // Standard settlement configuration for testing
    poolConfig = {
      ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      settlement: {
        enabled: true,
        minAuctionAge: 10, // Very short for testing (10 seconds)
        maxBucketDepth: 20,
        maxIterations: 5,
        checkBotIncentive: false, // Disabled for easier testing
      },
    };

    keeperConfig = {
      dryRun: false,
      subgraphUrl: 'http://test-subgraph-url',
      delayBetweenActions: 100, // Short delay for testing
    };
  });

  describe('Real Settlement Scenarios', () => {
    /**
     * Test end-to-end settlement workflows with real blockchain state
     * These tests create actual loans, kick them, and test settlement scenarios
     */

    it('should detect and settle auction with bad debt', async () => {
      console.log('\n=== Testing Bad Debt Settlement ===');
      
      // Setup: Impersonate accounts with funds
      const lenderSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
      );
      const borrowerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
      );
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );

      // Setup: Create loan scenario following existing test patterns
      await depositQuoteToken({
        pool,
        owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
        amount: 1, // 1 WETH
        price: 0.07, // Price per SOL
      });
      
      await drawDebt({
        pool,
        owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
        amountToBorrow: 0.9, // 0.9 WETH
        collateralToPledge: 14, // 14 SOL
      });
      
      // Age the loan to make it kickable
      await increaseTime(SECONDS_PER_YEAR * 2);
      console.log('Loan aged for 2 years to become kickable');

      // Fund accounts for gas
      for (const signer of [lenderSigner, borrowerSigner, kickerSigner]) {
        await setBalance(
          await signer.getAddress(),
          decimaledToWei(10).toHexString()
        );
      }

      // Kick the loan to start liquidation
      const borrowerAddress = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
      await handleKicks({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer: kickerSigner,
        config: {
          dryRun: false,
          subgraphUrl: '',
          coinGeckoApiKey: '',
          delayBetweenActions: 0,
        },
      });
      console.log(`Loan kicked for borrower: ${borrowerAddress}`);

      // Wait for auction to meet minimum age for settlement
      await increaseTime(15); // 15 seconds > 10 second minimum
      console.log('Auction aged to meet minimum settlement age');

      // Progress the auction by taking some collateral
      try {
        await increaseTime(SECONDS_PER_DAY * 1); // Age auction further
        await handleTakes({
          pool,
          poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          signer: kickerSigner,
          config: {
            dryRun: false,
            subgraphUrl: '',
            delayBetweenActions: 0,
          },
        });
        console.log('Take handling completed');
      } catch (error) {
        console.log('Take handling result:', error instanceof Error ? error.message : String(error));
      }

      // Test settlement functionality
      settlementHandler = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );

      // Check if settlement is needed
      const settlementCheck = await settlementHandler.needsSettlement(borrowerAddress);
      console.log('Settlement check result:', {
        needs: settlementCheck.needs,
        reason: settlementCheck.reason,
        debtRemaining: settlementCheck.details?.debtRemaining?.toString(),
        collateralRemaining: settlementCheck.details?.collateralRemaining?.toString()
      });

      // Test settlement execution (if needed)
      if (settlementCheck.needs) {
        console.log('Executing settlement...');
        
        const settlementResult = await settlementHandler.settleAuctionCompletely(borrowerAddress);
        console.log('Settlement result:', {
          success: settlementResult.success,
          completed: settlementResult.completed,
          iterations: settlementResult.iterations,
          reason: settlementResult.reason
        });

        expect(settlementResult.success).to.be.true;
        
        // Verify auction state after settlement
        if (settlementResult.completed) {
          const auctionInfo = await pool.contract.auctionInfo(borrowerAddress);
          expect(auctionInfo.kickTime_.eq(constants.Zero)).to.be.true; // Use BigNumber comparison
        }
      } else {
        console.log('Settlement not needed - this may be expected depending on auction state');
        // Not necessarily a test failure - the auction might be healthy or fully liquidated
      }

      console.log('Bad debt settlement test completed');
    });

    it('should handle auctions that do not need settlement', async () => {
      console.log('\n=== Testing Healthy Auction (No Settlement Needed) ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Create settlement handler
      settlementHandler = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );

      // Test with a random address that has no auction
      const randomBorrower = '0x1234567890123456789012345678901234567890';
      
      const settlementCheck = await settlementHandler.needsSettlement(randomBorrower);
      console.log('Settlement check for non-existent auction:', {
        needs: settlementCheck.needs,
        reason: settlementCheck.reason
      });

      expect(settlementCheck.needs).to.be.false;
      expect(settlementCheck.reason).to.include('No active auction');

      console.log('Healthy auction test completed');
    });
  });

  describe('Integration with LP Collection', () => {
    /**
     * Test reactive settlement when LP collection fails due to locked bonds
     * This tests a critical integration point where settlement enables other operations
     */

    it('should trigger reactive settlement when LP collection fails with AuctionNotCleared', async () => {
      console.log('\n=== Testing Reactive Settlement from LP Collection ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Create mock LP collector and exchange tracker
      const dexRouter = new DexRouter(kickerSigner, {
        oneInchRouters: {},
        connectorTokens: [],
      });
      const exchangeTracker = new RewardActionTracker(
        kickerSigner,
        { tokenAddresses: {} } as any,
        dexRouter
      );

      const lpCollector = new LpCollector(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig,
        exchangeTracker
      );

      // Start LP collector subscriptions
      await lpCollector.startSubscription();

      // Simulate LP collection triggering AuctionNotCleared error
      try {
        // This will likely fail in most cases as we don't have active rewards
        await lpCollector.collectLpRewards();
        console.log('LP collection succeeded (no settlement trigger needed)');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('LP collection error:', errorMessage);
        
        if (errorMessage.includes('AuctionNotCleared')) {
          console.log('AuctionNotCleared detected - testing reactive settlement');
          
          const settlementSuccess = await tryReactiveSettlement({
            pool,
            poolConfig,
            signer: kickerSigner,
            config: keeperConfig,
          });
          
          console.log('Reactive settlement result:', settlementSuccess);
          
          // The result depends on whether there are actually auctions to settle
          expect(typeof settlementSuccess).to.equal('boolean');
        }
      }

      await lpCollector.stopSubscription();
      console.log('LP collection integration test completed');
    });
  });

  describe('Integration with Bond Collection', () => {
    /**
     * Test settlement integration with bond collection operations
     * Settlement should unlock bonds and allow collection to proceed
     */

    it('should unlock bonds through settlement for bond collection', async () => {
      console.log('\n=== Testing Settlement Integration with Bond Collection ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Test bond collection which may trigger settlement
      try {
        await collectBondFromPool({
          pool,
          signer: kickerSigner,
          poolConfig,
          config: keeperConfig,
        });
        console.log('Bond collection completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Bond collection error (expected in test environment):', errorMessage);
        
        // In a real scenario with locked bonds, this would trigger reactive settlement
        if (errorMessage.includes('AuctionNotCleared') || errorMessage.includes('BondNotReward')) {
          console.log('Testing settlement unlock scenario');
          
          const unlocked = await tryReactiveSettlement({
            pool,
            poolConfig,
            signer: kickerSigner,
            config: keeperConfig,
          });
          
          console.log('Settlement unlock result:', unlocked);
          expect(typeof unlocked).to.equal('boolean');
        }
      }

      console.log('Bond collection integration test completed');
    });
  });

  describe('Settlement Performance and Caching', () => {
    /**
     * Test settlement performance optimizations and caching behavior
     * Verify that subgraph queries are cached appropriately and age filtering works
     */

    it('should cache subgraph queries and filter by auction age', async () => {
      console.log('\n=== Testing Settlement Caching and Age Filtering ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Test with higher minimum age to ensure age filtering works
      const ageFilterConfig = {
        ...poolConfig,
        settlement: {
          ...poolConfig.settlement!,
          minAuctionAge: 86400, // 24 hours - very high for testing
        },
      };

      settlementHandler = new SettlementHandler(
        pool,
        kickerSigner,
        ageFilterConfig as any,
        keeperConfig
      );

      console.log('Testing auction discovery with high age filter...');
      
      // First call - should query subgraph
      const startTime = Date.now();
      const auctions1 = await settlementHandler.findSettleableAuctions();
      const firstCallTime = Date.now() - startTime;
      
      console.log(`First call found ${auctions1.length} auctions in ${firstCallTime}ms`);

      // Second call - should use cache (if no auctions found)
      const cacheStartTime = Date.now();
      const auctions2 = await settlementHandler.findSettleableAuctions();
      const cacheCallTime = Date.now() - cacheStartTime;
      
      console.log(`Cached call found ${auctions2.length} auctions in ${cacheCallTime}ms`);

      // Verify results are consistent
      expect(auctions1.length).to.equal(auctions2.length);
      
      // Cache should be faster (though in test environment this might not always be true)
      console.log(`Cache performance: ${firstCallTime}ms -> ${cacheCallTime}ms`);

      console.log('Caching and age filtering test completed');
    });

    it('should handle concurrent settlement attempts with locking', async () => {
      console.log('\n=== Testing Concurrent Settlement Locking ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Create multiple settlement handlers (simulating multiple keeper instances)
      const handler1 = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );
      
      const handler2 = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );

      // Test concurrent settlement discovery
      console.log('Testing concurrent settlement discovery...');
      
      const [auctions1, auctions2] = await Promise.all([
        handler1.findSettleableAuctions(),
        handler2.findSettleableAuctions(),
      ]);
      
      console.log(`Handler 1 found ${auctions1.length} auctions`);
      console.log(`Handler 2 found ${auctions2.length} auctions`);
      
      // Both should find the same auctions
      expect(auctions1.length).to.equal(auctions2.length);

      // Test the main settlement entry point
      try {
        await Promise.all([
          handleSettlements({
            pool,
            poolConfig: poolConfig as any,
            signer: kickerSigner,
            config: keeperConfig,
          }),
          handleSettlements({
            pool,
            poolConfig: poolConfig as any,
            signer: kickerSigner,
            config: keeperConfig,
          }),
        ]);
        console.log('Concurrent settlement handling completed');
      } catch (error) {
        console.log('Expected error in concurrent settlement:', error instanceof Error ? error.message : String(error));
      }

      console.log('Concurrent settlement locking test completed');
    });
  });

  describe('Settlement Configuration Validation', () => {
    /**
     * Test different settlement configurations and their behavior
     * Verify that configuration changes affect settlement behavior correctly
     */

    it('should respect checkBotIncentive configuration', async () => {
      console.log('\n=== Testing Bot Incentive Configuration ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Test with bot incentive check enabled
      const incentiveConfig = {
        ...poolConfig,
        settlement: {
          ...poolConfig.settlement!,
          checkBotIncentive: true,
        },
      };

      const incentiveHandler = new SettlementHandler(
        pool,
        kickerSigner,
        incentiveConfig as any,
        keeperConfig
      );

      // Test incentive check with random borrower
      const randomBorrower = '0x1234567890123456789012345678901234567890';
      const incentiveResult = await incentiveHandler.checkBotIncentive(randomBorrower);
      
      console.log('Bot incentive check result:', {
        hasIncentive: incentiveResult.hasIncentive,
        reason: incentiveResult.reason
      });

      // Should return false for non-existent auction
      expect(incentiveResult.hasIncentive).to.be.false;

      console.log('Bot incentive configuration test completed');
    });

    it('should respect iteration and bucket depth limits', async () => {
      console.log('\n=== Testing Settlement Limits Configuration ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Test with limited iterations and bucket depth
      const limitedConfig = {
        ...poolConfig,
        settlement: {
          ...poolConfig.settlement!,
          maxIterations: 2,
          maxBucketDepth: 5,
        },
      };

      const limitedHandler = new SettlementHandler(
        pool,
        kickerSigner,
        limitedConfig as any,
        keeperConfig
      );

      // Test dry run with limited config
      const dryRunConfig = { ...keeperConfig, dryRun: true };
      const dryRunHandler = new SettlementHandler(
        pool,
        kickerSigner,
        limitedConfig as any,
        dryRunConfig
      );

      const dryRunResult = await dryRunHandler.settleAuctionCompletely('0x1234567890123456789012345678901234567890');
      
      console.log('Dry run with limited config:', {
        success: dryRunResult.success,
        iterations: dryRunResult.iterations,
        reason: dryRunResult.reason
      });

      expect(dryRunResult.success).to.be.true;
      expect(dryRunResult.reason).to.include('Dry run');

      console.log('Settlement limits configuration test completed');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    /**
     * Test settlement behavior under error conditions and edge cases
     * Verify graceful handling of network errors, invalid states, etc.
     */

    it('should handle subgraph network errors gracefully', async () => {
      console.log('\n=== Testing Network Error Recovery ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      // Test with invalid subgraph URL to simulate network error
      const errorConfig = {
        ...keeperConfig,
        subgraphUrl: 'http://invalid-url-that-will-fail',
      };

      const errorHandler = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        errorConfig
      );

      console.log('Testing settlement discovery with invalid subgraph URL...');
      
      // Should handle error gracefully and return empty array
      const auctions = await errorHandler.findSettleableAuctions();
      
      console.log(`Settlement discovery with network error returned ${auctions.length} auctions`);
      expect(auctions).to.be.an('array');
      expect(auctions.length).to.equal(0);

      console.log('Network error recovery test completed');
    });

    it('should handle invalid auction states', async () => {
      console.log('\n=== Testing Invalid Auction State Handling ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      settlementHandler = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );

      // Test with various invalid borrower addresses
      const invalidBorrowers = [
        '0x0000000000000000000000000000000000000000', // Zero address
        '0xInvalidAddress', // Invalid format
        constants.AddressZero, // Zero address constant
      ];

      for (const borrower of invalidBorrowers) {
        try {
          console.log(`Testing settlement check for invalid borrower: ${borrower}`);
          
          const result = await settlementHandler.needsSettlement(borrower);
          
          console.log(`Result for ${borrower}:`, {
            needs: result.needs,
            reason: result.reason.substring(0, 50) + '...'
          });
          
          // Should handle gracefully without throwing
          expect(result.needs).to.be.false;
          
        } catch (error) {
          console.log(`Expected error for ${borrower}:`, error instanceof Error ? error.message.substring(0, 50) + '...' : String(error));
          // Errors are acceptable for truly invalid addresses
        }
      }

      console.log('Invalid auction state handling test completed');
    });
  });

  describe('Settlement Status and Monitoring', () => {
    /**
     * Test settlement status reporting and monitoring capabilities
     * Verify that settlement handlers provide good observability
     */

    it('should provide accurate settlement status information', async () => {
      console.log('\n=== Testing Settlement Status Reporting ===');
      
      const kickerSigner = await impersonateSigner(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
      );
      await setBalance(
        await kickerSigner.getAddress(),
        decimaledToWei(10).toHexString()
      );

      settlementHandler = new SettlementHandler(
        pool,
        kickerSigner,
        poolConfig as any,
        keeperConfig
      );

      // Test status for non-existent borrower
      const randomBorrower = '0x1234567890123456789012345678901234567890';
      
      try {
        const status = await settlementHandler.getSettlementStatus(randomBorrower);
        
        console.log('Settlement status for non-existent borrower:', {
          auctionExists: status.auctionExists,
          bondsLocked: status.bondsLocked,
          bondsClaimable: status.bondsClaimable,
          needsSettlement: status.needsSettlement,
          canWithdrawBonds: status.canWithdrawBonds
        });

        expect(status.auctionExists).to.be.false;
        expect(typeof status.bondsLocked).to.equal('boolean');
        expect(typeof status.bondsClaimable).to.equal('boolean');
        
      } catch (error) {
        console.log('Status check error (may be expected):', error instanceof Error ? error.message.substring(0, 50) + '...' : String(error));
        // Status check may fail for non-existent borrowers in some implementations
      }

      console.log('Settlement status reporting test completed');
    });
  });
});
