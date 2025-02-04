import { Signer, FungiblePool } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, PoolConfig } from './config';

interface HandleArbParams {
  signer: Signer;
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'take'>;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}

export async function handleArbTakes({
  signer,
  pool,
  poolConfig,
  config,
}: HandleArbParams) {
  const liquidationsToArbTake = await getLiquidationsToArbTake({
    pool,
    poolConfig,
    config,
  });

  for (const liquidation of liquidationsToArbTake) {
    await arbTakeLiquidation({ pool, poolConfig, signer, liquidation, config });
    await delay(config.delayBetweenActions);
  }
}

interface LiquidationToArbTake {
  borrower: string;
  hpbIndex: number;
}

interface GetLiquidationsToArbTakeParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig'> {
  config: Pick<KeeperConfig, 'subgraphUrl'>;
}

export async function getLiquidationsToArbTake({
  pool,
  poolConfig,
  config,
}: GetLiquidationsToArbTakeParams): Promise<Array<LiquidationToArbTake>> {
  const { subgraphUrl } = config;
  const result: LiquidationToArbTake[] = [];
  const {
    pool: { hpb, hpbIndex, liquidationAuctions },
  } = await subgraph.getLiquidations(
    subgraphUrl,
    pool.poolAddress,
    poolConfig.take.minCollateral
  );
  for (const auction of liquidationAuctions) {
    const { borrower } = auction;
    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    const price = weiToDecimaled(liquidationStatus.price);
    // TODO: Add price factor.
    if (price < hpb * poolConfig.take.priceFactor) {
      console.debug(
        `Found liquidation to arbTake - pool: ${pool.name}, borrower: ${borrower}, price: ${price}, hpb: ${hpb}.`
      );
      result.push({ borrower, hpbIndex });
    } else {
      console.debug(
        `Not taking liquidation since price is too high. price: ${price} hpb: ${hpb}`
      );
    }
  }
  return result;
}

interface ArbTakeLiquidationParams
  extends Pick<HandleArbParams, 'pool' | 'poolConfig' | 'signer'> {
  liquidation: LiquidationToArbTake;
  config: Pick<KeeperConfig, 'dryRun'>;
}

export async function arbTakeLiquidation({
  pool,
  poolConfig,
  signer,
  liquidation,
  config,
}: ArbTakeLiquidationParams) {
  const { borrower, hpbIndex } = liquidation;
  const { dryRun } = config;

  if (dryRun) {
    console.log(
      `DryRun - would ArbTake - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );
  } else {
    // TODO: should we loop through this step until collateral remaining is zero?
    console.log(
      `Sending ArbTake Tx - poolAddress: ${pool.poolAddress}, borrower: ${borrower}, hpbIndex: ${hpbIndex}`
    );
    const liquidationSdk = pool.getLiquidation(borrower);
    const arbTakeTx = await liquidationSdk.arbTake(signer, hpbIndex);
    await arbTakeTx.verifyAndSubmit();
    console.log(
      `ArbTake successful - poolAddress: ${pool.poolAddress}, borrower: ${borrower}`
    );

    // withdraw liquidity.
    // if (poolConfig.take.withdrawRewardLiquidity) {
    //   const signerAddress = await signer.getAddress();
    //   const bucket = pool.getBucketByIndex(hpbIndex);
    //   const lpBalance = await bucket.lpBalance(signerAddress);
    //   // console.log('approving transferor');
    //   // const approveTx = await pool.approveLenderHelperLPTransferor(signer);
    //   // await approveTx.verifyAndSubmit();
    //   // console.log('transferor approved');
    //   console.log(
    //     `Withdrawing lidquidity after arbTake. pool: ${pool.name}, lpBalance: ${weiToDecimaled(lpBalance)}`
    //   );
    //   const withdrawTx = await pool.withdrawLiquidity(signer, [hpbIndex]);
    //   await withdrawTx.verifyAndSubmit();
    //   console.log(`Withdrawing lidquidity successful. pool: ${pool.name}`);
    // }
  }
}
