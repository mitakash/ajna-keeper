import { FungiblePool, Signer } from '@ajna-finance/sdk';
import { BigNumber } from 'ethers';
import { KeeperConfig, PoolConfig } from './config-types';
import { logger } from './logging';
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
  if (locked.eq(BigNumber.from('0')) && claimable.gt(BigNumber.from('0'))) {
    if (!!config.dryRun) {
      logger.info(
        `DryRun - Would withdraw bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
      );
    } else {
      logger.debug(
        `Withdrawing bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
      );
      try {
        const withdrawTx = await pool.withdrawBonds(signer);
        await withdrawTx.verifyAndSubmit();
        logger.info(
          `Withdrew bond. pool: ${pool.name}. bondSize: ${weiToDecimaled(claimable)}`
        );
      } catch (error) {
        logger.error(`Failed to withdraw bond. pool: ${pool.name}.`, error);
      }
    }
  }
}
