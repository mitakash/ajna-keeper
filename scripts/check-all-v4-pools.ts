import { ethers } from 'ethers';

const config = require('../example-uniswapV4-config copy');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.default.rpcUrl);
  const poolManagerAddr = config.default.uniswapV4RouterOverrides.poolManager;

  console.log('🔍 Checking All V4 Pools\n');
  console.log('PoolManager:', poolManagerAddr);
  console.log('='.repeat(80) + '\n');

  const poolManager = new ethers.Contract(
    poolManagerAddr,
    [
      'function getSlot0(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
      'function getLiquidity(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint128)',
    ],
    provider
  );

  const pools = config.default.uniswapV4RouterOverrides.pools;

  for (const [poolName, poolConfig] of Object.entries(pools)) {
    const pc: any = poolConfig;
    console.log(`\n📊 ${poolName}`);
    console.log('-'.repeat(80));
    console.log(`Token0: ${pc.token0}`);
    console.log(`Token1: ${pc.token1}`);
    console.log(`Fee: ${pc.fee} (${pc.fee / 10000}%)`);
    console.log(`Tick Spacing: ${pc.tickSpacing}`);
    console.log(`Hooks: ${pc.hooks}`);

    const poolKey = [
      [pc.token0],
      [pc.token1],
      pc.fee,
      pc.tickSpacing,
      pc.hooks
    ];

    try {
      // Try to get pool state
      const slot0 = await poolManager.getSlot0(poolKey);

      console.log('\n✅ POOL EXISTS!');
      console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
      console.log('  tick:', slot0.tick.toString());
      console.log('  protocolFee:', slot0.protocolFee.toString());
      console.log('  lpFee:', slot0.lpFee.toString());

      // Calculate readable price
      const tick = slot0.tick.toNumber();
      const price = Math.pow(1.0001, tick);
      console.log('  price (1.0001^tick):', price.toFixed(6));

      // Try to get liquidity
      try {
        const liquidity = await poolManager.getLiquidity(poolKey);
        console.log('  liquidity:', liquidity.toString());

        if (liquidity.eq(0)) {
          console.log('\n⚠️  WARNING: Pool exists but has ZERO liquidity!');
          console.log('   Swaps will fail without liquidity.');
        } else {
          console.log('\n✅ Pool has liquidity - ready for swaps!');
        }
      } catch (liqErr) {
        console.log('  liquidity: (could not query)');
      }

    } catch (error: any) {
      console.log('\n❌ POOL DOES NOT EXIST');
      console.log('Error:', error.message.substring(0, 200));
      console.log('\n⚠️  This pool needs to be initialized before use!');
    }

    console.log('\n' + '='.repeat(80));
  }

  console.log('\n\n📝 SUMMARY\n');
  console.log('Check the results above to ensure all pools:');
  console.log('  1. ✅ Exist (initialized)');
  console.log('  2. ✅ Have liquidity > 0');
  console.log('  3. ✅ Match your expected configuration');
}

main().catch(console.error);
