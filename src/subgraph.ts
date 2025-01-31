import { gql, request } from "graphql-request";

export async function getLoans(subgraphUrl: string, poolAddress: string) {
  const query = gql`
    query {
      pool (id: "${poolAddress}") {
        lup
      }
      loans (where: {poolAddress: "${poolAddress}"}){
        borrower
        inLiquidation
        thresholdPrice
      }
    }
  `

  const result: {
    pool: {
      lup: number;  // TODO: use big number
    },
    loans: {
      borrower: string;
      inLiquidation: boolean;
      thresholdPrice: number; // TODO: use bigNumber
    }[] 
    }
    = await request(subgraphUrl, query)
  return result
}


export async function getLiquidations(subgraphUrl: string, poolAddress: string, minCollateral: number) {
  const query = gql`
    query {
      pool (id: "${poolAddress}") {
        hpb
        hpbIndex
        liquidationAuctions (where: {collateralRemaining_gt: "${minCollateral}"}) {
          borrower
          collateralRemaining
          kickTime
          referencePrice
        }
      }
    }
  `

  const result: {
    pool: {
      hpb: number;
      hpbIndex: number;
      liquidationAuctions: {
        borrower: string;
        collateralRemaining: number;
        kickTime: number;
        referencePrice: number;
      }[]
    }
  } = await request(subgraphUrl, query);
  return result;
}