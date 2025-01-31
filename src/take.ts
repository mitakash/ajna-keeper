import { Pool, Signer } from '@ajna-finance/sdk'
import { getLiquidations } from './subgraph';
import { delay } from './utils';
import { PoolConfig } from './config';
import { getAuctionPrice } from './price';
import { getTime } from './time';

export async function handleArbTakes(
  pool: Pool,
  poolConfig: PoolConfig,
  subgraphUrl: string,
  delayBetweenLoans: number,
  signer: Signer,
  dryRun: boolean,
) {
  const {pool: {hpb, hpbIndex, liquidationAuctions}} = await getLiquidations(subgraphUrl, pool.poolAddress, poolConfig.take!.minCollateral);
  for (const auction of liquidationAuctions) {
    const {borrower, kickTime, referencePrice} = auction;
    const timeElapsed = getTime() - kickTime;
    const currentPrice = getAuctionPrice(referencePrice, timeElapsed);

    if (currentPrice < hpb) {
      if (dryRun) {
        console.log(`DryRun - would ArbTake - poolAddress: ${pool.poolAddress}, borrower: ${borrower}, currentPrice: ${currentPrice}, hpb: ${hpb}`);
      } else {
        console.log(`ArbTaking - poolAddress: ${pool.poolAddress}, borrower: ${borrower}, currentPrice: ${currentPrice}, hpb: ${hpb}`);
        const liquidationSdk = pool.getLiquidation(borrower);
        await liquidationSdk.arbTake(signer, hpbIndex);
        await delay(delayBetweenLoans);
      }
    }
  }
}
