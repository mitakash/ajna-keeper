import {
  ERC20Pool__factory,
  FungiblePool,
  Loan,
  PoolInfoUtils__factory,
} from '@ajna-finance/sdk';
import subgraphModule, {
  GetLiquidationResponse,
  GetLoanResponse,
} from '../subgraph';
import { getProvider } from './test-utils';
import { weiToEth } from '../utils';

export function overrideGetLoans(
  fn: typeof subgraphModule.getLoans
): () => void {
  const originalGetLoans = subgraphModule.getLoans;
  const undoFn = () => {
    subgraphModule.getLoans = originalGetLoans;
  };
  subgraphModule.getLoans = fn;
  return undoFn;
}

export const makeGetLoansFromSdk = (pool: FungiblePool) => {
  return async (
    subgraphUrl: string,
    poolAddress: string
  ): Promise<GetLoanResponse> => {
    const { lup, hpb } = await pool.getPrices();
    const loansMap = await getLoansMap(pool);
    const borrowerLoanTuple = Array.from(loansMap.entries());
    const loans = borrowerLoanTuple
      .filter(([_, { isKicked }]) => !isKicked)
      .map(([borrower, { thresholdPrice }]) => ({
        borrower,
        thresholdPrice: weiToEth(thresholdPrice),
      }));
    return {
      pool: {
        lup: weiToEth(lup),
        hpb: weiToEth(hpb),
      },
      loans,
    };
  };
};

export function overrideGetLiquidations(
  fn: typeof subgraphModule.getLiquidations
): () => void {
  const originalGetLiquidations = subgraphModule.getLiquidations;
  const undoFn = () => {
    subgraphModule.getLiquidations = originalGetLiquidations;
  };
  subgraphModule.getLiquidations = fn;
  return undoFn;
}

export function makeGetLiquidationsFromSdk(pool: FungiblePool) {
  return async (
    subgraphUrl: string,
    poolAddress: string,
    minCollateral: number
  ): Promise<GetLiquidationResponse> => {
    const { hpb, hpbIndex } = await pool.getPrices();
    console.log('getting borrowers');
    const loansMap = await getLoansMap(pool);
    console.log('getting pool info utils');
    const poolInfoUtils = PoolInfoUtils__factory.connect(
      pool.poolAddress,
      getProvider()
    );
    const liquidationAuctions: GetLiquidationResponse['pool']['liquidationAuctions'] =
      [];
    console.log('getting auctionStatuses');
    for (const borrower of Object.keys(loansMap)) {
      const loan = loansMap.get(borrower);
      if (loan?.isKicked) {
        console.log(
          `getting auction status for borrower: ${borrower}, poolAddress: ${pool.poolAddress}`
        );
        const [
          kickTime,
          collateral,
          debtToCover,
          isCollateralized,
          price,
          neutralPrice,
          referencePrice,
          debtToCollateral,
          bondFactor,
        ] = await poolInfoUtils.auctionStatus(pool.poolAddress, borrower);
        if (weiToEth(collateral) >= minCollateral) {
          liquidationAuctions.push({
            borrower,
            collateralRemaining: weiToEth(collateral),
            kickTime: parseInt(kickTime.toString()),
            referencePrice: weiToEth(referencePrice),
          });
        }
      }
    }
    return {
      pool: {
        hpb: weiToEth(hpb),
        hpbIndex,
        liquidationAuctions,
      },
    };
  };
}

async function getLoansMap(pool: FungiblePool): Promise<Map<string, Loan>> {
  const { loansCount } = await pool.getStats();
  const poolContract = ERC20Pool__factory.connect(
    pool.poolAddress,
    getProvider()
  );
  const borrowers: string[] = [];
  for (let i = 1; i < loansCount + 1; i++) {
    const [borrower] = await poolContract.loanInfo(i);
    borrowers.push(borrower);
  }
  return await pool.getLoans(borrowers);
}
