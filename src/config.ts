import { promises as fs } from 'fs';
import path from 'path';
import { Config, Address } from '@ajna-finance/sdk';
import { FeeAmount } from '@uniswap/v3-sdk';

// these are in seconds, helps manage API costs and rate limits
const DELAY_BETWEEN_LOANS = 1.5;
const DELAY_MAIN_LOOP = 15;

export interface AjnaConfigParams {
  erc20PoolFactory: Address;
  erc721PoolFactory: Address;
  poolUtils: Address;
  positionManager: Address;
  ajnaToken: Address;
  grantFund: Address;
  burnWrapper: Address;
  lenderHelper: Address;
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

interface PriceOriginCoinGecko {
  source: PriceOriginSource.COINGECKO;
  query: string;
}

interface PriceOriginPool {
  source: PriceOriginSource.POOL;
  reference: PriceOriginPoolReference;
}

export type PriceOrigin = (
  | PriceOriginFixed
  | PriceOriginCoinGecko
  | PriceOriginPool
) & {
  invert?: boolean; // TODO: Is invert used for all price sources?
};

export interface KickSettings {
  minDebt: number; // The minimum amount of debt in wad to kick a loan.
  // TODO: Assert priceFactor is less than one.
  priceFactor: number; // Once the loan price
}

export interface TakeSettings {
  minCollateral: number;
  priceFactor: number;
  withdrawRewardLiquidity: boolean;
}

interface DexConfig {
  fee: FeeAmount;
}

export interface PoolConfig {
  name: string;
  address: Address;
  price: PriceOrigin; // TODO: move price setting to kick settings.
  kick?: KickSettings;
  take?: TakeSettings;
  dexSettings?: DexConfig; // Only set this value if you want winnings sent to dex and traded for L2 token.
}

export interface KeeperConfig {
  ethRpcUrl: string;
  subgraphUrl: string; // TODO: fallback to SDK if this is not provided?
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
    const absolutePath = path.resolve(filePath);
    const fileContents = await fs.readFile(absolutePath, 'utf-8');
    const parsedFile = JSON.parse(fileContents);
    assertIsValidConfig(parsedFile);
    return parsedFile;
  } catch (error) {
    console.error('Error reading config file:', error);
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
  // TODO: validate the nested config
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
    ajnaConfig.grantFund,
    ajnaConfig.burnWrapper,
    ajnaConfig.lenderHelper
  );
}
