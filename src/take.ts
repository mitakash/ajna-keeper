import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, RequireFields } from './utils';
import { KeeperConfig, PoolConfig } from './config';
import { getAuctionPrice } from './price';
import { getTime } from './time';

interface HandleArbParams {
  signer: Signer;
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}

export async function handleArbTakes({
  signer,
  pool,
  poolConfig,
  config,
}: HandleArbParams) {
  const liquidationsToArbTake = await getLiquidationsToArbTake({
    pool,
    poolConfig,
    config,
  });

  for (const liquidation of liquidationsToArbTake) {
    await arbTakeLiquidation({ pool, poolConfig, signer, liquidation, config });
  }
}

interface LiquidationToArbTake {
  borrower: string;
  hpbIndex: number;
}

interface GetLiquidationsToArbTakeParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig'> {
  config: Pick<KeeperConfig, 'subgraphUrl'>;
}

export async function getLiquidationsToArbTake({
  pool,
  poolConfig,
  config,
}: GetLiquidationsToArbTakeParams): Promise<Array<LiquidationToArbTake>> {
  const { subgraphUrl } = config;
  const result: LiquidationToArbTake[] = [];
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    subgraphUrl,
    pool.poolAddress,
    poolConfig.take.minCollateral
  );
  for (const auction of liquidationAuctions) {
    const { borrower, kickTime, referencePrice } = auction;
    const timeElapsed = getTime() - kickTime;
    const currentPrice = getAuctionPrice(referencePrice, timeElapsed);
    if (currentPrice < hpb) {
      result.push({ borrower, hpbIndex });
    }
  }
  return result;
}

interface ArbTakeLiquidationParams extends Omit<HandleArbParams, 'config'> {
  liquidation: LiquidationToArbTake;
  config: Pick<KeeperConfig, 'delayBetweenActions' | 'dryRun'>;
}

export async function arbTakeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: ArbTakeLiquidationParams) {
  const { borrower, hpbIndex } = liquidation;
  const { delayBetweenActions, dryRun } = config;

  if (dryRun) {
    console.log(
      `DryRun - would ArbTake - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );
  } else {
    // TODO: should we loop through this step until collateral remaining is zero?
    console.log(
      `Sending ArbTake Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );
    const liquidationSdk = pool.getLiquidation(borrower);
    const arbTakeTx = await liquidationSdk.arbTake(signer, hpbIndex);
    await arbTakeTx.verifyAndSubmit();
    console.log(
      `ArbTake successful - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );

    // withdraw liquidity.
    if (poolConfig.take.withdrawRewardLiquidity) {
      const withdrawTx = await pool.withdrawLiquidity(signer, [hpbIndex]);
      await withdrawTx.verifyAndSubmit();
      await delay(delayBetweenActions);
    }
  }
}
