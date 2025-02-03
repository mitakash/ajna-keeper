import { expect } from 'chai';
import { getProvider } from './test-utils';
import { MAINNET_CONFIG } from './test-config';

describe('Hardhat config', async () => {
  it('gets block number', async () => {
    const provider = getProvider();
    const bn = await provider.getBlockNumber();
    expect(bn).to.equal(MAINNET_CONFIG.BLOCK_NUMBER);
  });
});
