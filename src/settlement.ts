import { ethers, BigNumber } from 'ethers';
import { FungiblePool, Signer } from '@ajna-finance/sdk';
import { KeeperConfig, PoolConfig, SettlementConfig } from './config-types';
import { logger } from './logging';
import { poolSettle } from './transactions';
import { weiToDecimaled, delay, RequireFields } from './utils';
import subgraph from './subgraph';

interface SettlementStatus {
  auctionExists: boolean;
  bondsLocked: boolean; 
  bondsClaimable: boolean;
  needsSettlement: boolean;
  canWithdrawBonds: boolean;
}

interface SettlementResult {
  success: boolean;
  completed: boolean;
  iterations: number;
  reason: string;
}

interface AuctionToSettle {
  borrower: string;
  kickTime: number;
  debtRemaining: BigNumber;
  collateralRemaining: BigNumber;
}

export class SettlementHandler {
  constructor(
    private pool: FungiblePool,
    private signer: Signer,
    private poolConfig: RequireFields<PoolConfig, 'settlement'>,
    private config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>
  ) {}

  /**
   * Main entry point - handle all settlements for this pool
   */
  async handleSettlements(): Promise<void> {
    logger.debug(`Checking for settleable auctions in pool: ${this.pool.name}`);
    
    const auctions = await this.findSettleableAuctions();
    if (auctions.length === 0) {
      logger.debug(`No settleable auctions found in pool: ${this.pool.name}`);
      return;
    }

    logger.info(`Found ${auctions.length} potentially settleable auctions in pool: ${this.pool.name}`);

    for (const auction of auctions) {
      await this.processAuction(auction);
      await delay(this.config.delayBetweenActions);
    }
  }

  /**
  * Find auctions that ACTUALLY need settlement (not just unsettled auctions)
  */
  public async findSettleableAuctions(): Promise<AuctionToSettle[]> {
    try {
    // Get all unsettled auctions from subgraph
    const result = await subgraph.getUnsettledAuctions(
      this.config.subgraphUrl,
      this.pool.poolAddress
    );
    
    const actuallySettleable: AuctionToSettle[] = [];
    
    // 🔧 FIX: Check each auction to see if it actually needs settlement
    for (const auction of result.liquidationAuctions) {
      const borrower = auction.borrower;
      
      logger.debug(`Checking if auction ${borrower.slice(0, 8)} actually needs settlement...`);
      
      // Check on-chain if this auction actually needs settlement
      const settlementCheck = await this.needsSettlement(borrower);
      
      // Only include auctions that actually need settlement (collateral=0, debt>0)
      if (settlementCheck.needs) {
        logger.debug(`Auction ${borrower.slice(0, 8)} DOES need settlement: ${settlementCheck.reason}`);
        actuallySettleable.push({
          borrower: auction.borrower,
          kickTime: parseInt(auction.kickTime) * 1000,
          debtRemaining: ethers.utils.parseEther(auction.debtRemaining || '0'),
          collateralRemaining: ethers.utils.parseEther(auction.collateralRemaining || '0')
        });
      } else {
        logger.debug(`Auction ${borrower.slice(0, 8)} does NOT need settlement: ${settlementCheck.reason}`);
      }
    }
    
    if (actuallySettleable.length > 0) {
      logger.info(`Found ${actuallySettleable.length} auctions that ACTUALLY need settlement in pool: ${this.pool.name}`);
    } else {
      logger.debug(`No auctions actually need settlement in pool: ${this.pool.name} (all are still active)`);
    }
    
    return actuallySettleable;
    } catch (error) {
    logger.error(`Failed to query unsettled auctions for pool ${this.pool.name}:`, error);
    return [];
    }
  }

  /**
   * Process a single auction for settlement
   */
  private async processAuction(auction: AuctionToSettle): Promise<void> {
    const { borrower } = auction;
    
    logger.debug(`Checking settlement for borrower ${borrower.slice(0, 8)} in pool ${this.pool.name}`);

    // Check if auction meets age requirement
    if (!this.isAuctionOldEnough(auction)) {
      logger.debug(`Auction for ${borrower.slice(0, 8)} is too young, skipping`);
      return;
    }

    // Check if settlement is needed
    const settlementCheck = await this.needsSettlement(borrower);
    if (!settlementCheck.needs) {
      logger.debug(`Settlement not needed for ${borrower.slice(0, 8)}: ${settlementCheck.reason}`);
      return;
    }

    // Check bot incentive if required
    if (this.poolConfig.settlement.checkBotIncentive) {
      const incentiveCheck = await this.checkBotIncentive(borrower);
      if (!incentiveCheck.hasIncentive) {
        logger.debug(`No bot incentive for ${borrower.slice(0, 8)}: ${incentiveCheck.reason}`);
        return;
      }
      logger.debug(`Bot incentive confirmed: ${incentiveCheck.reason}`);
    }

    // Attempt settlement
    logger.info(`SETTLEMENT NEEDED for ${borrower.slice(0, 8)}: ${settlementCheck.reason}`);
    const result = await this.settleAuctionCompletely(borrower);
    
    if (result.success) {
      logger.info(`Settlement completed for ${borrower.slice(0, 8)} in ${result.iterations} iterations`);
    } else {
      logger.warn(`Settlement incomplete for ${borrower.slice(0, 8)} after ${result.iterations} iterations: ${result.reason}`);
    }
  }

  /**
   * Check if auction is old enough to settle based on config
   */
  private isAuctionOldEnough(auction: AuctionToSettle): boolean {
    const minAge = this.poolConfig.settlement.minAuctionAge || 3600; // Default 1 hour
    const ageSeconds = (Date.now() - auction.kickTime) / 1000;
    return ageSeconds >= minAge;
  }

  /**
   * Check if an auction needs settlement
   */
  async needsSettlement(borrower: string): Promise<{ needs: boolean; reason: string; details?: any }> {
    try {
      // Check if auction exists and is active
      const auctionInfo = await this.pool.contract.auctionInfo(borrower);
      const kickTime = auctionInfo.kickTime_;
      
      if (kickTime.eq(0)) {
        return { needs: false, reason: "No active auction (kickTime = 0)" };
      }

      // Get liquidation status for collateral
      const liquidationStatus = await this.pool.getLiquidation(borrower).getStatus();
      const collateralAmount = liquidationStatus.collateral;
      
      // Get current debt from auctionInfo.debtToCollateral_
      const debt = auctionInfo.debtToCollateral_;
      
      const details = {
        debtRemaining: debt,
        collateralRemaining: collateralAmount,
        auctionPrice: liquidationStatus.price,
        kickTime: kickTime.toNumber()
      };

      // Settlement logic: only when collateral = 0 AND debt > 0
      if (debt.eq(0)) {
        return { 
          needs: false, 
          reason: "No debt remaining - auction fully covered",
          details 
        };
      }

      if (collateralAmount.gt(0)) {
        return { 
          needs: false, 
          reason: `Still has ${weiToDecimaled(collateralAmount)} collateral to auction`,
          details 
        };
      }

      // Bad debt: collateral = 0 AND debt > 0
      if (collateralAmount.eq(0) && debt.gt(0)) {
        try {
          const poolWithSigner = this.pool.contract.connect(this.signer);
          await poolWithSigner.callStatic.settle(borrower, 10);
          
          return { 
            needs: true, 
            reason: `Bad debt detected: ${weiToDecimaled(debt)} debt with 0 collateral`,
            details 
          };
        } catch (settleError) {
          return { 
            needs: false, 
            reason: `Settlement call would fail: ${settleError instanceof Error ? settleError.message.slice(0, 100) : String(settleError)}`,
            details 
          };
        }
      }

      return { 
        needs: false, 
        reason: "Unexpected state",
        details 
      };

    } catch (error) {
      return { 
        needs: false, 
        reason: `Error checking settlement: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Check if bot has incentive to settle (kicker bonds/rewards)
   */
  async checkBotIncentive(borrower: string): Promise<{ hasIncentive: boolean; reason: string }> {
    try {
      const botAddress = await this.signer.getAddress();
      
      const auctionInfo = await this.pool.contract.auctionInfo(borrower);
      const kicker = auctionInfo.kicker_;
      
      const isKicker = kicker.toLowerCase() === botAddress.toLowerCase();
      
      if (isKicker) {
        try {
          const kickerInfo = await this.pool.contract.kickerInfo(botAddress);
          const claimable = kickerInfo.claimable_;
          return {
            hasIncentive: true,
            reason: `Bot is kicker with ${weiToDecimaled(claimable)} claimable bond`
          };
        } catch (kickerError) {
          return {
            hasIncentive: true,
            reason: `Bot is kicker (could not check claimable amount)`
          };
        }
      }
      
      return {
        hasIncentive: false,
        reason: `Not the kicker (kicker: ${kicker.slice(0, 8)})`
      };
    } catch (error) {
      return {
        hasIncentive: false,
        reason: `Error checking incentive: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Settle an auction completely with multiple iterations if needed
   */
  async settleAuctionCompletely(borrower: string): Promise<SettlementResult> {
    const maxIterations = this.poolConfig.settlement.maxIterations || 10;
    const bucketDepth = this.poolConfig.settlement.maxBucketDepth || 50;

    if (this.config.dryRun) {
      logger.info(`DRY RUN: Would settle ${borrower.slice(0, 8)} in up to ${maxIterations} iterations`);
      return {
        success: true,
        completed: true,
        iterations: 1,
        reason: "Dry run - settlement skipped"
      };
    }

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      try {
        logger.debug(`Settlement iteration ${iteration}/${maxIterations} for ${borrower.slice(0, 8)}`);
        
        // Attempt settlement
        await poolSettle(this.pool, this.signer, borrower, bucketDepth);
        
        // Check if fully settled
        const auctionInfo = await this.pool.contract.auctionInfo(borrower);
        if (auctionInfo.kickTime_.eq(0)) {
          return {
            success: true,
            completed: true,
            iterations: iteration,
            reason: "Auction fully settled and removed"
          };
        }
        
        logger.debug(`Partial settlement completed, auction still exists - need iteration ${iteration + 1}`);
        
        // Wait between iterations
        if (iteration < maxIterations) {
          await delay(this.config.delayBetweenActions);
        }
        
      } catch (error) {
        logger.error(`Settlement iteration ${iteration} failed for ${borrower.slice(0, 8)}:`, error);
        return {
          success: false,
          completed: false,
          iterations: iteration,
          reason: `Settlement failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    return {
      success: true,
      completed: false,
      iterations: maxIterations,
      reason: `Partial settlement after ${maxIterations} iterations - may need more`
    };
  }

  /**
   * Get current settlement status for debugging
   */
  async getSettlementStatus(borrower: string): Promise<SettlementStatus> {
    const signerAddress = await this.signer.getAddress();
    const auctionInfo = await this.pool.contract.auctionInfo(borrower);
    const { locked, claimable } = await this.pool.kickerInfo(signerAddress);
    
    return {
      auctionExists: !auctionInfo.kickTime_.eq(0),
      bondsLocked: !locked.eq(0),
      bondsClaimable: claimable.gt(0),
      needsSettlement: !auctionInfo.kickTime_.eq(0),
      canWithdrawBonds: locked.eq(0) && claimable.gt(0)
    };
  }
}

/**
 * Handle settlements for a pool (main entry point)
 */
export async function handleSettlements({
  pool,
  poolConfig,
  signer,
  config,
}: {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'settlement'>;
  signer: Signer;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}): Promise<void> {
  const handler = new SettlementHandler(pool, signer, poolConfig, config);
  await handler.handleSettlements();
}

/**
 * Reactive settlement - try to settle when bonds are locked
 */
export async function tryReactiveSettlement({
  pool,
  poolConfig,
  signer,
  config,
}: {
  pool: FungiblePool;
  poolConfig: PoolConfig;
  signer: Signer;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}): Promise<boolean> {
  if (!poolConfig.settlement?.enabled) {
    return false;
  }

  // 🔧 NEW: Check if any auctions actually need settlement BEFORE attempting
  const handler = new SettlementHandler(
    pool,
    signer,
    poolConfig as RequireFields<PoolConfig, 'settlement'>,
    config
  );

  const auctions = await handler.findSettleableAuctions();

  if (auctions.length === 0) {
    logger.debug(`No auctions need settlement in ${pool.name} - bonds locked for normal reasons`);
    return false; // Don't attempt settlement
  }

  logger.info(`Bonds locked in ${pool.name}, attempting reactive settlement...`);

  await handler.handleSettlements();

  // Check if bonds are now unlocked
  const signerAddress = await signer.getAddress();
  const { locked } = await pool.kickerInfo(signerAddress);
  const bondsUnlocked = locked.eq(0);

  if (bondsUnlocked) {
    logger.info(`Reactive settlement successful - bonds unlocked in ${pool.name}`);
  } else {
    logger.warn(`Reactive settlement completed but bonds still locked in ${pool.name}`);
  }

  return bondsUnlocked;
}
