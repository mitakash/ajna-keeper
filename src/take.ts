import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, PoolConfig } from './config-types';
import { logger } from './logging';
import { liquidationArbTake } from './transactions';

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
  for await (const liquidation of getLiquidationsToArbTake({
    pool,
    poolConfig,
    config,
  })) {
    await arbTakeLiquidation({
      pool,
      poolConfig,
      signer,
      liquidation,
      config,
    });
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

export async function* getLiquidationsToArbTake({
  pool,
  poolConfig,
  config,
}: GetLiquidationsToArbTakeParams): AsyncGenerator<LiquidationToArbTake> {
  const { subgraphUrl } = config;
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    subgraphUrl,
    pool.poolAddress,
    poolConfig.take.minCollateral
  );
  const minDeposit = poolConfig.take.minCollateral / hpb;
  for (const auction of liquidationAuctions) {
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = weiToDecimaled(liquidationStatus.price);
    // TODO: May want to include a hardcoded minDeposit value when minCollateral is zero.
    const { buckets } = await subgraph.getHighestMeaningfulBucket(
      config.subgraphUrl,
      pool.poolAddress,
      minDeposit.toString()
    );
    if (buckets.length == 0) continue;
    const hmbIndex = buckets[0].bucketIndex;
    const hmbPrice = weiToDecimaled(pool.getBucketByIndex(hmbIndex).price);
    if (price < hmbPrice * poolConfig.take.priceFactor) {
      logger.debug(
        `Found liquidation to arbTake - pool: ${pool.name}, borrower: ${borrower}, price: ${price}, hpb: ${hmbPrice}.`
      );
      yield { borrower, hpbIndex: hmbIndex };
    } else {
      logger.debug(
        `Not taking liquidation since price is too high. price: ${price} hpb: ${hmbPrice}`
      );
    }
  }
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
      await liquidationArbTake(liquidationSdk, signer, hpbIndex);
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
