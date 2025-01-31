import { AjnaSDK, Pool, Signer } from '@ajna-finance/sdk'
import { configureAjna, KeeperConfig, PoolConfig } from './config'
import { delay, getProviderAndSigner, overrideMulticall } from './utils'
import { handleKicks } from './kick'
import { handleArbTakes } from './take'
import {getPrice} from './price';

export interface KeeperContext {
  pools: Map<string, Pool>;
  config: KeeperConfig;
}

// these are in seconds, helps manage API costs and rate limits
const DELAY_BETWEEN_LOANS = 1.5
const DELAY_MAIN_LOOP = 15

export async function startKeeperFromConfig(config: KeeperConfig) {
  const keeperCtx: KeeperContext = {
    pools: new Map(),
    config
  }
  const { provider, signer } = await getProviderAndSigner(config.KEEPER_KEYSTORE, config.ETH_RPC_URL);
  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);

  console.log('...and pools:');
  for(const pool of config.pools) {
    const name: string = pool.name ?? '(unnamed)';
    console.log('loading pool', name.padStart(18), 'at', pool.address);
    const fungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(pool.address);
    overrideMulticall(fungiblePool, config);
    keeperCtx.pools.set(pool.address, fungiblePool);
  }

  while (true) {
    for(const pool of config.pools) {
      try {
        keepPool(pool, signer, keeperCtx); // not awaiting here; we want these calls dispatched in parallel
      } catch (error) {
        console.error(`Error keeping pool ${pool.address}:`, error);
      }
    }
    console.log('\n');
    await delay(DELAY_MAIN_LOOP);
  }
}

async function keepPool(poolConfig: PoolConfig, signer: Signer, keeperCtx: KeeperContext) {
  let price: number;
  if (poolConfig.price) {
    price = await getPrice(poolConfig.address, poolConfig.price,keeperCtx.config.pricing.coinGeckoApiKey, keeperCtx.pools);
  } else {
    throw new Error('No price feed configured for pool ' + poolConfig.address);
  }
  console.log(poolConfig.name, `${poolConfig.price.source} price`, price);

  const pool = keeperCtx.pools.get(poolConfig.address);
  if (pool == undefined) throw new Error(`Cannot find pool for address: ${poolConfig.address}`);
  if (poolConfig.kick) handleKicks(pool, poolConfig, price, keeperCtx.config.SUBGRAPH_URL, DELAY_BETWEEN_LOANS, signer, !!keeperCtx.config.dryRun);
  if (poolConfig.take) handleArbTakes(pool, poolConfig, keeperCtx.config.SUBGRAPH_URL, DELAY_BETWEEN_LOANS, signer, !!keeperCtx.config.dryRun);
}
