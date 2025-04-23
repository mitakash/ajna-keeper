import { gql, request } from 'graphql-request';

export interface GetLoanResponse {
  loans: {
    borrower: string;
    thresholdPrice: number;
  }[];
}

async function getLoans(subgraphUrl: string, poolAddress: string) {
  const query = gql`
    query {
      loans (where: {inLiquidation: false, poolAddress: "${poolAddress}"}){
        borrower
        thresholdPrice
      }
    }
  `;

  const result: GetLoanResponse = await request(subgraphUrl, query);
  return result;
}

export interface GetLiquidationResponse {
  pool: {
    hpb: number;
    hpbIndex: number;
    liquidationAuctions: {
      borrower: string;
    }[];
  };
}

async function getLiquidations(
  subgraphUrl: string,
  poolAddress: string,
  minCollateral: string
) {
  // TODO: Should probably sort auctions by kickTime so that we kick the most profitable auctions first.
  const query = gql`
    query {
      pool (id: "${poolAddress}") {
        hpb
        hpbIndex
        liquidationAuctions (where: {collateralRemaining_gt: ${minCollateral}}) {
          borrower
        }
      }
    }
  `;

  const result: GetLiquidationResponse = await request(subgraphUrl, query);
  return result;
}

export interface GetMeaningfulBucketResponse {
  buckets: {
    bucketIndex: number;
  }[];
}

async function getHighestMeaningfulBucket(
  subgraphUrl: string,
  poolAddress: string,
  minDeposit: string
) {
  const query = gql`
    query {
      buckets(
        where: {
          deposit_gt: "${minDeposit}"
          poolAddress: "${poolAddress}"
        }
        first: 1
        orderBy: bucketPrice
        orderDirection: desc
      ) {
        bucketIndex
      }
    }
  `;

  const result: GetMeaningfulBucketResponse = await request(subgraphUrl, query);
  return result;
}

// Exported as default module to enable mocking in tests.
export default { getLoans, getLiquidations, getHighestMeaningfulBucket };
