import './subgraph-mock';
import { getLoansToKick, kick } from '../kick';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { MAINNET_CONFIG } from './test-config';
import { configureAjna } from '../config';
import {
  getProvider,
  resetHardhat,
  increaseTime,
  impersonateSigner,
  setBalance,
} from './test-utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { makeGetLoansFromSdk, overrideGetLoans } from './subgraph-mock';
import { expect } from 'chai';
import { arrayFromAsync } from '../utils';

describe('getLoansToKick', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Returns empty array when all loans are in good health.', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
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

    const loansToKick = await arrayFromAsync(
      getLoansToKick({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        price: 0.01,
        config: {
          subgraphUrl: '',
        },
      })
    );
    expect(loansToKick).to.be.empty;
  });

  it('Returns loan when loan is in bad health', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
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
        price: 0,
        config: {
          subgraphUrl: '',
        },
      })
    );
    expect(loansToKick.length).equals(1);
    expect(loansToKick[0].borrower).equals(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
  });
});

describe('kick', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Kicks loan', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
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
        price: 0,
        config: {
          subgraphUrl: '',
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
      price: 0,
    });
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(loan.isKicked).to.be.true;
  });
});
