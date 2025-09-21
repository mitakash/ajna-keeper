// src/take-factory.ts
// Official Uniswap V3 quotes using QuoterV2 contract (the CORRECT approach)

import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { decimaledToWei, delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, LiquiditySource, PoolConfig } from './config-types';
import { logger } from './logging';
import { liquidationArbTake } from './transactions';
import { BigNumber, ethers } from 'ethers';
import { NonceTracker } from './nonce';
import { AjnaKeeperTakerFactory__factory } from '../typechain-types';
// Import the Uniswap V3 quote provider (FIXED PATH)
import { UniswapV3QuoteProvider } from './dex-providers/uniswap-quote-provider';
import { SushiSwapQuoteProvider } from './dex-providers/sushiswap-quote-provider';
import { UniswapV4QuoteProvider } from './dex-providers/uniswapV4-quote-provider';
import { convertWadToTokenDecimals, getDecimalsErc20 } from './erc20';
import { UniswapV4RouterOverrides, UniV4PoolKey } from './config-types';
// FIXED: Import quoteTokenScale function
import { quoteTokenScale } from '@ajna-finance/sdk/dist/contracts/pool';
import { DexRouter } from './dex-router'

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
    | 'sushiswapRouterOverrides'
    | 'uniswapV4RouterOverrides'
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
  config: Pick<FactoryTakeParams['config'], 'universalRouterOverrides' | 'sushiswapRouterOverrides' | 'uniswapV4RouterOverrides' >,
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
    if (poolConfig.take.liquiditySource === LiquiditySource.SUSHISWAP) {
      return await checkSushiSwapQuote(pool, price, collateral, poolConfig, config, signer);
    }
    
    if (poolConfig.take.liquiditySource == LiquiditySource.UNISWAPV4){
      return await checkUniswapV4Quote(pool, price, collateral, poolConfig, config, signer)
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
    
    const collateralInTokenDecimals = convertWadToTokenDecimals(collateral, collateralDecimals);
    
    // PHASE 3: Get OFFICIAL quote from Uniswap V3 QuoterV2 contract
    logger.debug(`Factory: Getting official Uniswap V3 quote for ${ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)} collateral in pool ${pool.name}`);
    
    const quoteResult = await quoteProvider.getQuote(
      collateralInTokenDecimals,
      pool.collateralAddress,
      pool.quoteAddress,
      routerConfig.defaultFeeTier
    );

    if (!quoteResult.success || !quoteResult.dstAmount) {
      logger.debug(`Factory: Failed to get official Uniswap V3 quote for pool ${pool.name}: ${quoteResult.error}`);
      return false;
    }

    // PHASE 3: Calculate actual market price from the OFFICIAL quote
    const collateralAmount = Number(ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals));
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
    
    logger.debug(`Price check: pool=${pool.name}, auction=${auctionPrice.toFixed(4)}, market=${officialMarketPrice.toFixed(4)}, takeable=${takeablePrice.toFixed(4)}, profitable=${profitable}`);

    return profitable;

  } catch (error) {
    logger.error(`Factory: Error getting official Uniswap V3 quote for pool ${pool.name}: ${error}`);
    return false;
  }
}


/**
 * Check SushiSwap V3 profitability using official QuoterV2 contract
 */
async function checkSushiSwapQuote(
  pool: FungiblePool,
  auctionPrice: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  config: Pick<FactoryTakeParams['config'], 'sushiswapRouterOverrides'>,
  signer: Signer
): Promise<boolean> {
  
  if (!config.sushiswapRouterOverrides) {
    logger.debug(`Factory: No sushiswapRouterOverrides configured for pool ${pool.name}`);
    return false;
  }

  const sushiConfig = config.sushiswapRouterOverrides;
  
  // Validate required configuration
  if (!sushiConfig.swapRouterAddress || !sushiConfig.factoryAddress || !sushiConfig.wethAddress) {
    logger.debug(`Factory: Missing required SushiSwap configuration for pool ${pool.name}`);
    return false;
  }

  try {
    // Create SushiSwap quote provider
    const quoteProvider = new SushiSwapQuoteProvider(signer, {
      swapRouterAddress: sushiConfig.swapRouterAddress,
      quoterV2Address: sushiConfig.quoterV2Address,
      factoryAddress: sushiConfig.factoryAddress,
      defaultFeeTier: sushiConfig.defaultFeeTier || 500,
      wethAddress: sushiConfig.wethAddress,
    });

    // Check if the quote provider is available
    const initialized = await quoteProvider.initialize();
    if (!initialized) {
      logger.debug(`Factory: SushiSwap quote provider not available for pool ${pool.name}`);
      return false;
    }

    // Get token decimals for proper formatting
    const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
    const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);
    const collateralInTokenDecimals = convertWadToTokenDecimals(collateral, collateralDecimals);


    // Get official quote from SushiSwap QuoterV2 contract
    logger.debug(`Factory: Getting SushiSwap quote for ${ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)} collateral in pool ${pool.name}`);
    
   

    const quoteResult = await quoteProvider.getQuote(
      collateralInTokenDecimals,
      pool.collateralAddress,
      pool.quoteAddress,
      sushiConfig.defaultFeeTier
    );

    if (!quoteResult.success || !quoteResult.dstAmount) {
      logger.debug(`Factory: Failed to get SushiSwap quote for pool ${pool.name}: ${quoteResult.error}`);
      return false;
    }

    // Calculate actual market price from the official quote
    const collateralAmount = Number(ethers.utils.formatUnits(collateralInTokenDecimals, collateralDecimals)); 
    const quoteAmount = Number(ethers.utils.formatUnits(quoteResult.dstAmount, quoteDecimals));

    if (collateralAmount <= 0 || quoteAmount <= 0) {
      logger.debug(`Factory: Invalid amounts - collateral: ${collateralAmount}, quote: ${quoteAmount} for pool ${pool.name}`);
      return false;
    }

    // Market price = quoteAmount / collateralAmount (quote tokens per collateral token)
    const marketPrice = quoteAmount / collateralAmount;
    
    const marketPriceFactor = poolConfig.take.marketPriceFactor;
    if (!marketPriceFactor) {
      logger.debug(`Factory: No marketPriceFactor configured for pool ${pool.name}`);
      return false;
    }

    // Calculate the maximum price we're willing to pay (including slippage/profit margin)
    const takeablePrice = marketPrice * marketPriceFactor;
    
    const profitable = auctionPrice <= takeablePrice;
    
    logger.debug(`SushiSwap price check: pool=${pool.name}, auction=${auctionPrice.toFixed(4)}, market=${marketPrice.toFixed(4)}, takeable=${takeablePrice.toFixed(4)}, profitable=${profitable}`);

    return profitable;

  } catch (error) {
    logger.error(`Factory: Error getting SushiSwap quote for pool ${pool.name}: ${error}`);
    return false;
  }
}

async function checkUniswapV4Quote(
  pool: FungiblePool,
  auctionPrice: number,
  collateral: BigNumber,
  poolConfig: RequireFields<PoolConfig, 'take'>,
  config: Pick<FactoryTakeParams['config'], 'uniswapV4RouterOverrides'>,
  signer: Signer
): Promise<boolean> {

  const v4 = config.uniswapV4RouterOverrides;
  if (!v4 || !v4.router || !v4.pools) {
    logger.debug(`Factory: Missing uniswapV4RouterOverrides configuration`);
    return false;
  }

  // tokenIn is the collateral Ajna gives us in the callback; we need quote token out
  const tokenIn  = pool.collateralAddress;
  const tokenOut = pool.quoteAddress;

  // find a matching poolKey in overrides (either order)
  const poolKey = findV4PoolKeyForPair(v4, tokenIn, tokenOut);
  if (!poolKey) {
    logger.debug(`Factory: No Uni v4 poolKey configured for ${tokenIn}/${tokenOut}`);
    return false;
  }

  try {
    const collateralDecimals = await getDecimalsErc20(signer, tokenIn);
    const quoteDecimals      = await getDecimalsErc20(signer, tokenOut);
    const inAmtTokenDec      = convertWadToTokenDecimals(collateral, collateralDecimals);

    const qp = new UniswapV4QuoteProvider(signer, {
      router: v4.router,
      defaultSlippage: v4.defaultSlippage ?? 0.5,
      pools: v4.pools
    });

    const mr = await qp.getMarketPrice(
      inAmtTokenDec,
      tokenIn,
      tokenOut,
      collateralDecimals,
      quoteDecimals,
      poolKey
    );

    if (!mr.success || mr.price === undefined) {
      logger.debug(`Factory: Uni v4 quote unavailable: ${mr.error ?? 'unknown error'}`);
      return false;
    }

    const marketPrice      = mr.price; // quote per collateral
    const marketPriceFactor = poolConfig.take.marketPriceFactor!;
    const takeablePrice    = marketPrice * marketPriceFactor;
    const profitable       = auctionPrice <= takeablePrice;

    logger.debug(`Uni v4 price check: auction=${auctionPrice.toFixed(6)}, market=${marketPrice.toFixed(6)}, takeable=${takeablePrice.toFixed(6)}, profitable=${profitable}`);
    return profitable;

  } catch (e) {
    logger.debug(`Factory: Uni v4 quote failed: ${e}`);
    return false;
  }
}

// helper: pick poolKey from overrides by address pair
function findV4PoolKeyForPair(
  v4: UniswapV4RouterOverrides,
  a: string,
  b: string
): UniV4PoolKey | undefined {
  if (!v4.pools) return undefined;                  // narrow away the {}

  const aLc = a.toLowerCase();
  const bLc = b.toLowerCase();

  const entries: UniV4PoolKey[] = Object.values(v4.pools); // now typed
  return entries.find(k => {
    const t0 = k.token0.toLowerCase();
    const t1 = k.token1.toLowerCase();
    return (t0 === aLc && t1 === bLc) || (t0 === bLc && t1 === aLc);
  });
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
  config: Pick<FactoryTakeParams['config'], 'dryRun' | 'keeperTakerFactory' | 'universalRouterOverrides' | 'sushiswapRouterOverrides' | 'uniswapV4RouterOverrides' >;
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
  } 
  else if (poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV4) {
    await takeWithUniswapV4Factory({
      pool,
      poolConfig,
      signer,
      liquidation,
      config,
    });
  }
  else if (poolConfig.take.liquiditySource === LiquiditySource.SUSHISWAP) {
  await takeWithSushiSwapFactory({
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
 * FIXED: Execute Uniswap V3 take via factory
 * Now follows 1inch pattern - sends WAD amounts to smart contract
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

  // FIXED: Use minimal amountOutMinimum instead of complex decimal calculations
  // Let Ajna's liquidation contract enforce the actual minimum requirements
  // This follows the 1inch pattern where smart contracts handle decimal conversion
  const minimalAmountOut = BigNumber.from(1); // 1 wei - trust Ajna liquidation contract

  logger.debug(
    `Factory: Executing Uniswap V3 take for pool ${pool.name}:\n` +
    `  Collateral (WAD): ${liquidation.collateral.toString()}\n` +
    `  Auction Price (WAD): ${liquidation.auctionPrice.toString()}\n` +
    `  Minimal Amount Out: ${minimalAmountOut.toString()} (let Ajna enforce)`
  );

  // FIXED: Prepare Uniswap V3 swap details with minimal output requirement
  // Smart contract will handle WAD → token decimal conversion using Ajna's scale functions
  const swapDetails = {
    universalRouter: config.universalRouterOverrides.universalRouterAddress!,
    permit2: config.universalRouterOverrides.permit2Address!,
    targetToken: pool.quoteAddress,
    feeTier: config.universalRouterOverrides.defaultFeeTier || 3000,
    amountOutMinimum: minimalAmountOut, // FIXED: Minimal amount, not pre-calculated
    deadline: Math.floor(Date.now() / 1000) + 1800,
  };

  // FIXED: Encode struct exactly like SushiSwap pattern
  const encodedSwapDetails = ethers.utils.defaultAbiCoder.encode(
    ['(address,address,address,uint24,uint256,uint256)'], // UniswapV3SwapDetails struct
    [[
      swapDetails.universalRouter,
      swapDetails.permit2,
      swapDetails.targetToken,
      swapDetails.feeTier,
      swapDetails.amountOutMinimum,
      swapDetails.deadline
    ]]
  );

  try {
    logger.debug(`Factory: Sending Uniswap V3 Take Tx - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);

    await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      // FIXED: Send WAD amounts directly - no decimal pre-conversion
      const tx = await factory.takeWithAtomicSwap(
        pool.poolAddress,
        liquidation.borrower,
        liquidation.auctionPrice,  // WAD amount
        liquidation.collateral,    // WAD amount
        Number(poolConfig.take.liquiditySource), // LiquiditySource.UNISWAPV3 = 2
        swapDetails.universalRouter,
        encodedSwapDetails,
        { nonce: nonce.toString() }
      );
      return await tx.wait();
    });

    logger.info(`Factory Uniswap V3 Take successful - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);

  } catch (error) {
    logger.error(`Factory: Failed to Uniswap V3 Take. pool: ${pool.name}, borrower: ${liquidation.borrower}`, error);
  }
}




/**
 * Execute SushiSwap take via factory
 */

/**
 * FIXED: Execute SushiSwap take via factory  
 * Now follows 1inch pattern - sends WAD amounts to smart contract
 */
async function takeWithSushiSwapFactory({
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
  config: Pick<FactoryTakeParams['config'], 'keeperTakerFactory' | 'sushiswapRouterOverrides'>;
}) {
  
  const factory = AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory!, signer);

  if (!config.sushiswapRouterOverrides) {
    logger.error('Factory: sushiswapRouterOverrides required for SushiSwap takes');
    return;
  }

  // FIXED: Use minimal amountOutMinimum instead of complex decimal calculations
  // Let Ajna's liquidation contract enforce the actual minimum requirements  
  // This mirrors the working 1inch implementation pattern
  const minimalAmountOut = BigNumber.from(1); // 1 wei - trust Ajna liquidation contract

  logger.debug(
    `Factory: Using WAD amounts for SushiSwap pool ${pool.name}:\n` +
    `  Collateral (WAD): ${liquidation.collateral.toString()}\n` +
    `  Auction Price (WAD): ${liquidation.auctionPrice.toString()}\n` +
    `  Minimal Amount Out: ${minimalAmountOut.toString()} (let Ajna enforce)`
  );

  // FIXED: Prepare SushiSwap swap details with minimal output requirement
  // Smart contract will handle WAD → token decimal conversion using Ajna's scale functions
  const swapDetails = {
    swapRouter: config.sushiswapRouterOverrides.swapRouterAddress!,
    targetToken: pool.quoteAddress,
    feeTier: config.sushiswapRouterOverrides.defaultFeeTier || 500,
    amountOutMinimum: minimalAmountOut, // FIXED: Minimal amount, not pre-calculated
    deadline: Math.floor(Date.now() / 1000) + 1800,
  };

  // FIXED: Encode with new parameter structure (no change needed here)
  const encodedSwapDetails = ethers.utils.defaultAbiCoder.encode(
    ['uint24', 'uint256', 'uint256'], // feeTier, amountOutMinimum, deadline  
    [swapDetails.feeTier, swapDetails.amountOutMinimum, swapDetails.deadline]
  );

  try {
    logger.debug(`Factory: Sending SushiSwap Take Tx - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);
    
    await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      // FIXED: Send WAD amounts directly - no decimal pre-conversion
      const tx = await factory.takeWithAtomicSwap(
        pool.poolAddress,
        liquidation.borrower,
        liquidation.auctionPrice,  // WAD amount
        liquidation.collateral,    // WAD amount  
        Number(poolConfig.take.liquiditySource), // LiquiditySource.SUSHISWAP = 3
        swapDetails.swapRouter,
        encodedSwapDetails,
        { nonce: nonce.toString() }
      );
      return await tx.wait();
    });

    logger.info(`Factory SushiSwap Take successful - poolAddress: ${pool.poolAddress}, borrower: ${liquidation.borrower}`);
    
  } catch (error) {
    logger.error(`Factory: Failed to SushiSwap Take. pool: ${pool.name}, borrower: ${liquidation.borrower}`, error);
  }
}

async function takeWithUniswapV4Factory({
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
  config: Pick<FactoryTakeParams['config'], 'keeperTakerFactory' | 'uniswapV4RouterOverrides'>;
}) {
  const v4 = config.uniswapV4RouterOverrides;
  if (!v4 || !v4.router) {
    logger.error('Factory: uniswapV4RouterOverrides.router is required for Uni v4 takes');
    return;
  }

  const factory = AjnaKeeperTakerFactory__factory.connect(config.keeperTakerFactory!, signer);

  // find poolKey for collateral→quote
  const tokenIn  = pool.collateralAddress;
  const tokenOut = pool.quoteAddress;
  const poolKey  = findV4PoolKeyForPair(v4, tokenIn, tokenOut);

  if (!poolKey) {
    logger.error(`Factory: No Uni v4 poolKey configured for ${tokenIn}/${tokenOut}`);
    return;
  }

  // Minimal out (trust Ajna core to enforce profitability); or compute with slippage if you prefer
  const amountOutMin = ethers.BigNumber.from(1);
  const deadline     = Math.floor(Date.now() / 1000) + 30 * 60; // 30m

  /**
   * IMPORTANT: The ABI layout here MUST MATCH your UniswapV4KeeperTaker.sol.
   * Adjust the tuple types/ordering to exactly what that contract `abi.decode(...)` expects.
   *
   * Example layout (common pattern):
   *   struct V4SwapDetails {
   *     PoolKey poolKey;              // (token0, token1, fee, tickSpacing, hooks, poolManager)
   *     uint256 amountOutMinimum;
   *     uint160 sqrtPriceLimitX96;
   *     uint256 deadline;
   *   }
   */
  const sqrtPriceLimitX96 = poolKey.sqrtPriceLimitX96
    ? ethers.BigNumber.from(poolKey.sqrtPriceLimitX96)
    : ethers.BigNumber.from(0);

  // if your solidity poolKey includes poolManager, inject it; else drop it from the tuple
  const poolManager = v4.poolManager ?? ethers.constants.AddressZero;

  const encodedSwapDetails = ethers.utils.defaultAbiCoder.encode(
    [
      // tuple: token0, token1, fee, tickSpacing, hooks, poolManager
      'tuple(address,address,uint24,int24,address,address)',
      'uint256',
      'uint160',
      'uint256',
    ],
    [
      [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks, poolManager],
      amountOutMin,
      sqrtPriceLimitX96,
      deadline,
    ],
  );

  logger.debug(
    `Factory: Uni v4 take\n` +
    `  pool=${pool.name}\n` +
    `  borrower=${liquidation.borrower}\n` +
    `  router=${v4.router}\n` +
    `  poolKey=(${poolKey.token0}, ${poolKey.token1}, fee=${poolKey.fee}, ts=${poolKey.tickSpacing}, hooks=${poolKey.hooks})`
  );

  await NonceTracker.queueTransaction(signer, async (nonce: number) => {
    const tx = await factory.takeWithAtomicSwap(
      pool.poolAddress,
      liquidation.borrower,
      liquidation.auctionPrice,      // WAD
      liquidation.collateral,        // WAD
      Number(LiquiditySource.UNISWAPV4), // 5
      v4.router,                     // swapRouter param
      encodedSwapDetails,
      { nonce: nonce.toString() }
    );
    return await tx.wait();
  });

  logger.info(`Factory Uni v4 take successful - pool=${pool.poolAddress}, borrower=${liquidation.borrower}`);
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
