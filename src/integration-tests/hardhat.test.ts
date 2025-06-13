import { expect } from 'chai';
import { getProvider, resetHardhat } from './test-utils';
import { MAINNET_CONFIG } from './test-config';

describe('Hardhat config', async () => {
  it('gets block number', async () => {
    await resetHardhat(); 
    const provider = getProvider();
    const bn = await provider.getBlockNumber();
    expect(bn).to.equal(MAINNET_CONFIG.BLOCK_NUMBER);
  });
});
