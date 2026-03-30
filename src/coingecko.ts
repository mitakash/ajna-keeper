import { logger } from './logging';
import {
  PriceOriginCoinGecko,
  PriceOriginCoinGeckoQuery,
} from './config-types';
import { getPriceFromAlchemy, getPoolPriceFromAlchemy } from './alchemy-prices';

interface CoinGeckoResponse {
  [coinName: string]: {
    usd: number;
  };
}

// Map CoinGecko token IDs to contract addresses for Alchemy fallback
// This mapping is chain-specific and should be expanded as needed
function getTokenAddress(tokenId: string, chainId: number, tokenAddresses?: { [key: string]: string }): string | null {
  // First check user-provided token addresses
  if (tokenAddresses && tokenAddresses[tokenId]) {
    return tokenAddresses[tokenId];
  }

  // Common token address mappings per chain
  const addressMap: { [key: number]: { [key: string]: string } } = {
    // Base mainnet (8453)
    8453: {
      'ethereum': '0x4200000000000000000000000000000000000006', // WETH
      'weth': '0x4200000000000000000000000000000000000006',
      'usd-coin': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
      'usdc': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'dai': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      'tether': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',  // USDT
      'usdt': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      'wrapped-bitcoin': '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC
      'wbtc': '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      'cana': '0x88a3548e2a662936268bFD4366e48D38183E3958', // CANA on Base
      'cana-holdings-california-carbon-credits': '0x88a3548e2a662936268bFD4366e48D38183E3958', // CANA full CoinGecko ID
    },
    // Ethereum mainnet (1)
    1: {
      'ethereum': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      'weth': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'usd-coin': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      'usdc': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      'dai': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      'tether': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      'usdt': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'wrapped-bitcoin': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
      'wbtc': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      'cana': '0x01995A697752266d8E748738aAa3F06464B8350B', // CANA on Ethereum mainnet
      'cana-holdings-california-carbon-credits': '0x01995A697752266d8E748738aAa3F06464B8350B', // CANA full CoinGecko ID
    },
    // Avalanche C-Chain (43114)
    43114: {
      'avalanche-2': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
      'avax': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      'wavax': '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      'usd-coin': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
      'usdc': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      'ethereum': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH.e
      'weth': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    },
    // Arbitrum One (42161)
    42161: {
      'ethereum': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      'weth': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      'usd-coin': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
      'usdc': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      'dai': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      'tether': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
      'usdt': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    },
  };

  const chainMap = addressMap[chainId];
  if (!chainMap) {
    return null;
  }

  return chainMap[tokenId] || null;
}

function buildCgQuery(tokenId: string): string {
  return `price?ids=${tokenId}&vs_currencies=usd`;
}

async function getPrice(
  query: string,
  apiKey: string | undefined,
  chainId?: number,
  rpcUrl?: string,
  tokenAddresses?: { [key: string]: string }
): Promise<number> {
  // Try CoinGecko first if API key is provided
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_COINGECKO_API_KEY_HERE') {
    try {
      const url = 'https://api.coingecko.com/api/v3/simple/' + query;
      const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'x-cg-demo-api-key': apiKey },
      };

      const res = await fetch(url, options);
      const resJson: CoinGeckoResponse = await res.json();
      const price = Object.values(Object.values(resJson)[0])[0];
      logger.debug(`CoinGecko price fetched successfully: $${price}`);
      return price;
    } catch (error) {
      logger.warn(`CoinGecko fetch failed, trying Alchemy fallback: ${error}`);
    }
  } else {
    logger.debug('CoinGecko API key not provided, using Alchemy fallback');
  }

  // Fallback to Alchemy
  if (!chainId || !rpcUrl) {
    throw new Error('chainId and rpcUrl required for Alchemy price fallback');
  }

  // Extract token ID from query (format: "price?ids=ethereum&vs_currencies=usd")
  const tokenIdMatch = query.match(/ids=([^&]+)/);
  if (!tokenIdMatch) {
    throw new Error(`Could not extract token ID from query: ${query}`);
  }

  const tokenId = tokenIdMatch[1];
  const tokenAddress = getTokenAddress(tokenId, chainId, tokenAddresses);

  if (!tokenAddress) {
    throw new Error(
      `No token address mapping found for "${tokenId}" on chain ${chainId}. ` +
      `Add it to tokenAddresses config or update the token mapping in coingecko.ts`
    );
  }

  logger.info(`Using Alchemy Prices API for ${tokenId} (${tokenAddress})`);
  return await getPriceFromAlchemy(tokenAddress, chainId, rpcUrl);
}

async function getPoolPrice(
  quoteId: string,
  collateralId: string,
  apiKey: string | undefined,
  chainId?: number,
  rpcUrl?: string,
  tokenAddresses?: { [key: string]: string }
): Promise<number> {
  // Try CoinGecko first if API key is provided
  if (apiKey && apiKey.trim() !== '' && apiKey !== 'YOUR_COINGECKO_API_KEY_HERE') {
    try {
      const collateralPrice = await getPrice(buildCgQuery(collateralId), apiKey, chainId, rpcUrl, tokenAddresses);
      const quotePrice = await getPrice(buildCgQuery(quoteId), apiKey, chainId, rpcUrl, tokenAddresses);
      return collateralPrice / quotePrice;
    } catch (error) {
      logger.warn(`CoinGecko pool price fetch failed, trying Alchemy fallback: ${error}`);
    }
  } else {
    logger.debug('CoinGecko API key not provided, using Alchemy for pool price');
  }

  // Fallback to Alchemy
  if (!chainId || !rpcUrl) {
    throw new Error('chainId and rpcUrl required for Alchemy price fallback');
  }

  const quoteAddress = getTokenAddress(quoteId, chainId, tokenAddresses);
  const collateralAddress = getTokenAddress(collateralId, chainId, tokenAddresses);

  if (!quoteAddress || !collateralAddress) {
    throw new Error(
      `No token address mapping found for "${quoteId}" or "${collateralId}" on chain ${chainId}. ` +
      `Add them to tokenAddresses config or update the token mapping in coingecko.ts`
    );
  }

  logger.info(`Using Alchemy Prices API for pool price: ${collateralId}/${quoteId}`);
  return await getPoolPriceFromAlchemy(quoteAddress, collateralAddress, chainId, rpcUrl);
}

export async function getPriceCoinGecko(
  config: PriceOriginCoinGecko,
  apiKey: string | undefined,
  chainId?: number,
  rpcUrl?: string,
  tokenAddresses?: { [key: string]: string }
): Promise<number> {
  if (isPriceOriginQuery(config)) {
    return await getPrice(config.query, apiKey, chainId, rpcUrl, tokenAddresses);
  } else {
    return await getPoolPrice(config.quoteId, config.collateralId, apiKey, chainId, rpcUrl, tokenAddresses);
  }
}

function isPriceOriginQuery(
  config: PriceOriginCoinGecko
): config is PriceOriginCoinGeckoQuery {
  return !!config.hasOwnProperty('query');
}
