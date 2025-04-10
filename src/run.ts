import { AjnaSDK, FungiblePool, Signer } from '@ajna-finance/sdk';
import { configureAjna, KeeperConfig, PoolConfig } from './config-types';
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
import { logger, logAlert, logWarning, AlertSeverity, setLoggerConfig } from './logging';
import { RewardActionTracker } from './reward-action-tracker';
import { DexRouter } from './dex-router';
import { metricsService } from './metrics';

type PoolMap = Map<string, FungiblePool>;

// Extend KeeperConfig with optional metrics configuration
interface ExtendedKeeperConfig extends KeeperConfig {
  enableMetrics?: boolean;
  metricsPort?: number;
}

export async function startKeeperFromConfig(config: KeeperConfig) {
  // Cast to extended config to handle optional metrics properties
  const extendedConfig = config as ExtendedKeeperConfig;
  
  // Initialize logger and metrics
  setLoggerConfig({
    logLevel: extendedConfig.logLevel || 'debug',
    enableMetrics: extendedConfig.enableMetrics !== false
  });

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
    try {
      const endTimer = metricsService.startTimer('pool_loading', pool.address);
      const fungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
        pool.address
      );
      // TODO: Should this be a per-pool multicall?
      overrideMulticall(fungiblePool, config);
      pools.set(pool.address, fungiblePool);
      endTimer();
    } catch (error) {
      logAlert(`Failed to load pool ${name} at ${pool.address}`, AlertSeverity.HIGH, {
        poolAddress: pool.address,
        poolName: name,
        errorMessage: error instanceof Error ? error.message : String(error),
        component: 'pool-loading'
      });
    }
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
      try {
        const endTimer = metricsService.startTimer('kick_handling', poolConfig.address);
        await handleKicks({
          pool,
          poolConfig,
          signer,
          config,
        });
        endTimer();
        await delay(config.delayBetweenActions);
      } catch (error) {
        logAlert(`Failed to handle kicks for pool: ${pool.name}`, AlertSeverity.HIGH, {
          poolAddress: poolConfig.address,
          poolName: pool.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          component: 'kick-handler'
        });
      }
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
      try {
        const endTimer = metricsService.startTimer('arb_take_handling', poolConfig.address);
        await handleArbTakes({
          pool,
          poolConfig,
          signer,
          config,
        });
        endTimer();
        await delay(config.delayBetweenActions);
      } catch (error) {
        logAlert(`Failed to handle arb take for pool: ${pool.name}`, AlertSeverity.HIGH, {
          poolAddress: poolConfig.address,
          poolName: pool.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          component: 'arb-take-handler'
        });
      }
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
      try {
        const endTimer = metricsService.startTimer('bond_collection', poolConfig.address);
        await collectBondFromPool({ pool, signer, config });
        endTimer();
        await delay(config.delayBetweenActions);
      } catch (error) {
        logAlert(`Failed to collect bond from pool: ${pool.name}`, AlertSeverity.MEDIUM, {
          poolAddress: poolConfig.address,
          poolName: pool.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          component: 'bond-collector'
        });
      }
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
  const dexRouter = new DexRouter(signer, {
    oneInchRouters: config?.oneInchRouters ?? {},
    connectorTokens: config?.connectorTokens ?? [],
  });
  const exchangeTracker = new RewardActionTracker(signer, config, dexRouter);

  for (const poolConfig of poolsWithCollectLpSettings) {
    const pool = poolMap.get(poolConfig.address)!;
    try {
      const endTimer = metricsService.startTimer('lp_collector_init', poolConfig.address);
      const collector = new LpCollector(
        pool,
        signer,
        poolConfig,
        config,
        exchangeTracker
      );
      lpCollectors.set(poolConfig.address, collector);
      await collector.startSubscription();
      endTimer();
    } catch (error) {
      logAlert(`Failed to start LP collector for pool: ${pool.name}`, AlertSeverity.HIGH, {
        poolAddress: poolConfig.address,
        poolName: pool.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        component: 'lp-collector-init'
      });
    }
  }

  while (true) {
    for (const poolConfig of poolsWithCollectLpSettings) {
      const collector = lpCollectors.get(poolConfig.address)!;
      try {
        const endTimer = metricsService.startTimer('lp_reward_collection', poolConfig.address);
        await collector.collectLpRewards();
        endTimer();
        await delay(config.delayBetweenActions);
      } catch (error) {
        const pool = poolMap.get(poolConfig.address)!;
        logAlert(`Failed to collect LP reward from pool: ${pool.name}`, AlertSeverity.MEDIUM, {
          poolAddress: poolConfig.address,
          poolName: pool.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          component: 'lp-reward-collector'
        });
      }
    }
    try {
      const endTimer = metricsService.startTimer('token_exchange', 'all');
      await exchangeTracker.handleAllTokens();
      endTimer();
    } catch (error) {
      logAlert(`Failed to exchange tokens`, AlertSeverity.MEDIUM, {
        errorMessage: error instanceof Error ? error.message : String(error),
        component: 'token-exchange'
      });
    }
    await delay(config.delayBetweenRuns);
  }
}

function hasCollectLpSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'collectLpReward'> {
  return !!config.collectLpReward;
}
