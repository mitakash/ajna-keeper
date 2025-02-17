import { promises as fs } from 'fs';
import path from 'path';
import { Config, Address } from '@ajna-finance/sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import { logger } from './logging';

export interface AjnaConfigParams {
  erc20PoolFactory: Address;
  erc721PoolFactory: Address;
  poolUtils: Address;
  positionManager: Address;
  ajnaToken: Address;
  grantFund?: Address;
  burnWrapper?: Address;
  lenderHelper?: Address;
}

export enum PriceOriginSource {
  FIXED = 'fixed',
  COINGECKO = 'coingecko',
  POOL = 'pool',
}

export enum PriceOriginPoolReference {
  HPB = 'hpb',
  HTP = 'htp',
  LUP = 'lup',
  LLB = 'llb',
}

/** Use a constant value as the price. */
interface PriceOriginFixed {
  source: PriceOriginSource.FIXED;
  value: number;
}

// See: https://docs.coingecko.com/reference/simple-price for reference.
/** Query the price from Coingecko. */
export interface PriceOriginCoinGeckoQuery {
  source: PriceOriginSource.COINGECKO;
  /** The query used for the token price in Coingecko.  example: "price?ids=ethereum&vs_currencies=usd" */
  query: string;
}

/** Query the price from Coingeck using two different tokens which aren't currencies.  */
export interface PriceOriginCoinGeckoTokenIds {
  source: PriceOriginSource.COINGECKO;
  /** Id of quote token as seen in Coingecko api. example: "wrapped-steth". */
  quoteId: string;
  /** Id of collateral token as seen in Coingecko api. example: "sol-wormhole". */
  collateralId: string;
}

/** Get the price by querying from CoinGecko. */
export type PriceOriginCoinGecko =
  | PriceOriginCoinGeckoQuery
  | PriceOriginCoinGeckoTokenIds;

/** Use the pool's prices as the source for limitPrice */
interface PriceOriginPool {
  source: PriceOriginSource.POOL;
  reference: PriceOriginPoolReference;
}

/** Determines how to get the price for kicks. */
export type PriceOrigin = (
  | PriceOriginFixed
  | PriceOriginCoinGecko
  | PriceOriginPool
) & {
  /** If set, use the inverse of the price as reference. */
  invert?: boolean;
};

export interface KickSettings {
  /** The minimum amount of debt in wad to kick a loan. */
  minDebt: number;
  /** Will only kick when NP * priceFactor > price. (Should be less than one). */
  priceFactor: number;
}

export interface TakeSettings {
  /** Minimum amount of collateral in liquidation to arbTake. */
  minCollateral: number;
  /** Will only arbTake when auctionPrice < hpb * priceFactor. */
  priceFactor: number;
}

export interface CollectSettings {
  /** If true collects arbTake rewards as well as all deposits for this pool. */
  collectLiquidity: boolean;
  /** If true collects bonds from pool. */
  collectBonds: boolean;
}

interface DexConfig {
  fee: FeeAmount;
}

export enum TokenToCollect {
  QUOTE = 'quote',
  COLLATERAL = 'collateral',
}

interface CollectLpRewardSettings {
  /** Wether to redeem LP as Quote or Collateral. */
  redeemAs: TokenToCollect;
  /** Minimum amount of token to collect. */
  minAmount: number;
  /** If true, will exchange LP rewards with Uniswap. */
  shouldExchangeRewardsToWeth?: boolean;
  /** The fee amount to use when exchanging LP rewards. */
  exchangeRewardsFeeAmount?: FeeAmount,
}

export interface PoolConfig {
  name: string;
  address: Address;
  price: PriceOrigin;
  /** Will only kick if settings are provided. */
  kick?: KickSettings;
  /** Will only take if settings are provided. */
  take?: TakeSettings;
  /** Only set this value if you want winnings sent to dex and traded for L2 token. */
  dexSettings?: DexConfig;
  /** Will only collect bond if true.*/
  collectBond?: boolean;
  /** Will only collect reward if settings are provided. */
  collectLpReward?: CollectLpRewardSettings;
}

export interface KeeperConfig {
  /** The url of RPC endpoint. Should include API key. example: https://avax-mainnet.g.alchemy.com/v2/asf... */
  ethRpcUrl: string;
  /** The url of the subgraph. */
  subgraphUrl: string;
  /** Path to encrypted keystore json file. See README for instructions on how to create this file.*/
  keeperKeystore: string;
  /** If true, doesn't send any requests. */
  dryRun?: boolean;
  /** Use this to overwrite the multicall address. Only use this if you are getting multicall errors for this chain. See https://www.multicall3.com/deployments */
  multicallAddress?: string;
  /** The address of the WETH token. */
  wethAddress: string;
  /** The block at which the multicall contract was deployed. Use this only if you have used multicallAddress. */
  multicallBlock?: number;
  /** Contract addresses passed to Ajna for this chain. See here for addresses https://faqs.ajna.finance/info/deployment-addresses-and-bridges */
  ajna: AjnaConfigParams;
  /** Your API key for Coingecko.com */
  coinGeckoApiKey: string;
  pools: PoolConfig[];
  /** The time between between actions within Kick or ArbTake loops. Higher values reduce load on network and prevent usage errors. */
  delayBetweenActions: number;
  /** The time between each run of the Kick and ArbTake loops. */
  delayBetweenRuns: number;
}

export async function readConfigFile(filePath: string): Promise<KeeperConfig> {
  try {
    if (filePath.endsWith('.ts')) {
      const imported = await import('../' + filePath);
      return imported.default;
    } else {
      const absolutePath = path.resolve(filePath);
      const fileContents = await fs.readFile(absolutePath, 'utf-8');
      const parsedFile = JSON.parse(fileContents);
      assertIsValidConfig(parsedFile);
      return parsedFile;
    }
  } catch (error) {
    logger.error('Error reading config file:', error);
    process.exit(1);
  }
}

export function assertIsValidConfig(
  config: Partial<KeeperConfig>
): asserts config is KeeperConfig {
  expectProperty(config, 'ethRpcUrl');
  expectProperty(config, 'subgraphUrl');
  expectProperty(config, 'keeperKeystore');
  expectProperty(config, 'ajna');
  expectProperty(config, 'coinGeckoApiKey');
  expectProperty(config, 'pools');
}

function expectProperty<T, K extends keyof T>(config: T, key: K): void {
  if (!(config as Object).hasOwnProperty(key)) {
    throw new Error(`Missing ${String(key)} key from config`);
  }
}

export function configureAjna(ajnaConfig: AjnaConfigParams): void {
  new Config(
    ajnaConfig.erc20PoolFactory,
    ajnaConfig.erc721PoolFactory,
    ajnaConfig.poolUtils,
    ajnaConfig.positionManager,
    ajnaConfig.ajnaToken,
    ajnaConfig.grantFund ?? '',
    ajnaConfig.burnWrapper ?? '',
    ajnaConfig.lenderHelper ?? ''
  );
}
