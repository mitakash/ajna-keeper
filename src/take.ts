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
import { convertWadToTokenDecimals, getDecimalsErc20 } from './erc20';
import { NonceTracker } from './nonce';
import { SmartDexManager } from './smart-dex-manager';
import { handleFactoryTakes } from './take-factory';

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
    | 'keeperTakerFactory'   
    | 'takerContracts'
    | 'universalRouterOverrides'
    | 'sushiswapRouterOverrides'     
    | 'curveRouterOverrides'    
    | 'tokenAddresses'
  >;
}

export async function handleTakes({
  signer,
  pool,
  poolConfig,
  config,
}: HandleTakeParams) {
  // Smart Detection - route to appropriate take handler
  const dexManager = new SmartDexManager(signer, config);
  const deploymentType = await dexManager.detectDeploymentType();
  const validation = await dexManager.validateDeployment();

  logger.debug(`Detection Results - Type: ${deploymentType}, Valid: ${validation.valid}`);
  if (!validation.valid) {
    logger.error(`Configuration errors: ${validation.errors.join(', ')}`);
  }

  // Route based on deployment type
  switch (deploymentType) {
    case 'single':
      // EXISTING 1inch path - zero changes to existing code
      logger.debug(`Using single contract (1inch) take handler for pool: ${pool.name}`);
      await handleTakesWith1inch({
        signer,
        pool,
        poolConfig,
        config,
      });
      break;

    case 'factory':
      // NEW factory path - completely separate code
      logger.debug(`Using factory (multi-DEX) take handler for pool: ${pool.name}`);
      await handleFactoryTakes({
        signer,
        pool,
        poolConfig,
        config: {
          dryRun: config.dryRun,
          subgraphUrl: config.subgraphUrl,
          delayBetweenActions: config.delayBetweenActions,
          keeperTakerFactory: config.keeperTakerFactory,
          takerContracts: config.takerContracts,
          universalRouterOverrides: (config as any).universalRouterOverrides, // Type fix
	  sushiswapRouterOverrides: (config as any).sushiswapRouterOverrides,
	  curveRouterOverrides: (config as any).curveRouterOverrides,
          tokenAddresses: config.tokenAddresses,
        },
      });
      break;

    case 'none':
      // External DEX unavailable, but arbTake should still work!
      // Use the existing 1inch handler since it already supports arbTake fallback
      logger.warn(`External DEX integration unavailable for pool ${pool.name} - checking arbTake only`);
      await handleTakesWith1inch({
        signer,
        pool,
        poolConfig,
        config,
      });
      break;
  }
}


/**
 * Handle liquidations for all scenarios: 1inch external takes, factory takes, and arbTake-only
 * 
 * Despite the name, this function handles multiple take strategies:
 * - External takes via 1inch (when keeperTaker contract is available)
 * - External takes via factory system (when keeperTakerFactory + takerContracts available) 
 * - ArbTake-only (when no external DEX contracts deployed)
 * - LP reward collection and settlement (works in all scenarios)
 * 
 * The function automatically skips external takes when they're not profitable or possible,
 * and falls back to arbTake when configured. This provides a unified interface for
 * all liquidation scenarios while maintaining backward compatibility.
 */

export async function handleTakesWith1inch({
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
    if (liquidation.isTakeable) {
      await takeLiquidation({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
      // If an arbTake is also possible, give the take transaction some time to be included
      // in a block before proceeding with the arbTake.
      if (liquidation.isArbTakeable) await delay(config.delayBetweenActions);
    }
    if (liquidation.isArbTakeable) {
      await arbTakeLiquidation({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
    }
  }
}

interface LiquidationToTake {
  borrower: string;
  hpbIndex: number;
  collateral: BigNumber; // WAD
  auctionPrice: BigNumber; // WAD
  isTakeable: boolean;
  isArbTakeable: boolean;
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
): Promise<{ isArbTakeable: boolean; hpbIndex: number }> {
  if (!poolConfig.take.minCollateral || !poolConfig.take.hpbPriceFactor) {
    return { isArbTakeable: false, hpbIndex: 0 };
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
    return { isArbTakeable: false, hpbIndex: 0 };
  }

  const { buckets } = await subgraph.getHighestMeaningfulBucket(
    subgraphUrl,
    pool.poolAddress,
    minDeposit
  );
  if (buckets.length === 0) {
    return { isArbTakeable: false, hpbIndex: 0 };
  }

  const hmbIndex = buckets[0].bucketIndex;
  const hmbPrice = Number(
    weiToDecimaled(pool.getBucketByIndex(hmbIndex).price)
  );
  const maxArbPrice = hmbPrice * poolConfig.take.hpbPriceFactor;
  return {
    isArbTakeable: price < maxArbPrice,
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
    
    // In checkIfTakeable function, before the dexRouter quote call:
    const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
    const collateralInTokenDecimals = convertWadToTokenDecimals(collateral, collateralDecimals);


    const quoteResult = await dexRouter.getQuoteFromOneInch(
      chainId,
      collateralInTokenDecimals,
      pool.collateralAddress,
      pool.quoteAddress
    );

    if (!quoteResult.success) {
      logger.debug(
        `No valid quote data for collateral ${ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)} in pool ${pool.name}: ${quoteResult.error}`	      
      );
      return { isTakeable: false };
    }

    const amountOut = ethers.BigNumber.from(quoteResult.dstAmount);
    if (amountOut.isZero()) {
      logger.debug(
	`Zero amountOut for collateral ${ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)} in pool ${pool.name}`      
      );
      return { isTakeable: false };
    }

    const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);

    //collateralAmount is the human readable amount
    const collateralAmount = Number(
     ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)  // ← Use converted amount
    );

    //quoteAmount is supposed to be the human readable amount
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

    let isTakeable = false;
    let isArbTakeable = false;
    let arbHpbIndex = 0;

    if (poolConfig.take.marketPriceFactor && poolConfig.take.liquiditySource) {
      isTakeable = (await checkIfTakeable(
        pool,
        price,
        collateral,
        poolConfig,
        config,
        signer,
        oneInchRouters,
        connectorTokens
      )).isTakeable;
    }

    if (poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor) {
      const minDeposit = poolConfig.take.minCollateral / hpb;
      const arbTakeCheck = await checkIfArbTakeable(
        pool,
        price,
        collateral,
        poolConfig,
        subgraphUrl,
        minDeposit.toString(),
        signer
      );
      isArbTakeable = arbTakeCheck.isArbTakeable;
      arbHpbIndex = arbTakeCheck.hpbIndex;
    }

    if (isTakeable || isArbTakeable) {
      const strategyLog = isTakeable && !isArbTakeable ? 'take'
        : !isTakeable && isArbTakeable ? 'arbTake'
        : isTakeable && isArbTakeable ? 'take and arbTake'
        : 'none';
      logger.debug(`Found liquidation to ${strategyLog} - pool: ${pool.name}, borrower: ${borrower}, price: ${price}`);

      yield {
        borrower,
        hpbIndex: arbHpbIndex,
        collateral,
        auctionPrice: liquidationStatus.price,
        isTakeable,
        isArbTakeable,
      };
      continue;

    } else {
      logger.debug(
        `Not taking liquidation since price ${price} is too high - pool: ${pool.name}, borrower: ${borrower}`
      );
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

      // Convert collateral from WAD to token decimals for 1inch API consistency
      const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
      const collateralInTokenDecimals = convertWadToTokenDecimals(liquidation.collateral, collateralDecimals);

      const swapData = await dexRouter.getSwapDataFromOneInch(
        await signer.getChainId(),
        collateralInTokenDecimals,  //Use token decimals for 1inch API
        pool.collateralAddress,
        pool.quoteAddress,
        1,
        keeperTaker.address,
        true
      );

      // Log transaction parameters for debugging
      logger.debug(
        `Preparing takeWithAtomicSwap transaction:\n` +
        `  Pool: ${pool.poolAddress}\n` +
        `  Borrower: ${liquidation.borrower}\n` +
        `  Auction Price (WAD): ${liquidation.auctionPrice.toString()}\n` +
        `  Collateral (WAD): ${liquidation.collateral.toString()}\n` +
        `  Collateral (Token Decimals): ${collateralInTokenDecimals.toString()}\n` +
        `  Liquidity Source: ${poolConfig.take.liquiditySource}\n` +
        `  1inch Router: ${dexRouter.getRouter(await signer.getChainId())}\n` +
        `  Swap Data Length: ${swapData.data.length} chars`
      );

      try {
        logger.debug(
          `Sending Take Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
        );
        await NonceTracker.queueTransaction(signer, async (nonce: number) => {
          const tx = await keeperTaker.takeWithAtomicSwap(
          pool.poolAddress,
          liquidation.borrower,
          liquidation.auctionPrice,
          liquidation.collateral,
          Number(poolConfig.take.liquiditySource),
          dexRouter.getRouter(await signer.getChainId())!!,
          convertSwapApiResponseToDetailsBytes(swapData.data),
          { nonce: nonce.toString() }
          );
          return await tx.wait();
        });
	
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
