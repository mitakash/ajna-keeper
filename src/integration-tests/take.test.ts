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
} from './test-utils';
import {
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { expect } from 'chai';
import { getLiquidationsToArbTake } from '../take';

describe.only('getLiquidationsToArbTake', () => {
  before(async () => {
    await resetHardhat();
  });

  it('gets nothing when there arent any kicked loans', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.WBTC_USDC_POOL.poolConfig.address
    );
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    const liquidationsToArbTake = await getLiquidationsToArbTake({
      pool,
      poolConfig: MAINNET_CONFIG.WBTC_USDC_POOL.poolConfig,
      config: {
        subgraphUrl: '',
      },
    });
    expect(liquidationsToArbTake).to.be.empty;
  });
});
