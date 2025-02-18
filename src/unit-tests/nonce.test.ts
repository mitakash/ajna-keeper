import sinon from 'sinon';
import { NonceTracker } from '../nonce';
import { Wallet } from 'ethers';
import { Signer } from '@ajna-finance/sdk';
import { expect } from 'chai';

describe('NonceTracker', () => {
  let signer: Signer = Wallet.createRandom();

  beforeEach(() => {
    NonceTracker.clearNonces();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets initial nonce', async () => {
    sinon.stub(signer, 'getTransactionCount').resolves(10);
    const nonce = await NonceTracker.getNonce(signer);
    expect(nonce).equals(10);
  });

  it('increments nonce every time it is called', async () => {
    sinon.stub(signer, 'getTransactionCount').resolves(10);
    await NonceTracker.getNonce(signer);
    const secondNonce = await NonceTracker.getNonce(signer);
    expect(secondNonce).equals(11);
  });

  it('resets nonce when resetNonce is called', async () => {
    sinon.stub(signer, 'getTransactionCount').resolves(10);
    await NonceTracker.getNonce(signer);
    await NonceTracker.getNonce(signer);
    NonceTracker.resetNonce(signer, await signer.getAddress());
    const nonceAfterReset = await NonceTracker.getNonce(signer);
    expect(nonceAfterReset).equals(10);
  });
});
