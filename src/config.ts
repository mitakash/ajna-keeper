import { promises as fs } from 'fs'
import path from 'path'
import { Config, Address } from '@ajna-finance/sdk'

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
  FIXED = "fixed",
  COINGECKO = "coingecko",
  POOL = "pool",
}

export enum PriceOriginPoolReference {
  HPB = "hpb",
  HTP = "htp",
  LUP = "lup",
  LLB = "llb",
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

export type PriceOrigin = (PriceOriginFixed | PriceOriginCoinGecko | PriceOriginPool) & {
  invert: boolean;  // TODO: Is invert used for all price sources?
};

interface KickSettings {
  minDebt: number;  // The minimum amount of debt in wad to kick a loan.
  priceFactor: number; 
}

interface TakeSettings {
  minCollateral: number;
  priceFactor: number;
}

export interface PoolConfig {
  name: string;
  address: Address;
  price: PriceOrigin;
  "price-disabled": PriceOrigin;
  kick?: KickSettings;
  take?: TakeSettings;
}

export interface KeeperConfig {
  ajna: AjnaConfigParams;
  dryRun?: boolean;
  multicallAddress?: string;
  multicallBlock?: number;
  ETH_RPC_URL: string;
  SUBGRAPH_URL: string;
  KEEPER_KEYSTORE: string;
  pricing: PricingApiKey;
  pools: PoolConfig[];
}

export async function readConfigFile(filePath: string): Promise<KeeperConfig> {
  try {
    const absolutePath = path.resolve(filePath)
    const fileContents = await fs.readFile(absolutePath, 'utf-8')
    const parsedFile = JSON.parse(fileContents)
    assertIsValidConfig(parsedFile)
    return parsedFile
  } catch (error) {
    console.error('Error reading config file:', error)
    process.exit(1)
  }
}

export function assertIsValidConfig(config: any): asserts config is KeeperConfig {
  expectProperty(config, "ajna")  // TODO: Validate nested ajna fields?
  expectProperty(config, "ETH_RPC_URL")
  expectProperty(config, "SUBGRAPH_URL")
  expectProperty(config, "KEEPER_KEYSTORE")
  expectProperty(config, "pricing")
  expectProperty(config, "pools")
  // TODO: validate the config
}

function expectProperty(config: any, key: string): void {
  if(!(config as Object).hasOwnProperty(key)) {
    throw new Error(`Missing ${key} key from config`)
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
  )
}
