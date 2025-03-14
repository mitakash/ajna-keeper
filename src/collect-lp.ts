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
import { BigNumber } from 'ethers';
import { KeeperConfig, PoolConfig, TokenToCollect } from './config-types';
import { logger } from './logging';
import {
  bucketRemoveCollateralToken,
  bucketRemoveQuoteToken,
} from './transactions';
import { decimaledToWei, weiToDecimaled } from './utils';
import { RewardActionTracker } from './reward-action-tracker';

enum RedeemStatus {
  TOKEN_EMPTY,
  TOKEN_NOT_EMPTY,
}

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
      ([bucketIndex, rewardLp]) => rewardLp.gt(BigNumber.from('0'))
    );
    for (let [bucketIndex, rewardLp] of lpMapEntries) {
      await this.collectLpRewardFromBucket(bucketIndex);
    }
  }

  /**
   * Collects the lpReward from bucket. Returns amount of lp used.
   * @param bucketIndex
   */
  private async collectLpRewardFromBucket(bucketIndex: number) {
    const { redeemAs } = this.poolConfig.collectLpReward;
    if (redeemAs === TokenToCollect.QUOTE_ONLY) {
      await this.redeemQuote(bucketIndex);
    } else if (redeemAs === TokenToCollect.COLLATERAL_ONLY) {
      await this.redeemCollateral(bucketIndex);
    } else if (redeemAs === TokenToCollect.QUOTE_THEN_COLLATERAL) {
      const status = await this.redeemQuote(bucketIndex);
      if (status === RedeemStatus.TOKEN_EMPTY) {
        await this.redeemCollateral(bucketIndex);
      }
    } else if (redeemAs === TokenToCollect.COLLATERAL_THEN_QUOTE) {
      const status = await this.redeemCollateral(bucketIndex);
      if (status === RedeemStatus.TOKEN_EMPTY) {
        await this.redeemQuote(bucketIndex);
      }
    }
  }

  private async redeemQuote(bucketIndex: number) {
    var rewardLp = this.lpMap.get(bucketIndex)!;
    const { minLpAmount, rewardAction } = this.poolConfig.collectLpReward;
    const signerAddress = await this.signer.getAddress();
    const bucket = await this.pool.getBucketByIndex(bucketIndex);
    const { exchangeRate, deposit } = await bucket.getStatus();
    const { lpBalance, depositWithdrawable } =
      await bucket.getPosition(signerAddress);
    const minQuoteToWithdraw = await bucket.lpToQuoteTokens(
      decimaledToWei(minLpAmount)
    );
    if (deposit.lt(minQuoteToWithdraw)) return RedeemStatus.TOKEN_EMPTY;
    if (lpBalance.lt(rewardLp)) rewardLp = lpBalance;
    if (rewardLp.lt(decimaledToWei(minLpAmount)))
      return RedeemStatus.TOKEN_NOT_EMPTY;

    const rewardQuote = await bucket.lpToQuoteTokens(rewardLp);
    const quoteToWithdraw = min(depositWithdrawable, rewardQuote);
    if (quoteToWithdraw.lt(minQuoteToWithdraw))
      return RedeemStatus.TOKEN_NOT_EMPTY;
    if (this.config.dryRun) {
      logger.info(
        `DryRun - would collect LP reward as quote. pool: ${this.pool.name}`
      );
    } else {
      try {
        logger.debug(`Collecting LP reward as quote. pool: ${this.pool.name}`);
        await bucketRemoveQuoteToken(bucket, this.signer, quoteToWithdraw);
        logger.info(
          `Collected LP reward as quote. pool: ${this.pool.name}, amount: ${weiToDecimaled(quoteToWithdraw)}`
        );

        if (rewardAction) {
          this.exchangeTracker.addToken(
            rewardAction,
            this.pool.quoteAddress,
            quoteToWithdraw
          );
        }

        const lpConsumed = quoteToLp(quoteToWithdraw, exchangeRate);
        this.subtractReward(bucketIndex, lpConsumed);
        return deposit.gt(quoteToWithdraw)
          ? RedeemStatus.TOKEN_NOT_EMPTY
          : RedeemStatus.TOKEN_EMPTY;
      } catch (error) {
        logger.error(
          `Failed to collect LP reward as quote. pool: ${this.pool.name}`,
          error
        );
        return RedeemStatus.TOKEN_NOT_EMPTY;
      }
    }
  }

  private async redeemCollateral(bucketIndex: number) {
    var rewardLp = this.lpMap.get(bucketIndex)!;
    const { minLpAmount, rewardAction } = this.poolConfig.collectLpReward;
    const signerAddress = await this.signer.getAddress();
    const bucket = await this.pool.getBucketByIndex(bucketIndex);
    const { exchangeRate, collateral } = await bucket.getStatus();
    const { lpBalance, collateralRedeemable } =
      await bucket.getPosition(signerAddress);
    const price = indexToPrice(bucketIndex);
    const minCollateralToWithdraw = await bucket.lpToCollateral(
      decimaledToWei(minLpAmount)
    );
    if (collateral.lt(minCollateralToWithdraw)) return RedeemStatus.TOKEN_EMPTY;
    if (lpBalance.lt(rewardLp)) rewardLp = lpBalance;
    if (rewardLp.lt(decimaledToWei(minLpAmount)))
      return RedeemStatus.TOKEN_NOT_EMPTY;

    const rewardCollateral = await bucket.lpToCollateral(rewardLp);
    const collateralToWithdraw = min(rewardCollateral, collateralRedeemable);
    if (collateralToWithdraw.lt(minCollateralToWithdraw))
      return RedeemStatus.TOKEN_NOT_EMPTY;
    if (this.config.dryRun) {
      logger.info(
        `DryRun - Would collect LP reward as collateral. pool: ${this.pool.name}`
      );
    } else {
      try {
        logger.debug(
          `Collecting LP reward as collateral. pool ${this.pool.name}`
        );
        await bucketRemoveCollateralToken(
          bucket,
          this.signer,
          collateralToWithdraw
        );
        logger.info(
          `Collected LP reward as collateral. pool: ${this.pool.name}, token: ${this.pool.collateralSymbol}, amount: ${weiToDecimaled(collateralToWithdraw)}`
        );

        if (rewardAction) {
          this.exchangeTracker.addToken(
            rewardAction,
            this.pool.collateralAddress,
            collateralToWithdraw
          );
        }

        const lpConsumed = collateralToLp(
          collateralToWithdraw,
          exchangeRate,
          price
        );
        this.subtractReward(bucketIndex, lpConsumed);
        return collateral.gt(collateralToWithdraw)
          ? RedeemStatus.TOKEN_NOT_EMPTY
          : RedeemStatus.TOKEN_EMPTY;
      } catch (error) {
        logger.error(
          `Failed to collect LP reward as collateral. pool: ${this.pool.name}`,
          error
        );
      }
    }
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
    if (rewardLp.eq(BigNumber.from('0'))) return;
    const bucketIndex = parseInt(index.toString());
    const prevReward = this.lpMap.get(bucketIndex) ?? BigNumber.from('0');
    const sumReward = prevReward.add(rewardLp);
    logger.info(
      `Received LP Rewards in pool: ${this.pool.name}, bucketIndex: ${index}, rewardLp: ${rewardLp}`
    );
    this.lpMap.set(bucketIndex, sumReward);
  }

  private subtractReward(bucketIndex: number, lp: BigNumber) {
    const prevReward = this.lpMap.get(bucketIndex) ?? BigNumber.from('0');
    const newReward = prevReward.sub(lp);
    if (newReward.lte(BigNumber.from('0'))) {
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
    if (parsedTransaction.functionFragment.name != 'bucketTake') {
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

function quoteToLp(deposit: BigNumber, exchangeRate: BigNumber): BigNumber {
  return wdiv(deposit, exchangeRate);
}

function collateralToLp(
  collateral: BigNumber,
  exchangeRate: BigNumber,
  price: BigNumber
): BigNumber {
  return wdiv(wdiv(collateral, price), exchangeRate);
}
