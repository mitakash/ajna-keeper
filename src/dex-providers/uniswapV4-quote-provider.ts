// src/dex-providers/uniswapV4-quote-provider.ts
import { ethers, BigNumber, Contract, Signer } from 'ethers';
import { logger } from '../logging';
import { UniV4PoolKey } from '../config-types';
import { V4Utils, POOL_MANAGER_ABI, PoolKey, Currency } from '../uniswapv4';

interface V4Config {
  router: string; // Actually the PoolManager address in V4
  poolManager?: string; // Optional explicit PoolManager address  
  defaultSlippage: number;
  pools: Record<string, UniV4PoolKey>;
}

interface QuoteResult {
  success: boolean;
  dstAmount?: BigNumber;
  error?: string;
  price?: number;
}

export class UniswapV4QuoteProvider {
  private signer: Signer;
  private config: V4Config;
  private poolManager?: Contract;
  private poolManagerAddress: string;

  constructor(signer: Signer, config: V4Config) {
    this.signer = signer;
    this.config = config;
    // In V4, the "router" is actually the PoolManager address
    this.poolManagerAddress = config.poolManager || config.router;
  }

  async initialize(): Promise<boolean> {
    try {
      if (!this.poolManagerAddress) {
        // Try to get from known addresses
        const chainId = await this.signer.getChainId();
        const knownAddress = V4Utils.getPoolManagerAddress(chainId);
        
        if (!knownAddress) {
          logger.debug('V4: Pool Manager address not found for chain ' + chainId);
          return false;
        }
        
        this.poolManagerAddress = knownAddress;
      }

      this.poolManager = new Contract(
        this.poolManagerAddress,
        POOL_MANAGER_ABI,
        this.signer
      );

      // Test connection with a simple view call instead of deployed()
      try {
        const provider = this.signer.provider;
        if (!provider) {
          throw new Error('No provider available');
        }
        
        // Check if contract exists by getting code
        const code = await provider.getCode(this.poolManagerAddress);
        if (code === '0x') {
          throw new Error(`Contract not deployed at ${this.poolManagerAddress}`);
        }
        
        logger.debug(`V4: PoolManager detected at ${this.poolManagerAddress} on chain ${await this.signer.getChainId()}`);
        return true;
        
      } catch (contractError) {
        logger.error(`V4: Contract verification failed: ${contractError}`);
        return false;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`V4: Failed to initialize: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get market price for a token pair using V4 pool state
   */
  async getMarketPrice(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    tokenInDecimals: number,
    tokenOutDecimals: number,
    poolKey: UniV4PoolKey
  ): Promise<{ success: boolean; price?: number; error?: string }> {
    
    if (!this.poolManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Pool Manager not initialized' };
      }
    }

    try {
      // Convert config poolKey to V4 PoolKey format
      const v4PoolKey = this.convertToV4PoolKey(poolKey);
      
      // Generate pool ID
      const poolId = V4Utils.generatePoolId(v4PoolKey);
      
      // Get pool state from PoolManager
      const slot0 = await this.poolManager!.getSlot0(poolId);
      const { sqrtPriceX96, tick } = slot0;
      
      if (sqrtPriceX96.isZero()) {
        return { success: false, error: 'Pool not initialized or has no liquidity' };
      }

      // Determine if tokenIn is token0 or token1
      const isToken0Input = tokenIn.toLowerCase() === poolKey.token0.toLowerCase();
      
      // Calculate price from sqrtPriceX96
      const price = V4Utils.sqrtPriceX96ToPrice(
        sqrtPriceX96,
        tokenInDecimals,
        tokenOutDecimals,
        isToken0Input
      );

      logger.debug(`V4: Pool price calculated: ${price} ${tokenOut}/${tokenIn} (tick: ${tick})`);
      
      return { success: true, price };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`V4: Error getting market price: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get quote for exact input swap
   * Since V4 doesn't have a quoter yet, we use price-based estimation
   */
  async getQuote(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKey: UniV4PoolKey
  ): Promise<QuoteResult> {
    
    try {
      // Get token decimals (you should pass these or get them from contracts)
      const tokenInDecimals = await this.getTokenDecimals(tokenIn);
      const tokenOutDecimals = await this.getTokenDecimals(tokenOut);
      
      const priceResult = await this.getMarketPrice(
        amountIn,
        tokenIn,
        tokenOut,
        tokenInDecimals,
        tokenOutDecimals,
        poolKey
      );

      if (!priceResult.success || !priceResult.price) {
        return { success: false, error: priceResult.error };
      }

      // Simple price-based calculation
      // In production, you'd want to account for slippage and fees
      const amountInNumber = Number(ethers.utils.formatUnits(amountIn, tokenInDecimals));
      const amountOutNumber = amountInNumber * priceResult.price;
      
      // Apply fee reduction (approximate)
      const feeReduction = (10000 - poolKey.fee) / 10000;
      const amountOutAfterFees = amountOutNumber * feeReduction;
      
      const amountOut = ethers.utils.parseUnits(
        amountOutAfterFees.toFixed(tokenOutDecimals), 
        tokenOutDecimals
      );

      logger.debug(`V4: Quote - ${amountInNumber} ${tokenIn} -> ${amountOutAfterFees.toFixed(6)} ${tokenOut}`);

      return {
        success: true,
        dstAmount: BigNumber.from(amountOut),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`V4: Quote error: ${errorMessage}`);
      return { success: false, error: errorMessage };
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
      hooks: poolKey.hooks
    };
  }

  /**
   * Get token decimals from contract
   */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return 18; // Native ETH
    }

    try {
      const tokenContract = new Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        this.signer
      );
      return await tokenContract.decimals();
    } catch (error) {
      logger.warn(`V4: Could not get decimals for ${tokenAddress}, defaulting to 18`);
      return 18;
    }
  }

  /**
   * Check if quote provider is available
   */
  isAvailable(): boolean {
    return !!this.poolManager;
  }

  /**
   * Get the Pool Manager address being used
   */
  getPoolManagerAddress(): string {
    return this.poolManagerAddress;
  }
}