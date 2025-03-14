import { FeeAmount } from '@uniswap/v3-sdk';
import { BigNumber, Signer, constants } from 'ethers';
import {
  ExchangeReward,
  KeeperConfig,
  RewardAction,
  RewardActionLabel,
  TransferReward
} from './config-types';
import { DexRouter } from './dex-router';
import { getDecimalsErc20, transferErc20 } from './erc20';
import { logger } from './logging';
import { delay, tokenChangeDecimals, weiToDecimaled } from './utils';

export interface TokenConfig {
  address: string;
  targetToken: string;
  slippage: number;
  useOneInch?: boolean;
  feeAmount?: FeeAmount;
}

export function deterministicJsonStringify(obj: any): string {
  // Note: this works fine as long as the object is not nested.
  const determineObj: { [key: string]: any } = {};
  const sortedKeys = Object.keys(obj).sort();
  for (const key of sortedKeys) {
    determineObj[key] = obj[key];
  }
  return JSON.stringify(determineObj);
}

function serializeRewardAction(
  rewardAction: RewardAction,
  token: string
): string {
  const key = deterministicJsonStringify({ token, ...rewardAction });
  return key;
}

function deserializeRewardAction(serial: string): {
  rewardAction: RewardAction;
  token: string;
} {
  const { token, ...rewardAction } = JSON.parse(serial);
  if (typeof token !== 'string') {
    throw new Error(`Could not deserialize token from ${serial}`);
  }
  return { token, rewardAction };
}

export class RewardActionTracker {
  private feeTokenAmountMap: Map<string, BigNumber> = new Map();

  constructor(
    private signer: Signer,
    private config: Pick<
      KeeperConfig,
      | 'uniswapOverrides'
      | 'delayBetweenActions'
      | 'pools'
      | 'oneInchRouters'
      | 'tokenAddresses'
    >,
    private dexRouter: DexRouter
  ) {}

  private async swapToken(
    chainId: number,
    tokenAddress: string,
    amount: BigNumber,
    targetToken: string,
    useOneInch: boolean,
    slippage: number,
    feeAmount?: number
  ): Promise<void> {
    const address = await this.signer.getAddress();

    const targetAddress =
      chainId === 43114 && targetToken in (this.config.tokenAddresses || {})
        ? this.config.tokenAddresses![targetToken]
        : this.config.uniswapOverrides?.wethAddress;

    if (!targetAddress) {
      throw new Error(
        `No target address found for token ${targetToken} on chain ${chainId}`
      );
    }

    await this.dexRouter.swap(
      chainId,
      amount,
      tokenAddress,
      targetAddress,
      address,
      useOneInch,
      slippage,
      feeAmount,
      this.config.uniswapOverrides
    );
  }

  public async handleAllTokens(): Promise<void> {
    const nonZeroEntries = Array.from(this.feeTokenAmountMap.entries()).filter(
      ([key, amountWad]) => amountWad.gt(constants.Zero)
    );
    for (const [key, amountWad] of nonZeroEntries) {
      const { rewardAction, token } = deserializeRewardAction(key);

      switch (rewardAction.action) {
        case RewardActionLabel.TRANSFER:
          await this.transferReward(
            rewardAction as TransferReward,
            token,
            amountWad
          );
          break;

        case RewardActionLabel.EXCHANGE:
          const pool = this.config.pools.find(
            (p) =>
              (
                p.collectLpReward?.rewardActionQuote?.action ===
                  RewardActionLabel.EXCHANGE &&
                p.collectLpReward?.rewardActionQuote?.address.toLowerCase() ===
                  token.toLowerCase()
              ) || (
                p.collectLpReward?.rewardActionCollateral?.action ===
                  RewardActionLabel.EXCHANGE &&
                p.collectLpReward?.rewardActionCollateral?.address.toLowerCase() ===
                  token.toLowerCase()
              )
          )

          const tokenConfig = rewardAction as TokenConfig;

          const slippage =
            tokenConfig?.slippage ??
            (rewardAction as ExchangeReward).slippage ??
            1;
          const targetToken =
            tokenConfig?.targetToken ??
            (rewardAction as ExchangeReward).targetToken ??
            'weth';
          const useOneInch =
            tokenConfig?.useOneInch ??
            (rewardAction as ExchangeReward).useOneInch ??
            false;
          const feeAmount =
            (rewardAction as ExchangeReward).fee ?? tokenConfig?.feeAmount;

          try {
            await this.swapToken(
              await this.signer.getChainId(),
              token,
              amountWad,
              targetToken,
              useOneInch,
              slippage,
              feeAmount
            );
            this.removeToken(rewardAction, token, amountWad);
            logger.info(
              `Successfully swapped ${weiToDecimaled(amountWad)} of ${token} to ${targetToken}`
            );
            await delay(this.config.delayBetweenActions);
          } catch (error) {
            logger.error(
              `Failed to swap ${weiToDecimaled(amountWad)} of ${token}`,
              error
            );
            throw error;
          }
          break;

        default:
          logger.warn('Unsupported reward action');
      }
    }
  }

  addToken(
    rewardAction: RewardAction,
    tokenCollected: string,
    amountWadToAdd: BigNumber
  ) {
    const key = serializeRewardAction(rewardAction, tokenCollected);
    const currAmount = this.feeTokenAmountMap.get(key) ?? constants.Zero;
    this.feeTokenAmountMap.set(key, currAmount.add(amountWadToAdd));
  }

  removeToken(
    rewardAction: RewardAction,
    tokenCollected: string,
    amountWadToSub: BigNumber
  ) {
    const key = serializeRewardAction(rewardAction, tokenCollected);
    const currAmount = this.feeTokenAmountMap.get(key) ?? constants.Zero;
    this.feeTokenAmountMap.set(key, currAmount.sub(amountWadToSub));
  }

  async transferReward(
    rewardAction: TransferReward,
    token: string,
    amountWad: BigNumber
  ) {
    try {
      logger.debug(
        `Sending reward token to ${rewardAction.to}, amountWad: ${weiToDecimaled(amountWad)}, tokenAddress: ${token}`
      );
      const decimals = await getDecimalsErc20(this.signer, token);
      const amount = tokenChangeDecimals(amountWad, 18, decimals);
      await transferErc20(this.signer, token, rewardAction.to, amount);
      this.removeToken(rewardAction, token, amountWad);
      logger.info(
        `Successfully transferred reward token to ${rewardAction.to}, amountWad: ${weiToDecimaled(amountWad)}, tokenAddress: ${token}`
      );
    } catch (error) {
      logger.error(
        `Failed to transfer token to ${rewardAction.to}, amountWad: ${weiToDecimaled(amountWad)}, tokenAddress: ${token}`,
        error
      );
      throw error;
    }
  }
}
