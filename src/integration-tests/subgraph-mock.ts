import { ERC20Pool__factory, FungiblePool, Loan } from '@ajna-finance/sdk';
import subgraphModule, {
  GetLiquidationResponse,
  GetLoanResponse,
} from '../subgraph';
import { getProvider } from './test-utils';
import { weiToDecimaled } from '../utils';
import { MAINNET_CONFIG } from './test-config';
import { logger } from '../logging';

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
    const loansMap = await getLoansMap(pool);
    const borrowerLoanTuple = Array.from(loansMap.entries());
    const loans = borrowerLoanTuple
      .filter(([_, { isKicked, thresholdPrice }]) => !isKicked)
      .map(([borrower, { thresholdPrice }]) => ({
        borrower,
        thresholdPrice: weiToDecimaled(thresholdPrice),
      }));
    return {
      loans,
    };
  };
};

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
    const poolContract = ERC20Pool__factory.connect(
      pool.poolAddress,
      getProvider()
    );
    const events = await poolContract.queryFilter(
      poolContract.filters.Kick(),
      MAINNET_CONFIG.BLOCK_NUMBER
    );
    const borrowers: string[] = [];
    for (const evt of events) {
      const { borrower } = evt.args;
      borrowers.push(borrower);
    }
    const liquidationAuctions: GetLiquidationResponse['pool']['liquidationAuctions'] =
      [];
    for (const borrower of borrowers) {
      try {
        const liquidation = await pool.getLiquidation(borrower);
        const liquidationStatus = await liquidation.getStatus();
        if (weiToDecimaled(liquidationStatus.collateral) > minCollateral) {
          liquidationAuctions.push({
            borrower,
          });
        }
      } catch (e) {
        logger.debug(
          `Failed to find auction for borrower: ${borrower}, pool: ${pool.name}`
        );
      }
    }

    return {
      pool: {
        hpb: weiToDecimaled(hpb),
        hpbIndex,
        liquidationAuctions,
      },
    };
  };
}
