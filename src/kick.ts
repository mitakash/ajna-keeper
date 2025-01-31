import { Address, Pool, Signer } from '@ajna-finance/sdk'
import { getLoans } from './subgraph';
import { delay, bigNumberToWad, wadToBigNumber } from './utils';
import { PoolConfig } from './config';
import { approveErc20 } from './erc20';

const APPROVAL_AMOUNT_FACTOR = 1.10

export async function handleKicks(
  pool: Pool,
  poolConfig: PoolConfig,
  price: number,
  subgraphUrl: string,
  delayBetweenLoans: number,
  signer: Signer,
  dryRun: boolean,
) {
  const {pool: {lup}, loans} = await getLoans(subgraphUrl, pool.poolAddress)
  for(const loanFromSubgraph of loans) {
    const {borrower, inLiquidation, thresholdPrice} = loanFromSubgraph
    if (inLiquidation) continue
    if (thresholdPrice > lup) continue

    const loanFromSDK = await pool.getLoan(borrower)
    const {neutralPrice, liquidationBond} = loanFromSDK
    const debt = bigNumberToWad(loanFromSDK.debt)

    // if loan debt is lower than configured fixed value (denominated in quote token), skip it
    if (debt < poolConfig.kick!.minDebt) continue

    // if threshold price below this, kick if not already under liquidation
    const comparisonPrice = price * poolConfig.kick!.priceFactor

    // TODO: Make sure that user has enough QT to fund Liquidation Bond. 
    //    Note: If two kicks happen simultaneously, make sure they do not overdraft.
    if (price < comparisonPrice) {
      if (!dryRun) {
        console.log(`Kicking loan - pool: ${pool.name}, borrower: ${borrower}, thresholdPrice: ${thresholdPrice}, debt: ${debt}, feedPrice: ${price}`);
        await kick(signer, pool, borrower, bigNumberToWad(liquidationBond));
      }else {
        console.log(`DryRun - Would kick loan - pool: ${pool.name}, borrower: ${borrower}, thresholdPrice: ${thresholdPrice}, debt: ${debt}, feedPrice: ${price}`);
      }
    }

    await delay(delayBetweenLoans);
  }
}

export async function kick(signer: Signer, pool: Pool, borrower: Address, liquidationBond: number) {
  try {
    await approveErc20(signer, pool.quoteAddress, pool.poolAddress, wadToBigNumber(liquidationBond * APPROVAL_AMOUNT_FACTOR));
    const wrappedTransaction = await pool.kick(signer, borrower);  // TODO: Add limitIndex?
    console.log(`Kicking loan for borrower ${borrower}`);
    const tx = await wrappedTransaction.submit();
    console.log(`Kick transaction confirmed for borrower ${borrower}`);
  } catch (error) {
    console.error(`Failed to kick loan for borrower ${borrower}:`, error);
    throw error;
  }
}