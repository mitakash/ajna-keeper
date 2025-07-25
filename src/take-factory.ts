// src/take-factory.ts
// PHASE 3: Official Uniswap V3 quotes using QuoterV2 contract (the CORRECT approach)

import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { decimaledToWei, delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, LiquiditySource, PoolConfig } from './config-types';
import { logger } from './logging';
import { liquidationArbTake } from './transactions';
import { BigNumber, ethers } from 'ethers';
import { getDecimalsErc20 } from './erc20';
import { NonceTracker } from './nonce';
import { AjnaKeeperTakerFactory__factory } from '../typechain-types';
// PHASE 3: Import the Uniswap V3 quote provider (FIXED PATH)
import { UniswapV3QuoteProvider } from './dex-providers/uniswap-quote-provider';

interface FactoryTakeParams {
  signer: Signer;
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  config: Pick<
    KeeperConfig,
    | 'dryRun'
    | 'subgraphUrl'
    | 'delayBetweenActions'
    | 'keeperTakerFactory'
    | 'takerContracts'
    | 'universalRouterOverrides'
  >;
}

interface LiquidationToTake {
  borrower: string;
  hpbIndex: number;
  collateral: BigNumber;
  auctionPrice: BigNumber;
  isTakeable: boolean;
  isArbTakeable: boolean;
}

/**
 * Handle takes using factory pattern (Uniswap V3, future DEXs)
 * Completely separate from existing 1inch logic
 */
export async function handleFactoryTakes({
  signer,
  pool,
  poolConfig,
  config,
}: FactoryTakeParams) {
  logger.debug(`Factory take handler starting for pool: ${pool.name}`);

  for await (const liquidation of getLiquidationsToTakeFactory({
    pool,
    poolConfig,
    signer,
    config,
  })) {
    if (liquidation.isTakeable) {
      await takeLiquidationFactory({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
      
      if (liquidation.isArbTakeable) await delay(config.delayBetweenActions);
    }
    
    if (liquidation.isArbTakeable) {
      await arbTakeLiquidationFactory({
        pool,
        poolConfig,
        signer,
        liquidation,
        config,
      });
    }
  }
}

/**
 * Get liquidations using factory-compatible quote sources
 */
async function* getLiquidationsToTakeFactory({
  pool,
  poolConfig,
  signer,
  config,
}: Pick<FactoryTakeParams, 'pool' | 'poolConfig' | 'signer' | 'config'>): AsyncGenerator<LiquidationToTake> {
  
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    config.subgraphUrl,
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

    // Check if external take is possible with configured DEX
    if (poolConfig.take.marketPriceFactor && poolConfig.take.liquiditySource) {
      isTakeable = await checkIfTakeableFactory(
        pool,
        price,
        collateral,
        poolConfig,
        config,
        signer
      );
    }

    // Check arbTake (same logic as existing)
    if (poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor) {
      const minDeposit = poolConfig.take.minCollateral / hpb;
      const arbTakeCheck = await checkIfArbTakeableFactory(
        pool,
        price,
        collateral,
        poolConfig,
        config.subgraphUrl,
        minDeposit.toString(),
        signer
      );
      isArbTakeable = arbTakeCheck.isArbTakeable;
      arbHpbIndex = arbTakeCheck.hpbIndex;
    }

    if (isTakeable || isArbTakeable) {
      const strategyLog = isTakeable && !isArbTakeable ? 'factory take'
        : !isTakeable && isArbTakeable ? 'arbTake'
        : isTakeable && isArbTakeable ? 'factory take and arbTake'
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
    } else {
      logger.debug(
        `Factory: Not taking liquidation since price ${price} is too high - pool: ${pool.name}, borrower: ${borrower}`
      );
    }
  }
}

/**
 * Check if external take is profitable using factory DEX sources
 */
async function checkIfTakeableFactory(
  pool: FungiblePool,
  price: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  config: Pick<FactoryTakeParams['config'], 'universalRouterOverrides'>,
  signer: Signer
): Promise<boolean> {
  
  if (!poolConfig.take.marketPriceFactor) {
    return false;
  }

  if (!collateral.gt(0)) {
    logger.debug(`Factory: Invalid collateral amount: ${collateral.toString()} for pool ${pool.name}`);
    return false;
  }

  try {
    if (poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV3) {
      return await checkUniswapV3Quote(pool, price, collateral, poolConfig, config, signer);
    }
    
    // Future: Add other DEX sources here
    logger.debug(`Factory: Unsupported liquidity source: ${poolConfig.take.liquiditySource}`);
    return false;

  } catch (error) {
    logger.error(`Factory: Failed to check takeability for pool ${pool.name}: ${error}`);
    return false;
  }
}

/**
 * PHASE 3: Real Uniswap V3 quote check using OFFICIAL QuoterV2 contract
 * Uses the same method as Uniswap's frontend - guaranteed accurate prices
 */
async function checkUniswapV3Quote(
  pool: FungiblePool,
  auctionPrice: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  config: Pick<FactoryTakeParams['config'], 'universalRouterOverrides'>,
  signer: Signer
): Promise<boolean> {
  
  if (!config.universalRouterOverrides) {
    logger.debug(`Factory: No universalRouterOverrides configured for pool ${pool.name}`);
    return false;
  }

  const routerConfig = config.universalRouterOverrides;
  
  // Validate required configuration
  if (!routerConfig.universalRouterAddress || !routerConfig.poolFactoryAddress || !routerConfig.wethAddress) {
    logger.debug(`Factory: Missing required router configuration for pool ${pool.name}`);
    return false;
  }

  try {
    // PHASE 3: Create official UniswapV3QuoteProvider (now using config address)
    const quoteProvider = new UniswapV3QuoteProvider(signer, {
      universalRouterAddress: routerConfig.universalRouterAddress,
      poolFactoryAddress: routerConfig.poolFactoryAddress,
      defaultFeeTier: routerConfig.defaultFeeTier || 3000,
      wethAddress: routerConfig.wethAddress,
      quoterV2Address: routerConfig.quoterV2Address,  // NEW: Pass from config
    });

    // Check if the quote provider found a QuoterV2 contract
    if (!quoteProvider.isAvailable()) {
      logger.debug(`Factory: UniswapV3QuoteProvider not available for pool ${pool.name}`);
      return false;
    }

    // Log the QuoterV2 address being used
    const quoterAddress = quoteProvider.getQuoterAddress();
    logger.debug(`Factory: Using QuoterV2 at ${quoterAddress} for pool ${pool.name}`);

    // Get token decimals for proper formatting
    const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
    const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);

    // PHASE 3: Get OFFICIAL quote from Uniswap V3 QuoterV2 contract
    logger.debug(`Factory: Getting official Uniswap V3 quote for ${ethers.utils.formatUnits(collateral, collateralDecimals)} collateral in pool ${pool.name}`);
    
    const quoteResult = await quoteProvider.getQuote(
      collateral,
      pool.collateralAddress,
      pool.quoteAddress,
      routerConfig.defaultFeeTier
    );

    if (!quoteResult.success || !quoteResult.dstAmount) {
      logger.debug(`Factory: Failed to get official Uniswap V3 quote for pool ${pool.name}: ${quoteResult.error}`);
      return false;
    }

    // PHASE 3: Calculate actual market price from the OFFICIAL quote
    const collateralAmount = Number(ethers.utils.formatUnits(collateral, collateralDecimals));
    const quoteAmount = Number(ethers.utils.formatUnits(quoteResult.dstAmount, quoteDecimals));

    if (collateralAmount <= 0 || quoteAmount <= 0) {
      logger.debug(`Factory: Invalid amounts - collateral: ${collateralAmount}, quote: ${quoteAmount} for pool ${pool.name}`);
      return false;
    }

    // Market price = quoteAmount / collateralAmount (quote tokens per collateral token)
    const officialMarketPrice = quoteAmount / collateralAmount;
    
    const marketPriceFactor = poolConfig.take.marketPriceFactor;
    if (!marketPriceFactor) {
      logger.debug(`Factory: No marketPriceFactor configured for pool ${pool.name}`);
      return false;
    }

    // Calculate the maximum price we're willing to pay (including slippage/profit margin)
    const takeablePrice = officialMarketPrice * marketPriceFactor;
    
    const profitable = auctionPrice <= takeablePrice;
    
    // PHASE 3: Enhanced logging with OFFICIAL Uniswap market data
    //logger.info(
    //  `Factory: OFFICIAL Uniswap V3 QuoterV2 price check for pool ${pool.name}:\n` +
    //  `  QuoterV2: ${quoterAddress}\n` +
    //  `  Collateral: ${collateralAmount.toFixed(6)} (${pool.collateralAddress})\n` +
    //  `  Quote Out: ${quoteAmount.toFixed(6)} (${pool.quoteAddress})\n` +
    //  `  Official Price: ${officialMarketPrice.toFixed(6)} (from QuoterV2 contract)\n` +
    //  `  Takeable Price: ${takeablePrice.toFixed(6)} (official * ${marketPriceFactor})\n` +
    //  `  Auction Price: ${auctionPrice.toFixed(6)}\n` +
    //  `  Profitable: ${profitable ? '✅ YES' : '❌ NO'}`
    //);
    logger.debug(`Price check: pool=${pool.name}, auction=${auctionPrice.toFixed(4)}, market=${officialMarketPrice.toFixed(4)}, takeable=${takeablePrice.toFixed(4)}, profitable=${profitable}`);

    return profitable;

  } catch (error) {
    logger.error(`Factory: Error getting official Uniswap V3 quote for pool ${pool.name}: ${error}`);
    return false;
  }
}

/**
 * ArbTake check (same logic as existing, copied to avoid dependencies)
 */
async function checkIfArbTakeableFactory(
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

  const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
  const minCollateral = ethers.BigNumber.from(
    decimaledToWei(poolConfig.take.minCollateral, collateralDecimals)
  );
  
  if (collateral.lt(minCollateral)) {
    logger.debug(`Factory: Collateral ${collateral} below minCollateral ${minCollateral} for pool: ${pool.name}`);
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
  const hmbPrice = Number(weiToDecimaled(pool.getBucketByIndex(hmbIndex).price));
  const maxArbPrice = hmbPrice * poolConfig.take.hpbPriceFactor;
  
  return {
    isArbTakeable: price < maxArbPrice,
    hpbIndex: hmbIndex,
  };
}

/**
 * Execute external take using factory pattern
 */
async function takeLiquidationFactory({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  signer: Signer;
  liquidation: LiquidationToTake;
  config: Pick<FactoryTakeParams['config'], 'dryRun' | 'keeperTakerFactory' | 'universalRouterOverrides'>;
}) {
  
  const { borrower } = liquidation;
  const { dryRun, keeperTakerFactory } = config;

  if (dryRun) {
    logger.info(
      `DryRun - would Factory Take - poolAddress: ${pool.poolAddress}, borrower: ${borrower} using ${poolConfig.take.liquiditySource}`
    );
    return;
  }

  if (!keeperTakerFactory) {
    logger.error('Factory: keeperTakerFactory address not configured');
    return;
  }

  if (poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV3) {
    await takeWithUniswapV3Factory({
      pool,
      poolConfig,
      signer,
      liquidation,
      config,
    });
  } else {
    logger.error(`Factory: Unsupported liquidity source: ${poolConfig.take.liquiditySource}`);
  }
}

/**
 * Execute Uniswap V3 take via factory
 */
async function takeWithUniswapV3Factory({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  signer: Signer;
  liquidation: LiquidationToTake;
  config: Pick<FactoryTakeParams['config'], 'keeperTakerFactory' | 'universalRouterOverrides'>;
}) {
  
  const factory = AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory!, signer);

  if (!config.universalRouterOverrides) {
    logger.error('Factory: universalRouterOverrides required for UniswapV3 takes');
    return;
  }

  // Prepare Uniswap V3 swap details
  const swapDetails = {
    universalRouter: config.universalRouterOverrides.universalRouterAddress!,
    permit2: config.universalRouterOverrides.permit2Address!,
    targetToken: pool.quoteAddress,
    feeTier: config.universalRouterOverrides.defaultFeeTier || 3000,
    slippageBps: Math.floor((config.universalRouterOverrides.defaultSlippage || 0.5) * 100),
    deadline: Math.floor(Date.now() / 1000) + 1800,
  };

  const encodedSwapDetails = ethers.utils.defaultAbiCoder.encode(
    ['(address,address,address,uint24,uint256,uint256)'],
    [Object.values(swapDetails)]
  );

  try {
    logger.debug(`Factory: Sending Take Tx - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);
    
    await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      const tx = await factory.takeWithAtomicSwap(
        pool.poolAddress,
        liquidation.borrower,
        liquidation.auctionPrice,
        liquidation.collateral,
        Number(poolConfig.take.liquiditySource), // LiquiditySource.UNISWAPV3 = 2
        swapDetails.universalRouter,
        encodedSwapDetails,
        { nonce: nonce.toString() }
      );
      return await tx.wait();
    });

    logger.info(`Factory Take successful - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);
    
  } catch (error) {
    logger.error(`Factory: Failed to Take. pool: ${pool.name}, borrower: ${liquidation.borrower}`, error);
  }
}

/**
 * ArbTake using existing logic (same as original)
 */
async function arbTakeLiquidationFactory({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  signer: Signer;
  liquidation: LiquidationToTake;
  config: Pick<FactoryTakeParams['config'], 'dryRun'>;
}) {
  
  const { borrower, hpbIndex } = liquidation;
  const { dryRun } = config;

  if (dryRun) {
    logger.info(`DryRun - would Factory ArbTake - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`);
    return;
  }

  try {
    logger.debug(`Factory: Sending ArbTake Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}, hpbIndex: ${hpbIndex}`);
    
    const liquidationSdk = pool.getLiquidation(borrower);
    await liquidationArbTake(liquidationSdk, signer, hpbIndex);
    
    logger.info(`Factory ArbTake successful - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`);
    
  } catch (error) {
    logger.error(`Factory: Failed to ArbTake. pool: ${pool.name}, borrower: ${borrower}`, error);
  }
}
