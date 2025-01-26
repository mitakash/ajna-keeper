import { gql, request } from "graphql-request";

export async function getLoans(subgraphUrl: string, poolAddress: string) {
  const query = gql`
    query {
      loans(where:{poolAddress:"${poolAddress}"}) {
        borrower
        inLiquidation
        thresholdPrice
        t0debt
      }
    }
  `

  const result: {
    loans: {
      borrower: string;
      inLiquidation: boolean;
      thresholdPrice: string;
      t0debt: string;
    }[] }
    = await request(subgraphUrl, query)
  return result.loans
}
