import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, PoolConfig } from './config';
import { logger } from './logging';

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
    await delay(config.delayBetweenActions);
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
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = weiToDecimaled(liquidationStatus.price);
    // TODO: Add price factor.
    if (price < hpb * poolConfig.take.priceFactor) {
      logger.debug(
        `Found liquidation to arbTake - pool: ${pool.name}, borrower: ${borrower}, price: ${price}, hpb: ${hpb}.`
      );
      result.push({ borrower, hpbIndex });
    } else {
      logger.debug(
        `Not taking liquidation since price is too high. price: ${price} hpb: ${hpb}`
      );
    }
  }
  return result;
}

interface ArbTakeLiquidationParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig' | 'signer'> {
  liquidation: LiquidationToArbTake;
  config: Pick<KeeperConfig, 'dryRun'>;
}

export async function arbTakeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: ArbTakeLiquidationParams) {
  const { borrower, hpbIndex } = liquidation;
  const { dryRun } = config;

  if (dryRun) {
    logger.info(
      `DryRun - would ArbTake - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );
  } else {
    try {
      logger.debug(
        `Sending ArbTake Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}, hpbIndex: ${hpbIndex}`
      );
      const liquidationSdk = pool.getLiquidation(borrower);
      const arbTakeTx = await liquidationSdk.arbTake(signer, hpbIndex);
      await arbTakeTx.verifyAndSubmit();
      logger.info(
        `ArbTake successful - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
      );
    } catch (error) {
      logger.error(
        `Failed to ArbTake. pool: ${pool.name}, borrower: ${borrower}`,
        error
      );
    }
  }
}
