import './subgraph-mock';
import { approveBalanceForLoanToKick, getLoansToKick, kick, handleKicks } from '../kick';
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
import { arrayFromAsync, decimaledToWei, weiToDecimaled } from '../utils';
import { constants, Wallet } from 'ethers';
import { getAllowanceOfErc20, getBalanceOfErc20, transferErc20 } from '../erc20';
import { SECONDS_PER_YEAR, SECONDS_PER_DAY } from '../constants';
import { NonceTracker } from '../nonce';

describe('getLoansToKick', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Returns empty when loan is healthy (TP < LUP)', async () => {
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

    // Verify pre-condition: loan exists and TP < LUP (healthy)
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const prices = await pool.getPrices();
    expect(loan.debt.gt(constants.Zero), 'Loan should have debt').to.be.true;
    expect(loan.collateral.gt(constants.Zero), 'Loan should have collateral').to.be.true;
    expect(
      loan.thresholdPrice.lt(prices.lup),
      `TP (${weiToDecimaled(loan.thresholdPrice)}) should be below LUP (${weiToDecimaled(prices.lup)})`
    ).to.be.true;

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

  it('Returns loan when unhealthy (TP > LUP after interest accrual)', async () => {
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
    await increaseTime(SECONDS_PER_YEAR * 2);

    // Verify pre-condition: TP > LUP after interest accrual
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const prices = await pool.getPrices();
    expect(
      loan.thresholdPrice.gt(prices.lup),
      `TP (${weiToDecimaled(loan.thresholdPrice)}) should exceed LUP (${weiToDecimaled(prices.lup)}) after 2 years`
    ).to.be.true;

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
    // Verify kick data is populated correctly
    expect(loansToKick[0].liquidationBond.gt(constants.Zero), 'Bond should be > 0').to.be.true;
    expect(loansToKick[0].limitPrice).to.be.greaterThan(0);
  });

  it('Skips loan when debt is below minDebt threshold', async () => {
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
    await increaseTime(SECONDS_PER_YEAR * 2);

    // Set minDebt higher than the actual debt (~0.9 + interest ≈ 1.0)
    const loansToKick = await arrayFromAsync(
      getLoansToKick({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          kick: {
            minDebt: 100, // 100 WETH — way above the ~1 WETH debt
            priceFactor: 0.9,
          },
        },
        config: {
          subgraphUrl: '',
          coinGeckoApiKey: '',
        },
      })
    );
    expect(loansToKick).to.be.empty;
  });

  it('Skips loan when NP * priceFactor < market price', async () => {
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
    await increaseTime(SECONDS_PER_YEAR * 2);

    // Use a very low priceFactor so NP * priceFactor < price
    // (The pool uses FIXED price source = 0.075)
    const loansToKick = await arrayFromAsync(
      getLoansToKick({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          kick: {
            minDebt: 0,
            priceFactor: 0.001, // NP * 0.001 will be far below the fixed price of 0.075
          },
        },
        config: {
          subgraphUrl: '',
          coinGeckoApiKey: '',
        },
      })
    );
    expect(loansToKick).to.be.empty;
  });
});

describe('kick', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('Kicks loan and creates auction with locked bond', async () => {
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

    // Verify loan is now in liquidation
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(loan.isKicked).to.be.true;

    // Verify kicker's bond is locked (per Ajna: kicker must post bond)
    const signerAddress = await signer.getAddress();
    const { claimable, locked } = await pool.kickerInfo(signerAddress);
    expect(locked.gt(constants.Zero), 'Kicker bond should be locked').to.be.true;

    // Verify auction was created with valid state
    const liquidation = pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const status = await liquidation.getStatus();
    // Auction price starts at 256 * max(HTP, NP, ReferencePrice) — should be > 0
    expect(status.price.gt(constants.Zero), 'Auction price should be > 0').to.be.true;
    // Collateral should still be in the auction (not yet taken)
    expect(weiToDecimaled(status.collateral)).to.equal(14);
  });

  it('dryRun does not kick the loan', async () => {
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
        dryRun: true,
      },
    });

    // Loan should NOT be kicked
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(loan.isKicked).to.be.false;

    // No bond should be locked
    const signerAddress = await signer.getAddress();
    const { locked } = await pool.kickerInfo(signerAddress);
    expect(locked.eq(constants.Zero), 'No bond should be locked in dryRun').to.be.true;
  });
});

describe('approveBalanceForLoanToKick', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
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

  it('Approves single bond + margin when balance covers one bond but not all', async () => {
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
    // Balance (20) < estimatedRemaining (50), so approves single bond (10) + 1% margin = 10.1
    expect(allowance.gte(decimaledToWei(10)), 'Allowance should be >= 10 WETH').to.be.true;
    expect(allowance.lte(decimaledToWei(11)), 'Allowance should be <= 11 WETH (bond + margin)').to.be.true;
  });

  it('Approves full estimated remaining + margin when balance is sufficient', async () => {
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
    // Balance (60) >= estimatedRemaining (50), so approves 50 + 1% margin = 50.5
    expect(allowance.gte(decimaledToWei(50)), 'Allowance should be >= 50 WETH').to.be.true;
    expect(allowance.lt(decimaledToWei(51)), 'Allowance should be < 51 WETH').to.be.true;
  });
});

describe('handleKicks (end-to-end)', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('Clears allowance after kicking', async () => {
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
    await increaseTime(SECONDS_PER_YEAR * 2);
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      '100000000000000000000'
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

    // Loan should be kicked
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(loan.isKicked).to.be.true;

    // handleKicks clears allowance after all kicks complete
    const signerAddress = await signer.getAddress();
    const allowance = await getAllowanceOfErc20(
      signer,
      pool.quoteAddress,
      pool.poolAddress
    );
    expect(
      allowance.eq(constants.Zero),
      'Allowance should be cleared to 0 after handleKicks'
    ).to.be.true;
  });
});
