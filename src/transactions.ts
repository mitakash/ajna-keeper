import { FungiblePool, Signer } from '@ajna-finance/sdk';
import {
  removeQuoteToken,
  withdrawBonds,
  quoteTokenScale,
  kick,
  bucketTake,
} from '@ajna-finance/sdk/dist/contracts/pool';
import { BigNumber, ethers } from 'ethers';
import { MAX_FENWICK_INDEX, MAX_UINT_256 } from './constants';
import { NonceTracker } from './nonce';
import { Bucket } from '@ajna-finance/sdk/dist/classes/Bucket';
import {
  removeCollateral,
  approve,
} from '@ajna-finance/sdk/dist/contracts/erc20-pool';
import { Liquidation } from '@ajna-finance/sdk/dist/classes/Liquidation';
import { settle } from '@ajna-finance/sdk/dist/contracts/pool';
import { getAllowanceOfErc20, getDecimalsErc20, convertWadToTokenDecimals } from './erc20';
import { weiToDecimaled } from './utils';
import { logger } from './logging';

export async function poolWithdrawBonds(pool: FungiblePool, signer: Signer) {
  const contractPoolWithSigner = pool.contract.connect(signer);
  const recipient = await signer.getAddress();

  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await withdrawBonds(
      contractPoolWithSigner,
      recipient,
      MAX_UINT_256,
      {
        nonce: nonce.toString(),
      }
    );
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Withdrew bonds from pool ${pool.name} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

export async function bucketRemoveQuoteToken(
  bucket: Bucket,
  signer: Signer,
  maxAmount: BigNumber = MAX_UINT_256
) {
  const contractPoolWithSigner = bucket.poolContract.connect(signer);
  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await removeQuoteToken(
      contractPoolWithSigner,
      maxAmount,
      bucket.index,
      { nonce: nonce.toString() }
    );
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Removed quote token from bucket ${bucket.index} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

export async function bucketRemoveCollateralToken(
  bucket: Bucket,
  signer: Signer,
  maxAmount: BigNumber = MAX_UINT_256
) {
  const contractPoolWithSigner = bucket.poolContract.connect(signer);
  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await removeCollateral(
      contractPoolWithSigner,
      bucket.index,
      maxAmount,
      { nonce: nonce.toString() }
    );
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Removed collateral from bucket ${bucket.index} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

export async function poolQuoteApprove(
  pool: FungiblePool,
  signer: Signer,
  allowance: BigNumber
) {
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
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Approved quote token for pool ${pool.name}, allowance: ${weiToDecimaled(allowance)} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}


export async function poolKick(
  pool: FungiblePool,
  signer: Signer,
  borrower: string,
  limitIndex: number = MAX_FENWICK_INDEX
) {
  const contractPoolWithSigner = pool.contract.connect(signer);
  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await kick(contractPoolWithSigner, borrower, limitIndex, {
      nonce: nonce.toString(),
    });
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Kicked borrower ${borrower.slice(0, 8)} in pool ${pool.name} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

export async function liquidationArbTake(
  liquidation: Liquidation,
  signer: Signer,
  bucketIndex: number
) {
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
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Arb take on borrower ${liquidation.borrowerAddress.slice(0, 8)} at bucket ${bucketIndex} | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

export async function poolSettle(
  pool: FungiblePool, 
  signer: Signer, 
  borrower: string, 
  bucketDepth: number = 50
) {
  const contractPoolWithSigner = pool.contract.connect(signer);
  
  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await settle(
      contractPoolWithSigner,
      borrower,
      bucketDepth,
      {
        nonce: nonce.toString(),
        gasLimit: 800000 // Conservative gas limit for settlement
      }
    );
    const receipt = await tx.verifyAndSubmit();
    logger.info(`Settled borrower ${borrower.slice(0, 8)} in pool ${pool.name} (depth: ${bucketDepth}) | tx: ${receipt.transactionHash}`);
    return receipt;
  });
}

