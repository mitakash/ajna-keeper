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

  it('resets nonce when transaction fails', async () => {
  const address = await signer.getAddress();
  sinon.stub(signer, 'getTransactionCount').resolves(10);
  
  // First, let's get a nonce and increment it
  await NonceTracker.getNonce(signer); // Should be 10
  await NonceTracker.getNonce(signer); // Should be 11
  
  // Set up a transaction function that will fail
  const txFunction = async (nonce: number) => {
    throw new Error('Transaction failed');
  };

  // Attempt transaction and expect it to fail
  try {
    await NonceTracker.queueTransaction(signer, txFunction);
    // Should not reach here
    expect.fail('Transaction should have failed');
  } catch (error) {
    // Expected to fail
  }

  // Instead of checking if resetNonce was called, check if the nonce was actually reset
  // by getting the next nonce - it should be 10 (reset) and not 12 (incremented)
  const nextNonce = await NonceTracker.getNonce(signer);
  expect(nextNonce).to.equal(10);
  });
});
