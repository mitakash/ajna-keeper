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

  it('resets nonce on pre-broadcast failure (pending nonce unchanged)', async () => {
    // getTransactionCount always returns 10 — simulates nonce NOT consumed
    sinon.stub(signer, 'getTransactionCount').resolves(10);

    // Advance stored nonce past 10
    await NonceTracker.getNonce(signer); // 10
    await NonceTracker.getNonce(signer); // 11

    try {
      await NonceTracker.queueTransaction(signer, async () => {
        throw new Error('Gas estimation failed');
      });
      expect.fail('Should have thrown');
    } catch (error) {
      // expected
    }

    // Pre-broadcast: pending nonce (10) <= used nonce (12), so it resets to 10
    const nextNonce = await NonceTracker.getNonce(signer);
    expect(nextNonce).to.equal(10);
  });

  it('preserves nonce on post-broadcast failure (pending nonce advanced)', async () => {
    let callCount = 0;
    sinon.stub(signer, 'getTransactionCount').callsFake(async () => {
      callCount++;
      // First call: initial getNonce → 10
      // Second call: handleFailedNonce check → return 11 (nonce was consumed)
      return callCount <= 1 ? 10 : 11;
    });

    try {
      await NonceTracker.queueTransaction(signer, async () => {
        // Simulate: tx was broadcast but confirmation timed out
        throw new Error('Transaction confirmation timeout after 2 minutes');
      });
      expect.fail('Should have thrown');
    } catch (error) {
      // expected
    }

    // Post-broadcast: pending nonce (11) > used nonce (10), so nonce is NOT reset.
    // Stored nonce was already incremented to 11 by getNonce.
    const nextNonce = await NonceTracker.getNonce(signer);
    expect(nextNonce).to.equal(11);
  });

  it('serializes concurrent transactions for the same address', async function () {
    this.timeout(10000);
    sinon.stub(signer, 'getTransactionCount').resolves(10);

    const executionOrder: number[] = [];

    // Queue two transactions concurrently — they should execute sequentially
    const tx1 = NonceTracker.queueTransaction(signer, async (nonce) => {
      executionOrder.push(nonce);
      await new Promise(resolve => setTimeout(resolve, 50));
      return `tx-${nonce}`;
    });

    const tx2 = NonceTracker.queueTransaction(signer, async (nonce) => {
      executionOrder.push(nonce);
      return `tx-${nonce}`;
    });

    const [result1, result2] = await Promise.all([tx1, tx2]);

    expect(result1).to.equal('tx-10');
    expect(result2).to.equal('tx-11');
    // Nonces should have been assigned in order
    expect(executionOrder).to.deep.equal([10, 11]);
  });

  it('does not corrupt nonce when concurrent transaction fails pre-broadcast', async function () {
    this.timeout(10000);
    // getTransactionCount always returns 10 — nonce not consumed
    sinon.stub(signer, 'getTransactionCount').resolves(10);

    // First transaction fails pre-broadcast
    const tx1 = NonceTracker.queueTransaction(signer, async () => {
      throw new Error('tx1 failed');
    }).catch(() => 'failed');

    // Second transaction should get nonce 10 after reset
    const tx2 = NonceTracker.queueTransaction(signer, async (nonce) => {
      return nonce;
    });

    const [result1, result2] = await Promise.all([tx1, tx2]);

    expect(result1).to.equal('failed');
    // Pre-broadcast failure: pending nonce (10) <= used nonce (10), so reset to 10
    expect(result2).to.equal(10);
  });

  it('cleans up queue entries after settlement', async function () {
    this.timeout(10000);
    sinon.stub(signer, 'getTransactionCount').resolves(10);

    await NonceTracker.queueTransaction(signer, async () => 'done');

    // Allow microtask for cleanup to run
    await new Promise(resolve => setTimeout(resolve, 50));

    // Queue should be cleaned up — next call should work without chaining
    const result = await NonceTracker.queueTransaction(signer, async (nonce) => nonce);
    expect(result).to.equal(11);
  });
});
