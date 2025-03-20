import './subgraph-mock';
import { approveBalanceForLoanToKick, getLoansToKick, kick } from '../kick';
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
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { makeGetLoansFromSdk, overrideGetLoans } from './subgraph-mock';
import { expect } from 'chai';
import { arrayFromAsync, decimaledToWei } from '../utils';
import { constants, Wallet } from 'ethers';
import { getAllowanceOfErc20, transferErc20 } from '../erc20';

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
        config: {
          subgraphUrl: '',
          coinGeckoApiKey: '',
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
        config: {
          subgraphUrl: '',
          coinGeckoApiKey: '',
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
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(loan.isKicked).to.be.true;
  });
});

describe('approveBalanceForLoanToKick', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Fails when there is insufficient balance', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    const quoteWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
    );
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    await setBalance(signer.address, decimaledToWei(100).toHexString());
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      decimaledToWei(100).toHexString()
    );
    await transferErc20(
      quoteWhaleSigner,
      pool.quoteAddress,
      signer.address,
      decimaledToWei(1)
    );

    const loanToKick = {
      borrower: '0x0000000000000000000000000000000000000000',
      liquidationBond: decimaledToWei(10),
      estimatedRemainingBond: decimaledToWei(50),
      limitPrice: 1,
    };
    const approved = await approveBalanceForLoanToKick({
      pool,
      signer,
      loanToKick,
    });
    const allowance = await getAllowanceOfErc20(
      signer,
      pool.quoteAddress,
      pool.poolAddress
    );
    expect(approved).to.be.false;
    expect(allowance.eq(constants.Zero)).to.be.true;
  });

  it('Approves bond when there is sufficient balance for one bond', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    const quoteWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
    );
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    await setBalance(signer.address, decimaledToWei(100).toHexString());
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      decimaledToWei(100).toHexString()
    );
    await transferErc20(
      quoteWhaleSigner,
      pool.quoteAddress,
      signer.address,
      decimaledToWei(20)
    );

    const loanToKick = {
      borrower: '0x0000000000000000000000000000000000000000',
      liquidationBond: decimaledToWei(10),
      estimatedRemainingBond: decimaledToWei(50),
      limitPrice: 1,
    };
    const approved = await approveBalanceForLoanToKick({
      pool,
      signer,
      loanToKick,
    });
    const allowance = await getAllowanceOfErc20(
      signer,
      pool.quoteAddress,
      pool.poolAddress
    );
    expect(approved, 'approval returns true').to.be.true;
    expect(
      allowance.gte(decimaledToWei(10)) && allowance.lte(decimaledToWei(11)),
      'allowance is roughly 10 WETH'
    ).to.be.true;
  });

  it('Approves bond when there is sufficient balance for all bonds', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    const quoteWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
    );
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    await setBalance(signer.address, decimaledToWei(100).toHexString());
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      decimaledToWei(100).toHexString()
    );
    await transferErc20(
      quoteWhaleSigner,
      pool.quoteAddress,
      signer.address,
      decimaledToWei(60)
    );

    const loanToKick = {
      borrower: '0x0000000000000000000000000000000000000000',
      liquidationBond: decimaledToWei(10),
      estimatedRemainingBond: decimaledToWei(50),
      limitPrice: 1,
    };
    const approved = await approveBalanceForLoanToKick({
      pool,
      signer,
      loanToKick,
    });
    const allowance = await getAllowanceOfErc20(
      signer,
      pool.quoteAddress,
      pool.poolAddress
    );
    expect(approved, 'approval returns true').to.be.true;
    expect(
      allowance.gte(decimaledToWei(50)) && allowance.lt(decimaledToWei(51)),
      'Allowance is roughly 50 Weth'
    ).to.be.true;
  });
});
