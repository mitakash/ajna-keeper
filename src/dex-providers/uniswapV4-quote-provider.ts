// src/dex-providers/uniswapV4-quote-provider.ts
/**
 * Uniswap V4 Quote Provider
 * Uses StateView contract for accurate pool state reading
 */
import { ethers, BigNumber, Contract, Signer } from 'ethers';
import { logger } from '../logging';
import { UniV4PoolKey } from '../config-types';
import {
  V4Utils,
  STATE_VIEW_ABI,
  ERC20_ABI,
  PoolKey,
  V4QuoteError,
  V4_CHAIN_ADDRESSES,
} from '../uniswapv4';

export interface V4Config {
  poolManager: string;
  defaultSlippage: number;
  pools: Record<string, UniV4PoolKey>;
  // AUDIT FIX H-03: Allow StateView address to be configured per chain
  stateView?: string;
}

export interface QuoteResult {
  success: boolean;
  dstAmount?: BigNumber;
  price?: number;
  error?: string;
}

export class UniswapV4QuoteProvider {
  private signer: Signer;
  private config: V4Config;
  private stateView?: Contract;
  private stateViewAddress?: string;
  private chainId?: number;
  // Cache decimals to avoid repeated RPC calls for the same token
  private decimalsCache: Map<string, number> = new Map();

  constructor(signer: Signer, config: V4Config) {
    this.signer = signer;
    this.config = config;
  }

  /**
   * Initialize the quote provider with retry logic
   * AUDIT FIX H-03: Now supports configurable StateView address per chain
   */
  async initialize(retries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.chainId = await this.signer.getChainId();

        // AUDIT FIX H-03: Use config.stateView if provided, otherwise fall back to hardcoded addresses
        if (this.config.stateView) {
          this.stateViewAddress = this.config.stateView;
          logger.debug(`V4: Using configured StateView address: ${this.stateViewAddress}`);
        } else {
          const addresses = V4_CHAIN_ADDRESSES[this.chainId];
          if (!addresses) {
            logger.error(`V4: Chain ${this.chainId} not supported and no stateView configured`);
            return false;
          }
          this.stateViewAddress = addresses.STATE_VIEW;
          logger.debug(`V4: Using default StateView for chain ${this.chainId}: ${this.stateViewAddress}`);
        }

        // Verify StateView is deployed
        const provider = this.signer.provider;
        if (!provider) {
          throw new Error('No provider available');
        }

        const code = await provider.getCode(this.stateViewAddress);
        if (code === '0x') {
          throw new Error(`StateView not deployed at ${this.stateViewAddress}`);
        }

        this.stateView = new Contract(
          this.stateViewAddress,
          STATE_VIEW_ABI,
          this.signer,
        );

        logger.debug(`V4: StateView initialized at ${this.stateViewAddress}`);
        logger.debug(`V4: PoolManager at ${this.config.poolManager} on chain ${this.chainId}`);

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (attempt < retries) {
          logger.warn(`V4: Initialize attempt ${attempt}/${retries} failed: ${errorMessage}. Retrying in ${attempt * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          logger.error(`V4: Failed to initialize after ${retries} attempts: ${errorMessage}`);
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Get current market price from pool
   */
  async getMarketPrice(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKey: UniV4PoolKey,
  ): Promise<{ success: boolean; price?: number; tick?: number; error?: string }> {
    if (!this.stateView) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'StateView not initialized' };
      }
    }

    try {
      // CRITICAL FIX: Get decimals for token0 and token1 (in poolKey order, not tokenIn/tokenOut order)
      // sqrtPriceX96ToPrice expects token0Decimals and token1Decimals, not tokenInDecimals and tokenOutDecimals
      const token0Decimals = await this.getTokenDecimals(poolKey.token0);
      const token1Decimals = await this.getTokenDecimals(poolKey.token1);

      // Convert to V4 PoolKey format
      const v4PoolKey = this.convertToV4PoolKey(poolKey);
      const poolId = V4Utils.generatePoolId(v4PoolKey);

      // AUDIT FIX M-01: Check in-range liquidity BEFORE accepting the price.
      // A pool can have a valid sqrtPriceX96 but zero in-range liquidity.
      // If we proceed with zero liquidity the on-chain swap will revert after we've
      // already committed gas to the full atomic take transaction.
      const liquidity = await this.stateView!.getLiquidity(poolId);
      if (liquidity.isZero()) {
        return { success: false, error: 'Pool has zero in-range liquidity - swap would revert' };
      }

      // Get pool state from StateView
      const slot0Result = await this.stateView!.getSlot0(poolId);

      // Parse slot0 result
      const sqrtPriceX96 = slot0Result[0] || slot0Result.sqrtPriceX96;
      const tick = slot0Result[1] || slot0Result.tick;

      if (sqrtPriceX96.isZero()) {
        return { success: false, error: 'Pool not initialized or has no liquidity' };
      }

      // Determine if token0 is input
      const isToken0Input = tokenIn.toLowerCase() === poolKey.token0.toLowerCase();

      // Calculate price using token0/token1 decimals (matching sqrtPriceX96ToPrice expectation)
      // AUDIT FIX M-05: sqrtPriceX96ToPrice now uses BigNumber arithmetic internally for precision
      const price = V4Utils.sqrtPriceX96ToPrice(
        sqrtPriceX96,
        token0Decimals,
        token1Decimals,
        isToken0Input,
      );

      logger.debug(
        `V4: Pool liquidity=${liquidity.toString()}, price=${price} ${tokenOut}/${tokenIn} (tick: ${tick}, token0Dec: ${token0Decimals}, token1Dec: ${token1Decimals}, zeroForOne: ${isToken0Input})`,
      );

      return { success: true, price, tick };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`V4: Error getting market price: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get quote for exact input swap
   */
  async getQuote(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKey: UniV4PoolKey,
  ): Promise<QuoteResult> {
    try {
      // Get market price
      const priceResult = await this.getMarketPrice(amountIn, tokenIn, tokenOut, poolKey);

      if (!priceResult.success || !priceResult.price) {
        return { success: false, error: priceResult.error };
      }

      // Get token decimals
      const tokenInDecimals = await this.getTokenDecimals(tokenIn);
      const tokenOutDecimals = await this.getTokenDecimals(tokenOut);

      // Calculate expected output
      const amountInNumber = Number(ethers.utils.formatUnits(amountIn, tokenInDecimals));
      const amountOutNumber = amountInNumber * priceResult.price;

      // AUDIT FIX #13: V4 fees are in "hundredths of a basis point" (1/1,000,000)
      // e.g., fee=3000 means 0.30%, so feeReduction = (1000000 - 3000) / 1000000 = 0.997
      // Previously incorrect: (10000 - 3000) / 10000 = 0.70 (would be 30% fee!)
      const feeReduction = (1000000 - poolKey.fee) / 1000000;

      // Apply price impact buffer (1% for safety)
      const priceImpactBuffer = 0.99;

      const amountOutAfterFees = amountOutNumber * feeReduction * priceImpactBuffer;

      const amountOut = ethers.utils.parseUnits(
        amountOutAfterFees.toFixed(tokenOutDecimals),
        tokenOutDecimals,
      );

      logger.debug(
        `V4: Quote - ${amountInNumber.toFixed(6)} ${tokenIn.slice(0, 8)}... -> ${amountOutAfterFees.toFixed(6)} ${tokenOut.slice(0, 8)}...`,
      );

      return {
        success: true,
        dstAmount: BigNumber.from(amountOut),
        price: priceResult.price,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`V4: Quote error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a pool is profitable for arbitrage
   */
  async isProfitable(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKey: UniV4PoolKey,
    auctionPrice: BigNumber, // In WAD (18 decimals)
  ): Promise<{ profitable: boolean; expectedProfit?: BigNumber; error?: string }> {
    try {
      const quoteResult = await this.getQuote(amountIn, tokenIn, tokenOut, poolKey);

      if (!quoteResult.success || !quoteResult.dstAmount) {
        return { profitable: false, error: quoteResult.error };
      }

      // Convert auction price from WAD to native decimals
      const tokenOutDecimals = await this.getTokenDecimals(tokenOut);
      const tokenInDecimals = await this.getTokenDecimals(tokenIn);

      // Calculate what we'd get at auction price
      const amountInNumber = Number(ethers.utils.formatUnits(amountIn, tokenInDecimals));
      const auctionPriceNumber = Number(ethers.utils.formatEther(auctionPrice));
      const auctionOutput = amountInNumber * auctionPriceNumber;
      const auctionOutputWei = ethers.utils.parseUnits(
        auctionOutput.toFixed(tokenOutDecimals),
        tokenOutDecimals,
      );

      // Market output should exceed auction output for profit
      const expectedProfit = quoteResult.dstAmount.sub(auctionOutputWei);
      const profitable = expectedProfit.gt(0);

      if (profitable) {
        logger.debug(
          `V4: Profitable swap - Market: ${ethers.utils.formatUnits(quoteResult.dstAmount, tokenOutDecimals)}, Auction: ${ethers.utils.formatUnits(auctionOutputWei, tokenOutDecimals)}, Profit: ${ethers.utils.formatUnits(expectedProfit, tokenOutDecimals)}`,
        );
      }

      return { profitable, expectedProfit };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { profitable: false, error: errorMessage };
    }
  }

  /**
   * Convert config PoolKey to V4 PoolKey format
   */
  private convertToV4PoolKey(poolKey: UniV4PoolKey): PoolKey {
    return {
      currency0: { addr: poolKey.token0 },
      currency1: { addr: poolKey.token1 },
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks,
    };
  }

  /**
   * Get token decimals from contract with retry and caching
   * CRITICAL: Does NOT default to 18 on error - throws instead to prevent catastrophic pricing errors
   */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18; // Native ETH
    }

    // Check cache first
    const cached = this.decimalsCache.get(tokenAddress.toLowerCase());
    if (cached !== undefined) {
      return cached;
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.signer);
        const decimals = await tokenContract.decimals();
        const result = typeof decimals === 'number' ? decimals : decimals.toNumber();
        // Cache successful result
        this.decimalsCache.set(tokenAddress.toLowerCase(), result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries) {
          logger.warn(
            `V4: Decimals lookup attempt ${attempt}/${maxRetries} failed for ${tokenAddress}: ${errorMessage}. Retrying in ${attempt}s...`,
          );
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        } else {
          logger.error(
            `V4: CRITICAL - Could not get decimals for ${tokenAddress} after ${maxRetries} attempts: ${errorMessage}`,
          );
          throw new V4QuoteError(
            `Failed to get token decimals for ${tokenAddress}. This would cause catastrophic pricing errors (e.g., USDC has 6 decimals, not 18).`,
          );
        }
      }
    }
    // Unreachable but satisfies TypeScript
    throw new V4QuoteError(`Failed to get token decimals for ${tokenAddress}`);
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!this.stateView;
  }

  /**
   * Get the Pool Manager address being used
   */
  getPoolManagerAddress(): string {
    return this.config.poolManager;
  }

  /**
   * Get StateView address
   */
  getStateViewAddress(): string | undefined {
    return this.stateViewAddress;
  }
}