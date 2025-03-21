import { Signer } from 'ethers';

export class NonceTracker {
  private nonces: Map<string, Promise<number>> = new Map();
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
    await tracker.resetNonce(signer, address);
  }

  static clearNonces() {
    const tracker = new NonceTracker();
    tracker.nonces = new Map();
  }

  public async getNonce(signer: Signer): Promise<number> {
    const address = await signer.getAddress();
    if (!this.nonces.get(address)) {
      this.resetNonce(signer, address);
    }
    const currNonce = this.nonces.get(address)!;
    this.nonces.set(address, incrementNonce(currNonce));
    return currNonce;
  }

  public resetNonce(signer: Signer, address: string) {
    this.nonces.set(address, signer.getTransactionCount('pending'));
  }
}

async function incrementNonce(nonce: Promise<number>) {
  return (await nonce) + 1;
}
