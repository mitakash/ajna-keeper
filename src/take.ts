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
  config: Pick<
    KeeperConfig,
    'subgraphUrl' | 'oneInchRouters' | 'connectorTokens'
  >;
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

  const collateralDecimals = await getDecimalsErc20(
    signer,
    pool.collateralAddress
  );
  const minCollateral = ethers.BigNumber.from(
    decimaledToWei(config.take.minCollateral, collateralDecimals)
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
  const maxArbPrice = hmbPrice * config.take.hpbPriceFactor;
  return {
    isTakeable: price < maxArbPrice,
    hpbIndex: hmbIndex,
  };
}

async function checkIfTakeable(
  pool: FungiblePool,
  price: number,
  collateral: BigNumber,
  config: RequireFields<PoolConfig, 'take'>,
  signer: Signer,
  oneInchRouters: { [chainId: number]: string } | undefined,
  connectorTokens: string[] | undefined
): Promise<{ isTakeable: boolean }> {
  if (
    config.take.liquiditySource !== LiquiditySource.ONEINCH ||
    !config.take.marketPriceFactor
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
    const takeablePrice = marketPrice * config.take.marketPriceFactor;

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
  if (
    poolConfig.take.minCollateral &&
    hpb &&
    !ethers.BigNumber.from(hpb).isZero()
  ) {
    const minCollateralBN = ethers.BigNumber.from(
      decimaledToWei(poolConfig.take.minCollateral, 18)
    );
    const hpbBN = ethers.BigNumber.from(hpb);
    minDeposit = minCollateralBN
      .mul(ethers.utils.parseUnits('1', 18))
      .div(hpbBN)
      .toString();
  }

  for (const auction of liquidationAuctions) {
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = Number(weiToDecimaled(liquidationStatus.price));
    const collateral = liquidationStatus.collateral;

    // TODO: Create a `checkIfTakeable` function which calculates takeablePrice based on configuration and
    // liquiditySource (1inch) API
    const { isTakeable: isTakeableForTake } = await checkIfTakeable(
      pool,
      price,
      collateral,
      poolConfig,
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
      };
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
        yield {
          takeStrategy: TakeStrategy.ArbTake,
          borrower,
          hpbIndex: arbHpbIndex,
          collateral,
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
    'dryRun' | 'connectorTokens' | 'oneInchRouters' | 'keeperTaker'
  >;
}

export async function takeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: TakeLiquidationParams) {
  const { borrower, collateral } = liquidation;
  const { dryRun } = config;

  if (dryRun) {
    logger.info(
      `DryRun - would Take - poolAddress: ${pool.poolAddress}, borrower: ${borrower} using ${poolConfig.take.liquiditySource}`
    );
    return;
  }

  if (
    poolConfig.take.liquiditySource !== LiquiditySource.ONEINCH ||
    !poolConfig.take.marketPriceFactor
  ) {
    logger.error(
      `Valid liquidity source not configured or marketPriceFactor missing. Skipping liquidation of poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );
    return;
  }

  const dexRouter = new DexRouter(signer, {
    oneInchRouters: config.oneInchRouters ?? {},
    connectorTokens: config.connectorTokens ?? [],
  });
  const swapDataResult = await dexRouter.getSwapDataFromOneInch(
    await signer.getChainId(),
    collateral,
    pool.collateralAddress,
    pool.quoteAddress,
    1,
    await signer.getAddress(),
    true
  );

  if (!swapDataResult.success || !swapDataResult.data) {
    logger.error(
      `Failed to get swap data for pool ${pool.name}: ${swapDataResult.error}`
    );
    return;
  }

  const swapData = swapDataResult.data;
  // TODO: need to encode and pass OneInchSwapDetails
  // const swapCalldata: SwapCalldata = decodeSwapCalldata(swapData.data);
  // const swapDetails = {
  //   aggregationExecutor: swapCalldata.aggregationExecutor,
  //   swapDescription: swapCalldata.swapDescription,
  //   opaqueData: swapCalldata.encodedCalls,
  // }

  const keeperTaker = AjnaKeeperTaker__factory.connect(
    config.keeperTaker!!,
    signer
  );
  // TODO: need to encode and pass OneInchSwapDetails as last parameter
  // const tx = await keeperTaker.takeWithAtomicSwap(
  //   pool.poolAddress,
  //   borrower,
  //   collateral,
  //   poolConfig.take.liquiditySource,
  //   dexRouter.getRouter(await signer.getChainId())!,
  //   swapDetails
  // );
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
