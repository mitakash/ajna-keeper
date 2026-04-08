// Updated nonce.ts with mutex-based concurrency control
import { Signer } from 'ethers';
import { logger } from './logging';

/**
 * Simple mutex to prevent concurrent nonce allocations from
 * the parallel keeper loops (kick, take, settle, collect, LP).
 */
class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

export class NonceTracker {
  private nonces: Map<string, number> = new Map();
  private pendingTransactions: Map<string, Promise<void>> = new Map();
  private static instance: NonceTracker;
  private mutex = new Mutex();

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
    tracker.pendingTransactions = new Map();
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
  
  // Mutex-guarded transaction queue to prevent concurrent nonce collisions
  // from the parallel keeper loops (kick, take, settle, collect, LP)
  public async queueTransaction<T>(
    signer: Signer,
    txFunction: (nonce: number) => Promise<T>
  ): Promise<T> {
    const address = await signer.getAddress();
    logger.debug(`Queueing transaction for ${address}`);

    // Acquire mutex - only one transaction can allocate a nonce at a time
    await this.mutex.acquire();

    let nonce: number;
    try {
      nonce = await this.getNonce(signer);
      logger.debug(`Executing transaction with nonce ${nonce}`);
    } catch (error) {
      this.mutex.release();
      throw error;
    }

    // Release mutex after nonce allocation so other loops can proceed
    // while this transaction is in-flight
    this.mutex.release();

    try {
      const result = await txFunction(nonce);

      // Universal RPC cache refresh delay after every transaction
      logger.debug(`Transaction with nonce ${nonce} completed, adding ${NonceTracker.RPC_CACHE_REFRESH_DELAY}ms RPC cache refresh delay`);
      await this.delay(NonceTracker.RPC_CACHE_REFRESH_DELAY);

      logger.debug(`Transaction with nonce ${nonce} completed successfully`);
      return result;
    } catch (txError) {
      logger.error(`Transaction with nonce ${nonce} failed: ${txError}`);

      // Acquire mutex for the reset to prevent race with other loops
      await this.mutex.acquire();
      await this.resetNonce(signer, address);
      this.mutex.release();

      throw txError;
    }
  }
  /**
   * Simple delay function
   */
   private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
