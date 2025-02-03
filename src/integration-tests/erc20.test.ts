import { getBalanceOfErc20 } from '../erc20';
import { resetHardhat, impersonateSigner } from './test-utils';
import { MAINNET_CONFIG } from './test-config';
import { expect } from 'chai';

describe('getBallanceOfErc20', () => {
  before(async () => {
    await resetHardhat();
  });

  it('Can get balance of ERC20', async () => {
    const signer = await impersonateSigner(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress
    );
    const balanceBig = await getBalanceOfErc20(
      signer,
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress
    );
    const balance = balanceBig.div(1e2).toNumber() / 1e6;
    expect(balance).to.equal(33101.380119);
  });
});
