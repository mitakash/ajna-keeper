import { FeeAmount } from '@uniswap/v3-sdk';
import { BigNumber, Signer, constants } from 'ethers';
import {
  ExchangeReward,
  KeeperConfig,
  RewardAction,
  RewardActionLabel,
  TransferReward,
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
  // New: Add a map to track retry attempts for each token
  private retryCountMap: Map<string, number> = new Map();

  constructor(
    private signer: Signer,
    private config: KeeperConfig,
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
  ): Promise<{ success: boolean; error?: string }> {
    const address = await this.signer.getAddress();

    const targetAddress =
      targetToken in (this.config.tokenAddresses || {})
        ? this.config.tokenAddresses![targetToken]
        : this.config.uniswapOverrides?.wethAddress;

    if (!targetAddress) {
      logger.error(
        `No target address found for token ${targetToken} on chain ${chainId}`
      );
      return {
        success: false,
        error: `No target address for ${targetToken} on chain ${chainId}`,
      };
    }
    // Combine uniswapOverrides and universalRouterOverrides into a single object to pass to swap
    const combinedUniswapSettings = {
      ...this.config.uniswapOverrides,
      ...this.config.universalRouterOverrides
    };
    const result = await this.dexRouter.swap(
      chainId,
      amount,
      tokenAddress,
      targetAddress,
      address,
      useOneInch,
      slippage,
      feeAmount,
      combinedUniswapSettings, 
    );
    return result;
  }

  public async handleAllTokens(): Promise<void> {
    // Define maximum number of retry attempts
    const MAX_RETRY_COUNT = 3;
    
    // Get all non-zero token entries
    const nonZeroEntries = Array.from(this.feeTokenAmountMap.entries()).filter(
      ([_, amountWad]) => amountWad.gt(constants.Zero)
    );
    
    for (const [key, amountWad] of nonZeroEntries) {
      const { rewardAction, token } = deserializeRewardAction(key);
      
      // Get current retry count for this token (default to 0 if not present)
      const retryCount = this.retryCountMap.get(key) || 0;
      
      // Skip if we've already tried too many times
      if (retryCount >= MAX_RETRY_COUNT) {
        logger.warn(`Skipping token ${token} after ${MAX_RETRY_COUNT} failed swap attempts - removing from queue`);
        this.removeToken(rewardAction, token, amountWad);
        this.retryCountMap.delete(key); // Clean up retry counter
        continue;
      }

      try {
        switch (rewardAction.action) {
          case RewardActionLabel.TRANSFER:
            await this.transferReward(
              rewardAction as TransferReward,
              token,
              amountWad
            );
            break;

          case RewardActionLabel.EXCHANGE:
            // Extract swap parameters
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

            // If not the first attempt, log that we're retrying
            if (retryCount > 0) {
              logger.info(`Retry attempt ${retryCount + 1}/${MAX_RETRY_COUNT} for swapping ${weiToDecimaled(amountWad)} of ${token}`);
            }
            
            // Attempt the swap
            const swapResult = await this.swapToken(
              await this.signer.getChainId(),
              token,
              amountWad,
              targetToken,
              useOneInch,
              slippage,
              feeAmount
            );
            
            if (swapResult.success) {
              // Success: remove token and clear retry count
              this.removeToken(rewardAction, token, amountWad);
              this.retryCountMap.delete(key);
              logger.info(
                `Successfully swapped ${weiToDecimaled(amountWad)} of ${token} to ${targetToken}`
              );
            } else {
              // Failure: increment retry count
              const newRetryCount = retryCount + 1;
              this.retryCountMap.set(key, newRetryCount);
              
              logger.error(
                `Failed to swap ${weiToDecimaled(amountWad)} of ${token} (attempt ${newRetryCount}/${MAX_RETRY_COUNT}): ${swapResult.error}`
              );
              
              // If we've reached max retries, remove the token
              if (newRetryCount >= MAX_RETRY_COUNT) {
                logger.warn(`Max retry count reached for ${token} - removing from queue`);
                this.removeToken(rewardAction, token, amountWad);
                this.retryCountMap.delete(key);
              }
              // Otherwise we'll try again on next loop iteration
            }
            break;

          default:
            logger.warn('Unsupported reward action');
        }
      } catch (error) {
        // Handle unexpected errors
        logger.error(`Error processing reward action for ${token}:`, error);
        
        // Increment retry count for the next attempt
        const newRetryCount = retryCount + 1;
        this.retryCountMap.set(key, newRetryCount);
        
        // Remove token if max retries reached
        if (newRetryCount >= MAX_RETRY_COUNT) {
          logger.warn(`Removing token ${token} after ${MAX_RETRY_COUNT} failed attempts due to errors`);
          this.removeToken(rewardAction, token, amountWad);
          this.retryCountMap.delete(key);
        }
      }
      
      // The config.delayBetweenActions provides
      // natural spacing between actions and retry attempts
      await delay(this.config.delayBetweenActions);
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

  // Helper to manually clear retry count if needed
  clearRetryCount(rewardAction: RewardAction, tokenCollected: string) {
    const key = serializeRewardAction(rewardAction, tokenCollected);
    this.retryCountMap.delete(key);
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
