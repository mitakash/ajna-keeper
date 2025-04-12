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

export async function handleTakes({
  signer,
  pool,
  poolConfig,
  config,
}: HandleArbParams) {
  for await (const liquidation of getLiquidationsToTake({
    pool,
    poolConfig,
    config,
  })) {
    if (liquidation.takeStrategy === TakeStrategy.Take) {
      await takeLiquidation({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
    } else if (liquidation.takeStrategy === TakeStrategy.ArbTake) {
      await arbTakeLiquidation({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
    }
    await delay(config.delayBetweenActions);
  }
}

enum TakeStrategy {
  Take = 1,
  ArbTake = 2,
}

interface LiquidationToTake {
  takeStrategy: TakeStrategy;
  borrower: string;
  hpbIndex: number;
}

interface GetLiquidationsToArbTakeParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig'> {
  config: Pick<KeeperConfig, 'subgraphUrl'>;
}

export async function* getLiquidationsToTake({
  pool,
  poolConfig,
  config,
}: GetLiquidationsToArbTakeParams): AsyncGenerator<LiquidationToTake> {
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

    // TODO: Create a `checkIfTakeable` function which calculates takeablePrice based on configuration and
    // liquiditySource (1inch) API
    const takeablePrice = 0;
    if (price <= takeablePrice) {
      logger.debug(
        `Found liquidation to take - pool: ${pool.name}, borrower: ${borrower}, price: ${price} takeablePrice: ${takeablePrice}.`
      );
      yield { takeStrategy: TakeStrategy.Take, borrower, hpbIndex: 0 };
    }

    // TODO: Perhaps refactor this into a `checkIfArbTakeable` function.
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
      yield { takeStrategy: TakeStrategy.ArbTake, borrower, hpbIndex: hmbIndex };
    } else {
      logger.debug(
        `Not taking liquidation since price is too high. price: ${price} hpb: ${hmbPrice}`
      );
    }
  }
}

interface ArbTakeLiquidationParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig' | 'signer'> {
  liquidation: LiquidationToTake;
  config: Pick<KeeperConfig, 'dryRun'>;
}

export async function takeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}) {
  const { borrower } = liquidation;
  const { dryRun } = config;

  // TODO: Check configured liquidity source.  If 1inch, call 1inch API's `swap` function and
  // pass data to the AjnaKeeperTaker contract.
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
