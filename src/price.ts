import { PriceOrigin, PriceOriginPoolReference, PriceOriginSource } from './config'
import { getPrice as getPriceCoinGecko } from './coingecko'
import { bigNumberToWad } from './utils'
import { KeeperContext } from './run';
import { Pool } from '@ajna-finance/sdk';

// Retrieves the market price using the configured source
export async function getPrice(poolAddress: string, priceOrigin: PriceOrigin, coinGeckoApiKey: string = "", pools: KeeperContext["pools"]) {
  let price: number;
  switch (priceOrigin.source) {
    case PriceOriginSource.COINGECKO:
      price = await getPriceCoinGecko(priceOrigin.query, coinGeckoApiKey);
      break;
    case PriceOriginSource.FIXED:
      price = priceOrigin.value;
      break;
    case PriceOriginSource.POOL:
      price = await getPoolPrice(pools.get(poolAddress)!, priceOrigin.reference);
      break;
    default:
      throw new Error('Unknown price provider:' + (priceOrigin as any).source);
  }
  if (priceOrigin.invert) {
    return (price !== 0) ? 1 / price : 0;
  } else {
    return price;
  }
}

export async function getPoolPrice(pool: Pool, reference: PriceOriginPoolReference): Promise<number> {
  const poolPrices = await pool.getPrices();
  let price;
  switch (reference) {
    case PriceOriginPoolReference.HPB:
      price = poolPrices?.hpb;
      break;
    case PriceOriginPoolReference.HTP:
      price = poolPrices?.htp;
      break;
    case PriceOriginPoolReference.LUP:
      price = poolPrices?.lup;
      break;
    case PriceOriginPoolReference.LLB:
      price = poolPrices?.llb;
      break;
    default:
      throw new Error('Unknown pool price reference:' + reference);
  }
  if (price == undefined) {
    throw new Error(`Unable to get price for ${pool.poolAddress} - ${reference}`);
  }
  return bigNumberToWad(price);
}

function bucketToPrice(index: number) {
  return 1.005 ^ (index - 3232)
}

function priceToBucket(price: number) {
  return Math.log(price) / Math.log(1.005) + 3232
}


const HALVING_DURATIONS: number[] = [
  ...Array(6).fill(20 * 60),
  ...Array(6).fill(2 * 60 * 60),
  ...Array(58).fill(60 * 60)
]
export function getAuctionPrice(referencePrice: number, elapsedSeconds: number) {
  let halvingStartTime = 0
  for (let i = 0; i < HALVING_DURATIONS.length; i++) {
    const duration = HALVING_DURATIONS[i]
    if (elapsedSeconds < (halvingStartTime + duration)) {
      const durationPctCompleted = (elapsedSeconds - halvingStartTime) / duration
      return 256 * referencePrice * 2 ^ -(i + durationPctCompleted)
    }
    halvingStartTime += duration
  }
  return 0
}