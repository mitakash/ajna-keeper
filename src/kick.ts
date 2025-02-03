import { FungiblePool, Signer } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, ethToWei, RequireFields, weiToEth } from './utils';
import { KeeperConfig, PoolConfig } from './config';
import { getBalanceOfErc20 } from './erc20';
import { BigNumber } from 'ethers';
import { priceToBucket } from './price';

interface HandleKickParams {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'kick'>;
  price: number;
  signer: Signer;
  config: Pick<KeeperConfig, 'dryRun' | 'subgraphUrl' | 'delayBetweenActions'>;
}

export async function handleKicks({
  pool,
  poolConfig,
  price,
  signer,
  config,
}: HandleKickParams) {
  const loansToKick = await getLoansToKick({ pool, poolConfig, price, config });

  for (const loanToKick of loansToKick) {
    await kick({ signer, pool, loanToKick, config, price });
    await delay(config.delayBetweenActions);
  }
}

interface LoanToKick {
  borrower: string;
  liquidationBond: BigNumber;
}

interface GetLoansToKickParams
  extends Pick<HandleKickParams, 'pool' | 'poolConfig' | 'price'> {
  config: Pick<KeeperConfig, 'subgraphUrl'>;
}

export async function getLoansToKick({
  pool,
  config,
  poolConfig,
  price,
}: GetLoansToKickParams): Promise<Array<LoanToKick>> {
  const { subgraphUrl } = config;
  const result: LoanToKick[] = [];

  const {
    pool: { lup, hpb },
    loans,
  } = await subgraph.getLoans(subgraphUrl, pool.poolAddress);
  for (const loanFromSubgraph of loans) {
    const { borrower, thresholdPrice } = loanFromSubgraph;

    // If TP is lower than lup, the bond can not be kicked.
    if (thresholdPrice < lup) continue;

    const { neutralPrice, liquidationBond, debt } =
      await pool.getLoan(borrower);

    // if loan debt is lower than configured fixed value (denominated in quote token), skip it
    if (weiToEth(debt) < poolConfig.kick.minDebt) continue;

    // Only kick loans with a neutralPrice above price (with some margin) to ensure they are profitable.
    const isNpAbovePrice =
      weiToEth(neutralPrice) * poolConfig.kick.priceFactor > price;

    // Only kick loans with a neutralPrice above hpb to ensure they are profitalbe.
    const isNpAboveHpb = weiToEth(neutralPrice) > hpb;
    const shouldBeProfitable = isNpAbovePrice && isNpAboveHpb;

    if (shouldBeProfitable) {
      result.push({ borrower, liquidationBond });
    }
  }
  return result;
}

interface KickParams
  extends Pick<HandleKickParams, 'pool' | 'signer' | 'price'> {
  loanToKick: LoanToKick;
  config: Pick<KeeperConfig, 'dryRun'>;
}

const LIQUIDATION_BOND_MARGIN: number = 0.01; // How much extra margin to allow for liquidationBond. Expressed as a factor.

export async function kick({
  pool,
  signer,
  config,
  loanToKick,
  price,
}: KickParams) {
  const { dryRun } = config;
  const { borrower, liquidationBond } = loanToKick;

  if (dryRun) {
    console.debug(
      `DryRun - Would kick loan - pool: ${pool.name}, borrower: ${borrower}`
    );
    return;
  }
  try {
    console.log(`Kicking loan - pool: ${pool.name}, borrower: ${borrower}`);
    const quoteBalance = await getBalanceOfErc20(signer, pool.quoteAddress);
    if (quoteBalance < liquidationBond) {
      console.log(
        `Balance of token: ${pool.quoteSymbol} too low to kick loan. pool: ${pool.name}, borrower: ${borrower}, bond: ${liquidationBond}`
      );
      return;
    }
    console.log(
      `Approving liquidationBond for kick. pool: ${pool.name}, liquidationBond: ${liquidationBond}, quoteBalance: ${quoteBalance}`
    );
    const bondWithMargin = ethToWei(
      weiToEth(liquidationBond) * (1 + LIQUIDATION_BOND_MARGIN)
    );
    const approveTx = await pool.quoteApprove(signer, bondWithMargin);
    await approveTx.verifyAndSubmit();

    const limitIndex = priceToBucket(price, pool);
    console.log(
      `Sending kick transaction. pool: ${pool.name}, borrower: ${borrower}`
    );
    // const wrappedTransaction = await pool.kick(signer, borrower, limitIndex);
    const kickTx = await pool.kick(signer, borrower, limitIndex);
    await kickTx.verifyAndSubmit();
    console.log(
      `Kick transaction confirmed. pool: ${pool.name}, borrower: ${borrower}`
    );
  } catch (error) {
    console.error(
      `Failed to kick loan. pool: ${pool.name}, borrower: ${borrower}. Error: `,
      error
    );
  } finally {
    await pool.quoteApprove(signer, BigNumber.from(0));
  }
}
