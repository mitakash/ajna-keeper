import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { configureAjna, TokenToCollect } from '../config-types';
import './subgraph-mock';
import {
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { expect } from 'chai';
import { delay } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { handleKicks } from '../kick';
import { handleArbTakes } from '../take';
import { LpCollector } from '../collect-lp';
import { BigNumber, Wallet } from 'ethers';
import { waitForConditionToBeTrue } from '../utils';
import { getBalanceOfErc20 } from '../erc20';
import { NonceTracker } from '../nonce';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import {
  getProvider,
  impersonateSigner,
  increaseTime,
  resetHardhat,
} from './test-utils';
import { RewardActionTracker } from '../reward-action-tracker';

const setup = async () => {
  configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
  const ajna = new AjnaSDK(getProvider());
  const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
    MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
  );
  overrideGetLoans(makeGetLoansFromSdk(pool));
  overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
  await depositQuoteToken({
    pool,
    owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
    amount: 1,
    price: 0.07,
  });
  await drawDebt({
    pool,
    owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
    amountToBorrow: 0.9,
    collateralToPledge: 14,
  });
  await increaseTime(3.154e7 * 2);
  const signer = await impersonateSigner(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
  );
  await handleKicks({
    pool,
    poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
    signer,
    config: {
      dryRun: false,
      subgraphUrl: '',
      coinGeckoApiKey: '',
      delayBetweenActions: 0,
    },
  });
  await increaseTime(86400 * 1.5);
  return pool;
};

describe('LpCollector subscription', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Tracks taker reward after BucketTake', async () => {
    const pool = await setup();
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2
    );
    const lpCollector = new LpCollector(
      pool,
      signer,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE,
          minAmount: 0,
        },
      },
      {},
      new RewardActionTracker(signer, { delayBetweenActions: 0 })
    );
    await lpCollector.startSubscription();
    await handleArbTakes({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });
    await waitForConditionToBeTrue(async () => {
      const entries = Array.from(lpCollector.lpMap.entries());
      const rewardLp: BigNumber | undefined = entries?.[0]?.[1];
      return !!rewardLp && rewardLp.gt(BigNumber.from('0'));
    });
    await lpCollector.stopSubscription();
  });

  it('Does not track bucket takes of other users', async () => {
    const pool = await setup();
    const wallet = Wallet.fromMnemonic(USER1_MNEMONIC);
    const noActionSigner = wallet.connect(getProvider());
    const lpCollector = new LpCollector(
      pool,
      noActionSigner,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE,
          minAmount: 0,
        },
      },
      {},
      new RewardActionTracker(wallet, { delayBetweenActions: 0 })
    );
    await lpCollector.startSubscription();
    const takerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await handleArbTakes({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer: takerSigner,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });
    await delay(5);
    const entries = Array.from(lpCollector.lpMap.entries());
    expect(entries.length).equals(0);
    await lpCollector.stopSubscription();
  });

  it('Tracks rewards for kicker', async () => {
    const pool = await setup();
    const kickerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    const lpCollector = new LpCollector(
      pool,
      kickerSigner,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE,
          minAmount: 0,
        },
      },
      {},
      new RewardActionTracker(kickerSigner, { delayBetweenActions: 0 })
    );
    await lpCollector.startSubscription();
    await delay(5);
    const takerSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2
    );
    await handleArbTakes({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer: takerSigner,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });
    await waitForConditionToBeTrue(async () => {
      const entries = Array.from(lpCollector.lpMap.entries());
      const rewardLp: BigNumber | undefined = entries?.[0]?.[1];
      return !!rewardLp && rewardLp.gt(BigNumber.from('0'));
    });
    await lpCollector.stopSubscription();
  });
});

describe('LpCollector collections', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Collects tracked rewards', async () => {
    const pool = await setup();
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );

    const lpCollector = new LpCollector(
      pool,
      signer,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE,
          minAmount: 0,
        },
      },
      {},
      new RewardActionTracker(signer, { delayBetweenActions: 0 })
    );
    await lpCollector.startSubscription();
    await handleArbTakes({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });
    await waitForConditionToBeTrue(async () => {
      const entries = Array.from(lpCollector.lpMap.entries());
      const rewardLp: BigNumber | undefined = entries?.[0]?.[1];
      return !!rewardLp && rewardLp.gt(BigNumber.from('0'));
    });
    const liquidation = pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const settleTx = await liquidation.settle(signer);
    await settleTx.verifyAndSubmit();
    await NonceTracker.getNonce(signer);

    const balanceBeforeCollection = await getBalanceOfErc20(
      signer,
      pool.quoteAddress
    );
    await lpCollector.collectLpRewards();
    const balanceAfterCollection = await getBalanceOfErc20(
      signer,
      pool.quoteAddress
    );
    expect(balanceAfterCollection.gt(balanceBeforeCollection)).to.be.true;
    await lpCollector.stopSubscription();
  });
});
