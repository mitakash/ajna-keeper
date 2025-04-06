import axios from 'axios';
import 'dotenv/config';
import { BigNumber, Contract, Signer, providers } from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { approveErc20, getAllowanceOfErc20 } from './erc20';
import { logger } from './logging';
import { swapToWeth } from './uniswap';

// TODO:
// Why does this log errors and return failure rather than throwing exceptions?

export class DexRouter {
  private signer: Signer;
  private oneInchRouters: { [chainId: number]: string };
  private connectorTokens: string;

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
    this.connectorTokens = options.connectorTokens ? options.connectorTokens.join(',') : '';
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

        const txResponse = await this.signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        logger.info(
          `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut} | Tx Hash: ${txResponse.hash}`
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

  public async swap(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    to: string,
    useOneInch: boolean,
    slippage: number = 1,
    feeAmount: number = 3000,
    uniswapOverrides?: { wethAddress?: string; uniswapV3Router?: string }
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

    const erc20 = new Contract(tokenIn, ERC20_ABI, provider);
    const balance = await erc20.balanceOf(fromAddress);

    if (balance.lt(amount)) {
      logger.error(
        `Insufficient balance for ${tokenIn}: ${balance.toString()} < ${amount.toString()}`
      );
      return { success: false, error: `Insufficient balance for ${tokenIn}` };
    }

    const effectiveUseOneInch = chainId === 43114 ? true : useOneInch;
    if (effectiveUseOneInch) {
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
        `Current allowance: ${currentAllowance.toString()}, Amount: ${amount.toString()}`
      );
      if (currentAllowance.lt(amount)) {
        try {
          logger.debug(
            `Approving 1inch router ${oneInchRouter} for token: ${tokenIn}`
          );
          await approveErc20(this.signer, tokenIn, oneInchRouter, amount);
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
        amount,
        tokenIn,
        tokenOut,
        slippage
      );
      return result;
    } else {
      try {
        await swapToWeth(
          this.signer,
          tokenIn,
          amount,
          feeAmount,
          uniswapOverrides
        );
        logger.info(
          `Uniswap V3 swap via swapToWeth successful: ${amount.toString()} ${tokenIn} -> ${tokenOut}`
        );
        return { success: true };
      } catch (error) {
        logger.error(
          `Uniswap V3 swap via swapToWeth failed for token: ${tokenIn}: ${error}`
        );
        return { success: false, error: `Uniswap swap failed: ${error}` };
      }
    }
  }
}
