import axios from 'axios';
import { BigNumber, Contract, Signer, providers } from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { logger } from './logging';
import { approveErc20, getAllowanceOfErc20 } from './erc20';
import { swapToWeth } from './uniswap';

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
  }

  private async swapWithOneInch(
    chainId: number,
    amount: BigNumber,
    tokenIn: string,
    tokenOut: string,
    slippage: number
  ) {
    const url = `${process.env.ONEINCH}/${chainId}/swap`;
    const fromAddress = await this.signer.getAddress();
    const params = {
      fromTokenAddress: tokenIn,
      toTokenAddress: tokenOut,
      amount: amount.toString(),
      fromAddress,
      slippage,
    };

    const response = await axios.get(url, { params });
    const tx = response.data.tx;

    const provider = this.signer.provider as providers.Provider;
    const gasEstimate = await provider.estimateGas({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      from: fromAddress,
    });
    tx.gas = gasEstimate.add(gasEstimate.div(10)).toString(); // 10%

    const txResponse = await this.signer.sendTransaction(tx);
    await txResponse.wait();
    logger.info(
      `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut}`
    );
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
    const balance = await erc20.balanceOf(fromAddress);
    if (balance.lt(amount)) {
      throw new Error(
        `Insufficient balance for ${tokenIn}: ${balance.toString()} < ${amount.toString()}`
      );
    }

    if (useOneInch) {
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
