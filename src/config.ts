import { promises as fs } from 'fs';
import path from 'path';
import { Config, Address } from '@ajna-finance/sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import { logger } from './logging';

// these are in seconds, helps manage API costs and rate limits
const DELAY_BETWEEN_LOANS = 1.5;
const DELAY_MAIN_LOOP = 15;

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

interface PricingApiKey {
  coinGeckoApiKey: string;
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

interface PriceOriginFixed {
  source: PriceOriginSource.FIXED;
  value: number;
}

// See: https://docs.coingecko.com/reference/simple-price for reference.
export interface PriceOriginCoinGeckoQuery {
  source: PriceOriginSource.COINGECKO;
  query: string; // The query used for the token price in Coingecko.  example: "price?ids=ethereum&vs_currencies=usd"
}

export interface PriceOriginCoinGeckoTokenIds {
  source: PriceOriginSource.COINGECKO;
  quoteId: string; // Id of quote token as seen in Coingecko api. example: "ethereum"
  collateralId: string; // Id of collateral token as seen in Coingecko api. example: "solana"
}

export type PriceOriginCoinGecko =
  | PriceOriginCoinGeckoQuery
  | PriceOriginCoinGeckoTokenIds;

interface PriceOriginPool {
  source: PriceOriginSource.POOL;
  reference: PriceOriginPoolReference;
}

export type PriceOrigin = (
  | PriceOriginFixed
  | PriceOriginCoinGecko
  | PriceOriginPool
) & {
  invert?: boolean; // Uses the inverse of the price as reference.
};

export interface KickSettings {
  minDebt: number; // The minimum amount of debt in wad to kick a loan.
  priceFactor: number; // Will only kick when NP * priceFactor > price. (Should be less than one).
}

export interface TakeSettings {
  minCollateral: number;
  priceFactor: number; // Will only arbTake when auctionPrice < hpb * priceFactor.
}

export interface CollectSettings {
  collectLiquidity: boolean; // If true collects arbTake rewards as well as all deposits for this pool.
  collectBonds: boolean; // If true collects bonds from pool.
}

interface DexConfig {
  fee: FeeAmount;
}

export enum TokenToCollect {
  QUOTE = 'quote',
  COLLATERAL = 'collateral',
}

interface CollectLpRewardSettings {
  redeemAs: TokenToCollect;
  minAmount: number;
}

export interface PoolConfig {
  name: string;
  address: Address;
  price: PriceOrigin; // TODO: move price setting to kick settings.
  kick?: KickSettings; // Will only kick if settings are provided.
  take?: TakeSettings; // Will only take if settings are provided.
  dexSettings?: DexConfig; // Only set this value if you want winnings sent to dex and traded for L2 token.
  collectBond?: boolean; // Will only collect bond if true.
  collectLpReward?: CollectLpRewardSettings; // Will only collect reward if settings are provided.
}

export interface KeeperConfig {
  ethRpcUrl: string;
  subgraphUrl: string;
  keeperKeystore: string;
  dryRun?: boolean;
  multicallAddress?: string;
  multicallBlock?: number;
  ajna: AjnaConfigParams;
  pricing: PricingApiKey;
  pools: PoolConfig[];
  delayBetweenActions: number;
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
  expectProperty(config, 'pricing');
  expectProperty(config, 'pools');
  config.delayBetweenActions =
    config.delayBetweenActions ?? DELAY_BETWEEN_LOANS;
  config.delayBetweenRuns = config.delayBetweenRuns ?? DELAY_MAIN_LOOP;
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
