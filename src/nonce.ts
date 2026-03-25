import { Signer } from 'ethers';
import { logger } from './logging';

export class NonceTracker {
  private nonces: Map<string, number> = new Map();
  private queues: Map<string, Promise<unknown>> = new Map();
  private static instance: NonceTracker;

  // Universal RPC cache refresh delay - applies to all chains
  private static readonly RPC_CACHE_REFRESH_DELAY = 1000; // 1000ms for aggressive RPC caching

  constructor() {
    if (!NonceTracker.instance) {
      NonceTracker.instance = this;
    }
    return NonceTracker.instance;
  }

  static async getNonce(signer: Signer): Promise<number> {
    const tracker = new NonceTracker();
    return tracker.getNonce(signer);
  }

  static async resetNonce(signer: Signer, address: string) {
    const tracker = new NonceTracker();
    return await tracker.resetNonce(signer, address);
  }

  static clearNonces() {
    const tracker = new NonceTracker();
    tracker.nonces = new Map();
    tracker.queues = new Map();
    logger.debug('Cleared all nonce tracking data');
  }

  static async queueTransaction<T>(
    signer: Signer,
    txFunction: (nonce: number) => Promise<T>
  ): Promise<T> {
    const tracker = new NonceTracker();
    return tracker.queueTransaction(signer, txFunction);
  }

  public async getNonce(signer: Signer): Promise<number> {
    const address = await signer.getAddress();
    logger.debug(`Getting nonce for address: ${address}`);

    // If we don't have a nonce stored, get it from the network
    if (this.nonces.get(address) === undefined) {
      await this.resetNonce(signer, address);
    }

    // Get the current nonce value
    const currentNonce = this.nonces.get(address)!;
    logger.debug(`Using nonce: ${currentNonce}`);

    // Increment the stored nonce for next time
    this.nonces.set(address, currentNonce + 1);

    return currentNonce;
  }

  public async resetNonce(signer: Signer, address: string) {
    // Get the latest nonce directly from the network
    const latestNonce = await signer.getTransactionCount('pending');
    logger.debug(`Reset nonce for ${address} to ${latestNonce}`);
    this.nonces.set(address, latestNonce);
    return latestNonce;
  }

  /**
   * Serializes transactions per address using a promise chain.
   * Concurrent calls for the same address wait for prior transactions to complete
   * before acquiring a nonce, preventing race conditions on failure/reset.
   *
   * On error, checks the network's pending nonce to determine if the tx was
   * broadcast before deciding whether to reset. This prevents nonce reuse
   * when a tx times out after being sent to the mempool.
   */
  public async queueTransaction<T>(
    signer: Signer,
    txFunction: (nonce: number) => Promise<T>
  ): Promise<T> {
    const address = await signer.getAddress();
    logger.debug(`Queueing transaction for ${address}`);

    // Synchronous read-then-write: safe because no await between reading
    // the queue and writing the new entry. For local Wallet signers,
    // getAddress() above returns a resolved promise whose continuation
    // runs atomically in a single microtask.
    const previous = this.queues.get(address) || Promise.resolve();

    const done = previous.catch(() => {}).then(async () => {
      const nonce = await this.getNonce(signer);
      logger.debug(`Executing transaction with nonce ${nonce}`);

      try {
        const result = await txFunction(nonce);

        // Universal RPC cache refresh delay after every transaction
        logger.debug(`Transaction with nonce ${nonce} completed, adding ${NonceTracker.RPC_CACHE_REFRESH_DELAY}ms RPC cache refresh delay`);
        await this.delay(NonceTracker.RPC_CACHE_REFRESH_DELAY);

        logger.debug(`Transaction with nonce ${nonce} completed successfully`);
        return result;
      } catch (txError) {
        logger.error(`Transaction with nonce ${nonce} failed: ${txError}`);
        await this.handleFailedNonce(signer, address, nonce);
        throw txError;
      }
    });

    // Store a caught version so the chain never breaks.
    // Clean up the entry when it settles to prevent unbounded growth.
    const caught = done.catch(() => {});
    this.queues.set(address, caught);
    caught.then(() => {
      if (this.queues.get(address) === caught) {
        this.queues.delete(address);
      }
    });

    return done;
  }

  /**
   * After a failed transaction, check the network's pending nonce to decide
   * whether the nonce was consumed (tx was broadcast) or not (pre-broadcast
   * error like gas estimation failure or insufficient funds).
   *
   * - If pendingNonce > nonce: the tx reached the mempool. The stored nonce
   *   (already incremented to nonce+1 by getNonce) is correct. Do NOT reset.
   * - If pendingNonce <= nonce: the tx never made it to the mempool. Reset
   *   to the network value so the nonce can be reused.
   */
  private async handleFailedNonce(signer: Signer, address: string, nonce: number) {
    try {
      const pendingNonce = await signer.getTransactionCount('pending');
      if (pendingNonce > nonce) {
        // Tx was broadcast — nonce is consumed. The stored nonce (nonce+1) is correct.
        logger.warn(
          `Nonce ${nonce} was consumed (pending=${pendingNonce}), keeping incremented nonce for ${address}`
        );
      } else {
        // Tx was NOT broadcast — safe to reset so the nonce can be reused.
        logger.debug(
          `Nonce ${nonce} was not consumed (pending=${pendingNonce}), resetting nonce for ${address}`
        );
        this.nonces.set(address, pendingNonce);
      }
    } catch (rpcError) {
      // If we can't query the network, fall back to resetting (original behavior).
      // This is the conservative choice: a skipped nonce is recoverable,
      // but a reused nonce after broadcast is dangerous.
      logger.warn(`Failed to check pending nonce for ${address}, preserving incremented nonce: ${rpcError}`);
    }
  }

  /**
   * Simple delay function
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
