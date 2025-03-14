import {
  AjnaSDK,
  FungiblePool,
  getExpiry,
  wdiv,
  wmul,
} from '@ajna-finance/sdk';

import { expect } from 'chai';
import { BigNumber, Wallet, constants } from 'ethers';
import sinon from 'sinon';
import { LpCollector } from '../collect-lp';

import { configureAjna, TokenToCollect } from '../config-types';
import {
  approveErc20,
  getBalanceOfErc20,
  getDecimalsErc20,
  transferErc20,
} from '../erc20';
import { handleKicks } from '../kick';
import { NonceTracker } from '../nonce';
import { RewardActionTracker } from '../reward-action-tracker';
import { handleArbTakes } from '../take';
import { decimaledToWei, delay, waitForConditionToBeTrue } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import './subgraph-mock';
import {
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import {
  getProvider,
  impersonateSigner,
  increaseTime,
  resetHardhat,
  setBalance,
} from './test-utils';
import { Bucket } from '@ajna-finance/sdk/dist/classes/Bucket';
import { TransactionResponse } from '@ethersproject/abstract-provider';

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
    NonceTracker.clearNonces();
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
          redeemAs: TokenToCollect.QUOTE_ONLY,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
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
      return !!rewardLp && rewardLp.gt(constants.Zero);
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
          redeemAs: TokenToCollect.QUOTE_ONLY,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
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
          redeemAs: TokenToCollect.QUOTE_ONLY,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
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
      return !!rewardLp && rewardLp.gt(constants.Zero);
    });
    await lpCollector.stopSubscription();
  });
});

describe('LpCollector collections', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('Collects quote only', async () => {
    const pool = await setup();
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );

    const lpCollector = new LpCollector(
      pool,
      signer,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE_ONLY,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
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
      return !!rewardLp && rewardLp.gt(constants.Zero);
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

  it('Collects collateral only', async () => {
    const pool = await setup();
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );

    const lpCollector = new LpCollector(
      pool,
      signer,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.COLLATERAL_ONLY,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
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
      return !!rewardLp && rewardLp.gt(constants.Zero);
    });
    const liquidation = pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const settleTx = await liquidation.settle(signer);
    await settleTx.verifyAndSubmit();
    await NonceTracker.getNonce(signer);

    const balanceBeforeCollection = await getBalanceOfErc20(
      signer,
      pool.collateralAddress
    );
    await lpCollector.collectLpRewards();
    const balanceAfterCollection = await getBalanceOfErc20(
      signer,
      pool.collateralAddress
    );
    expect(balanceAfterCollection.gt(balanceBeforeCollection)).to.be.true;
    await lpCollector.stopSubscription();
  });

  it('Collects quote then collateral', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const provider = getProvider();
    const ajna = new AjnaSDK(provider);
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    const user1 = Wallet.fromMnemonic(USER1_MNEMONIC).connect(provider);
    await setBalance(user1.address, decimaledToWei(100).toHexString());
    await sendSolAndWethToUser(user1.address, 1, 1);
    const bucket = pool.getBucketByPrice(decimaledToWei(1));
    NonceTracker.resetNonce(user1, user1.address);
    await approveErc20(
      user1,
      MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
      pool.poolAddress,
      constants.MaxInt256
    );
    await addQuoteToken(user1, bucket, decimaledToWei(1));
    NonceTracker.resetNonce(user1, user1.address);
    await approveErc20(
      user1,
      MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress,
      pool.poolAddress,
      constants.MaxInt256
    );
    const addCollateralTx = await pool.addCollateral(
      user1,
      bucket.index,
      decimaledToWei(1)
    );
    await addCollateralTx.verifyAndSubmit();
    const { lpBalance } = await bucket.getPosition(user1.address);

    const lpCollector = new LpCollector(
      pool,
      user1,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.QUOTE_THEN_COLLATERAL,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
    );
    await lpCollector.startSubscription();

    // @ts-ignore: access private property.
    lpCollector.addReward(bucket.index, wdiv(lpBalance, decimaledToWei(1.1)));

    const quoteBalanceBeforeCollection = await getBalanceOfErc20(
      user1,
      pool.quoteAddress
    );
    const collateralBalanceBeforeCollection = await getBalanceOfErc20(
      user1,
      pool.collateralAddress
    );
    NonceTracker.resetNonce(user1, user1.address);
    await lpCollector.collectLpRewards();
    const quoteBalanceAfterCollection = await getBalanceOfErc20(
      user1,
      pool.quoteAddress
    );
    const collateralBalanceAfterCollection = await getBalanceOfErc20(
      user1,
      pool.collateralAddress
    );
    expect(quoteBalanceAfterCollection.gt(quoteBalanceBeforeCollection)).to.be
      .true;
    expect(
      collateralBalanceAfterCollection.gt(collateralBalanceBeforeCollection)
    ).to.be.true;
    const { deposit, collateral } = await bucket.getStatus();
    expect(deposit.eq(constants.Zero)).to.be.true;
    expect(collateral.gt(constants.Zero)).to.be.true;
    await lpCollector.stopSubscription();
  });

  it('Collects collateral then quote', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const provider = getProvider();
    const ajna = new AjnaSDK(provider);
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    const user1 = Wallet.fromMnemonic(USER1_MNEMONIC).connect(provider);
    await setBalance(user1.address, decimaledToWei(100).toHexString());
    await sendSolAndWethToUser(user1.address, 1, 1);
    const bucket = pool.getBucketByPrice(decimaledToWei(1));
    NonceTracker.resetNonce(user1, user1.address);
    await approveErc20(
      user1,
      MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
      pool.poolAddress,
      constants.MaxInt256
    );
    await addQuoteToken(user1, bucket, decimaledToWei(1));
    NonceTracker.resetNonce(user1, user1.address);
    await approveErc20(
      user1,
      MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress,
      pool.poolAddress,
      constants.MaxInt256
    );
    const addCollateralTx = await pool.addCollateral(
      user1,
      bucket.index,
      decimaledToWei(1)
    );
    await addCollateralTx.verifyAndSubmit();
    const { lpBalance } = await bucket.getPosition(user1.address);

    const lpCollector = new LpCollector(
      pool,
      user1,
      {
        collectLpReward: {
          redeemAs: TokenToCollect.COLLATERAL_THEN_QUOTE,
          minLpAmount: 0,
        },
      },
      {},
      sinon.createStubInstance(RewardActionTracker)
    );
    await lpCollector.startSubscription();

    // @ts-ignore: access private property.
    lpCollector.addReward(bucket.index, wdiv(lpBalance, decimaledToWei(1.1)));

    const quoteBalanceBeforeCollection = await getBalanceOfErc20(
      user1,
      pool.quoteAddress
    );
    const collateralBalanceBeforeCollection = await getBalanceOfErc20(
      user1,
      pool.collateralAddress
    );
    NonceTracker.resetNonce(user1, user1.address);
    await lpCollector.collectLpRewards();
    const quoteBalanceAfterCollection = await getBalanceOfErc20(
      user1,
      pool.quoteAddress
    );
    const collateralBalanceAfterCollection = await getBalanceOfErc20(
      user1,
      pool.collateralAddress
    );
    expect(quoteBalanceAfterCollection.gt(quoteBalanceBeforeCollection)).to.be
      .true;
    expect(
      collateralBalanceAfterCollection.gt(collateralBalanceBeforeCollection)
    ).to.be.true;
    const { deposit, collateral } = await bucket.getStatus();
    expect(deposit.gt(constants.Zero)).to.be.true;
    expect(collateral.eq(constants.Zero)).to.be.true;
    await lpCollector.stopSubscription();
  });
});

async function sendSolAndWethToUser(
  userAddress: string,
  solAmt: number,
  wethAmt: number
) {
  const quoteWhaleSigner = await impersonateSigner(
    MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
  );
  await setBalance(
    MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
    decimaledToWei(100).toHexString()
  );
  const quoteDecimals = await getDecimalsErc20(
    quoteWhaleSigner,
    MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress
  );
  await transferErc20(
    quoteWhaleSigner,
    MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
    userAddress,
    decimaledToWei(wethAmt, quoteDecimals)
  );
  const collateralWhaleSigner = await impersonateSigner(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
  );
  await setBalance(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
    decimaledToWei(100).toHexString()
  );
  const collateralDecimals = await getDecimalsErc20(
    collateralWhaleSigner,
    MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress
  );
  await transferErc20(
    collateralWhaleSigner,
    MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress,
    userAddress,
    decimaledToWei(solAmt, collateralDecimals)
  );
}

async function addQuoteToken(
  signer: Wallet,
  bucket: Bucket,
  amount: BigNumber
) {
  const contract = bucket.poolContract.connect(signer);
  const tx: TransactionResponse = await contract.addQuoteToken(
    amount,
    bucket.index,
    getExpiry(signer)
  );
  return tx.wait();
}
