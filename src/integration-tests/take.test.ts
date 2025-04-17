import './subgraph-mock';
import { getLoansToKick, handleKicks, kick } from '../kick';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import { configureAjna } from '../config-types';
import {
  getProvider,
  resetHardhat,
  increaseTime,
  impersonateSigner,
  setBalance,
} from './test-utils';
import {
  makeGetHighestMeaningfulBucket,
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetHighestMeaningfulBucket,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { expect } from 'chai';
import {
  arbTakeLiquidation,
  getLiquidationsToTake,
  handleTakes,
} from '../take';
import { Wallet } from 'ethers';
import { arrayFromAsync, decimaledToWei, weiToDecimaled } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { SECONDS_PER_YEAR, SECONDS_PER_DAY } from '../constants';
import { NonceTracker } from '../nonce';

const setup = async () => {
  configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
  const ajna = new AjnaSDK(getProvider());
  const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
    MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
  );
  overrideGetLoans(makeGetLoansFromSdk(pool));
  overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
  overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));
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
  await increaseTime(SECONDS_PER_YEAR * 2);
  const loansToKick = await arrayFromAsync(
    getLoansToKick({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        coinGeckoApiKey: '',
      },
    })
  );
  const signer = await impersonateSigner(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
  );
  setBalance(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
    '100000000000000000000'
  );
  await kick({
    pool,
    signer,
    loanToKick: loansToKick[0],
    config: {
      dryRun: false,
    },
  });

  return { pool, signer };
};

describe('getLiquidationsToArbTake', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('gets nothing when there arent any kicked loans', async () => {
    const { pool, signer } = await setup();

    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    expect(liquidationsToArbTake).to.be.empty;
  });

  it('gets loans when there are kicked loans', async () => {
    const { pool, signer } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1);

    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    expect(liquidationsToArbTake.length).equals(1);
    expect(liquidationsToArbTake[0].borrower).equals(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
  });
});

describe('arbTakeLiquidation', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('ArbTakes eligible liquidations and earns lpb', async () => {
    const { pool } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1); // Increase timestamp by 1 day.
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    setBalance(signer.address, decimaledToWei(100).toHexString());

    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );

    await arbTakeLiquidation({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
      },
      liquidation: liquidationsToArbTake[0],
    });
    const bucket = await pool.getBucketByIndex(
      liquidationsToArbTake[0].hpbIndex
    );
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const lpBalance = await bucket.lpBalance(await signer.getAddress());
    expect(weiToDecimaled(lpBalance)).to.be.greaterThan(0);
    expect(weiToDecimaled(loan.collateral)).equals(0);
  });
});

describe('handleTakes', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('ArbTakes multiple times to fill multiple buckets in one auction.', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));
    const bucket1 = pool.getBucketByPrice(decimaledToWei(1));
    const bucket2 = pool.getBucketByIndex(bucket1.index + 1);
    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: weiToDecimaled(bucket1.price),
    });
    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: weiToDecimaled(bucket2.price),
    });
    await drawDebt({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
      amountToBorrow: 1.5,
      collateralToPledge: 1.6,
    });
    await increaseTime(SECONDS_PER_YEAR * 2);
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      '100000000000000000000'
    );
    await handleKicks({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        coinGeckoApiKey: '',
        delayBetweenActions: 0,
      },
    });
    const AUCTION_WAIT_TIME = 60 * 20 * 6 + 2 * 2 * 60 * 60 + 50 * 60;
    await increaseTime(AUCTION_WAIT_TIME);

    await handleTakes({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    const bucket1Status = await bucket1.getStatus();
    expect(weiToDecimaled(bucket1Status.deposit)).lessThan(
      1e-7,
      'Bucket 1 should only have dust remaining'
    );

    await handleTakes({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    const bucket2Status = await bucket2.getStatus();
    expect(weiToDecimaled(bucket2Status.deposit)).lessThan(
      0.8,
      'Bucket 2 should have less deposit than it started with.'
    );
  });
});