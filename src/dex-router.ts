import axios from 'axios';
import 'dotenv/config';
import { BigNumber, Contract, Signer, providers , ethers} from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { approveErc20, getAllowanceOfErc20, getDecimalsErc20 } from './erc20';
import { logger } from './logging';
import { swapToWeth } from './uniswap';
import { tokenChangeDecimals } from './utils';
import { swapWithUniversalRouter } from './universal-router-module';
import { swapWithSushiswapRouter } from './sushiswap-router-module';
import { swapWithUniswapV4Adapter } from './uniswapV4-router-module';
import { NonceTracker } from './nonce';
import { UniswapV4RouterOverrides, UniV4PoolKey, PostAuctionDex } from './config-types';
import { UniswapV4QuoteProvider } from './dex-providers/uniswapV4-quote-provider';

// TODO:
// Why does this log errors and return failure rather than throwing exceptions?

export class DexRouter {
  private signer: Signer;
  private oneInchRouters: { [chainId: number]: string };
  private connectorTokens: string;

  /**
   * AUDIT FIX C-04: Find and NORMALIZE V4 pool key for token pair
   * V4 requires currency0 < currency1 (lexicographic ordering)
   * Returns normalized poolKey or undefined if not found
   */
  private findV4PoolKeyForPair(
    v4: UniswapV4RouterOverrides,
    a: string,
    b: string
  ): UniV4PoolKey | undefined {
    const pools = v4.pools || {};
    const aLc = a.toLowerCase();
    const bLc = b.toLowerCase();

    for (const key of Object.keys(pools)) {
      const k = pools[key] as UniV4PoolKey;
      if (!k) continue;

      const t0 = k.token0.toLowerCase();
      const t1 = k.token1.toLowerCase();

      const m1 = t0 === aLc && t1 === bLc;
      const m2 = t0 === bLc && t1 === aLc;

      if (m1 || m2) {
        // CRITICAL: Normalize the poolKey so currency0 < currency1 (V4 requirement)
        // V4 pools are keyed by ordered addresses - wrong order = different/nonexistent pool
        if (t0 < t1) {
          // Already normalized
          return k;
        } else {
          // Need to swap - return normalized copy
          return {
            token0: k.token1,
            token1: k.token0,
            fee: k.fee,
            tickSpacing: k.tickSpacing,
            hooks: k.hooks,
            sqrtPriceLimitX96: k.sqrtPriceLimitX96,
          };
        }
      }
    }
    return undefined;
  }

  constructor(
    signer: Signer,
    options: {
      oneInchRouters?: { [chainId: number]: string };
      connectorTokens?: Array<string>;
    } = {}
  ) {
    if (!signer) logger.error('Signer is required');
    const provider = signer.provider;
    if (!provider) logger.error('No provider available');
    this.signer = signer;
    this.oneInchRouters = options.oneInchRouters || {};
    this.connectorTokens = options.connectorTokens
      ? options.connectorTokens.join(',')
      : '';
  }

  // All methods stay exactly the same until swap()
  public getRouter(chainId: number): string | undefined {
    return this.oneInchRouters[chainId];
  }

  public async getQuoteFromOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string
  ): Promise<{ success: boolean; dstAmount?: string; error?: string }> {
    const url = `${process.env.ONEINCH_API}/${chainId}/quote`;

    const params: {
      fromTokenAddress: string;
      toTokenAddress: string;
      amount: string;
      connectorTokens?: string;
    } = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
    };

    if (this.connectorTokens.length > 0) {
      params['connectorTokens'] = this.connectorTokens;
    }

    logger.debug(
      `Sending these parameters to 1inch get quote: ${JSON.stringify(params)}`
    );

    try {
      const response = await axios.get(url, {
        params,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      });
      console.log('1inch quote response:', response.data);

      return { success: true, dstAmount: response.data.dstAmount };
    } catch (error: Error | any) {
      const errorMsg = error.response?.data?.description || error.message;
      logger.error(`Failed to get quote from 1inch: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  public async getSwapDataFromOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    slippage: number,
    fromAddress: string,
    usePatching: boolean = false,
  ) : Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${process.env.ONEINCH_API}/${chainId}/swap`;
    const params: {
      fromTokenAddress: string;
      toTokenAddress: string;
      amount: string;
      fromAddress: string;
      slippage: number;
      connectorTokens?: string;
      usePatching?: boolean;
      disableEstimate?: boolean;
    } = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
      fromAddress,
      slippage,
    };

    if (this.connectorTokens.length > 0) {
      params['connectorTokens'] = this.connectorTokens;
    }
    if (usePatching) {
      params['usePatching'] = true;     // allow mutations to the swap data
      params['disableEstimate'] = true; // skip API balance check (collateral will come mid-transaction)
    }

    logger.debug(
      `Sending these parameters to 1inch: ${JSON.stringify(params)}`
    );

    const response = await axios.get(url, {
      params,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
      },
    });

    if (
      !response.data.tx ||
      !response.data.tx.to ||
      !response.data.tx.data
    ) {
      logger.error('No valid transaction received from 1inch');
      return {
        success: false,
        error: 'No valid transaction received from 1inch',
      };
    }

    return { success: true, data: response.data.tx };
  }

  // swapWithOneInch stays exactly the same (preserves NonceTracker!)
  private async swapWithOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    slippage: number,
  ): Promise<{ success: boolean; receipt?: any; error?: string }> {
    if (!process.env.ONEINCH_API) {
      logger.error(
        'ONEINCH_API is not configured in the environment variables'
      );
      return { success: false, error: 'ONEINCH_API is not configured' };
    }
    if (!process.env.ONEINCH_API_KEY) {
      logger.error(
        'ONEINCH_API_KEY is not configured in the environment variables'
      );
      return { success: false, error: 'ONEINCH_API_KEY is not configured' };
    }

    const fromAddress = await this.signer.getAddress();

    if (slippage < 0 || slippage > 100) {
      logger.error('Slippage must be between 0 and 100');
      return { success: false, error: 'Slippage must be between 0 and 100' };
    }

    const quoteResult = await this.getQuoteFromOneInch(
      chainId,
      amount,
      tokenIn,
      tokenOut
    );
    if (!quoteResult.success) {
      return { success: false, error: quoteResult.error };
    }
    logger.info(
      `1inch quote: ${amount.toString()} ${tokenIn} -> ${quoteResult.dstAmount} ${tokenOut}`
    );

    const retries = 3;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const swapDataResult = await this.getSwapDataFromOneInch(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          slippage,
          fromAddress
        );
        if (!swapDataResult.success) {
          return { success: false, error: swapDataResult.error };
        }
        const txFrom1inch = swapDataResult.data!;
        logger.debug(`Transaction from 1inch: ${JSON.stringify(txFrom1inch)}`);

        const tx = {
          to: txFrom1inch.to,
          data: txFrom1inch.data,
          value: txFrom1inch.value || '0',
          gasLimit: txFrom1inch.gas
            ? BigNumber.from(txFrom1inch.gas)
            : undefined,
          gasPrice: txFrom1inch.gasPrice
            ? BigNumber.from(txFrom1inch.gasPrice)
            : undefined,
        };

        const provider = this.signer.provider as providers.Provider;
        let gasEstimate;
        try {
          gasEstimate = await provider.estimateGas({
            to: tx.to,
            data: tx.data,
            value: tx.value || '0',
            from: fromAddress,
          });
          tx.gasLimit = gasEstimate.add(gasEstimate.div(10));
        } catch (gasError) {
          logger.error(`Failed to estimate gas: ${gasError}`);
          return {
            success: false,
            error: `Gas estimation failed: ${gasError}`,
          };
        }

        // CRITICAL: Keep NonceTracker.queueTransaction exactly as-is!
        const receipt = await NonceTracker.queueTransaction(this.signer, async (nonce: number) => {
        // Create a new txWithNonce object that includes the nonce
        const txWithNonce = {
          ...tx,
          nonce
        };
        const txResponse = await this.signer.sendTransaction(txWithNonce);
        return await txResponse.wait();
        });
	
	logger.info(
          `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut} | Tx Hash: ${receipt.transactionHash}`
        );
        return { success: true, receipt };
      } catch (error: Error | any) {
        const errorMsg = error.response?.data?.description || error.message;
        const status = error.response?.status || 500;
        if (status === 429 && attempt < retries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          logger.warn(`Attempt (${attempt}/${retries}) after ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        logger.error(`Failed to swap with 1inch: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    }
    return { success: false, error: 'Max retries reached for 1inch swap' };
  }

  // Keep your existing swapWithSushiswap method exactly as-is
  private async swapWithSushiswap(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    to: string,
    slippage: number,
    feeAmount?: number,
    sushiswapSettings?: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      
      if (!sushiswapSettings) {
        return {
          success: false,
          error: 'SushiSwap configuration not found'
        };
      }
      
      const result = await swapWithSushiswapRouter(
        this.signer,
        tokenIn,
        amount,
        tokenOut,
        slippage,
        sushiswapSettings.swapRouterAddress!,
        sushiswapSettings.quoterV2Address!,
        feeAmount || sushiswapSettings.defaultFeeTier || 500,
	sushiswapSettings.factoryAddress,  // From your config
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `SushiSwap swap failed: ${error}`
      };
    }
  }

  private async swapWithUniswapV4(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    to: string,
    slippage: number,
    uniswapV4Settings?: UniswapV4RouterOverrides,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!uniswapV4Settings) {
        return {
          success: false,
          error: 'Uniswap V4 configuration not found'
        };
      }
  
      if (!uniswapV4Settings.router) {
        return {
          success: false,
          error: 'Uniswap V4 router address not configured'
        };
      }
  
      // Find the pool key for this token pair
      const poolKey = this.findV4PoolKeyForPair(
        uniswapV4Settings,
        tokenIn,
        tokenOut
      );
  
      if (!poolKey) {
        return {
          success: false,
          error: `No V4 pool configured for pair ${tokenIn}-${tokenOut}`
        };
      }
  
      logger.info(`Using Uniswap V4 pool: ${poolKey.token0.slice(0, 8)}.../${poolKey.token1.slice(0, 8)}... (fee: ${poolKey.fee})`);
  
      // Get token decimals for price calculation
      const ERC20_ABI = ['function decimals() view returns (uint8)'];
      const tokenInContract = new Contract(tokenIn, ERC20_ABI, this.signer);
      const tokenOutContract = new Contract(tokenOut, ERC20_ABI, this.signer);

      const tokenInDecimalsRaw = await tokenInContract.decimals();
      const tokenOutDecimalsRaw = await tokenOutContract.decimals();

      const tokenInDecimals = typeof tokenInDecimalsRaw === 'number'
        ? tokenInDecimalsRaw
        : tokenInDecimalsRaw.toNumber();
      const tokenOutDecimals = typeof tokenOutDecimalsRaw === 'number'
        ? tokenOutDecimalsRaw
        : tokenOutDecimalsRaw.toNumber();

      // Initialize quote provider and get market price
      try {
        // Ensure poolManager is defined for V4Config
        if (!uniswapV4Settings.poolManager) {
          return {
            success: false,
            error: 'Uniswap V4 poolManager address not configured'
          };
        }

        // AUDIT FIX H-03: Pass through stateView for multi-chain support
        const v4Config = {
          poolManager: uniswapV4Settings.poolManager,
          defaultSlippage: uniswapV4Settings.defaultSlippage,
          pools: uniswapV4Settings.pools,
          stateView: uniswapV4Settings.stateView,
        };

        const quoteProvider = new UniswapV4QuoteProvider(this.signer, v4Config);
        const initialized = await quoteProvider.initialize();

        if (initialized) {
          logger.info('✅ V4 QuoteProvider initialized successfully');
          logger.info(`   PoolManager: ${quoteProvider.getPoolManagerAddress()}`);

          // Get market price from the pool (4 arguments: amountIn, tokenIn, tokenOut, poolKey)
          const marketResult = await quoteProvider.getMarketPrice(
            amount,
            tokenIn,
            tokenOut,
            poolKey
          );

          if (marketResult.success && marketResult.price) {
            logger.info(`📊 V4 Market Price: ${marketResult.price.toFixed(8)} ${tokenOut}/${tokenIn}`);

            // Calculate expected output - amount is already in native decimals
            const amountInFormatted = parseFloat(ethers.utils.formatUnits(amount, tokenInDecimals));
            const expectedOutputValue = amountInFormatted * marketResult.price;

            logger.info(`💰 Expected output: ~${expectedOutputValue.toFixed(6)} ${tokenOut} tokens`);

            // Optional: Add price validation here
            // Example: Check if price is reasonable
            if (marketResult.price <= 0) {
              logger.warn(`⚠️  Market price is ${marketResult.price} - this seems wrong!`);
              return {
                success: false,
                error: `Invalid market price: ${marketResult.price}`
              };
            }

          } else {
            logger.warn(`⚠️  V4 market price unavailable: ${marketResult.error || 'Unknown error'}`);
            logger.info('Proceeding with swap anyway (quote is informational)');
          }
        } else {
          logger.warn('⚠️  V4 QuoteProvider failed to initialize');
          logger.info('Proceeding without price check (quote provider is optional)');
        }
      } catch (quoteError) {
        const errorMsg = quoteError instanceof Error ? quoteError.message : String(quoteError);
        logger.warn(`⚠️  V4 quote provider error: ${errorMsg}`);
        logger.info('Proceeding with swap anyway (quote is informational only)');
      }
  
      // Execute the swap
      logger.info('🔄 Executing V4 swap...');
      const result = await swapWithUniswapV4Adapter(
        this.signer,
        tokenIn,
        amount,
        tokenOut,
        slippage ?? uniswapV4Settings.defaultSlippage ?? 1.0,
        uniswapV4Settings.router,
        poolKey,
        to
      );
  
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Uniswap V4 swap failed: ${errorMsg}`
      };
    }
  }

  // MAJOR CHANGE: Update method signature and replace boolean logic with switch/case
  public async swap(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    to: string,
    dexProvider: PostAuctionDex,
    slippage: number = 1,
    feeAmount: number = 3000,
    combinedSettings?: { 
      uniswap?: {
        wethAddress?: string; 
        uniswapV3Router?: string;
        universalRouterAddress?: string;
        permit2Address?: string;
        poolFactoryAddress?: string;
        defaultFeeTier?: number;
        defaultSlippage?: number;
      };
      sushiswap?: any; // ADD: SushiSwap settings
      uniswapV4?: UniswapV4RouterOverrides;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!chainId || !amount || !tokenIn || !tokenOut || !to) {
      logger.error('Invalid parameters provided to swap');
      return { success: false, error: 'Invalid parameters provided to swap' };
    }
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      logger.info(`Token ${tokenIn} is already ${tokenOut}, no swap necessary`);
      return { success: true };
    }

    const provider = this.signer.provider as providers.Provider;
    const fromAddress = await this.signer.getAddress();

    // Convert amount from WAD (18 decimals) to token's native decimals
    const decimals = await getDecimalsErc20(this.signer, tokenIn);
    const adjustedAmount = tokenChangeDecimals(amount, 18, decimals);
    logger.debug(
      `Converted ${amount.toString()} (WAD) to ${adjustedAmount.toString()} (${decimals} decimals) for token ${tokenIn}`
    );

    const erc20 = new Contract(tokenIn, ERC20_ABI, provider);
    const balance = await erc20.balanceOf(fromAddress);

    if (balance.lt(adjustedAmount)) {
      logger.error(
        `Insufficient balance for ${tokenIn}: ${balance.toString()} < ${adjustedAmount.toString()}`
      );
      return { success: false, error: `Insufficient balance for ${tokenIn}` };
    }


    // ADD: Replace with switch/case enum logic
    switch (dexProvider) {
      case PostAuctionDex.ONEINCH:
        // SAME: Keep exact same 1inch logic, preserves all nonce tracking!
        const oneInchRouter = this.oneInchRouters[chainId];
        if (!oneInchRouter) {
          logger.error(`No 1inch router defined for chainId ${chainId}`);
          return {
            success: false,
            error: `No 1inch router defined for chainId ${chainId}`,
          };
        }

        const currentAllowance = await getAllowanceOfErc20(
          this.signer,
          tokenIn,
          oneInchRouter
        );
        logger.debug(
          `Current allowance: ${currentAllowance.toString()}, Amount: ${adjustedAmount.toString()}`
        );
        if (currentAllowance.lt(adjustedAmount)) {
          try {
            logger.debug(
              `Approving 1inch router ${oneInchRouter} for token: ${tokenIn}`
            );
            await approveErc20(
              this.signer,
              tokenIn,
              oneInchRouter,
              adjustedAmount
            );
            logger.info(`Approval successful for token ${tokenIn}`);
          } catch (error) {
            logger.error(
              `Failed to approve token ${tokenIn} for 1inch: ${error}`
            );
            return { success: false, error: `Approval failed: ${error}` };
          }
        }

        const result = await this.swapWithOneInch(
          chainId,
          adjustedAmount,
          tokenIn,
          tokenOut,
          slippage
        );
        return result;

      case PostAuctionDex.UNISWAP_V3:
        // SAME: Keep exact same Uniswap logic, just change uniswapOverrides → combinedSettings?.uniswap
        if (combinedSettings?.uniswap?.universalRouterAddress && combinedSettings?.uniswap?.permit2Address && combinedSettings?.uniswap?.poolFactoryAddress) {
          try {
            logger.info(`Using Universal Router for swap`);
            await swapWithUniversalRouter(
              this.signer,
              tokenIn,
              adjustedAmount,
              tokenOut,
              slippage * 100, // Convert percentage to basis points
              combinedSettings.uniswap.universalRouterAddress,
              combinedSettings.uniswap.permit2Address,
              combinedSettings.uniswap.defaultFeeTier || feeAmount,
              combinedSettings.uniswap.poolFactoryAddress
            );
            logger.info(
              `Universal Router swap successful: ${adjustedAmount.toString()} ${tokenIn} -> ${tokenOut}`
            );
            return { success: true };
          } catch (error) {
            logger.error(`Universal Router swap failed for token: ${tokenIn}: ${error}`);
            return { success: false, error: `Universal Router swap failed: ${error}` };
          }
        } else {
          try {
            await swapToWeth(
              this.signer,
              tokenIn,
              adjustedAmount,
              feeAmount,
              combinedSettings?.uniswap
            );
            logger.info(
              `Uniswap V3 swap successful: ${adjustedAmount.toString()} ${tokenIn} -> ${tokenOut}`
            );
            return { success: true };
          } catch (error) {
            logger.error(`Uniswap V3 swap failed for token: ${tokenIn}: ${error}`);
            return { success: false, error: `Uniswap swap failed: ${error}` };
          }
        }

      case PostAuctionDex.SUSHISWAP:
        // NEW: Add SushiSwap case
        return await this.swapWithSushiswap(
          chainId,
          adjustedAmount,
          tokenIn,
          tokenOut,
          to,
          slippage,
          feeAmount,
          combinedSettings?.sushiswap
        );
      
        case PostAuctionDex.UNISWAP_V4:
          return await this.swapWithUniswapV4(
            chainId,
            adjustedAmount,
            tokenIn,
            tokenOut,
            to,
            slippage,
            combinedSettings?.uniswapV4
          );

      default:
        return {
          success: false,
          error: `Unsupported DEX provider: ${dexProvider}`
        };
      
    }
  }
}
