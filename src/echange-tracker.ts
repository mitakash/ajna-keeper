import { FeeAmount } from '@uniswap/v3-sdk';
import { RewardActionTracker } from './reward-action-tracker';
export interface TokenConfig {
  address: string;
  targetToken: string;
  slippage: number;
  useOneInch?: boolean;
  feeAmount?: FeeAmount;
}

export class ExchangeTracker {
  private rewardActionTracker: RewardActionTracker;
  private tokens: TokenConfig[];

  constructor(rewardActionTracker: RewardActionTracker, tokens: TokenConfig[]) {
    this.rewardActionTracker = rewardActionTracker;
    this.tokens = tokens;
  }

  public async handleAllTokens(chainId: number): Promise<void> {
    for (const token of this.tokens) {
      await this.rewardActionTracker.handleRewardsForToken(token, chainId);
    }
  }
}
