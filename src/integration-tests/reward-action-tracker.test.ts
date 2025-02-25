import { RewardActionLabel } from '../config-types';
import {
  getProvider,
  impersonateSigner,
  resetHardhat,
  setBalance,
} from './test-utils';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import { RewardActionTracker } from '../reward-action-tracker';
import { decimaledToWei } from '../utils';
import { Wallet } from 'ethers';
import { getBalanceOfErc20 } from '../erc20';
import { expect } from 'chai';

describe('RewardActionTracker', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Transfers to wallet', async () => {
    const signer = await impersonateSigner(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress
    );
    await setBalance(
      await signer.getAddress(),
      decimaledToWei(1000).toHexString()
    );
    const receiver = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    const et = new RewardActionTracker(signer, { delayBetweenActions: 0 });
    et.addToken(
      { action: RewardActionLabel.TRANSFER, to: receiver.address },
      tokenToSwap,
      decimaledToWei(1)
    );
    const senderBalanceBefore = await getBalanceOfErc20(signer, tokenToSwap);
    const receiverBalanceBefore = await getBalanceOfErc20(
      receiver,
      tokenToSwap
    );
    await et.handleAllTokens();
    const senderBalanceAfter = await getBalanceOfErc20(signer, tokenToSwap);
    const receiverBalanceAfter = await getBalanceOfErc20(receiver, tokenToSwap);
    const senderBalanceDecrease = senderBalanceBefore.sub(senderBalanceAfter);
    const receiverBalanceIncrease = receiverBalanceAfter.sub(
      receiverBalanceBefore
    );
    expect(senderBalanceDecrease.eq(decimaledToWei(1, 8))).to.be.true;
    expect(receiverBalanceIncrease.eq(decimaledToWei(1, 8))).to.be.true;
  });
});
