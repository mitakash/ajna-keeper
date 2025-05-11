// Updated nonce.ts with simpler promise handling
import { Signer } from 'ethers';
import { logger } from './logging';

export class NonceTracker {
  private nonces: Map<string, number> = new Map();
  private pendingTransactions: Map<string, Promise<void>> = new Map();
  private static instance: NonceTracker;

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
  
  // Simplified implementation that focuses just on managing nonces correctly
  public async queueTransaction<T>(
    signer: Signer,
    txFunction: (nonce: number) => Promise<T>
  ): Promise<T> {
    const address = await signer.getAddress();
    logger.debug(`Queueing transaction for ${address}`);
    
    try {
      // Get nonce from our tracker
      const nonce = await this.getNonce(signer);
      logger.debug(`Executing transaction with nonce ${nonce}`);
      
      // Execute the transaction
      try {
        const result = await txFunction(nonce);
        logger.debug(`Transaction with nonce ${nonce} completed successfully`);
        return result;
      } catch (txError) {
        logger.error(`Transaction with nonce ${nonce} failed: ${txError}`);
        
        // Reset nonce on failure
        await this.resetNonce(signer, address);
        
        throw txError;
      }
    } catch (error) {
      logger.error(`Error in queueTransaction: ${error}`);
      throw error;
    }
  }
}
