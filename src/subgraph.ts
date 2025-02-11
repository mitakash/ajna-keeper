import { gql, request } from 'graphql-request';

export interface GetLoanResponse {
  loans: {
    borrower: string;
    thresholdPrice: number;
  }[];
}

async function getLoans(
  subgraphUrl: string,
  poolAddress: string,
  poolLup: number
) {
  const query = gql`
    query {
      loans (where: {inLiquidation: false, poolAddress: "${poolAddress}", thresholdPrice_gt: "${poolLup.toString()}"}){
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
  minCollateral: number
) {
  // TODO: Should probably sort auctions by kickTime so that we kick the most profitable auctions first.
  const query = gql`
    query {
      pool (id: "${poolAddress}") {
        hpb
        hpbIndex
        liquidationAuctions (where: {collateralRemaining_gt: "${minCollateral}"}) {
          borrower
        }
      }
    }
  `;

  const result: GetLiquidationResponse = await request(subgraphUrl, query);
  return result;
}

export interface GetRewardsResponse {
  account: {
    lends: {
      bucketIndex: number;
      lpb: number;
    }[];
    kicks: {
      locked: string;
      pool: {
        id: string;
      };
    }[];
  };
}

async function getRewards(
  subgraphUrl: string,
  poolAddress: string,
  borrower: string
) {
  const query = gql`
  query {
    account (id: "${borrower}) {
      lends(where: {lpb_gt: "0", poolAddress: "${poolAddress}}) {
        bucketIndex
        lpb
      }
      kicks(where: {pool_: {id: "${poolAddress}"}, claimable: "1"}) {
        locked
      }
    }
  }`;
  const result: GetRewardsResponse = await request(subgraphUrl, query);
  return result;
}

// Exported as default module to enable mocking in tests.
export default { getLoans, getLiquidations, getRewards };
