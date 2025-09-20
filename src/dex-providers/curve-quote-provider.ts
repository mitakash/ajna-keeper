// src/dex-providers/curve-quote-provider.ts
// Curve Quote Provider for accurate price discovery during external takes
// FIXED: Uses tokenAddresses mapping for reliable pool discovery

import { ethers, BigNumber, Signer } from 'ethers';
import { logger } from '../logging';
import { getDecimalsErc20 } from '../erc20';
import { CurvePoolType } from '../config-types';

// StableSwap ABI (int128 indices) - from working test scripts
const STABLESWAP_ABI = [
  'function coins(uint256 i) external view returns (address)',
  'function balances(uint256 i) external view returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function fee() external view returns (uint256)',
];

// CryptoSwap ABI (uint256 indices) - from working test scripts
const CRYPTOSWAP_ABI = [
  'function coins(uint256 i) external view returns (address)',
  'function balances(uint256 i) external view returns (uint256)',
  'function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256)',
  'function fee() external view returns (uint256)',
];

interface CurveQuoteConfig {
  poolConfigs: {
    [tokenPair: string]: {
      address: string;
      poolType: CurvePoolType;
    }
  };
  defaultSlippage: number;
  wethAddress: string;
  // FIXED: Add tokenAddresses mapping for reliable symbol lookup
  tokenAddresses?: { [symbol: string]: string };
}

interface QuoteResult {
  success: boolean;
  dstAmount?: BigNumber;
  error?: string;
  gasEstimate?: BigNumber;
}

/**
 * Curve Quote Provider for External Take Profitability Analysis
 * 
 * Uses Curve pool contracts directly for accurate pricing
 * FIXED: Now uses tokenAddresses mapping like DexRouter for reliable pool discovery
 */
export class CurveQuoteProvider {
  private signer: Signer;
  private config: CurveQuoteConfig;
  private isInitialized: boolean = false;

  constructor(signer: Signer, config: CurveQuoteConfig) {
    this.signer = signer;
    this.config = config;
  }

  /**
   * Initialize and validate the quote provider
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Test that we have pool configurations
      if (!this.config.poolConfigs || Object.keys(this.config.poolConfigs).length === 0) {
        logger.warn(`Curve quote provider has no pool configurations`);
        return false;
      }

      // Validate each pool configuration
      let validPools = 0;
      for (const [tokenPair, poolConfig] of Object.entries(this.config.poolConfigs)) {
        try {
          const poolCode = await this.signer.provider!.getCode(poolConfig.address);
          if (poolCode === '0x') {
            logger.warn(`Curve pool not found at ${poolConfig.address} for pair ${tokenPair}`);
            continue;
          }

          // Test pool interaction with correct ABI
          const poolAbi = poolConfig.poolType === CurvePoolType.STABLE ? STABLESWAP_ABI : CRYPTOSWAP_ABI;
          const poolContract = new ethers.Contract(poolConfig.address, poolAbi, this.signer);
          
          // Test coins() function to verify pool is working
          const token0 = await poolContract.coins(0);
          logger.debug(`Curve pool ${tokenPair} initialized successfully at ${poolConfig.address}, first token: ${token0}`);
          validPools++;
        } catch (error) {
          logger.warn(`Failed to validate Curve pool ${tokenPair} at ${poolConfig.address}: ${error}`);
        }
      }

      if (validPools === 0) {
        logger.warn(`No valid Curve pools found`);
        return false;
      }

      logger.debug(`Curve quote provider initialized with ${validPools} valid pools`);
      this.isInitialized = true;
      return true;

    } catch (error) {
      logger.error(`Failed to initialize Curve quote provider: ${error}`);
      return false;
    }
  }

  /**
   * Check if quote provider is available and ready
   */
  isAvailable(): boolean {
    return this.isInitialized && Object.keys(this.config.poolConfigs).length > 0;
  }

  /**
   * FIXED: Find pool configuration using reliable symbol-based lookup (same as DexRouter)
   */
  private async findPoolForTokenPair(tokenA: string, tokenB: string): Promise<{ address: string; poolType: CurvePoolType } | undefined> {
    // FIXED: Use tokenAddresses mapping if available (same logic as DexRouter)
    if (this.config.tokenAddresses) {
      const tokenASymbol = this.getTokenSymbolFromAddress(tokenA);
      const tokenBSymbol = this.getTokenSymbolFromAddress(tokenB);
      
      if (tokenASymbol && tokenBSymbol) {
        // Try both directions for the token pair (same as DexRouter)
        const key1 = `${tokenASymbol}-${tokenBSymbol}`;
        const key2 = `${tokenBSymbol}-${tokenASymbol}`;
        
        const poolConfig = this.config.poolConfigs[key1] || this.config.poolConfigs[key2];
        
        if (poolConfig) {
          logger.debug(`Found Curve pool for ${tokenASymbol}/${tokenBSymbol}: ${poolConfig.address} (${poolConfig.poolType})`);
          return poolConfig;
        }
        
        logger.debug(`No Curve pool configured for ${tokenASymbol}/${tokenBSymbol}`);
        return undefined;
      }
    }

    // FALLBACK: Direct address matching (less reliable but handles missing tokenAddresses)
    logger.debug(`Falling back to direct address matching for ${tokenA}/${tokenB}`);
    
    // Handle ETH/WETH conversion for lookup
    const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const tokenALookup = tokenA.toLowerCase() === ethAddress.toLowerCase() ? this.config.wethAddress.toLowerCase() : tokenA.toLowerCase();
    const tokenBLookup = tokenB.toLowerCase() === ethAddress.toLowerCase() ? this.config.wethAddress.toLowerCase() : tokenB.toLowerCase();

    // Search configured pools by checking actual pool contents
    for (const [tokenPair, poolConfig] of Object.entries(this.config.poolConfigs)) {
      try {
        // Check if tokens actually exist in this pool by querying the pool contract
        const poolExists = await this.checkTokensInPool(poolConfig.address, poolConfig.poolType, tokenALookup, tokenBLookup);
        if (poolExists) {
          logger.debug(`Found Curve pool for ${tokenA}/${tokenB}: ${poolConfig.address} (${poolConfig.poolType})`);
          return poolConfig;
        }
      } catch (error) {
        logger.debug(`Error checking pool ${tokenPair} for tokens ${tokenA}/${tokenB}: ${error}`);
      }
    }

    logger.debug(`No Curve pool configuration found for ${tokenA}/${tokenB}`);
    return undefined;
  }

  /**
   * FIXED: Helper to check if tokens actually exist in a pool contract
   */
  private async checkTokensInPool(
    poolAddress: string, 
    poolType: CurvePoolType, 
    tokenA: string, 
    tokenB: string
  ): Promise<boolean> {
    try {
      const { tokenInIndex, tokenOutIndex } = await this.discoverTokenIndices(
        poolAddress,
        poolType,
        tokenA,
        tokenB
      );
      return tokenInIndex !== undefined && tokenOutIndex !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * FIXED: Get token symbol from address using tokenAddresses mapping (same as DexRouter)
   */
  private getTokenSymbolFromAddress(address: string): string | undefined {
    if (!this.config.tokenAddresses) {
      return undefined;
    }
    
    for (const [symbol, tokenAddress] of Object.entries(this.config.tokenAddresses)) {
      if (tokenAddress.toString().toLowerCase() === address.toLowerCase()) {
        return symbol;
      }
    }
    return undefined;
  }

  /**
   * Check if pool exists and tokens are available
   */
  async poolExists(
    tokenA: string,
    tokenB: string
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const poolConfig = await this.findPoolForTokenPair(tokenA, tokenB);
      if (!poolConfig) {
        return false;
      }

      // Verify tokens exist in pool by discovering indices
      const { tokenInIndex, tokenOutIndex } = await this.discoverTokenIndices(
        poolConfig.address,
        poolConfig.poolType,
        tokenA,
        tokenB
      );

      const exists = tokenInIndex !== undefined && tokenOutIndex !== undefined;
      
      if (exists) {
        logger.debug(`Curve pool tokens found: ${tokenA}@${tokenInIndex}, ${tokenB}@${tokenOutIndex}`);
      } else {
        logger.debug(`Curve pool tokens NOT found for ${tokenA}/${tokenB}`);
      }
      
      return exists;

    } catch (error) {
      logger.debug(`Error checking Curve pool existence: ${error}`);
      return false;
    }
  }

  /**
   * Discover token indices in pool (pattern from test scripts)
   */
  private async discoverTokenIndices(
    poolAddress: string,
    poolType: CurvePoolType,
    tokenIn: string,
    tokenOut: string
  ): Promise<{ tokenInIndex?: number; tokenOutIndex?: number }> {
    // Handle ETH/WETH conversion for lookup
    const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const tokenInForLookup = tokenIn.toLowerCase() === ethAddress.toLowerCase() ? this.config.wethAddress : tokenIn;
    const tokenOutForLookup = tokenOut.toLowerCase() === ethAddress.toLowerCase() ? this.config.wethAddress : tokenOut;

    const poolAbi = poolType === CurvePoolType.STABLE ? STABLESWAP_ABI : CRYPTOSWAP_ABI;
    const poolContract = new ethers.Contract(poolAddress, poolAbi, this.signer);

    let tokenInIndex: number | undefined;
    let tokenOutIndex: number | undefined;

    // Discover token indices (pattern from test scripts)
    for (let i = 0; i < 8; i++) {
      try {
        const tokenAddr = await poolContract.coins(i);
        if (tokenAddr.toLowerCase() === tokenInForLookup.toLowerCase()) tokenInIndex = i;
        if (tokenAddr.toLowerCase() === tokenOutForLookup.toLowerCase()) tokenOutIndex = i;
      } catch (e) {
        break; // No more tokens in pool
      }
    }

    return { tokenInIndex, tokenOutIndex };
  }

  /**
   * Get accurate quote from Curve pool contract
   */
  async getQuote(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string
  ): Promise<QuoteResult> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Quote provider not available' };
        }
      }

      const poolConfig = await this.findPoolForTokenPair(tokenIn, tokenOut);
      if (!poolConfig) {
        return { success: false, error: `No Curve pool configured for ${tokenIn}/${tokenOut}` };
      }

      // Discover token indices
      const { tokenInIndex, tokenOutIndex } = await this.discoverTokenIndices(
        poolConfig.address,
        poolConfig.poolType,
        tokenIn,
        tokenOut
      );

      if (tokenInIndex === undefined || tokenOutIndex === undefined) {
        return { success: false, error: `Tokens not found in Curve pool ${poolConfig.address}` };
      }

      // Get quote using pool-specific ABI (pattern from test scripts)
      const poolAbi = poolConfig.poolType === CurvePoolType.STABLE ? STABLESWAP_ABI : CRYPTOSWAP_ABI;
      const poolContract = new ethers.Contract(poolConfig.address, poolAbi, this.signer);

      let amountOut: BigNumber;
      if (poolConfig.poolType === CurvePoolType.STABLE) {
        // StableSwap uses int128 indices
        amountOut = await poolContract.get_dy(tokenInIndex, tokenOutIndex, amountIn);
      } else {
        // CryptoSwap uses uint256 indices
        amountOut = await poolContract.get_dy(tokenInIndex, tokenOutIndex, amountIn);
      }

      if (amountOut.isZero()) {
        return { success: false, error: 'Zero output from Curve pool' };
      }

      // Get correct decimals for proper formatting
      const inputDecimals = await getDecimalsErc20(this.signer, tokenIn);
      const outputDecimals = await getDecimalsErc20(this.signer, tokenOut);

      logger.debug(`Curve quote success: ${ethers.utils.formatUnits(amountIn, inputDecimals)} in -> ${ethers.utils.formatUnits(amountOut, outputDecimals)} out`);

      return {
        success: true,
        dstAmount: amountOut,
        // Note: Curve pools don't provide gas estimates like Uniswap QuoterV2
      };

    } catch (error: any) {
      logger.debug(`Curve quote failed: ${error.message}`);
      
      // Parse common errors
      if (error.message?.includes('INSUFFICIENT_LIQUIDITY')) {
        return { success: false, error: 'Insufficient liquidity in Curve pool' };
      } else if (error.message?.includes('revert')) {
        return { success: false, error: `Curve pool reverted: ${error.reason || error.message}` };
      } else {
        return { success: false, error: `Curve quote error: ${error.message}` };
      }
    }
  }

  /**
   * Calculate market price from quote (quote tokens per collateral token)
   */
  async getMarketPrice(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    tokenInDecimals: number,
    tokenOutDecimals: number
  ): Promise<{ success: boolean; price?: number; error?: string }> {
    try {
      const quoteResult = await this.getQuote(amountIn, tokenIn, tokenOut);
      
      if (!quoteResult.success || !quoteResult.dstAmount) {
        return { success: false, error: quoteResult.error };
      }

      // Calculate price: output tokens per input token
      const inputAmount = Number(ethers.utils.formatUnits(amountIn, tokenInDecimals));
      const outputAmount = Number(ethers.utils.formatUnits(quoteResult.dstAmount, tokenOutDecimals));
      
      if (inputAmount <= 0 || outputAmount <= 0) {
        return { success: false, error: 'Invalid amounts for price calculation' };
      }

      const marketPrice = outputAmount / inputAmount;
      
      logger.debug(`Curve market price: 1 ${tokenIn} = ${marketPrice.toFixed(6)} ${tokenOut}`);
      
      return { success: true, price: marketPrice };

    } catch (error: any) {
      return { success: false, error: `Market price calculation failed: ${error.message}` };
    }
  }

  /**
   * Get configured pool addresses for debugging
   */
  getConfiguredPools(): string[] {
    return Object.values(this.config.poolConfigs).map(config => config.address);
  }
}