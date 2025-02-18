import './subgraph-mock';
import {
  AjnaSDK,
  ERC20Pool__factory,
  FungiblePool,
  Signer,
} from '@ajna-finance/sdk';
import { MAINNET_CONFIG } from './test-config';
import { configureAjna } from '../config-types';
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
import { weiToDecimaled } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { collectBondFromPool } from '../collect-bond';
import { handleKicks } from '../kick';
import { handleArbTakes } from '../take';
import { NonceTracker } from '../nonce';

const getAmountWithdrawn = async (pool: FungiblePool, signer: Signer) => {
  const signerAddress = await signer.getAddress();
  const poolContract = ERC20Pool__factory.connect(pool.poolAddress, signer);
  const bondEvtFilter = poolContract.filters.BondWithdrawn(signerAddress);
  const evts = await poolContract.queryFilter(
    bondEvtFilter,
    MAINNET_CONFIG.BLOCK_NUMBER
  );
  const amountWithdrawn = evts.reduce(
    (sum, evt) => sum + weiToDecimaled(evt.args.amount),
    0
  );
  return amountWithdrawn;
};

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
  return pool;
};

describe('collectBondFromPool', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Does nothing when there is no bond', async () => {
    const pool = await setup();
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await collectBondFromPool({ signer, pool, config: {} });
    const amtWithdraw = await getAmountWithdrawn(pool, signer);
    expect(amtWithdraw).equals(0);
  });

  it('Does nothing when there is a locked bond', async () => {
    const pool = await setup();
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

    await collectBondFromPool({ signer, pool, config: {} });
    const amtWithdraw = await getAmountWithdrawn(pool, signer);
    expect(amtWithdraw).equals(0);
  });

  it('Collects bond when a bond is available', async () => {
    const pool = await setup();
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
    await increaseTime(86400 * 2);
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
    await increaseTime(86400 * 2);
    const liquidation = await pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const settleTx = await liquidation.settle(signer);
    await settleTx.verifyAndSubmit();
    await NonceTracker.getNonce(signer);

    await collectBondFromPool({ signer, pool, config: {} });
    const amtWithdrawn = await getAmountWithdrawn(pool, signer);
    expect(amtWithdrawn).greaterThan(0);
  });
});
