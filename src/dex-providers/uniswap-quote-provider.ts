// src/dex-providers/uniswap-quote-provider.ts
// OFFICIAL UNISWAP APPROACH: Using QuoterV2 contract with callStatic

import { BigNumber, ethers } from 'ethers';
import { logger } from '../logging';
import { getDecimalsErc20 } from '../erc20';

interface QuoteResult {
  success: boolean;
  dstAmount?: string;
  error?: string;
}

interface UniswapV3Config {
  universalRouterAddress: string;
  poolFactoryAddress: string;
  defaultFeeTier: number;
  wethAddress: string;
  quoterV2Address?: string;  // NEW: QuoterV2 address from config
}

// QuoterV2 ABI - the official interface for getting quotes
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

/**
 * Official Uniswap V3 quote provider using QuoterV2 contract
 * Uses the configured QuoterV2 address per chain - clean and simple!
 */
export class UniswapV3QuoteProvider {
  private signer: ethers.Signer;
  private config: UniswapV3Config;

  constructor(signer: ethers.Signer, config: UniswapV3Config) {
    this.signer = signer;
    this.config = config;
  }

  /**
   * Get a quote using the configured QuoterV2 contract
   * Simple and clean - just uses the address from config
   */
  async getQuote(
    srcAmount: BigNumber,
    srcToken: string,
    dstToken: string,
    feeTier?: number
  ): Promise<QuoteResult> {
    try {
      const tier = feeTier || this.config.defaultFeeTier;
      
      // Check if QuoterV2 address is configured
      if (!this.config.quoterV2Address) {
        return {
          success: false,
          error: 'QuoterV2 address not configured for this chain'
        };
      }

      // Create QuoterV2 contract instance
      const quoterContract = new ethers.Contract(
        this.config.quoterV2Address,
        QUOTER_V2_ABI,
        this.signer
      );

      // Prepare quote parameters
      const quoteParams = {
        tokenIn: srcToken,
        tokenOut: dstToken,
        amountIn: srcAmount,
        fee: tier,
        sqrtPriceLimitX96: 0 // No price limit
      };
      
      // Get correct decimals for proper formatting
      const inputDecimals = await getDecimalsErc20(this.signer, srcToken);
      const outputDecimals = await getDecimalsErc20(this.signer, dstToken);
      logger.debug(`Getting Uniswap V3 quote using QuoterV2 at ${this.config.quoterV2Address}: ${ethers.utils.formatUnits(srcAmount, inputDecimals)} ${srcToken} -> ${dstToken} (fee: ${tier})`);

      // CRITICAL: Use callStatic because QuoterV2 works by reverting with the result
      const result = await quoterContract.callStatic.quoteExactInputSingle(quoteParams);
      
      // QuoterV2 returns: (amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate)
      const [amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate] = result;

      if (amountOut.eq(0)) {
        return {
          success: false,
          error: 'Quote returned zero output amount'
        };
      }

      logger.debug(`Uniswap V3 quote result: ${ethers.utils.formatUnits(amountOut, outputDecimals)} ${dstToken} (gas: ${gasEstimate.toString()})`);

      return {
        success: true,
        dstAmount: amountOut.toString()
      };

    } catch (error: any) {
      logger.error(`Uniswap V3 quote failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if this provider is available (has required configuration)
   */
  isAvailable(): boolean {
    return !!(
      this.config.universalRouterAddress &&
      this.config.poolFactoryAddress &&
      this.config.defaultFeeTier &&
      this.config.wethAddress &&
      this.config.quoterV2Address  // NEW: Require QuoterV2 address
    );
  }

  /**
   * Get the configured QuoterV2 address for debugging
   */
  getQuoterAddress(): string | undefined {
    return this.config.quoterV2Address;
  }
}
