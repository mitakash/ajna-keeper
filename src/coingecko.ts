import { logger } from './logging';
import {
  PriceOriginCoinGecko,
  PriceOriginCoinGeckoQuery,
} from './config-types';

interface CoinGeckoRespone {
  [coinName: string]: {
    usd: number;
  };
}

function buildCgQuery(tokenId: string): string {
  return `price?ids=${tokenId}&vs_currencies=usd`;
}

async function getPrice(query: string, apiKey: string): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/' + query;
  const options = {
    method: 'GET',
    headers: { accept: 'application/json', 'x-cg-demo-api-key': apiKey },
  };

  try {
    const res = await fetch(url, options);
    const resJson: CoinGeckoRespone = await res.json();
    return Object.values(Object.values(resJson)[0])[0];
  } catch (error) {
    logger.error(
      `Error fetching price from CoinGecko. query:${query} - `,
      error
    );
    throw new Error(`Could not get price from CoinGecko. ${query}`);
  }
}

async function getPoolPrice(
  quoteId: string,
  collateralId: string,
  apiKey: string
): Promise<number> {
  const collateralPrice = await getPrice(buildCgQuery(collateralId), apiKey);
  const quotePrice = await getPrice(buildCgQuery(quoteId), apiKey);
  return collateralPrice / quotePrice;
}

export async function getPriceCoinGecko(
  config: PriceOriginCoinGecko,
  apiKey: string
): Promise<number> {
  if (isPriceOriginQuery(config)) {
    return await getPrice(config.query, apiKey);
  } else {
    return await getPoolPrice(config.quoteId, config.collateralId, apiKey);
  }
}

function isPriceOriginQuery(
  config: PriceOriginCoinGecko
): config is PriceOriginCoinGeckoQuery {
  return !!config.hasOwnProperty('query');
}
