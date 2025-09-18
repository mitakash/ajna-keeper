import axios from 'axios';
import 'dotenv/config';
import { BigNumber, Contract, Signer, providers } from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { approveErc20, getAllowanceOfErc20, getDecimalsErc20 } from './erc20';
import { logger } from './logging';
import { swapToWeth } from './uniswap';
import { tokenChangeDecimals } from './utils';
import { swapWithUniversalRouter } from './universal-router-module';
import { swapWithSushiswapRouter } from './sushiswap-router-module';
import { swapWithCurveRouter } from './curve-router-module';
import { NonceTracker } from './nonce';
import { PostAuctionDex, CurvePoolType } from './config-types';

export class DexRouter {
  private signer: Signer;
  private oneInchRouters: { [chainId: number]: string };
  private connectorTokens: string;
  private tokenAddresses: { [symbol: string]: string }; // CURVE INTEGRATION: Added for symbol lookup

  constructor(
    signer: Signer,
    options: {
      oneInchRouters?: { [chainId: number]: string };
      connectorTokens?: Array<string>;
      tokenAddresses?: { [symbol: string]: string }; // CURVE INTEGRATION: Added tokenAddresses
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
    this.tokenAddresses = options.tokenAddresses || {}; // CURVE INTEGRATION: Store tokenAddresses
  }

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

        const receipt = await NonceTracker.queueTransaction(this.signer, async (nonce: number) => {
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
        sushiswapSettings.factoryAddress,
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `SushiSwap swap failed: ${error}`
      };
    }
  }

  // CURVE INTEGRATION: Simplified helper to find pool config by token pair
  private getCurvePoolForTokenPair(
    tokenIn: string, 
    tokenOut: string, 
    poolConfigs: any
  ): { address: string; poolType: CurvePoolType } | undefined {
    
    // Convert addresses to symbol names for lookup  
    const tokenInSymbol = this.getTokenSymbolFromAddress(tokenIn);
    const tokenOutSymbol = this.getTokenSymbolFromAddress(tokenOut);
    
    if (!tokenInSymbol || !tokenOutSymbol) {
      logger.debug(`Could not resolve token symbols for ${tokenIn}/${tokenOut}`);
      return undefined;
    }
    
    // Try both directions for the token pair
    const key1 = `${tokenInSymbol}-${tokenOutSymbol}`;
    const key2 = `${tokenOutSymbol}-${tokenInSymbol}`;
    
    const poolConfig = poolConfigs[key1] || poolConfigs[key2];
    
    if (poolConfig) {
      logger.debug(`Found Curve pool for ${tokenInSymbol}/${tokenOutSymbol}: ${poolConfig.address}`);
      return poolConfig;
    }
    
    logger.debug(`No Curve pool configured for ${tokenInSymbol}/${tokenOutSymbol}`);
    return undefined;
  }

  // CURVE INTEGRATION: Helper to convert address to symbol using tokenAddresses from config
  private getTokenSymbolFromAddress(address: string): string | undefined {
    for (const [symbol, tokenAddress] of Object.entries(this.tokenAddresses)) {
      if (tokenAddress.toString().toLowerCase() === address.toLowerCase()) {
        return symbol;
      }
    }
    return undefined;
  }

  // CURVE INTEGRATION: Updated Curve swap method with simplified lookup
  private async swapWithCurve(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    to: string,
    slippage: number,
    feeAmount?: number,
    curveSettings?: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      
      if (!curveSettings) {
        return {
          success: false,
          error: 'Curve configuration not found'
        };
      }
      
      if (!curveSettings.poolConfigs) {
        return {
          success: false,
          error: 'Curve pool configurations not found'
        };
      }
      
      // SIMPLIFIED: Use the new token pair lookup
      const poolConfig = this.getCurvePoolForTokenPair(
        tokenIn, 
        tokenOut, 
        curveSettings.poolConfigs
      );
      
      if (!poolConfig) {
        return {
          success: false,
          error: `No Curve pool configured for ${tokenIn}/${tokenOut}`
        };
      }
      
      const result = await swapWithCurveRouter(
        this.signer,
        tokenIn,
        amount,
        tokenOut,
        slippage,
        poolConfig.address,
        poolConfig.poolType,
        curveSettings.defaultSlippage
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Curve swap failed: ${error}`
      };
    }
  }

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
      sushiswap?: any;
      curve?: {
        poolConfigs?: {
          [tokenPair: string]: {
            address: string;
            poolType: CurvePoolType;
          }
        };
        defaultSlippage?: number;
        wethAddress?: string;
      };
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

    switch (dexProvider) {
      case PostAuctionDex.ONEINCH:
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

      case PostAuctionDex.CURVE:
        // CURVE INTEGRATION: New case for Curve post-auction swaps
        return await this.swapWithCurve(
          chainId,
          adjustedAmount,
          tokenIn,
          tokenOut,
          to,
          slippage,
          feeAmount,
          combinedSettings?.curve
        );

      default:
        return {
          success: false,
          error: `Unsupported DEX provider: ${dexProvider}`
        };
    }
  }
}