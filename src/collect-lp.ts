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
import { swapToWETH } from './uniswap';
import { decimaledToWei, weiToDecimaled } from './utils';

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
    private config: Pick<KeeperConfig, 'dryRun' | 'wethAddress'>
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
      redeemAs,
      minAmount,
      shouldExchangeRewardsToWeth,
      exchangeRewardsFeeAmount,
    } = this.poolConfig.collectLpReward;
    const signerAddress = await this.signer.getAddress();
    const bucket = await this.pool.getBucketByIndex(bucketIndex);
    const { exchangeRate, collateral } = await bucket.getStatus();
    const { lpBalance, depositWithdrawable } =
      await bucket.getPosition(signerAddress);
    if (lpBalance.lt(rewardLp)) rewardLp = lpBalance;

    let tokenCollected: string | null = null;
    let amountCollected: BigNumber = BigNumber.from('0');

    if (redeemAs == TokenToCollect.QUOTE) {
      const rewardQuote = await bucket.lpToQuoteTokens(rewardLp);
      const quoteToWithdraw = min(depositWithdrawable, rewardQuote);
      if (quoteToWithdraw.gt(decimaledToWei(minAmount))) {
        if (this.config.dryRun) {
          logger.info(
            `DryRun - would collect LP reward as quote. pool: ${this.pool.name}`
          );
        } else {
          try {
            logger.debug(
              `Collecting LP reward as quote. pool: ${this.pool.name}`
            );
            const withdrawQuoteTx = await bucket.removeQuoteToken(
              this.signer,
              quoteToWithdraw
            );
            await withdrawQuoteTx.verifyAndSubmit();
            logger.info(
              `Collected LP reward as quote. pool: ${this.pool.name}, amount: ${weiToDecimaled(quoteToWithdraw)}`
            );

            if (!!shouldExchangeRewardsToWeth && exchangeRewardsFeeAmount) {
              tokenCollected = this.pool.quoteAddress;
              amountCollected = quoteToWithdraw;

              await swapToWETH(
                this.signer,
                tokenCollected,
                amountCollected,
                exchangeRewardsFeeAmount,
                this.config.wethAddress
              );
            }

            return wdiv(quoteToWithdraw, exchangeRate);
          } catch (error) {
            logger.error(
              `Failed to collect LP reward as quote. pool: ${this.pool.name}`,
              error
            );
          }
        }
      }
    } else {
      const rewardCollateral = await bucket.lpToCollateral(rewardLp);
      const collateralToWithdraw = min(rewardCollateral, collateral);
      if (collateralToWithdraw.gt(decimaledToWei(minAmount))) {
        if (this.config.dryRun) {
          logger.info(
            `DryRun - Would collect LP reward as collateral. pool: ${this.pool.name}`
          );
        } else {
          try {
            logger.debug(
              `Collecting LP reward as collateral. pool ${this.pool.name}`
            );
            const withdrawCollateralTx = await bucket.removeQuoteToken(
              this.signer,
              collateralToWithdraw
            );
            await withdrawCollateralTx.verifyAndSubmit();
            logger.info(
              `Collected LP reward as collateral. pool: ${this.pool.name}, token: ${this.pool.collateralSymbol}, amount: ${weiToDecimaled(collateralToWithdraw)}`
            );

            if (!!shouldExchangeRewardsToWeth && exchangeRewardsFeeAmount) {
              tokenCollected = this.pool.collateralAddress;
              amountCollected = collateralToWithdraw;

              await swapToWETH(
                this.signer,
                tokenCollected,
                amountCollected,
                exchangeRewardsFeeAmount,
                this.config.wethAddress
              );
            }

            const price = indexToPrice(bucketIndex);
            return wdiv(wdiv(collateralToWithdraw, price), exchangeRate);
          } catch (error) {
            logger.error(
              `Failed to collect LP reward as collateral. pool: ${this.pool.name}`,
              error
            );
          }
        }
      }
    }
    return BigNumber.from('0');
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
