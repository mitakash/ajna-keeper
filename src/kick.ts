import { FungiblePool, Loan, Signer } from '@ajna-finance/sdk';
import subgraph from './subgraph';
import {
  delay,
  decimaledToWei,
  RequireFields,
  weiToDecimaled,
  tokenChangeDecimals,
} from './utils';
import { KeeperConfig, PoolConfig } from './config';
import {
  getAllowanceOfErc20,
  getBalanceOfErc20,
  getDecimalsErc20,
} from './erc20';
import { BigNumber } from 'ethers';
import { getPrice } from './price';

interface HandleKickParams {
  pool: FungiblePool;
  poolConfig: RequireFields<PoolConfig, 'kick'>;
  signer: Signer;
  config: Pick<
    KeeperConfig,
    'dryRun' | 'subgraphUrl' | 'delayBetweenActions' | 'pricing'
  >;
}

const LIQUIDATION_BOND_MARGIN: number = 0.01; // How much extra margin to allow for liquidationBond. Expressed as a factor.

export async function handleKicks({
  pool,
  poolConfig,
  signer,
  config,
}: HandleKickParams) {
  for await (const loanToKick of getLoansToKick({
    pool,
    poolConfig,
    config,
  })) {
    await kick({ signer, pool, loanToKick, config });
    await delay(config.delayBetweenActions);
  }
  await clearAllowances({ pool, signer });
}

interface LoanToKick {
  borrower: string;
  liquidationBond: BigNumber;
  estimatedRemainingBond: BigNumber;
  limitPrice: number;
}

interface GetLoansToKickParams
  extends Pick<HandleKickParams, 'pool' | 'poolConfig'> {
  config: Pick<KeeperConfig, 'subgraphUrl' | 'pricing'>;
}

export async function* getLoansToKick({
  pool,
  config,
  poolConfig,
}: GetLoansToKickParams): AsyncGenerator<LoanToKick> {
  const { subgraphUrl } = config;
  const { loans } = await subgraph.getLoans(subgraphUrl, pool.poolAddress);
  const loanMap = await pool.getLoans(loans.map(({ borrower }) => borrower));
  const borrowersSortedByBond = Array.from(loanMap.keys()).sort(
    (borrowerA, borrowerB) => {
      const bondA = weiToDecimaled(loanMap.get(borrowerA)!.liquidationBond);
      const bondB = weiToDecimaled(loanMap.get(borrowerB)!.liquidationBond);
      return bondB - bondA;
    }
  );
  const getSumEstimatedBond = (borrowers: string[]) =>
    borrowers.reduce<BigNumber>(
      (sum, borrower) => sum.add(loanMap.get(borrower)!.liquidationBond),
      BigNumber.from('0')
    );

  for (let i = 0; i < borrowersSortedByBond.length; i++) {
    // TODO: query price here.
    const borrower = borrowersSortedByBond[i];
    const poolPrices = await pool.getPrices();
    const { lup, hpb } = poolPrices;
    const { thresholdPrice, liquidationBond, debt, neutralPrice } =
      await pool.getLoan(borrower);
    const estimatedRemainingBond = liquidationBond.add(
      getSumEstimatedBond(borrowersSortedByBond.slice(i + 1))
    );

    // If TP is lower than lup, the bond can not be kicked.
    if (thresholdPrice.lt(lup)) {
      console.debug(
        `Not kicking loan since TP is lower LUP. borrower: ${borrower}, TP: ${weiToDecimaled(thresholdPrice)}, LUP: ${weiToDecimaled(lup)}`
      );
      continue;
    }

    // if loan debt is lower than configured fixed value (denominated in quote token), skip it
    if (weiToDecimaled(debt) < poolConfig.kick.minDebt) {
      console.debug(
        `Not kicking loan since debt is too low. borrower: ${borrower}, debt: ${debt}`
      );
      continue;
    }

    // Only kick loans with a neutralPrice above hpb to ensure they are profitalbe.
    if (neutralPrice.lt(hpb)) {
      console.debug(
        `Not kicking loan since (NP < HPB). pool: ${pool.name}, borrower: ${borrower}, NP: ${neutralPrice}, hpb: ${hpb}`
      );
      continue;
    }

    // Only kick loans with a neutralPrice above price (with some margin) to ensure they are profitable.
    const limitPrice = await getPrice(
      poolConfig.price,
      config.pricing.coinGeckoApiKey,
      poolPrices
    );
    if (
      weiToDecimaled(neutralPrice) * poolConfig.kick.priceFactor <
      limitPrice
    ) {
      console.debug(
        `Not kicking loan since (NP * Factor < Price). pool: ${pool.name}, borrower: ${borrower}, NP: ${neutralPrice}, Price: ${limitPrice}`
      );
      continue;
    }

    yield {
      borrower,
      liquidationBond,
      estimatedRemainingBond,
      limitPrice,
    };
  }
}

interface ApproveBalanceParams {
  pool: FungiblePool;
  signer: Signer;
  loanToKick: LoanToKick;
}

/**
 * Approves enough quoteToken to cover the bond of this kick and remaining kicks.
 * @returns True if there is enough balance to cover the next kick. False otherwise.
 */
async function approveBalanceForLoanToKick({
  pool,
  signer,
  loanToKick,
}: ApproveBalanceParams): Promise<boolean> {
  const { liquidationBond, estimatedRemainingBond } = loanToKick;
  const balanceNative = await getBalanceOfErc20(signer, pool.quoteAddress);
  const quoteDecimals = await getDecimalsErc20(signer, pool.quoteAddress);
  // TODO: Convert balance to wad.
  const balanceWad = tokenChangeDecimals(balanceNative, quoteDecimals);
  if (balanceWad < liquidationBond) {
    return false;
  }
  const allowance = await getAllowanceOfErc20(
    signer,
    pool.quoteAddress,
    pool.poolAddress
  );
  if (allowance < liquidationBond) {
    const amountToApprove =
      estimatedRemainingBond < balanceWad
        ? estimatedRemainingBond
        : liquidationBond;
    const margin = decimaledToWei(
      weiToDecimaled(amountToApprove) * LIQUIDATION_BOND_MARGIN
    );
    const tx = await pool.quoteApprove(signer, amountToApprove.add(margin));
    await tx.verifyAndSubmit();
  }
  return true;
}

interface KickParams extends Pick<HandleKickParams, 'pool' | 'signer'> {
  loanToKick: LoanToKick;
  config: Pick<KeeperConfig, 'dryRun'>;
}

export async function kick({ pool, signer, config, loanToKick }: KickParams) {
  const { dryRun } = config;
  const { borrower, liquidationBond, limitPrice } = loanToKick;

  if (dryRun) {
    console.debug(
      `DryRun - Would kick loan - pool: ${pool.name}, borrower: ${borrower}`
    );
    return;
  }

  try {
    const bondApproved = await approveBalanceForLoanToKick({
      signer,
      pool,
      loanToKick,
    });

    if (!bondApproved) {
      console.log(
        `Skipping kick of loan due to insufficient balance. pool: ${pool.name}, borrower: ${loanToKick.borrower}, bond: ${weiToDecimaled(liquidationBond)}`
      );
      return;
    }

    console.log(`Kicking loan - pool: ${pool.name}, borrower: ${borrower}`);
    const limitIndex =
      limitPrice > 0
        ? pool.getBucketByPrice(decimaledToWei(limitPrice)).index
        : undefined;
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
  }
}

/**
 * Sets allowances for this pool to zero if it's current allowance is greater than zero.
 */
async function clearAllowances({
  pool,
  signer,
}: Pick<HandleKickParams, 'pool' | 'signer'>) {
  const allowance = await getAllowanceOfErc20(
    signer,
    pool.quoteAddress,
    pool.poolAddress
  );
  if (allowance > BigNumber.from('0')) {
    const tx = await pool.quoteApprove(signer, BigNumber.from('0'));
    await tx.verifyAndSubmit();
  }
}
