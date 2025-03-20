import axios from 'axios';
import 'dotenv/config';
import { BigNumber, Contract, Signer, providers } from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { approveErc20, getAllowanceOfErc20 } from './erc20';
import { logger } from './logging';
import { swapToWeth } from './uniswap';
import { tokenChangeDecimals } from './utils';

export class DexRouter {
  private signer: Signer;
  private oneInchRouters: { [chainId: number]: string };

  constructor(
    signer: Signer,
    options: {
      oneInchRouters?: { [chainId: number]: string };
    } = {}
  ) {
    if (!signer) logger.error('Signer is required');
    const provider = signer.provider;
    if (!provider) logger.error('No provider available');
    this.signer = signer;
    this.oneInchRouters = options.oneInchRouters || {};
  }
  /**
   * Fetches a quote from the 1inch API for a given token swap.
   * @param chainId The chain ID for the swap.
   * @param amount The amount to swap.
   * @param tokenIn The address of the input token.
   * @param tokenOut The address of the output token.
   * @returns An object containing the quoted amount and protocols used.
   */
  private async getQuoteFromOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string
  ): Promise<{ toTokenAmount: string; protocols: any[] }> {
    if (!process.env.ONEINCH_API) {
      logger.error(
        'ONEINCH_API is not configured in the environment variables'
      );
      throw new Error('ONEINCH_API is not configured');
    }
    if (!process.env.ONEINCH_API_KEY) {
      logger.error(
        'ONEINCH_API_KEY is not configured in the environment variables'
      );
      throw new Error('ONEINCH_API_KEY is not configured');
    }

    const url = `${process.env.ONEINCH_API}/${chainId}/quote`;
    const connectorTokens = [
      '0x24de8771bc5ddb3362db529fc3358f2df3a0e346',
      '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
      '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
      '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    ].join(',');

    const params = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
      connectorTokens,
    };
    logger.debug(`Sending these params to 1inch quote: ${JSON.stringify(params)}`);

    try {
      const response = await axios.get(url, {
        params,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      });

      logger.debug(`Quote from 1inch: ${response.data.toString()}`);
      return {
        toTokenAmount: response.data.toTokenAmount,
        protocols: response.data.protocols,
      };
    } catch (error: Error | any) {
      const errorMsg = error.response?.data?.description || error.message;
      logger.error(`Failed to get quote from 1inch: ${errorMsg} ${error}`);
      throw error;
    }
  }

  private async swapWithOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    slippage: number
  ) {
    if (!process.env.ONEINCH_API) {
      logger.error(
        'ONEINCH_API is not configured in the environment variables'
      );
    }
    if (!process.env.ONEINCH_API_KEY) {
      logger.error(
        'ONEINCH_API_KEY is not configured in the environment variables'
      );
    }
    const url = `${process.env.ONEINCH_API}/${chainId}/swap`;
    const fromAddress = await this.signer.getAddress();

    if (slippage < 0 || slippage > 100) {
      logger.error('Slippage must be between 0 and 100');
    }

    const quote = await this.getQuoteFromOneInch(
      chainId,
      amount,
      tokenIn,
      tokenOut
    );
    logger.info(
      `1inch quote: ${amount.toString()} ${tokenIn} -> ${quote.toTokenAmount} ${tokenOut}`
    );

    const params = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
      fromAddress,
      slippage,
    };

    logger.debug(`Sending these params to 1inch: ${JSON.stringify(params)}`);

    try {
      const response = await axios.get(url, {
        params,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      });

      if (!response.data.tx) {
        logger.error('No valid transaction received from 1inch');
      }

      const tx = response.data.tx;
      logger.debug(`Transaction from 1inch: ${JSON.stringify(tx)}`);

      const provider = this.signer.provider as providers.Provider;
      const gasEstimate = await provider.estimateGas({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        from: fromAddress,
      });
      tx.gas = gasEstimate.add(gasEstimate.div(10)).toString();

      const txResponse = await this.signer.sendTransaction(tx);
      const receipt = await txResponse.wait();
      logger.info(
        `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut} | Tx Hash: ${txResponse.hash}`
      );
      return receipt;
    } catch (error: Error | any) {
      const errorMsg = error.response?.data?.description || error.message;
      logger.error(`Failed to swap with 1inch: ${errorMsg} ${error}`);
      throw error;
    }
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
  ) {
    if (!chainId || !amount || !tokenIn || !tokenOut || !to) {
      logger.error('Invalid parameters provided to swap');
    }
    if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
      logger.info(`Token ${tokenIn} is already ${tokenOut}, no swap necessary`);
      return;
    }

    const provider = this.signer.provider as providers.Provider;
    const fromAddress = await this.signer.getAddress();

    const erc20 = new Contract(tokenIn, ERC20_ABI, provider);
    const decimals = await erc20.decimals();
    const balance = await erc20.balanceOf(fromAddress);
    const adjustedAmount = tokenChangeDecimals(amount, 18, decimals);

    if (balance.lt(adjustedAmount)) {
      logger.error(
        `Insufficient balance for ${tokenIn}: ${balance.toString()} < ${adjustedAmount.toString()}`
      );
    }

    const effectiveUseOneInch = chainId === 43114 ? true : useOneInch;
    if (effectiveUseOneInch) {
      const oneInchRouter = this.oneInchRouters[chainId];
      if (!oneInchRouter) {
        logger.error(`No 1inch router defined for chainId ${chainId}`);
      }

      const currentAllowance = await getAllowanceOfErc20(
        this.signer,
        tokenIn,
        oneInchRouter
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
          logger.error(`Failed to approve token ${tokenIn} for 1inch ${error}`);
          throw error;
        }
      }

      await this.swapWithOneInch(
        chainId,
        adjustedAmount,
        tokenIn,
        tokenOut,
        slippage
      );
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
      } catch (error) {
        logger.error(
          `Uniswap V3 swap via swapToWeth failed for token: ${tokenIn} ${error}`
        );
        throw error;
      }
    }
  }
}
