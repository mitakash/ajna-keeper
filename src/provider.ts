import { providers, BigNumber } from 'ethers';
import { decimaledToWei } from './utils';
import { wmul } from '@ajna-finance/sdk';

export interface FeeData {
  lastBaseFeePerGas: null | BigNumber;
  maxFeePerGas: null | BigNumber;
  maxPriorityFeePerGas: null | BigNumber;
  gasPrice: null | BigNumber;
}

/** An extension of ethers@v5 JsonRpcProvider which takes advantage of the fee structure from EIP-1559. */
export class JsonRpcProvider extends providers.JsonRpcProvider {
  // This uses the logic of ethers@v6: getFeeData and makes it compatible with ethers@v5: getFeeData.
  // V6: https://github.com/ethers-io/ethers.js/blob/v6.13.5/src.ts/providers/abstract-provider.ts
  // V5: https://github.com/ethers-io/ethers.js/blob/v5.7.2/packages/abstract-provider/src.ts/index.ts#L235
  async getMaxPriorityFeePerGas(): Promise<BigNumber> {
    const response = await this.send('eth_maxPriorityFeePerGas', []);
    return BigNumber.from(response);
  }

  async getFeeData(): Promise<FeeData> {
    const [block, gasPrice, priorityFee] = await Promise.all([
      this.getBlock('latest'),
      this.getGasPrice().catch((error) => {
        return null;
      }),
      this.getMaxPriorityFeePerGas(),
    ]);

    let maxFeePerGas: null | BigNumber = null;
    let maxPriorityFeePerGas: null | BigNumber = null;
    let lastBaseFeePerGas: null | BigNumber = null;

    // These are the recommended EIP-1559 heuristics for fee data
    if (block && block.baseFeePerGas) {
      maxPriorityFeePerGas =
        priorityFee != null ? priorityFee : BigNumber.from('1000000000');
      lastBaseFeePerGas = block.baseFeePerGas;
      maxFeePerGas = wmul(block.baseFeePerGas, decimaledToWei(2)).add(
        maxPriorityFeePerGas
      );
    }

    return { gasPrice, maxFeePerGas, maxPriorityFeePerGas, lastBaseFeePerGas };
  }
}
