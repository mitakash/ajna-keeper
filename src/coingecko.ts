import { logger } from './logging';

interface CoinGeckoRespone {
  [coinName: string]: {
    usd: number;
  };
}

export async function getPrice(query: string, apiKey: string): Promise<number> {
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
    logger.error('Error fetching price from CoinGecko:', error);
  }
  return NaN;
}
