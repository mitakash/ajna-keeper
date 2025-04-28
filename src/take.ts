import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { decimaledToWei, delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, LiquiditySource, PoolConfig } from './config-types';
import { logger } from './logging';
import { liquidationArbTake } from './transactions';
import { DexRouter } from './dex-router';
import { BigNumber, ethers } from 'ethers';
import { convertSwapApiResponseToDetailsBytes } from './1inch';
import { AjnaKeeperTaker__factory } from '../typechain-types';
import { getDecimalsErc20 } from './erc20';

interface HandleTakeParams {
  signer: Signer;
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  config: Pick<
    KeeperConfig,
    | 'dryRun'
    | 'subgraphUrl'
    | 'delayBetweenActions'
    | 'connectorTokens'
    | 'oneInchRouters'
    | 'keeperTaker'
  >;
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
    // Delay between handling each liquidation, probably superfluous
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
  collateral: BigNumber; // WAD
  auctionPrice: BigNumber; // WAD
}

interface GetLiquidationsToTakeParams
  extends Pick<HandleTakeParams, 'pool' | 'poolConfig' | 'signer'> {
  config: Pick<
    KeeperConfig,
    'subgraphUrl' | 'delayBetweenActions' | 'oneInchRouters' | 'connectorTokens'
  >;
}

async function checkIfArbTakeable(
  pool: FungiblePool,
  price: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  subgraphUrl: string,
  minDeposit: string,
  signer: Signer
): Promise<{ isTakeable: boolean; hpbIndex: number }> {
  if (!poolConfig.take.minCollateral || !poolConfig.take.hpbPriceFactor) {
    return { isTakeable: false, hpbIndex: 0 };
  }

  const collateralDecimals = await getDecimalsErc20(
    signer,
    pool.collateralAddress
  );
  const minCollateral = ethers.BigNumber.from(
    decimaledToWei(poolConfig.take.minCollateral, collateralDecimals)
  );
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
  const hmbPrice = Number(
    weiToDecimaled(pool.getBucketByIndex(hmbIndex).price)
  );
  const maxArbPrice = hmbPrice * poolConfig.take.hpbPriceFactor;
  return {
    isTakeable: price < maxArbPrice,
    hpbIndex: hmbIndex,
  };
}

async function checkIfTakeable(
  pool: FungiblePool,
  price: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  config: Pick<KeeperConfig, 'delayBetweenActions'>,
  signer: Signer,
  oneInchRouters: { [chainId: number]: string } | undefined,
  connectorTokens: string[] | undefined
): Promise<{ isTakeable: boolean }> {
  if (
    poolConfig.take.liquiditySource !== LiquiditySource.ONEINCH ||
    !poolConfig.take.marketPriceFactor
  ) {
    return { isTakeable: false };
  }

  if (!collateral.gt(0)) {
    logger.debug(
      `Invalid collateral amount: ${collateral.toString()} for pool ${pool.name}`
    );
    return { isTakeable: false };
  }

  try {
    const chainId = await signer.getChainId();
    if (!oneInchRouters || !oneInchRouters[chainId]) {
      logger.debug(
        `No 1inch router configured for chainId ${chainId} in pool ${pool.name}`
      );
      return { isTakeable: false };
    }

    // Pause between getting a quote for each liquidation to avoid 1inch rate limit
    await delay(config.delayBetweenActions);

    const dexRouter = new DexRouter(signer, {
      oneInchRouters: oneInchRouters ?? {},
      connectorTokens: connectorTokens ?? [],
    });
    const quoteResult = await dexRouter.getQuoteFromOneInch(
      chainId,
      collateral,
      pool.collateralAddress,
      pool.quoteAddress
    );

    if (!quoteResult.success) {
      logger.debug(
        `No valid quote data for collateral ${ethers.utils.formatUnits(collateral, await getDecimalsErc20(signer, pool.collateralAddress))} in pool ${pool.name}: ${quoteResult.error}`
      );
      return { isTakeable: false };
    }

    const amountOut = ethers.BigNumber.from(quoteResult.dstAmount);
    if (amountOut.isZero()) {
      logger.debug(
        `Zero amountOut for collateral ${ethers.utils.formatUnits(collateral, await getDecimalsErc20(signer, pool.collateralAddress))} in pool ${pool.name}`
      );
      return { isTakeable: false };
    }

    const collateralDecimals = await getDecimalsErc20(
      signer,
      pool.collateralAddress
    );
    const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);

    const collateralAmount = Number(
      ethers.utils.formatUnits(collateral, collateralDecimals)
    );
    const quoteAmount = Number(
      ethers.utils.formatUnits(amountOut, quoteDecimals)
    );

    const marketPrice = quoteAmount / collateralAmount;
    const takeablePrice = marketPrice * poolConfig.take.marketPriceFactor;

    logger.debug(
      `Market price: ${marketPrice}, takeablePrice: ${takeablePrice}, liquidation price: ${price} for pool ${pool.name}`
    );

    return { isTakeable: price <= takeablePrice };
  } catch (error) {
    logger.error(`Failed to fetch quote data for pool ${pool.name}: ${error}`);
    return { isTakeable: false };
  }
}

export async function* getLiquidationsToTake({
  pool,
  poolConfig,
  signer,
  config,
}: GetLiquidationsToTakeParams): AsyncGenerator<LiquidationToTake> {
  const { subgraphUrl, oneInchRouters, connectorTokens } = config;
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    subgraphUrl,
    pool.poolAddress,
    poolConfig.take.minCollateral ?? 0
  );
  for (const auction of liquidationAuctions) {
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = Number(weiToDecimaled(liquidationStatus.price));
    const collateral = liquidationStatus.collateral;

    const { isTakeable: isTakeableForTake } = await checkIfTakeable(
      pool,
      price,
      collateral,
      poolConfig,
      config,
      signer,
      oneInchRouters,
      connectorTokens
    );
    if (isTakeableForTake) {
      logger.debug(
        `Found liquidation to take - pool: ${pool.name}, borrower: ${borrower}, price: ${price}`
      );
      yield {
        takeStrategy: TakeStrategy.Take,
        borrower,
        hpbIndex: 0,
        collateral,
        auctionPrice: liquidationStatus.price,
      };
      continue;
    }

    if (poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor) {
      const minDeposit = poolConfig.take.minCollateral / hpb;
      const { isTakeable, hpbIndex: arbHpbIndex } = await checkIfArbTakeable(
        pool,
        price,
        collateral,
        poolConfig,
        subgraphUrl,
        minDeposit.toString(),
        signer
      );
      if (isTakeable) {
        logger.debug(
          `Found liquidation to arbTake - pool: ${pool.name}, borrower: ${borrower}, price: ${price}`
        );
        yield {
          takeStrategy: TakeStrategy.ArbTake,
          borrower,
          hpbIndex: arbHpbIndex,
          collateral,
          auctionPrice: liquidationStatus.price,
        };
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
  config: Pick<
    KeeperConfig,
    'dryRun' | 'delayBetweenActions' | 'connectorTokens' | 'oneInchRouters' | 'keeperTaker'
  >;
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
      const keeperTaker = AjnaKeeperTaker__factory.connect(
        config.keeperTaker!!,
        signer
      );

      // pause between getting the 1inch quote and requesting the swap to avoid 1inch rate limit
      await delay(config.delayBetweenActions);
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
        keeperTaker.address,
        true
      );

      try {
        logger.debug(
          `Sending Take Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
        );
        const tx = await keeperTaker.takeWithAtomicSwap(
            pool.poolAddress,
            liquidation.borrower,
            liquidation.auctionPrice,
            liquidation.collateral,
            poolConfig.take.liquiditySource,
            dexRouter.getRouter(await signer.getChainId())!!,
            convertSwapApiResponseToDetailsBytes(swapData.data),
        );
        await tx.wait();
        logger.info(
          `Take successful - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
        );
      } catch (error) {
        logger.error(
          `Failed to Take. pool: ${pool.name}, borrower: ${borrower}`,
          error
        );
      }
    } else {
      logger.error(
        `Valid liquidity source not configured. Skipping liquidation of poolAddress: ${pool.poolAddress}, borrower: ${borrower}.`
      );
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
