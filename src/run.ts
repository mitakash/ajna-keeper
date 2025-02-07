import { AjnaSDK, FungiblePool, Signer } from '@ajna-finance/sdk';
import { configureAjna, KeeperConfig, PoolConfig } from './config';
import {
  delay,
  getProviderAndSigner,
  overrideMulticall,
  RequireFields,
} from './utils';
import { handleKicks } from './kick';
import { handleArbTakes } from './take';
import { getPrice } from './price';
import { handleCollect } from './collect';

type PoolMap = Map<string, FungiblePool>;

export async function startKeeperFromConfig(config: KeeperConfig) {
  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);
  console.log('...and pools:');
  const pools = await getPoolsFromConfig(ajna, config);

  while (true) {
    for (const poolConfig of config.pools) {
      try {
        const pool = pools.get(poolConfig.address)!;
        keepPool(poolConfig, pool, config, signer); // not awaiting here; we want these calls dispatched in parallel
      } catch (error) {
        console.error(`Error keeping pool ${poolConfig.address}:`, error);
      }
    }
    console.log('\n');
    await delay(config.delayBetweenRuns);
  }
}

async function getPoolsFromConfig(
  ajna: AjnaSDK,
  config: KeeperConfig
): Promise<PoolMap> {
  const pools: PoolMap = new Map();
  for (const pool of config.pools) {
    const name: string = pool.name ?? '(unnamed)';
    console.log('loading pool', name.padStart(18), 'at', pool.address);
    const fungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      pool.address
    );
    overrideMulticall(fungiblePool, config);
    pools.set(pool.address, fungiblePool);
  }
  return pools;
}

async function keepPool(
  poolConfig: PoolConfig,
  pool: FungiblePool,
  config: KeeperConfig,
  signer: Signer
) {
  let price: number;
  price = await getPrice(
    pool,
    poolConfig.price,
    config.pricing.coinGeckoApiKey
  );
  console.debug(poolConfig.name, `${poolConfig.price.source} price`, price);

  if (hasKickSettings(poolConfig)) {
    handleKicks({
      pool,
      poolConfig,
      price,
      signer,
      config,
    });
  }

  if (hasTakeSettings(poolConfig)) {
    handleArbTakes({
      pool,
      poolConfig,
      signer,
      config,
    });
  }

  if (hasCollectSettings(poolConfig)) {
    handleCollect({ pool, poolConfig, signer, config });
  }
}

function hasKickSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'kick'> {
  return !!config.kick;
}

function hasTakeSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'take'> {
  return !!config.take;
}

function hasCollectSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'collect'> {
  return !!config.collect;
}
