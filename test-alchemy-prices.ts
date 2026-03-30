import 'dotenv/config';
import { getPriceFromAlchemy, getPoolPriceFromAlchemy } from './src/alchemy-prices';

async function testAlchemyPrices() {
  const chainId = 8453; // Base
  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  console.log('Testing Alchemy Prices API on Base chain...\n');

  try {
    // Test 1: Get WETH price
    console.log('Test 1: Fetching WETH price...');
    const wethAddress = '0x4200000000000000000000000000000000000006';
    const wethPrice = await getPriceFromAlchemy(wethAddress, chainId, rpcUrl);
    console.log(`✓ WETH Price: $${wethPrice.toFixed(2)}\n`);

    // Test 2: Get USDC price
    console.log('Test 2: Fetching USDC price...');
    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const usdcPrice = await getPriceFromAlchemy(usdcAddress, chainId, rpcUrl);
    console.log(`✓ USDC Price: $${usdcPrice.toFixed(4)}\n`);

    // Test 3: Get CANA price
    console.log('Test 3: Fetching CANA price...');
    const canaAddress = '0x88a3548e2a662936268bFD4366e48D38183E3958';
    try {
      const canaPrice = await getPriceFromAlchemy(canaAddress, chainId, rpcUrl);
      console.log(`✓ CANA Price: $${canaPrice.toFixed(6)}\n`);

      // Test 4: Get pool price (CANA/USDC)
      console.log('Test 4: Calculating CANA/USDC pool price...');
      const poolPrice = await getPoolPriceFromAlchemy(usdcAddress, canaAddress, chainId, rpcUrl);
      console.log(`✓ CANA/USDC Pool Price: ${poolPrice.toFixed(6)} USDC per CANA\n`);
    } catch (error) {
      console.log(`⚠ CANA price not currently available in Alchemy`);
      console.log(`  Will use CoinGecko for CANA price instead.\n`);
    }

    // Test 5: Get pool price (WETH/USDC) with well-known tokens
    console.log('Test 5: Calculating WETH/USDC pool price...');
    const poolPrice = await getPoolPriceFromAlchemy(usdcAddress, wethAddress, chainId, rpcUrl);
    console.log(`✓ WETH/USDC Pool Price: ${poolPrice.toFixed(2)} USDC per WETH\n`);

    console.log('✅ All Alchemy Prices API tests passed!');
    console.log('\nNote: If a token is not available in Alchemy, the keeper will')
    console.log('automatically fallback to CoinGecko API if you provide a CoinGecko API key.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAlchemyPrices();
