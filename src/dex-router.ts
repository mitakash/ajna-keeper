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
    if (!signer) throw new Error('Signer is required');
    const provider = signer.provider;
    if (!provider) throw new Error('No provider available');
    this.signer = signer;
    this.oneInchRouters = options.oneInchRouters || {};
    if (!process.env.ONEINCH_API) {
      throw new Error(
        'ONEINCH_API is not configured in the environment variables'
      );
    }
    if (!process.env.ONEINCH_API_KEY) {
      throw new Error(
        'ONEINCH_API_KEY is not configured in the environment variables'
      );
    }
  }

  private async swapWithOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    slippage: number
  ) {
    const url = `${process.env.ONEINCH_API}/${chainId}/swap`;
    const fromAddress = await this.signer.getAddress();

    if (slippage < 0 || slippage > 100) {
      throw new Error('Slippage must be between 0 and 100');
    }

    const params = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
      fromAddress,
      slippage,
    };

    try {
      const response = await axios.get(url, {
        params,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
        },
      });

      if (!response.data.tx) {
        throw new Error('No valid transaction received from 1inch');
      }

      const tx = response.data.tx;
      logger.debug('Params sent to 1inch:', params);
      logger.debug('Transaction from 1inch:', tx);

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
      logger.error(`Failed to swap with 1inch: ${errorMsg}`, error);
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
      throw new Error('Invalid parameters provided to swap');
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
      throw new Error(
        `Insufficient balance for ${tokenIn}: ${balance.toString()} < ${adjustedAmount.toString()}`
      );
    }

    const effectiveUseOneInch = chainId === 43114 ? true : useOneInch;
    if (effectiveUseOneInch) {
      const oneInchRouter = this.oneInchRouters[chainId];
      if (!oneInchRouter) {
        throw new Error(`No 1inch router defined for chainId ${chainId}`);
      }

      const currentAllowance = await getAllowanceOfErc20(
        this.signer,
        tokenIn,
        oneInchRouter
      );
      if (currentAllowance.lt(amount)) {
        try {
          logger.debug(
            `Approving 1inch router ${oneInchRouter} for token: ${tokenIn}`
          );
          await approveErc20(this.signer, tokenIn, oneInchRouter, amount);
          logger.info(`Approval successful for token ${tokenIn}`);
        } catch (error) {
          logger.error(`Failed to approve token ${tokenIn} for 1inch`, error);
          throw error;
        }
      }

      await this.swapWithOneInch(chainId, amount, tokenIn, tokenOut, slippage);
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
          `Uniswap V3 swap via swapToWeth failed for token: ${tokenIn}`,
          error
        );
        throw error;
      }
    }
  }
}
