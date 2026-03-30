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

  it('syncs nonce to network on post-broadcast failure (pending nonce advanced)', async () => {
    let callCount = 0;
    sinon.stub(signer, 'getTransactionCount').callsFake(async () => {
      callCount++;
      // First call: initial getNonce → 10
      // Second call: handleFailedNonce check → return 13 (nonce consumed + other process sent txs)
      return callCount <= 1 ? 10 : 13;
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

    // Post-broadcast: pending nonce (13) > used nonce (10), so syncs to 13
    // (not just nonce+1=11, in case another process advanced the nonce further)
    const nextNonce = await NonceTracker.getNonce(signer);
    expect(nextNonce).to.equal(13);
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

  it('preserves incremented nonce when RPC fails during error handling', async () => {
    let callCount = 0;
    sinon.stub(signer, 'getTransactionCount').callsFake(async () => {
      callCount++;
      if (callCount <= 1) return 10; // initial getNonce
      // handleFailedNonce RPC call fails
      throw new Error('RPC connection refused');
    });

    try {
      await NonceTracker.queueTransaction(signer, async () => {
        throw new Error('tx failed');
      });
      expect.fail('Should have thrown');
    } catch (error) {
      // expected
    }

    // RPC failed during nonce check — conservative behavior: keep nonce+1 (11)
    // rather than risk reusing nonce 10 which might be in the mempool
    const nextNonce = await NonceTracker.getNonce(signer);
    expect(nextNonce).to.equal(11);
  });

  it('recovers correctly through success-failure-success sequence', async function () {
    this.timeout(10000);
    // Always return 10 — simulates pre-broadcast failures (nonce never consumed)
    sinon.stub(signer, 'getTransactionCount').resolves(10);

    // tx1: success (nonce 10)
    const r1 = await NonceTracker.queueTransaction(signer, async (nonce) => nonce);
    expect(r1).to.equal(10);

    // tx2: pre-broadcast failure (nonce 11 attempted, not consumed, resets to 10)
    try {
      await NonceTracker.queueTransaction(signer, async () => {
        throw new Error('insufficient funds');
      });
    } catch (e) { /* expected */ }

    // tx3: success — should reuse nonce 10 (since tx2 never consumed it)
    // but getTransactionCount still returns 10, so reset landed at 10
    const r3 = await NonceTracker.queueTransaction(signer, async (nonce) => nonce);
    expect(r3).to.equal(10);
  });

  it('isolates queues between different signers', async function () {
    this.timeout(10000);
    const signer2: Signer = Wallet.createRandom();

    sinon.stub(signer, 'getTransactionCount').resolves(10);
    sinon.stub(signer2, 'getTransactionCount').resolves(50);

    // Queue txs for both signers concurrently
    const [r1, r2] = await Promise.all([
      NonceTracker.queueTransaction(signer, async (nonce) => nonce),
      NonceTracker.queueTransaction(signer2, async (nonce) => nonce),
    ]);

    expect(r1).to.equal(10);
    expect(r2).to.equal(50);

    // Second round — each should have independently incremented
    const [r3, r4] = await Promise.all([
      NonceTracker.queueTransaction(signer, async (nonce) => nonce),
      NonceTracker.queueTransaction(signer2, async (nonce) => nonce),
    ]);

    expect(r3).to.equal(11);
    expect(r4).to.equal(51);
  });

  it('resets when pendingNonce equals used nonce exactly (boundary)', async () => {
    let callCount = 0;
    sinon.stub(signer, 'getTransactionCount').callsFake(async () => {
      callCount++;
      // First call: getNonce init → 10
      // Second call: handleFailedNonce → returns 10 (same as nonce used)
      return 10;
    });

    try {
      await NonceTracker.queueTransaction(signer, async () => {
        throw new Error('gas estimation failed');
      });
    } catch (e) { /* expected */ }

    // pendingNonce (10) == used nonce (10), so <= is true → resets to 10
    const nextNonce = await NonceTracker.getNonce(signer);
    expect(nextNonce).to.equal(10);
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
