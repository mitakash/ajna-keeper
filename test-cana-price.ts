import 'dotenv/config';
import { getPriceCoinGecko } from './src/coingecko';
import { PriceOriginSource } from './src/config-types';

async function testCanaPrice() {
  const chainId = 8453; // Base
  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const coinGeckoApiKey = process.env.COINGECKO_API_KEY;

  console.log('Fetching CANA price from CoinGecko...\n');

  try {
    const canaPrice = await getPriceCoinGecko(
      {
        source: PriceOriginSource.COINGECKO,
        query: 'price?ids=cana-holdings-california-carbon-credits&vs_currencies=usd',
      },
      coinGeckoApiKey,
      chainId,
      rpcUrl,
      {
        'cana-holdings-california-carbon-credits': '0x88a3548e2a662936268bFD4366e48D38183E3958',
        'cana': '0x88a3548e2a662936268bFD4366e48D38183E3958'
      }
    );

    console.log(`✅ CANA Price: $${canaPrice.toFixed(6)}`);
    console.log(`   Source: CoinGecko API`);
    console.log(`   Token: CANA (Base: 0x88a3548e2a662936268bFD4366e48D38183E3958)`);
    console.log(`   CoinGecko ID: cana-holdings-california-carbon-credits\n`);

    console.log('✅ CoinGecko integration is working correctly!');

  } catch (error) {
    console.error('❌ Failed to fetch CANA price:', error);
    process.exit(1);
  }
}

testCanaPrice();
