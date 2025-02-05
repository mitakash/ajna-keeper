import { FungiblePool, Signer } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import { delay, ethToWei, RequireFields, weiToDecimaled } from './utils';
import { KeeperConfig, PoolConfig } from './config';
import { getBalanceOfErc20, getDecimalsErc20 } from './erc20';
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
  liquidationBond: number;
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
    if (thresholdPrice < lup) {
      console.debug(
        `Not kicking loan since TP is lower LUP. borrower: ${borrower}, TP: ${thresholdPrice}, LUP: ${lup}`
      );
      continue;
    }

    const { neutralPrice, liquidationBond, debt } = await getLoanFromSdk(
      pool,
      borrower
    );

    // if loan debt is lower than configured fixed value (denominated in quote token), skip it
    if (debt < poolConfig.kick.minDebt) {
      console.debug(
        `Not kicking loan since debt is too low. borrower: ${borrower}, debt: ${debt}`
      );
      continue;
    }

    // Only kick loans with a neutralPrice above price (with some margin) to ensure they are profitable.
    if (neutralPrice * poolConfig.kick.priceFactor < price) {
      console.debug(
        `Not kicking loan since (NP * Factor < Price). pool: ${pool.name}, borrower: ${borrower}, NP: ${neutralPrice}, Price: ${price}`
      );
      continue;
    }

    // Only kick loans with a neutralPrice above hpb to ensure they are profitalbe.
    if (neutralPrice < hpb) {
      console.debug(
        `Not kicking loan since (NP < HPB). pool: ${pool.name}, borrower: ${borrower}, NP: ${neutralPrice}, hpb: ${hpb}`
      );
      continue;
    }

    result.push({ borrower, liquidationBond });
  }
  return result;
}

async function getLoanFromSdk(pool: FungiblePool, borrower: string) {
  const loan = await pool.getLoan(borrower);
  return {
    neutralPrice: weiToDecimaled(loan.neutralPrice),
    liquidationBond: weiToDecimaled(loan.liquidationBond),
    debt: weiToDecimaled(loan.debt),
  };
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

    const decimals = await getDecimalsErc20(signer, pool.quoteAddress);
    const quoteBalanceBn = await getBalanceOfErc20(signer, pool.quoteAddress);
    const quoteBalance = weiToDecimaled(quoteBalanceBn, decimals);
    if (quoteBalance < liquidationBond) {
      // TODO: Remove kicker section.
      console.log('loanToKick:', loanToKick);
      console.error(
        `Balance of token: ${pool.quoteSymbol} too low to kick loan. pool: ${pool.name}, borrower: ${borrower}, bond: ${liquidationBond}, balance: ${quoteBalance}, kicker: ${await signer.getAddress()}`
      );
      return;
    }
    console.log(
      `Approving liquidationBond for kick. pool: ${pool.name}, borrower: ${borrower}, bond: ${liquidationBond}, balance: ${quoteBalance}`
    );
    const bondWithMargin = ethToWei(
      liquidationBond * (1 + LIQUIDATION_BOND_MARGIN)
    );
    const approveTx = await pool.quoteApprove(signer, bondWithMargin);
    await approveTx.verifyAndSubmit();

    const limitIndex = !!price ? priceToBucket(price, pool) : undefined;
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
