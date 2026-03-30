import { logger } from './logging';

interface AlchemyPriceRequest {
  network: string;
  address: string;
}

interface AlchemyPriceResponse {
  data: Array<{
    network: string;
    address: string;
    prices: Array<{
      currency: string;
      value: string;
      lastUpdatedAt: string;
    }>;
    error?: string;
  }>;
}

// Map chainId to Alchemy network names
function getAlchemyNetwork(chainId: number): string {
  const networkMap: { [key: number]: string } = {
    1: 'eth-mainnet',
    8453: 'base-mainnet',
    42161: 'arb-mainnet',
    10: 'opt-mainnet',
    137: 'polygon-mainnet',
    43114: 'avax-mainnet',
  };

  const network = networkMap[chainId];
  if (!network) {
    throw new Error(`Unsupported chainId for Alchemy Prices API: ${chainId}`);
  }
  return network;
}

// Extract Alchemy API key from RPC URL
function extractAlchemyKey(rpcUrl: string): string | null {
  // Pattern: https://[network].g.alchemy.com/v2/[API_KEY]
  const match = rpcUrl.match(/\/v2\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Fetch token price from Alchemy Prices API
 * @param tokenAddress - Contract address of the token
 * @param chainId - Chain ID (e.g., 8453 for Base)
 * @param rpcUrl - The RPC URL containing the Alchemy API key
 * @returns Price in USD
 */
export async function getPriceFromAlchemy(
  tokenAddress: string,
  chainId: number,
  rpcUrl: string
): Promise<number> {
  const apiKey = extractAlchemyKey(rpcUrl);
  if (!apiKey) {
    throw new Error('Could not extract Alchemy API key from RPC URL');
  }

  const network = getAlchemyNetwork(chainId);
  const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`;

  const requestBody: { addresses: AlchemyPriceRequest[] } = {
    addresses: [
      {
        network,
        address: tokenAddress,
      },
    ],
  };

  try {
    logger.debug(`Fetching price from Alchemy for ${tokenAddress} on ${network}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API request failed: ${response.status} ${response.statusText}`);
    }

    const data: AlchemyPriceResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No price data returned from Alchemy');
    }

    const tokenData = data.data[0];

    if (tokenData.error) {
      const errorMsg = typeof tokenData.error === 'string'
        ? tokenData.error
        : JSON.stringify(tokenData.error);
      throw new Error(`Alchemy API error: ${errorMsg}`);
    }

    if (!tokenData.prices || tokenData.prices.length === 0) {
      throw new Error(`No price information available from Alchemy for ${tokenAddress}`);
    }

    // Get USD price
    const usdPrice = tokenData.prices.find(p => p.currency.toLowerCase() === 'usd');
    if (!usdPrice) {
      throw new Error('USD price not available from Alchemy');
    }

    const price = parseFloat(usdPrice.value);
    logger.debug(`Alchemy price for ${tokenAddress}: $${price}`);

    return price;
  } catch (error) {
    logger.error(`Error fetching price from Alchemy for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Fetch prices for a token pair and calculate the ratio
 * @param quoteAddress - Contract address of the quote token
 * @param collateralAddress - Contract address of the collateral token
 * @param chainId - Chain ID
 * @param rpcUrl - The RPC URL containing the Alchemy API key
 * @returns Price ratio (collateral/quote)
 */
export async function getPoolPriceFromAlchemy(
  quoteAddress: string,
  collateralAddress: string,
  chainId: number,
  rpcUrl: string
): Promise<number> {
  const [collateralPrice, quotePrice] = await Promise.all([
    getPriceFromAlchemy(collateralAddress, chainId, rpcUrl),
    getPriceFromAlchemy(quoteAddress, chainId, rpcUrl),
  ]);

  return collateralPrice / quotePrice;
}
