import { expect } from 'chai';
import 'dotenv';
import { PriceOriginSource } from '../config';
import { getPriceCoinGecko } from '../coingecko';

describe('Coingecko API', () => {
  before(() => {
    expect(
      !!process.env.COINGECKO_API_KEY,
      'Make sure you add COINGECKO_API_KEY to your .env file'
    ).to.be.true;
  });

  it('Gets pool price for token pair', async () => {
    const poolPrice = await getPriceCoinGecko(
      {
        source: PriceOriginSource.COINGECKO,
        quoteId: 'ethereum',
        collateralId: 'wrapped-steth',
      },
      process.env.COINGECKO_API_KEY!
    );

    expect(poolPrice).greaterThan(0);
  });

  it('Gets pool price for query (fiat)', async () => {
    const poolPrice = await getPriceCoinGecko(
      {
        source: PriceOriginSource.COINGECKO,
        query: 'price?ids=ethereum&vs_currencies=usd',
      },
      process.env.COINGECKO_API_KEY!
    );

    expect(poolPrice).greaterThan(0);
  });
});
