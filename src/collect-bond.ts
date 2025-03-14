import { FungiblePool, Signer } from '@ajna-finance/sdk';
import { constants } from 'ethers';
import { KeeperConfig } from './config-types';
import { logger } from './logging';
import { poolWithdrawBonds } from './transactions';
import { weiToDecimaled } from './utils';

interface CollectBondParams {
  pool: FungiblePool;
  signer: Signer;
  config: Pick<KeeperConfig, 'dryRun'>;
}

export async function collectBondFromPool({
  pool,
  signer,
  config,
}: CollectBondParams) {
  // Note: this does not settleAuctions.
  const signerAddress = await signer.getAddress();
  const { claimable, locked } = await pool.kickerInfo(signerAddress);
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
  }
}
