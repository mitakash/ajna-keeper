import {
  ERC20Pool__factory,
  FungiblePool,
  indexToPrice,
  min,
  Signer,
  wdiv,
} from '@ajna-finance/sdk';
import { TypedListener } from '@ajna-finance/sdk/dist/types/contracts/common';
import {
  BucketTakeLPAwardedEvent,
  BucketTakeLPAwardedEventFilter,
  ERC20Pool,
} from '@ajna-finance/sdk/dist/types/contracts/ERC20Pool';
import { BigNumber, constants } from 'ethers';
import {
  KeeperConfig,
  PoolConfig,
  RewardAction,
  TokenToCollect,
} from './config-types';
import { logger } from './logging';
import { RewardActionTracker } from './reward-action-tracker';
import {
  bucketRemoveCollateralToken,
  bucketRemoveQuoteToken,
} from './transactions';
import { decimaledToWei, weiToDecimaled } from './utils';
import { FungibleBucket } from '@ajna-finance/sdk/dist/classes/FungibleBucket';

/**
 * Collects lp rewarded from BucketTakes without collecting the user's deposits or loans.
 */
export class LpCollector {
  public lpMap: Map<number, BigNumber> = new Map(); // Map<bucketIndexString, rewardLp>
  public poolContract: ERC20Pool;
  public kickerAwardEvt: Promise<BucketTakeLPAwardedEventFilter>;
  public takerAwardEvt: Promise<BucketTakeLPAwardedEventFilter>;

  private started: boolean = false;

  constructor(
    private pool: FungiblePool,
    private signer: Signer,
    private poolConfig: Required<Pick<PoolConfig, 'collectLpReward'>>,
    private config: Pick<KeeperConfig, 'dryRun'>,
    private exchangeTracker: RewardActionTracker
  ) {
    const poolContract = ERC20Pool__factory.connect(
      this.pool.poolAddress,
      this.signer
    );
    this.poolContract = poolContract;
    this.takerAwardEvt = (async () => {
      const signerAddress = await this.signer.getAddress();
      return poolContract.filters.BucketTakeLPAwarded(signerAddress);
    })();
    this.kickerAwardEvt = (async () => {
      const signerAddress = await this.signer.getAddress();
      return poolContract.filters.BucketTakeLPAwarded(undefined, signerAddress);
    })();
  }

  public async startSubscription() {
    if (!this.started) {
      await this.subscribeToLpRewards();
      this.started = true;
    }
  }

  public async stopSubscription() {
    if (this.started) {
      this.stopSubscriptionToLpRewards();
      this.started = false;
    }
  }

  public async collectLpRewards() {
    if (!this.started)
      throw new Error('Must start subscriptions before collecting rewards');
    const lpMapEntries = Array.from(this.lpMap.entries()).filter(
      ([bucketIndex, rewardLp]) => rewardLp.gt(constants.Zero)
    );
    for (let [bucketIndex, rewardLp] of lpMapEntries) {
      const lpConsumed = await this.collectLpRewardFromBucket(
        bucketIndex,
        rewardLp
      );
      this.subtractReward(bucketIndex, lpConsumed);
    }
  }

  /**
   * Collects the lpReward from bucket. Returns amount of lp used.
   * @param bucketIndex
   * @param rewardLp
   * @resolves the amount of lp used while redeeming rewards.
   */
  private async collectLpRewardFromBucket(
    bucketIndex: number,
    rewardLp: BigNumber
  ): Promise<BigNumber> {
    const {
      redeemFirst,
      minAmountQuote,
      minAmountCollateral,
      rewardActionQuote,
      rewardActionCollateral,
    } = this.poolConfig.collectLpReward;
    const signerAddress = await this.signer.getAddress();
    const bucket = this.pool.getBucketByIndex(bucketIndex);
    // retrieve exchange rate and total amount of deposit and collateral in bucket
    let { exchangeRate, deposit, collateral } = await bucket.getStatus();
    const { lpBalance, depositRedeemable, collateralRedeemable } =
      await bucket.getPosition(signerAddress);
    if (lpBalance.lt(rewardLp)) rewardLp = lpBalance;
    let reedemed = constants.Zero;

    // If config explicitly wants collateral first, do so and then redeem leftover quote token
    if (redeemFirst === TokenToCollect.COLLATERAL) {
      const collateralToWithdraw = min(collateralRedeemable, collateral);
      if (collateralToWithdraw.gt(decimaledToWei(minAmountCollateral))) {
        reedemed = reedemed.add(
          await this.redeemCollateral(
            bucket,
            bucketIndex,
            collateralToWithdraw,
            exchangeRate,
            rewardActionCollateral
          )
        );
        ({ exchangeRate, deposit, collateral } = await bucket.getStatus());
      }
      const remainingQuote = await bucket.lpToQuoteTokens(
        rewardLp.sub(reedemed)
      );
      // still need to check this in case minAmountCollateral prevented withdrawal of collateral
      const quoteToWithdraw = min(remainingQuote, deposit);
      if (quoteToWithdraw.gt(decimaledToWei(minAmountQuote))) {
        reedemed = reedemed.add(
          await this.redeemQuote(
            bucket,
            quoteToWithdraw,
            exchangeRate,
            rewardActionQuote
          )
        );
      }

      // Otherwise, default to redeeming quote token first
    } else {
      const quoteToWithdraw = min(depositRedeemable, deposit);
      if (quoteToWithdraw.gt(decimaledToWei(minAmountQuote))) {
        reedemed = reedemed.add(
          await this.redeemQuote(
            bucket,
            quoteToWithdraw,
            exchangeRate,
            rewardActionQuote
          )
        );
        ({ exchangeRate, deposit, collateral } = await bucket.getStatus());
      }
      const remainingCollateral = await bucket.lpToCollateral(
        rewardLp.sub(reedemed)
      );
      // still need to check this in case minAmountQuote prevented withdrawal of quote token
      const collateralToWithdraw = min(remainingCollateral, collateral);
      if (collateralToWithdraw.gt(decimaledToWei(minAmountCollateral))) {
        reedemed = reedemed.add(
          await this.redeemCollateral(
            bucket,
            bucketIndex,
            collateralToWithdraw,
            exchangeRate,
            rewardActionCollateral
          )
        );
      }
    }

    return reedemed;
  }

  private async redeemQuote(
    bucket: FungibleBucket,
    quoteToWithdraw: BigNumber,
    exchangeRate: BigNumber,
    rewardActionQuote?: RewardAction
  ): Promise<BigNumber> {
    if (this.config.dryRun) {
      logger.info(
        `DryRun - Would collect LP reward as ${quoteToWithdraw.toNumber()} quote. pool: ${this.pool.name}`
      );
    } else {
      try {
        logger.debug(`Collecting LP reward as quote. pool: ${this.pool.name}`);
        
        // Get LP balance before the transaction
        const signerAddress = await this.signer.getAddress();
        const { lpBalance: lpBalanceBefore } = await bucket.getPosition(signerAddress);
        
        await bucketRemoveQuoteToken(bucket, this.signer, quoteToWithdraw);
        
        // Get LP balance after the transaction
        const { lpBalance: lpBalanceAfter } = await bucket.getPosition(signerAddress);
        
        logger.info(
          `Collected LP reward as quote. pool: ${this.pool.name}, amount: ${weiToDecimaled(quoteToWithdraw)}`
        );

        if (rewardActionQuote) {
          this.exchangeTracker.addToken(
            rewardActionQuote,
            this.pool.quoteAddress,
            quoteToWithdraw
          );
        }
        
        // Validate LP difference to prevent negative values
        const lpUsed = lpBalanceBefore.sub(lpBalanceAfter);
        if (lpUsed.lt(0)) {
          logger.warn(`Negative LP calculation detected in redeemQuote, using zero instead. Pool: ${this.pool.name}, lpBefore: ${lpBalanceBefore.toString()}, lpAfter: ${lpBalanceAfter.toString()}`);
          return constants.Zero;
        }
        
        // Return the actual LP used
        return lpUsed;

      } catch (error) {
        // Re-throw AuctionNotCleared errors to trigger reactive settlement
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("AuctionNotCleared")) {
          logger.debug(`Re-throwing AuctionNotCleared error from ${this.pool.name} to trigger reactive settlement`);
          throw error; // Re-throw to outer catch block
        }

        logger.error(
          `Failed to collect LP reward as quote. pool: ${this.pool.name}`,
          error
        );
      }
    }
    return constants.Zero;
  }

  private async redeemCollateral(
    bucket: FungibleBucket,
    bucketIndex: number,
    collateralToWithdraw: BigNumber,
    exchangeRate: BigNumber,
    rewardActionCollateral?: RewardAction
  ): Promise<BigNumber> {
    if (this.config.dryRun) {
      logger.info(
        `DryRun - Would collect LP reward as ${collateralToWithdraw.toNumber()} collateral. pool: ${this.pool.name}`
      );
    } else {
      try {
        logger.debug(
          `Collecting LP reward as collateral. pool ${this.pool.name}`
        );
        
        // Get LP balance before the transaction
        const signerAddress = await this.signer.getAddress();
        const { lpBalance: lpBalanceBefore } = await bucket.getPosition(signerAddress);
        
        await bucketRemoveCollateralToken(
          bucket,
          this.signer,
          collateralToWithdraw
        );
        
        // Get LP balance after the transaction
        const { lpBalance: lpBalanceAfter } = await bucket.getPosition(signerAddress);
        
        logger.info(
          `Collected LP reward as collateral. pool: ${this.pool.name}, token: ${this.pool.collateralSymbol}, amount: ${weiToDecimaled(collateralToWithdraw)}`
        );

        if (rewardActionCollateral) {
          this.exchangeTracker.addToken(
            rewardActionCollateral,
            this.pool.collateralAddress,
            collateralToWithdraw
          );
        }
        
        // Validate LP difference to prevent negative values  
        const lpUsed = lpBalanceBefore.sub(lpBalanceAfter);
        if (lpUsed.lt(0)) {
          logger.warn(`Negative LP calculation detected in redeemCollateral, using zero instead. Pool: ${this.pool.name}, lpBefore: ${lpBalanceBefore.toString()}, lpAfter: ${lpBalanceAfter.toString()}`);
          return constants.Zero;
        }
        
        // Return the actual LP used 
        return lpUsed;

      } catch (error) {

        // NEW: Re-throw AuctionNotCleared errors to trigger reactive settlement
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("AuctionNotCleared")) {
          logger.debug(`Re-throwing AuctionNotCleared error from ${this.pool.name} to trigger reactive settlement`);
          throw error; // Re-throw to outer catch block
        }
	      
	logger.error(`Failed to collect LP reward as collateral. pool: ${this.pool.name}`, error);
      }
    }
    return constants.Zero;
  }

  private async subscribeToLpRewards() {
    this.poolContract.on(await this.takerAwardEvt, this.onTakerAwardEvent);
    this.poolContract.on(await this.kickerAwardEvt, this.onKickerAwardEvent);
  }

  private async stopSubscriptionToLpRewards() {
    this.poolContract.off(await this.takerAwardEvt, this.onTakerAwardEvent);
    this.poolContract.off(await this.kickerAwardEvt, this.onKickerAwardEvent);
  }

  private onTakerAwardEvent: TypedListener<BucketTakeLPAwardedEvent> = async (
    taker,
    kicker,
    lpAwardedTaker,
    lpAwardedKicker,
    evt
  ) => {
    const bucketIndex = await this.getBucketTakeBucketIndex(evt);
    this.addReward(bucketIndex, lpAwardedTaker);
  };

  private onKickerAwardEvent: TypedListener<BucketTakeLPAwardedEvent> = async (
    taker,
    kicker,
    lpAwardedTaker,
    lpAwardedKicker,
    evt
  ) => {
    const bucketIndex = await this.getBucketTakeBucketIndex(evt);
    this.addReward(bucketIndex, lpAwardedKicker);
  };

  private addReward(index: BigNumber, rewardLp: BigNumber) {
    if (rewardLp.eq(constants.Zero)) return;
    const bucketIndex = parseInt(index.toString());
    const prevReward = this.lpMap.get(bucketIndex) ?? constants.Zero;
    const sumReward = prevReward.add(rewardLp);
    logger.info(
      `Received LP Rewards in pool: ${this.pool.name}, bucketIndex: ${index}, rewardLp: ${rewardLp}`
    );
    this.lpMap.set(bucketIndex, sumReward);
  }

  private subtractReward(bucketIndex: number, lp: BigNumber) {
    const prevReward = this.lpMap.get(bucketIndex) ?? constants.Zero;
    const newReward = prevReward.sub(lp);
    if (newReward.lte(constants.Zero)) {
      this.lpMap.delete(bucketIndex);
    } else {
      this.lpMap.set(bucketIndex, newReward);
    }
  }

  private getBucketTakeBucketIndex = async (evt: BucketTakeLPAwardedEvent) => {
    const poolContract = ERC20Pool__factory.connect(
      this.pool.poolAddress,
      this.signer
    );
    const tx = await evt.getTransaction();
    const parsedTransaction = poolContract.interface.parseTransaction(tx);
    if (parsedTransaction.functionFragment.name !== 'bucketTake') {
      throw new Error(
        `Cannot get bucket index from transaction: ${parsedTransaction.functionFragment.name}`
      );
    }
    const [borrower, depositTake, index] = parsedTransaction.args as [
      string,
      boolean,
      BigNumber,
    ];
    return index;
  };
}
