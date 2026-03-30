import {
  PriceOrigin,
  PriceOriginPoolReference,
  PriceOriginSource,
} from './config-types';
import { getPriceCoinGecko } from './coingecko';
import { weiToDecimaled } from './utils';
import { PriceInfo } from '@ajna-finance/sdk';
import { logger } from './logging';

// Retrieves the market price using the configured source
export async function getPrice(
  priceOrigin: PriceOrigin,
  coinGeckoApiKey: string | undefined = '',
  poolPrices: PriceInfo,
  chainId?: number,
  rpcUrl?: string,
  tokenAddresses?: { [key: string]: string }
) {
  let price: number;
  switch (priceOrigin.source) {
    case PriceOriginSource.COINGECKO:
      price = await getPriceCoinGecko(priceOrigin, coinGeckoApiKey, chainId, rpcUrl, tokenAddresses);
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
    const inverted = price !== 0 ? 1 / price : 0;
    logger.debug(`Price resolved: ${inverted} (source: ${priceOrigin.source}, inverted from ${price})`);
    return inverted;
  } else {
    logger.debug(`Price resolved: ${price} (source: ${priceOrigin.source})`);
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
