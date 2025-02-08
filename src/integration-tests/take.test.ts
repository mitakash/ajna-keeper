import './subgraph-mock';
import { getLoansToKick, handleKicks, kick } from '../kick';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import { configureAjna } from '../config';
import {
  getProvider,
  resetHardhat,
  increaseTime,
  impersonateSigner,
  setBalance,
} from './test-utils';
import {
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { expect } from 'chai';
import { arbTakeLiquidation, getLiquidationsToArbTake } from '../take';
import { Wallet } from 'ethers';
import { arrayFromAsync, decimaledToWei, weiToDecimaled } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';

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
  const loansToKick = await arrayFromAsync(
    getLoansToKick({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        pricing: {
          coinGeckoApiKey: '',
        },
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

  return pool;
};

describe('getLiquidationsToArbTake', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('gets nothing when there arent any kicked loans', async () => {
    const pool = await setup();

    const liquidationsToArbTake = await getLiquidationsToArbTake({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
      },
    });
    expect(liquidationsToArbTake).to.be.empty;
  });

  it('gets loans when there are kicked loans', async () => {
    const pool = await setup();
    await increaseTime(86400 * 1);

    const liquidationsToArbTake = await getLiquidationsToArbTake({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
      },
    });
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
    const pool = await setup();
    await increaseTime(86400 * 1); // Increase timestamp by 1 day.
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    setBalance(signer.address, decimaledToWei(100).toHexString());

    const liquidationsToArbTake = await getLiquidationsToArbTake({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
      },
    });

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
