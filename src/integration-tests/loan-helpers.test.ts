import { AjnaSDK } from '@ajna-finance/sdk';
import { expect } from 'chai';
import { configureAjna } from '../config';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { MAINNET_CONFIG } from './test-config';
import { getProvider, resetHardhat } from './test-utils';
import { decimaledToWei, weiToDecimaled } from '../utils';

const setup = async (poolAddress: string) => {
  configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
  const sdk = new AjnaSDK(getProvider());
  return await sdk.fungiblePoolFactory.getPoolByAddress(poolAddress);
};

describe('depositQuoteToken', () => {
  before(async () => {
    await resetHardhat();
  });

  it('Can deposit into specified pool', async () => {
    const pool = await setup(MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address);
    const price = 1;
    const userAddress = MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress;
    await depositQuoteToken({
      pool,
      owner: userAddress,
      amount: 1,
      price,
    });
    const priceBn = decimaledToWei(price);
    const bucket = await pool.getBucketByPrice(priceBn);
    const balanceBn = await bucket.lpBalance(userAddress);
    const balance = weiToDecimaled(balanceBn);
    expect(balance).greaterThan(0.9).and.lessThan(1.1);
  });
});

describe('drawDebt', () => {
  before(async () => {
    await resetHardhat();
    const pool = await setup(MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address);

    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: 1,
    });
  });

  it('can take out a loan', async () => {
    const pool = await setup(MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address);

    await drawDebt({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
      amountToBorrow: 0.5,
      collateralToPledge: 1,
    });

    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const tp = weiToDecimaled(loan.thresholdPrice);
    expect(tp).greaterThan(0.4).and.lessThan(0.6);
  });
});
