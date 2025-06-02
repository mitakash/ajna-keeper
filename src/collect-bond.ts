import { FungiblePool, Signer } from '@ajna-finance/sdk';
import { constants } from 'ethers';
import { KeeperConfig, PoolConfig } from './config-types';
import { logger } from './logging';
import { poolWithdrawBonds } from './transactions';
import { weiToDecimaled } from './utils';
import { tryReactiveSettlement } from './settlement';

interface CollectBondParams {
  pool: FungiblePool;
  signer: Signer;
  poolConfig: PoolConfig; // Changed to include full poolConfig for settlement access
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}

export async function collectBondFromPool({
  pool,
  signer,
  poolConfig,
  config,
}: CollectBondParams) {
  // Note: this may now trigger settlement if bonds are locked
  const signerAddress = await signer.getAddress();
  const { claimable, locked } = await pool.kickerInfo(signerAddress);

    // Case 1: Bonds ready to withdraw (optimal case)
  if (locked.eq(constants.Zero) && claimable.gt(constants.Zero)) {
    if (!!config.dryRun) {
      logger.info(
        `DryRun - Would withdraw bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
      );
    } else {
      logger.debug(
        `Withdrawing bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
      );
      try {
        await poolWithdrawBonds(pool, signer);
        logger.info(
          `Withdrew bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
        );
      } catch (error) {
        logger.error(`Failed to withdraw bond. pool: ${pool.name}.`, error);
      }
    }
    return;
  }
  
  // Case 2: Bonds are locked - try reactive settlement if enabled
  if (locked.gt(constants.Zero)) {
    logger.debug(
      `Bonds locked in pool ${pool.name}: locked=${weiToDecimaled(locked)}, claimable=${weiToDecimaled(claimable)}`
    );
    
    if (poolConfig.settlement?.enabled) {
  
      const settlementSuccessful = await tryReactiveSettlement({
         pool,
         poolConfig,
         signer,
         config
      });
  
      
      if (settlementSuccessful) {
        // Try withdrawing bonds again after settlement
        const { claimable: newClaimable, locked: newLocked } = await pool.kickerInfo(signerAddress);
        
        if (newLocked.eq(constants.Zero) && newClaimable.gt(constants.Zero)) {
          if (!!config.dryRun) {
            logger.info(
              `DryRun - Would withdraw bond after settlement. pool: ${pool.name}. bondSize: ${weiToDecimaled(newClaimable)}`
            );
          } else {
            try {
              await poolWithdrawBonds(pool, signer);
              logger.info(
                `Withdrew bond after settlement. pool: ${pool.name}. bondSize: ${weiToDecimaled(newClaimable)}`
              );
            } catch (error) {
              logger.error(`Failed to withdraw bond after settlement. pool: ${pool.name}.`, error);
            }
          }
        } else {
          logger.warn(`Settlement completed but bonds still not withdrawable in pool: ${pool.name}`);
        }
      } else {
        logger.warn(`Bonds remain locked in pool: ${pool.name} - no settlements needed`);
      }
    } else {
      logger.debug(`Settlement not enabled for pool ${pool.name}, bonds remain locked`);
    }
    return;
  }
  
  // Case 3: No bonds to withdraw
  logger.debug(`No bonds to withdraw in pool ${pool.name}: locked=${weiToDecimaled(locked)}, claimable=${weiToDecimaled(claimable)}`);
}
