import {
  PriceOrigin,
  PriceOriginPoolReference,
  PriceOriginSource,
} from './config';
import { getPrice as getPriceCoinGecko } from './coingecko';
import { weiToDecimaled } from './utils';
import { PriceInfo } from '@ajna-finance/sdk';

// Retrieves the market price using the configured source
export async function getPrice(
  priceOrigin: PriceOrigin,
  coinGeckoApiKey: string = '',
  poolPrices: PriceInfo
) {
  let price: number;
  switch (priceOrigin.source) {
    case PriceOriginSource.COINGECKO:
      price = await getPriceCoinGecko(priceOrigin.query, coinGeckoApiKey);
      break;
    case PriceOriginSource.FIXED:
      price = priceOrigin.value;
      break;
    case PriceOriginSource.POOL:
      price = await getPoolPrice(poolPrices, priceOrigin.reference);
      break;
    default:
      throw new Error('Unknown price provider:' + (priceOrigin as any).source);
  }
  if (priceOrigin.invert) {
    return price !== 0 ? 1 / price : 0;
  } else {
    return price;
  }
}

export async function getPoolPrice(
  poolPrices: PriceInfo,
  reference: PriceOriginPoolReference
): Promise<number> {
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
  return weiToDecimaled(price);
}
