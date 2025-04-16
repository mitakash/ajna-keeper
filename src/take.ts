import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, LiquiditySource, PoolConfig } from './config-types';
import { logger } from './logging';
import { liquidationArbTake } from './transactions';
import { DexRouter } from './dex-router';
import { BigNumber, ethers } from 'ethers';
import { SwapCalldata } from './1inch';
import { AjnaKeeperTaker__factory } from '../typechain-types';
import { getDecimalsErc20 } from './erc20';
import { decimaledToWei } from './utils';

interface HandleTakeParams {
  signer: Signer;
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions' | 'connectorTokens' | 'oneInchRouters' | 'keeperTaker'>;
}

export async function handleTakes({
  signer,
  pool,
  poolConfig,
  config,
}: HandleTakeParams) {
  for await (const liquidation of getLiquidationsToTake({
    pool,
    poolConfig,
    signer,
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
  collateral: BigNumber;
}

interface GetLiquidationsToTakeParams
  extends Pick<HandleTakeParams, 'pool' | 'poolConfig' | 'signer'> {
  config: Pick<KeeperConfig, 'subgraphUrl'>;
}

async function checkIfArbTakeable(
  pool: FungiblePool,
  price: number,
  collateral: BigNumber,
  config: RequireFields<PoolConfig, 'take'>,
  subgraphUrl: string,
  minDeposit: string,
  signer: Signer
): Promise<{ isTakeable: boolean; hpbIndex: number }> {
  if (!config.take.minCollateral || !config.take.hpbPriceFactor) {
    return { isTakeable: false, hpbIndex: 0 };
  }

  const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
  const minCollateral = ethers.BigNumber.from(decimaledToWei(config.take.minCollateral, collateralDecimals));
  if (collateral.lt(minCollateral)) {
    logger.debug(
      `Collateral ${collateral} below minCollateral ${minCollateral} for pool: ${pool.name}`
    );
    return { isTakeable: false, hpbIndex: 0 };
  }

  const { buckets } = await subgraph.getHighestMeaningfulBucket(
    subgraphUrl,
    pool.poolAddress,
    minDeposit
  );
  if (buckets.length === 0) {
    return { isTakeable: false, hpbIndex: 0 };
  }

  const hmbIndex = buckets[0].bucketIndex;
  const hmbPrice = Number(weiToDecimaled(pool.getBucketByIndex(hmbIndex).price));
  const maxArbPrice = hmbPrice * config.take.hpbPriceFactor;
  return {
    isTakeable: price < maxArbPrice,
    hpbIndex: hmbIndex,
  };
}

export async function* getLiquidationsToTake({
  pool,
  poolConfig,
  signer,
  config,
}: GetLiquidationsToTakeParams): AsyncGenerator<LiquidationToTake> {
  const { subgraphUrl } = config;
  const minCollateral = poolConfig.take.minCollateral ?? 0;
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    subgraphUrl,
    pool.poolAddress,
    minCollateral
  );

  const DEFAULT_MIN_DEPOSIT = '0.001';
  let minDeposit = DEFAULT_MIN_DEPOSIT;
  if (poolConfig.take.minCollateral && hpb && !ethers.BigNumber.from(hpb).isZero()) {
    const minCollateralBN = ethers.BigNumber.from(decimaledToWei(poolConfig.take.minCollateral, 18));
    const hpbBN = ethers.BigNumber.from(hpb);
    minDeposit = minCollateralBN.mul(ethers.utils.parseUnits('1', 18)).div(hpbBN).toString();
  }

  for (const auction of liquidationAuctions) {
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = Number(weiToDecimaled(liquidationStatus.price));
    const collateral = liquidationStatus.collateral;

    // TODO: Create a `checkIfTakeable` function which calculates takeablePrice based on configuration and
    // liquiditySource (1inch) API
    const takeablePrice = 0;
    if (price <= takeablePrice && poolConfig.take.liquiditySource === LiquiditySource.ONEINCH && poolConfig.take.marketPriceFactor) {
      logger.debug(
        `Found liquidation to take - pool: ${pool.name}, borrower: ${borrower}, price: ${price}, takeablePrice: ${takeablePrice}`
      );
      yield { takeStrategy: TakeStrategy.Take, borrower, hpbIndex: 0, collateral };
      continue;
    }

    if (poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor) {
      const { isTakeable, hpbIndex: arbHpbIndex } = await checkIfArbTakeable(
        pool,
        price,
        collateral,
        poolConfig,
        subgraphUrl,
        minDeposit,
        signer
      );
      if (isTakeable) {
        logger.debug(
          `Found liquidation to arbTake - pool: ${pool.name}, borrower: ${borrower}, price: ${price}`
        );
        yield { takeStrategy: TakeStrategy.ArbTake, borrower, hpbIndex: arbHpbIndex, collateral };
      } else {
        logger.debug(
          `Not taking liquidation since price is too high for pool: ${pool.name}, borrower: ${borrower}, price: ${price}`
        );
      }
    }
  }
}

interface TakeLiquidationParams
  extends Pick<HandleTakeParams, 'pool' | 'poolConfig' | 'signer'> {
  liquidation: LiquidationToTake;
  config: Pick<KeeperConfig, 'dryRun' | 'connectorTokens' | 'oneInchRouters' | 'keeperTaker'>;
}

export async function takeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: TakeLiquidationParams) {
  const { borrower } = liquidation;
  const { dryRun } = config;

  if (dryRun) {
    logger.info(
      `DryRun - would Take - poolAddress: ${pool.poolAddress}, borrower: ${borrower} using ${poolConfig.take.liquiditySource}`
    );
  } else {
    if (poolConfig.take.liquiditySource === LiquiditySource.ONEINCH) {
        const dexRouter = new DexRouter(signer, {
          oneInchRouters: config.oneInchRouters ?? {},
          connectorTokens: config.connectorTokens ?? [],
        });
        const swapData = await dexRouter.getSwapDataFromOneInch(
              await signer.getChainId(),
              liquidation.collateral,
              pool.collateralAddress,
              pool.quoteAddress,
              1,
              await signer.getAddress(),
              true,
            );
        // const swapCalldata: SwapCalldata = decodeSwapCalldata(swapData.data);
        // const swapDetails = {
        //   aggregationExecutor: swapCalldata.aggregationExecutor,
        //   swapDescription: swapCalldata.swapDescription,
        //   opaqueData: swapCalldata.encodedCalls,
        // }

        const keeperTaker = AjnaKeeperTaker__factory.connect(config.keeperTaker!!, signer);
        // TODO: need to encode and pass OneInchSwapDetails as last parameter
        /*const tx = await keeperTaker.takeWithAtomicSwap(
          pool.poolAddress,
          liquidation.borrower,
          liquidation.collateral,
          poolConfig.take.liquiditySource,
          dexRouter.getRouter(await signer.getChainId())!!,
          swapDetails, // TODO: Need to abi.encode
        );*/
    } else {
      logger.error(`Valid liquidity source not configured. Skipping liquidation of poolAddress: ${pool.poolAddress}, borrower: ${borrower}.`);
    }
  }
}

interface ArbTakeLiquidationParams
  extends Pick<HandleTakeParams, 'pool' | 'poolConfig' | 'signer'> {
  liquidation: LiquidationToTake;
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
