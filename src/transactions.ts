import { FungiblePool, Signer } from '@ajna-finance/sdk';
import {
  removeQuoteToken,
  withdrawBonds,
  quoteTokenScale,
  kick,
  bucketTake,
} from '@ajna-finance/sdk/dist/contracts/pool';
import { BigNumber } from 'ethers';
import { MAX_FENWICK_INDEX, MAX_UINT_256 } from './constants';
import { NonceTracker } from './nonce';
import { Bucket } from '@ajna-finance/sdk/dist/classes/Bucket';
import {
  removeCollateral,
  approve,
} from '@ajna-finance/sdk/dist/contracts/erc20-pool';
import { Liquidation } from '@ajna-finance/sdk/dist/classes/Liquidation';

export async function poolWithdrawBonds(pool: FungiblePool, signer: Signer) {
  const address = await signer.getAddress();
  try {
    const contractPoolWithSigner = pool.contract.connect(signer);
    const recipient = await signer.getAddress();
    
    // Use queueTransaction instead of manual nonce management
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await withdrawBonds(
        contractPoolWithSigner,
        recipient,
        MAX_UINT_256,
        {
          nonce: nonce.toString(),
        }
      );
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
    // We don't need to call resetNonce manually as queueTransaction handles this
    // But we still throw the original error to maintain compatibility
    throw error;
  }
}

export async function bucketRemoveQuoteToken(
  bucket: Bucket,
  signer: Signer,
  maxAmount: BigNumber = MAX_UINT_256
) {
  const address = await signer.getAddress();
  try {
    const contractPoolWithSigner = bucket.poolContract.connect(signer);
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await removeQuoteToken(
        contractPoolWithSigner,
        maxAmount,
        bucket.index,
        { nonce: nonce.toString() }
      );
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
   
    // The error handling is done inside queueTransaction
    throw error;
  }
}

export async function bucketRemoveCollateralToken(
  bucket: Bucket,
  signer: Signer,
  maxAmount: BigNumber = MAX_UINT_256
) {
  const address = await signer.getAddress();
  try {
    const contractPoolWithSigner = bucket.poolContract.connect(signer);
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await removeCollateral(
        contractPoolWithSigner,
        bucket.index,
        maxAmount,
        { nonce: nonce.toString() }
      );
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
    
    throw error;
  }
}

export async function poolQuoteApprove(
  pool: FungiblePool,
  signer: Signer,
  allowance: BigNumber
) {
  const address = await signer.getAddress();
  try {
    const denormalizedAllowance = allowance.div(
      await quoteTokenScale(pool.contract)
    );
   
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await approve(
        signer,
        pool.poolAddress,
        pool.quoteAddress,
        denormalizedAllowance,
        { nonce: nonce.toString() }
      );
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
   
    throw error;
  }
}

export async function poolKick(
  pool: FungiblePool,
  signer: Signer,
  borrower: string,
  limitIndex: number = MAX_FENWICK_INDEX
) {
  const address = await signer.getAddress();
  try {
    const contractPoolWithSigner = pool.contract.connect(signer);
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await kick(contractPoolWithSigner, borrower, limitIndex, {
        nonce: nonce.toString(),
      });
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
    
    throw error;
  }
}

export async function liquidationArbTake(
  liquidation: Liquidation,
  signer: Signer,
  bucketIndex: number
) {
  const address = await signer.getAddress();
  try {
    const contractPoolWithSigner = liquidation.poolContract.connect(signer);
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await bucketTake(
        contractPoolWithSigner,
        liquidation.borrowerAddress,
        false,
        bucketIndex,
        {
          nonce: nonce.toString(),
        }
      );
      return await tx.verifyAndSubmit();
    });
  } catch (error) {
   
    throw error;
  }
}
