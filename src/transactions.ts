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
import { getAllowanceOfErc20, getDecimalsErc20 } from './erc20';

export async function poolWithdrawBonds(pool: FungiblePool, signer: Signer) {
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
    return await tx.verifyAndSubmit();
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
    return await tx.verifyAndSubmit();
  });
}

/**
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
    return await tx.verifyAndSubmit();
  });
}
*/

export async function poolQuoteApprove(
  pool: FungiblePool,
  signer: Signer,
  allowance: BigNumber
) {
  console.log('\n=== POOL QUOTE APPROVE DEBUG ===');
  console.log(`Pool address: ${pool.poolAddress}`);
  console.log(`Quote token address: ${pool.quoteAddress}`);
  console.log(`Collateral token address: ${pool.collateralAddress}`);
  console.log(`Original allowance amount: ${allowance.toString()}`);
  console.log(`Original allowance (human readable): ${ethers.utils.formatEther(allowance)} ETH-equivalent`);
  
  // Get token decimals for context
  try {
    const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);
    const collateralDecimals = await getDecimalsErc20(signer, pool.collateralAddress);
    console.log(`Quote token decimals: ${quoteDecimals}`);
    console.log(`Collateral token decimals: ${collateralDecimals}`);
    console.log(`Original allowance as quote token: ${ethers.utils.formatUnits(allowance, quoteDecimals)}`);
  } catch (e) {
    console.log(`Error getting token decimals: ${e}`);
  }
  
  // Get the actual quoteTokenScale value
  const quoteScale = await quoteTokenScale(pool.contract);
  console.log(`Quote token scale from SDK: ${quoteScale.toString()}`);
  console.log(`Quote token scale (human readable): ${ethers.utils.formatEther(quoteScale)} ETH-equivalent`);
  
  // Calculate the denormalized allowance
  const denormalizedAllowance = allowance.div(quoteScale);
  console.log(`Denormalized allowance: ${denormalizedAllowance.toString()}`);
  console.log(`Denormalized allowance (human readable): ${ethers.utils.formatEther(denormalizedAllowance)} ETH-equivalent`);
  
  // Show the math
  console.log('\n--- MATH BREAKDOWN ---');
  console.log(`${allowance.toString()} ÷ ${quoteScale.toString()} = ${denormalizedAllowance.toString()}`);
  console.log(`Is denormalized allowance zero? ${denormalizedAllowance.isZero()}`);
  console.log(`Is denormalized allowance greater than zero? ${denormalizedAllowance.gt(0)}`);
  
  // Check current allowance before approval
  try {
    const currentAllowance = await getAllowanceOfErc20(signer, pool.quoteAddress, pool.poolAddress);
    console.log(`Current allowance before approval: ${currentAllowance.toString()}`);
  } catch (e) {
    console.log(`Error checking current allowance: ${e}`);
  }
  
  console.log('\n--- PROCEEDING WITH APPROVAL ---');
  console.log(`Amount to approve: ${denormalizedAllowance.toString()}`);
  
  await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await approve(
      signer,
      pool.poolAddress,
      pool.quoteAddress,
      denormalizedAllowance,
      { nonce: nonce.toString() }
    );
    console.log(`Approval transaction created with nonce: ${nonce}`);
    return await tx.verifyAndSubmit();
  });
  
  // Check allowance after approval
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const newAllowance = await getAllowanceOfErc20(signer, pool.quoteAddress, pool.poolAddress);
    console.log(`Allowance after approval: ${newAllowance.toString()}`);
    console.log(`Approval successful? ${newAllowance.gte(denormalizedAllowance)}`);
  } catch (e) {
    console.log(`Error checking allowance after approval: ${e}`);
  }
  
  console.log('=== END POOL QUOTE APPROVE DEBUG ===\n');
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
    return await tx.verifyAndSubmit();
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
    return await tx.verifyAndSubmit();
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
    return await tx.verifyAndSubmit();
  });
}

