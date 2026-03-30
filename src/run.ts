import { AjnaSDK, FungiblePool, Signer } from '@ajna-finance/sdk';
import { configureAjna, KeeperConfig, PoolConfig, validateTakeSettings } from './config-types';
import {
  delay,
  getProviderAndSigner,
  overrideMulticall,
  RequireFields,
} from './utils';
import { handleKicks } from './kick';
import { handleTakes } from './take';
import { collectBondFromPool } from './collect-bond';
import { LpCollector } from './collect-lp';
import { logger } from './logging';
import { RewardActionTracker } from './reward-action-tracker';
import { DexRouter } from './dex-router';
import { handleSettlements, tryReactiveSettlement } from './settlement';

type PoolMap = Map<string, FungiblePool>;

export async function startKeeperFromConfig(config: KeeperConfig) {
  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  const network = await provider.getNetwork();
  const chainId = network.chainId;

  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);
  logger.info('...and pools:');
  const poolMap = await getPoolsFromConfig(ajna, config);

  kickPoolsLoop({ poolMap, config, signer, chainId });
  takePoolsLoop({ poolMap, config, signer });
  settlementLoop({ poolMap, config, signer });
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
  chainId?: number;
}

async function kickPoolsLoop({ poolMap, config, signer, chainId }: KeepPoolParams) {
  const poolsWithKickSettings = config.pools.filter(hasKickSettings);
  while (true) {
    for (const poolConfig of poolsWithKickSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      try {
        await handleKicks({
          pool,
          poolConfig,
          signer,
          config,
          chainId,
        });
        await delay(config.delayBetweenActions);
      } catch (error) {
        logger.error(`Failed to handle kicks for pool: ${pool.name}.`, error);
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

async function takePoolsLoop({ poolMap, config, signer }: KeepPoolParams) {
  const poolsWithTakeSettings = config.pools.filter(hasTakeSettings);
  while (true) {
    for (const poolConfig of poolsWithTakeSettings) {
      const pool = poolMap.get(poolConfig.address)!;
      try {
        validateTakeSettings(poolConfig.take, config);
        await handleTakes({
          pool,
          poolConfig,
          signer,
          config,
        });
        await delay(config.delayBetweenActions);
      } catch (error) {
        logger.error(
          `Failed to handle take for pool: ${pool.name}.`,
          error
        );
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
        await collectBondFromPool({ 
          pool, 
          signer, 
          poolConfig,  // Pass full poolConfig instead of just config
          config: {
            dryRun: config.dryRun,
            subgraphUrl: config.subgraphUrl,
            delayBetweenActions: config.delayBetweenActions
          }
        });
        await delay(config.delayBetweenActions);
      } catch (error) {
        logger.error(`Failed to collect bond from pool: ${pool.name}.`, error);
      }
    }
    await delay(config.delayBetweenRuns);
  }
}

async function settlementLoop({ poolMap, config, signer }: KeepPoolParams) {
  const poolsWithSettlementSettings = config.pools.filter(hasSettlementSettings);
  
  logger.info(`Settlement loop started with ${poolsWithSettlementSettings.length} pools`);
  logger.info(`Settlement pools: ${poolsWithSettlementSettings.map(p => p.name).join(', ')}`);
  
  while (true) {
    try {
      const startTime = new Date().toISOString();
      logger.debug(`Settlement loop iteration starting at ${startTime}`);
      
      for (const poolConfig of poolsWithSettlementSettings) {
        const pool = poolMap.get(poolConfig.address)!;
        try {
          logger.debug(`Processing settlement check for pool: ${pool.name}`);
          
          await handleSettlements({
            pool,
            poolConfig: poolConfig as RequireFields<PoolConfig, 'settlement'>,
            signer,
            config: {
              dryRun: config.dryRun,
              subgraphUrl: config.subgraphUrl,
              delayBetweenActions: config.delayBetweenActions
            }
          });
          
          logger.debug(`Settlement check completed for pool: ${pool.name}`);
          await delay(config.delayBetweenActions);
          
        } catch (poolError) {
          logger.error(`Failed to handle settlements for pool: ${pool.name}`, poolError);
          // Continue with other pools instead of crashing the entire settlement loop
        }
      }
      
      // Calculate settlement check interval
      const settlementCheckInterval = Math.max(
        config.delayBetweenRuns * 5, // 5x normal delay 
        120000 // Minimum 120 seconds between settlement checks
      );
      
      const nextCheck = new Date(Date.now() + settlementCheckInterval).toISOString();
      logger.debug(`Settlement loop completed, sleeping for ${settlementCheckInterval/1000}s until ${nextCheck}`);
      await delay(settlementCheckInterval);
      
    } catch (outerError) {
      // Properly handle TypeScript 'unknown' error type
      const errorMessage = outerError instanceof Error ? outerError.message : String(outerError);
      const errorStack = outerError instanceof Error ? outerError.stack : undefined;
  
       logger.error(`Settlement loop crashed, restarting in 30 seconds: ${errorMessage}`);
       if (errorStack) {
         logger.error(`Stack trace:`, errorStack);
       }
  
       // Wait 30 seconds before restarting the loop to prevent rapid crash loops
       await delay(30000);
       logger.info(`Restarting settlement loop after crash recovery delay`);
        
    }
  }
} 


function hasSettlementSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'settlement'> {
  return !!config.settlement?.enabled;
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
    tokenAddresses: config.tokenAddresses
  });
  const exchangeTracker = new RewardActionTracker(
  signer,
  config,
  dexRouter,
);

  for (const poolConfig of poolsWithCollectLpSettings) {
    const pool = poolMap.get(poolConfig.address)!;
    const collector = new LpCollector(
      pool,
      signer,
      poolConfig,
      config,
      exchangeTracker
    );
    lpCollectors.set(poolConfig.address, collector);
    await collector.startSubscription();
  }

  while (true) {
    for (const poolConfig of poolsWithCollectLpSettings) {
      const collector = lpCollectors.get(poolConfig.address)!;
      try {
        await collector.collectLpRewards();
        await delay(config.delayBetweenActions);
      } catch (error) {
        const pool = poolMap.get(poolConfig.address)!;

	//Properly handle TypeScript 'unknown' error type
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if this is specifically an AuctionNotCleared error
        if (errorMessage.includes("AuctionNotCleared")) {
          logger.info(`AuctionNotCleared detected - attempting settlement for ${pool.name}`);
    
        try {
          const settled = await tryReactiveSettlement({
            pool,
            poolConfig,
            signer,
            config: {
              dryRun: config.dryRun,
              subgraphUrl: config.subgraphUrl,
              delayBetweenActions: config.delayBetweenActions
            }
          });
  
          if (settled) {
            logger.info(`Retrying LP collection after settlement in ${pool.name}`);
            await collector.collectLpRewards();
            await delay(config.delayBetweenActions);
          } else {
            logger.warn(`Settlement attempted but bonds still locked in ${pool.name}`);
          }
        } catch (settlementError) {
          logger.error(`Settlement failed for ${pool.name}:`, settlementError);
        }
       } else {
         // Handle all other errors normally
         logger.error(`Failed to collect LP reward from pool: ${pool.name}.`, error);
       }
       }  
    }
    await exchangeTracker.handleAllTokens();
    await delay(config.delayBetweenRuns);
  }
}

function hasCollectLpSettings(
  config: PoolConfig
): config is RequireFields<PoolConfig, 'collectLpReward'> {
  return !!config.collectLpReward;
}
