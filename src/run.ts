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
import { collectBondFromPool } from './collect-bond';
import { LpCollector } from './collect-lp';
import { logger } from './logging';

type PoolMap = Map<string, FungiblePool>;

export async function startKeeperFromConfig(config: KeeperConfig) {
  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);
  logger.info('...and pools:');
  const poolMap = await getPoolsFromConfig(ajna, config);

  kickPoolsLoop({ poolMap, config, signer });
  arbTakePoolsLoop({ poolMap, config, signer });
  collectBondLoop({ poolMap, config, signer });
  collectLpRewardsLoop({ poolMap, config, signer });
}

async function getPoolsFromConfig(
  ajna: AjnaSDK,
  config: KeeperConfig
): Promise<PoolMap> {
  const pools: PoolMap = new Map();
  for (const pool of config.pools) {
    const name: string = pool.name ?? '(unnamed)';
    logger.info(`loading pool ${name.padStart(18)} at ${pool.address}`);
    const fungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      pool.address
    );
    // TODO: Should this be a per-pool multicall?
    overrideMulticall(fungiblePool, config);
    pools.set(pool.address, fungiblePool);
  }
  return pools;
}

interface KeepPoolParams {
  poolMap: PoolMap;
  config: KeeperConfig;
  signer: Signer;
}

async function kickPoolsLoop({ poolMap, config, signer }: KeepPoolParams) {
  const poolsWithKickSettings = config.pools.filter(hasKickSettings);
  while (true) {
    for (const poolConfig of poolsWithKickSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      await handleKicks({
        pool,
        poolConfig,
        signer,
        config,
      });
    }
    await delay(config.delayBetweenRuns);
  }
}

function hasKickSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'kick'> {
  return !!config.kick;
}

async function arbTakePoolsLoop({ poolMap, config, signer }: KeepPoolParams) {
  const poolsWithTakeSettings = config.pools.filter(hasTakeSettings);
  while (true) {
    for (const poolConfig of poolsWithTakeSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      await handleArbTakes({
        pool,
        poolConfig,
        signer,
        config,
      });
    }
    await delay(config.delayBetweenRuns);
  }
}

function hasTakeSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'take'> {
  return !!config.take;
}

async function collectBondLoop({ poolMap, config, signer }: KeepPoolParams) {
  const poolsWithCollectBondSettings = config.pools.filter(
    ({ collectBond }) => !!collectBond
  );
  while (true) {
    for (const poolConfig of poolsWithCollectBondSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      await collectBondFromPool({ pool, signer, config });
    }
    await delay(config.delayBetweenRuns);
  }
}

async function collectLpRewardsLoop({
  poolMap,
  config,
  signer,
}: KeepPoolParams) {
  const poolsWithCollectLpSettings = config.pools.filter(hasCollectLpSettings);
  const lpCollectors: Map<string, LpCollector> = new Map();

  for (const poolConfig of poolsWithCollectLpSettings) {
    const pool = poolMap.get(poolConfig.address)!;
    const collector = new LpCollector(pool, signer, poolConfig, config);
    collector.startSubscription();
  }

  while (true) {
    for (const poolConfig of poolsWithCollectLpSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      const collector = lpCollectors.get(poolConfig.address)!;
      await collector.collectLpRewards();
    }
    await delay(config.delayBetweenRuns);
  }
}

function hasCollectLpSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'collectLpReward'> {
  return !!config.collectLpReward;
}
