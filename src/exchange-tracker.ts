import { BigNumber, Signer } from 'ethers';
import { KeeperConfig } from './config-types';
import { FeeAmount } from '@uniswap/v3-sdk';
import uniswap from './uniswap';
import { logger } from './logging';
import { delay, weiToDecimaled } from './utils';

function feeTokenToKey(token: string, fee: FeeAmount): string {
  return `${token}-${fee.toString()}`;
}

function keyToFeeToken(key: string): { token: string; fee: FeeAmount } {
  const [token, feeStr] = key.split('-');
  const fee = parseInt(feeStr);
  if (!Object.values(FeeAmount).includes(fee)) {
    throw new Error(`Could not convert the fee in key: ${key} to a FeeAmount.`);
  }
  return { token, fee: fee as FeeAmount };
}

export class ExchangeTracker {
  private feeTokenAmountMap: Map<string, BigNumber> = new Map();

  constructor(
    private signer: Signer,
    private config: Pick<
      KeeperConfig,
      'wethAddress' | 'uniswapV3Router' | 'delayBetweenActions'
    >
  ) {}

  async exchangeAllTokens() {
    const nonZeroEntries = Array.from(this.feeTokenAmountMap.entries()).filter(
      ([key, amount]) => amount.gt(BigNumber.from('0'))
    );
    for (const [key, amount] of nonZeroEntries) {
      try {
        const { token, fee } = keyToFeeToken(key);
        await uniswap.swapToWeth(
          this.signer,
          token,
          amount,
          fee,
          this.config.wethAddress,
          this.config.uniswapV3Router
        );
        this.removeTokenToBeExchanged(token, amount, fee);
        logger.info(
          `Successfully exchanged token on Uniswap. token: ${token}, fee: ${fee / 1000}%, amount: ${weiToDecimaled(amount)}`
        );
        await delay(this.config.delayBetweenActions);
      } catch (error) {
        logger.error(
          `Failed to exchange token on Uniswap. token-fee: ${key}, amount: ${amount}`
        );
      }
    }
  }

  addTokenToBeExchanged(
    tokenCollected: string,
    amountToAdd: BigNumber,
    feeAmount: FeeAmount
  ) {
    const key = feeTokenToKey(tokenCollected, feeAmount);
    const currAmount = this.feeTokenAmountMap.get(key) ?? BigNumber.from('0');
    this.feeTokenAmountMap.set(key, currAmount.add(amountToAdd));
  }

  removeTokenToBeExchanged(
    tokenCollected: string,
    amountToSub: BigNumber,
    feeAmount: FeeAmount
  ) {
    const key = feeTokenToKey(tokenCollected, feeAmount);
    const currAmount = this.feeTokenAmountMap.get(key) ?? BigNumber.from('0');
    this.feeTokenAmountMap.set(key, currAmount.sub(amountToSub));
  }
}
