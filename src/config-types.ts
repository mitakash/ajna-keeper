// src/config-types.ts
// CURVE INTEGRATION: Only additions for Curve DEX support, no existing code modified

import { promises as fs } from 'fs';
import path from 'path';
import { Config, Address } from '@ajna-finance/sdk';
import { FeeAmount } from '@uniswap/v3-sdk';
import { logger } from './logging';
import { getWethToken } from './uniswap';
import { JsonRpcProvider } from './provider';
import { ethers } from 'ethers';

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

// should match LiquiditySource enum in AjnaKeeperTaker.sol
export enum LiquiditySource {
  NONE = 0,      // invalid
  ONEINCH = 1,   // use 1inch `quote` API for pricing and `swap` API to swap
  UNISWAPV3 = 2, // use Uniswap V3 via Universal Router
  SUSHISWAP = 3, // SushiSwap integration
  CURVE = 4,     // CURVE INTEGRATION: Added Curve support
}

// CURVE INTEGRATION: New enum for pool type selection
export enum CurvePoolType {
  STABLE = 'stable',  // StableSwap/StableSwapNG pools (int128 indices)
  CRYPTO = 'crypto'   // CryptoSwap/TriCrypto pools (uint256 indices)
}

export interface TakeSettings {
  /** Minimum amount of collateral in liquidation to take/arbTake. */
  minCollateral?: number;
  /** Will only arbTake when auctionPrice < hpb * hpbPriceFactor. */
  hpbPriceFactor?: number;
  /** Determines market price used to assess takeability */
  liquiditySource?: LiquiditySource;
  /** Will only take when auctionPrice < marketPrice * marketPriceFactor. */
  marketPriceFactor?: number;
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


export enum RewardActionLabel {
  TRANSFER = 'transfer',
  EXCHANGE = 'exchange',
}

//PostAuctionDex enum for scalable DEX selection
export enum PostAuctionDex {
  ONEINCH = 'oneinch',
  UNISWAP_V3 = 'uniswap_v3', 
  SUSHISWAP = 'sushiswap',
  CURVE = 'curve',           // CURVE INTEGRATION: Added Curve for post-auction swaps
  // Future additions:
  // IZUMI = 'izumi', 
  // BALANCER = 'balancer',
  // DODO = 'dodo'
}

export interface TransferReward {
  /** If set to transfer, send any collected rewards to the wallet specified by "to". */
  action: RewardActionLabel.TRANSFER;
  /** Wallet to receive redeemed LP rewards. */
  to: string;
}

export interface ExchangeReward {
  action: RewardActionLabel.EXCHANGE;
  address: string;
  targetToken: string;
  slippage: number;
  dexProvider: PostAuctionDex;
  fee?: number;
}

export type RewardAction = TransferReward | ExchangeReward;

interface CollectLpRewardSettings {
  /** Wether to redeem LP as Quote or Collateral first. If unset will default to Quote first. */
  redeemFirst?: TokenToCollect;
  /** Minimum amount of token to collect. */
  minAmountQuote: number;
  minAmountCollateral: number;
  /** What to do with Collected LP Rewards. If unset will leave rewards in wallet. */
  rewardActionQuote?: RewardAction;
  rewardActionCollateral?: RewardAction;
}


export interface SettlementConfig {
  enabled: boolean;
  minAuctionAge?: number;        // Minimum auction age in seconds before settlement (default: 3600 = 1 hour)
  maxBucketDepth?: number;       // Number of buckets to process per settlement call (default: 50)
  maxIterations?: number;        // Maximum settlement iterations before giving up (default: 10)
  checkBotIncentive?: boolean;   // Only settle if bot has bonds/rewards to claim (default: true)
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
  /** Will do settlement if settings are provided. */
  settlement?: SettlementConfig;
}

export interface UniswapV3Overrides {
  /** The address of the WETH token. */
  wethAddress?: string;
  /** Uniswap V3 router address */
  uniswapV3Router?: string;
}

export interface UniversalRouterOverrides {
  universalRouterAddress?: string;
  wethAddress?: string;
  permit2Address?: string;
  defaultFeeTier?: number;
  defaultSlippage?: number;
  poolFactoryAddress?: string;
  quoterV2Address?: string;  // NEW: QuoterV2 contract address per chain
}

// SushiSwap configuration interface
export interface SushiswapRouterOverrides {
  swapRouterAddress?: string;
  quoterV2Address?: string;
  factoryAddress?: string;
  wethAddress?: string;
  defaultFeeTier?: number; // Default: 500 (0.05%)
  defaultSlippage?: number; // Default: 1.0 (1%)
}

// CURVE INTEGRATION: New configuration interface for Curve pools
export interface CurveRouterOverrides {
  /** Pre-configured pool mappings for token pair routing */
  poolConfigs?: {
    [tokenPair: string]: {
      /** Curve pool contract address */
      address: string;
      /** Pool type determines ABI selection (int128 vs uint256 indices) */
      poolType: CurvePoolType;
    }
  };
  /** Default slippage percentage for Curve swaps (default: 1.0%) */
  defaultSlippage?: number;
  /** WETH address for ETH/WETH conversion in pool lookups */
  wethAddress?: string; 
}

export interface KeeperConfig {
  /** The url of RPC endpoint. Should include API key. example: https://avax-mainnet.g.alchemy.com/v2/asf... */
  ethRpcUrl: string;
  /** The log level of the keeper. */
  logLevel: string;
  /** The url of the subgraph. */
  subgraphUrl: string;
  /** Path to encrypted keystore json file. See README for instructions on how to create this file.*/
  keeperKeystore: string;
  /** Contract used for atomically taking liquidations with external liquidity */
  keeperTaker?: string;
  /** NEW: Factory contract for routing to multiple taker implementations */
  keeperTakerFactory?: string;
  /** NEW: Individual taker contract addresses per DEX */
  takerContracts?: {
    [source: string]: string;
  };
  /** If true, doesn't send any requests. */
  dryRun?: boolean;
  /** Use this to overwrite the multicall address. Only use this if you are getting multicall errors for this chain. See https://www.multicall3.com/deployments */
  multicallAddress?: string;
  /** The block at which the multicall contract was deployed. Use this only if you have used multicallAddress. */
  multicallBlock?: number;
  /** Contract addresses passed to Ajna for this chain. See here for addresses https://faqs.ajna.finance/info/deployment-addresses-and-bridges */
  ajna: AjnaConfigParams;
  /** Your API key for Coingecko.com (optional - will fallback to Alchemy Prices API if not provided) */
  coinGeckoApiKey?: string;
  /** List of pool specific settings. */
  pools: PoolConfig[];
  /** Custom address overrides for Uniswap. Only need this if any of the collectLpRewards have the RewardAction: uniswap. */
  uniswapOverrides?: UniswapV3Overrides;
  /** The time between between actions within Kick or ArbTake loops. Higher values reduce load on network and prevent usage errors. */
  delayBetweenActions: number;
  /** The time between each run of the Kick and ArbTake loops. */
  delayBetweenRuns: number;
  /** 1inch list of routers */
  oneInchRouters?: { [chainId: number]: string };
  /** List of token addresses */
  tokenAddresses?: { [tokenSymbol: string]: string };
  /** Optional list of token addresses used as intermediate connectors in 1inch swap routes */
  connectorTokens?: Array<string>;
  /** Uniswap Universal Router for Uni v3 */
  universalRouterOverrides?: UniversalRouterOverrides;
  /** SushiSwap configuration for post-auction swaps */
  sushiswapRouterOverrides?: SushiswapRouterOverrides;
  /** CURVE INTEGRATION: Curve configuration for post-auction swaps */
  curveRouterOverrides?: CurveRouterOverrides;
}

// Validation function for PostAuctionDex configuration
export function validatePostAuctionDex(dexProvider: PostAuctionDex, config: KeeperConfig): void {
  switch (dexProvider) {
    case PostAuctionDex.ONEINCH:
      if (!config.oneInchRouters) {
        throw new Error('PostAuctionDex.ONEINCH requires oneInchRouters configuration');
      }
      break;
    case PostAuctionDex.UNISWAP_V3:
      if (!config.universalRouterOverrides) {
        throw new Error('PostAuctionDex.UNISWAP_V3 requires universalRouterOverrides configuration');
      }
      break;
    case PostAuctionDex.SUSHISWAP:
      if (!config.sushiswapRouterOverrides) {
        throw new Error('PostAuctionDex.SUSHISWAP requires sushiswapRouterOverrides configuration');
      }
      break;
    // CURVE INTEGRATION: Added validation case for Curve
    case PostAuctionDex.CURVE:
      if (!config.curveRouterOverrides) {
        throw new Error('PostAuctionDex.CURVE requires curveRouterOverrides configuration');
      }
      break;
    default:
      throw new Error(`Unsupported PostAuctionDex: ${dexProvider}`);
  }
}

export async function readConfigFile(filePath: string): Promise<KeeperConfig> {
  try {
    if (filePath.endsWith('.ts')) {
      // FIXME: this prevents users from reading config files from other folders
      const imported = await import('../' + filePath);
      const config = imported.default;
      // await validateUniswapAddresses(config);
      return config;
    } else {
      const absolutePath = path.resolve(filePath);
      const fileContents = await fs.readFile(absolutePath, 'utf-8');
      const parsedFile = JSON.parse(fileContents);
      assertIsValidConfig(parsedFile);
      // await validateUniswapAddresses(parsedFile);
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
  // coinGeckoApiKey is now optional - will fallback to Alchemy Prices API
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

// /** Throws error if it cannot find the WETH9 token from uniswap's built in addresses or from the KeeperConfig. */
// async function validateUniswapAddresses(config: KeeperConfig) {
//   const poolsWithExchangeToWeth = config.pools.filter(
//     (poolConfig) =>
//       poolConfig.collectLpReward?.rewardAction?.action ==
//       RewardActionLabel.EXCHANGE_ON_UNISWAP
//   );
//   if (poolsWithExchangeToWeth.length > 0) {
//     const provider = new JsonRpcProvider(config.ethRpcUrl);
//     const { chainId } = await provider.getNetwork();
//     const weth = await getWethToken(
//       chainId,
//       provider,
//       config.uniswapOverrides?.wethAddress
//     );
//     logger.info(
//       `Exchanging LP rewards to ${weth.symbol}, address: ${weth.address}`
//     );
//   }
// }


export function validateTakeSettings(config: TakeSettings, keeperConfig: KeeperConfig): void {
  const hasArbTake = config.minCollateral !== undefined && config.hpbPriceFactor !== undefined;
  const hasTake = config.liquiditySource !== undefined && config.marketPriceFactor !== undefined;

  if (!hasArbTake && !hasTake) {
    throw new Error('TakeSettings: Must configure arbTake (minCollateral, hpbPriceFactor) or take (liquiditySource, marketPriceFactor)');
  }

  if (hasTake) {
    // Fix 1: Proper validation for multiple DEX sources
    if (config.liquiditySource === LiquiditySource.NONE) {
      throw new Error('TakeSettings: liquiditySource cannot be NONE');
    }

    if (config.liquiditySource !== LiquiditySource.ONEINCH &&
        config.liquiditySource !== LiquiditySource.UNISWAPV3 &&
        config.liquiditySource !== LiquiditySource.SUSHISWAP &&
        config.liquiditySource !== LiquiditySource.CURVE) {  // CURVE INTEGRATION: Added CURVE to validation
      throw new Error('TakeSettings: liquiditySource must be ONEINCH or UNISWAPV3 or SUSHISWAP or CURVE');
    }

    if (config.marketPriceFactor === undefined || config.marketPriceFactor <= 0) {
      throw new Error('TakeSettings: marketPriceFactor must be positive');
    }

    // Fix 2: Different validation based on DEX type
    if (config.liquiditySource === LiquiditySource.ONEINCH) {
      if (!keeperConfig.keeperTaker) {
        throw new Error('TakeSettings: keeperTaker required when liquiditySource is ONEINCH');
      }
    }

    if (config.liquiditySource === LiquiditySource.UNISWAPV3) {
      if (!keeperConfig.keeperTakerFactory) {
        throw new Error('TakeSettings: keeperTakerFactory required when liquiditySource is UNISWAPV3');
      }
      if (!keeperConfig.takerContracts || !keeperConfig.takerContracts['UniswapV3']) {
        throw new Error('TakeSettings: takerContracts.UniswapV3 required when liquiditySource is UNISWAPV3');
      }
      if (!keeperConfig.universalRouterOverrides) {
        throw new Error('TakeSettings: universalRouterOverrides required when liquiditySource is UNISWAPV3');
      }
    }

    if (config.liquiditySource === LiquiditySource.SUSHISWAP) {
      if (!keeperConfig.keeperTakerFactory) {
        throw new Error('TakeSettings: keeperTakerFactory required when liquiditySource is SUSHISWAP');
      }
      if (!keeperConfig.takerContracts || !keeperConfig.takerContracts['SushiSwap']) {
        throw new Error('TakeSettings: takerContracts.SushiSwap required when liquiditySource is SUSHISWAP');
      }
      if (!keeperConfig.sushiswapRouterOverrides) {
        throw new Error('TakeSettings: sushiswapRouterOverrides required when liquiditySource is SUSHISWAP');
      }
    }

    // CURVE INTEGRATION: Added minimal validation for Curve
    if (config.liquiditySource === LiquiditySource.CURVE) {
      if (!keeperConfig.curveRouterOverrides) {
        throw new Error('TakeSettings: curveRouterOverrides required when liquiditySource is CURVE');
      }
    }
  }

  if (hasArbTake) {
    if (config.minCollateral!! <= 0) {
      throw new Error('TakeSettings: minCollateral must be greater than 0');
    }
    if (config.hpbPriceFactor === undefined || config.hpbPriceFactor <= 0) {
      throw new Error('TakeSettings: hpbPriceFactor must be positive');
    }
  }
}
