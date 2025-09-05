// src/dex-providers/sushiswap-quote-provider.ts
// SushiSwap V3 Quote Provider for accurate price discovery during external takes
// Based on working production patterns from test-sushiswap-bypass-quoter.ts

import { ethers, BigNumber, Signer } from 'ethers';
import { logger } from '../logging';
import { getDecimalsErc20 } from '../erc20';

// SushiSwap V3 QuoterV2 ABI with CORRECT field order (from production testing)
const SUSHI_QUOTER_ABI = [
  `function quoteExactInputSingle(
    (address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params
  ) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)`,
  'function WETH9() external view returns (address)',
  'function factory() external view returns (address)'
];

const SUSHI_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

interface SushiSwapQuoteConfig {
  swapRouterAddress: string;
  quoterV2Address?: string;
  factoryAddress: string;
  defaultFeeTier: number;
  wethAddress: string;
}

interface QuoteResult {
  success: boolean;
  dstAmount?: BigNumber;
  error?: string;
  gasEstimate?: BigNumber;
}

/**
 * SushiSwap V3 Quote Provider for External Take Profitability Analysis
 * 
 * Uses SushiSwap's official QuoterV2 contract for accurate pricing
 * Based on production-tested patterns from fixed_quoter_test.ts
 */
export class SushiSwapQuoteProvider {
  private signer: Signer;
  private config: SushiSwapQuoteConfig;
  private quoterContract?: ethers.Contract;
  private factoryContract: ethers.Contract;
  private isInitialized: boolean = false;

  constructor(signer: Signer, config: SushiSwapQuoteConfig) {
    this.signer = signer;
    this.config = config;
    
    // Always initialize factory for pool validation
    this.factoryContract = new ethers.Contract(
      config.factoryAddress,
      SUSHI_FACTORY_ABI,
      signer
    );

    // Initialize quoter if address is provided
    if (config.quoterV2Address) {
      this.quoterContract = new ethers.Contract(
        config.quoterV2Address,
        SUSHI_QUOTER_ABI,
        signer
      );
    }
  }

  /**
   * Initialize and validate the quote provider
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Test factory connection
      const factoryCode = await this.signer.provider!.getCode(this.config.factoryAddress);
      if (factoryCode === '0x') {
        logger.warn(`SushiSwap factory not found at ${this.config.factoryAddress}`);
        return false;
      }

      // Test quoter if available
      if (this.quoterContract) {
        const quoterCode = await this.signer.provider!.getCode(this.config.quoterV2Address!);
        if (quoterCode === '0x') {
          logger.warn(`SushiSwap QuoterV2 not found at ${this.config.quoterV2Address}`);
          // Continue without quoter - can still do direct swaps
        } else {
          // Verify quoter is working
          try {
            const weth = await this.quoterContract.WETH9();
            const factory = await this.quoterContract.factory();
            
            if (factory.toLowerCase() !== this.config.factoryAddress.toLowerCase()) {
              logger.warn(`SushiSwap quoter factory mismatch: expected ${this.config.factoryAddress}, got ${factory}`);
            } else {
              logger.debug(`SushiSwap QuoterV2 initialized successfully at ${this.config.quoterV2Address}`);
            }
          } catch (error) {
            logger.warn(`SushiSwap QuoterV2 validation failed: ${error}`);
            this.quoterContract = undefined;
          }
        }
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      logger.error(`Failed to initialize SushiSwap quote provider: ${error}`);
      return false;
    }
  }

  /**
   * Check if quote provider is available and ready
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get QuoterV2 address being used (if any)
   */
  getQuoterAddress(): string | undefined {
    return this.config.quoterV2Address;
  }

  /**
   * Check if pool exists for the given token pair
   */
  async poolExists(
    tokenA: string,
    tokenB: string,
    feeTier?: number
  ): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const fee = feeTier || this.config.defaultFeeTier;
      const poolAddress = await this.factoryContract.getPool(tokenA, tokenB, fee);
      
      const exists = poolAddress !== '0x0000000000000000000000000000000000000000';
      
      if (exists) {
        logger.debug(`SushiSwap pool found: ${tokenA}/${tokenB} fee=${fee} at ${poolAddress}`);
      } else {
        logger.debug(`SushiSwap pool NOT found: ${tokenA}/${tokenB} fee=${fee}`);
      }
      
      return exists;

    } catch (error) {
      logger.debug(`Error checking SushiSwap pool existence: ${error}`);
      return false;
    }
  }

  /**
   * Get accurate quote from SushiSwap QuoterV2 contract
   * Uses the CORRECT struct field order discovered in production testing
   */
  async getQuote(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    feeTier?: number
  ): Promise<QuoteResult> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Quote provider not available' };
        }
      }

      // Check if quoter is available
      if (!this.quoterContract) {
        return { success: false, error: 'QuoterV2 not available - use direct swap approach' };
      }

      const fee = feeTier || this.config.defaultFeeTier;

      // Verify pool exists first
      const poolExists = await this.poolExists(tokenIn, tokenOut, fee);
      if (!poolExists) {
        return { success: false, error: `No SushiSwap pool for ${tokenIn}/${tokenOut} with fee ${fee}` };
      }

      // CRITICAL: Use the CORRECT struct field order discovered in production testing
      // Order: tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96
      const params = {
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amountIn,     // THIRD position (was causing issues when in 4th)
        fee: fee,              // FOURTH position (was causing issues when in 3rd)
        sqrtPriceLimitX96: 0   // No price limit
      };

      logger.debug(`SushiSwap quote params: tokenIn=${params.tokenIn}, tokenOut=${params.tokenOut}, amountIn=${params.amountIn.toString()}, fee=${params.fee}`);

      // Call quoter with correct field order
      const result = await this.quoterContract.callStatic.quoteExactInputSingle(params);
      
      const amountOut = result[0];        // uint256 amountOut
      const gasEstimate = result[3];      // uint256 gasEstimate

      if (amountOut.isZero()) {
        return { success: false, error: 'Zero output from SushiSwap quoter' };
      }

      // Get correct decimals for proper formatting
      const inputDecimals = await getDecimalsErc20(this.signer, tokenIn);
      const outputDecimals = await getDecimalsErc20(this.signer, tokenOut);

      logger.debug(`SushiSwap quote success: ${ethers.utils.formatUnits(amountIn, inputDecimals)} in -> ${ethers.utils.formatUnits(amountOut, outputDecimals)} out`);

      return {
        success: true,
        dstAmount: amountOut,
        gasEstimate: gasEstimate
      };

    } catch (error: any) {
      logger.debug(`SushiSwap quote failed: ${error.message}`);
      
      // Parse common errors
      if (error.message?.includes('INSUFFICIENT_LIQUIDITY')) {
        return { success: false, error: 'Insufficient liquidity in SushiSwap pool' };
      } else if (error.message?.includes('revert')) {
        return { success: false, error: `SushiSwap quoter reverted: ${error.reason || error.message}` };
      } else {
        return { success: false, error: `SushiSwap quote error: ${error.message}` };
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
    tokenOutDecimals: number,
    feeTier?: number
  ): Promise<{ success: boolean; price?: number; error?: string }> {
    try {
      const quoteResult = await this.getQuote(amountIn, tokenIn, tokenOut, feeTier);
      
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
      
      logger.debug(`SushiSwap market price: 1 ${tokenIn} = ${marketPrice.toFixed(6)} ${tokenOut}`);
      
      return { success: true, price: marketPrice };

    } catch (error: any) {
      return { success: false, error: `Market price calculation failed: ${error.message}` };
    }
  }

  /**
   * Estimate gas for a swap (if quoter is available)
   */
  async estimateSwapGas(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    feeTier?: number
  ): Promise<BigNumber | undefined> {
    try {
      const quoteResult = await this.getQuote(amountIn, tokenIn, tokenOut, feeTier);
      return quoteResult.gasEstimate;
    } catch (error) {
      logger.debug(`Gas estimation failed: ${error}`);
      return undefined;
    }
  }
}
