import { ethers } from 'ethers';

const config = require('../example-uniswapV4-config copy');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.default.rpcUrl);

  const poolManagerAddr = config.default.uniswapV4RouterOverrides.poolManager;
  const poolConfig = config.default.uniswapV4RouterOverrides.pools['B_T2-B_T4'];

  console.log('🔍 Checking if V4 Pool Exists\n');
  console.log('PoolManager:', poolManagerAddr);
  console.log('Token0 (B_T4):', poolConfig.token0);
  console.log('Token1 (B_T2):', poolConfig.token1);
  console.log('Fee:', poolConfig.fee);
  console.log('Tick Spacing:', poolConfig.tickSpacing);
  console.log('Hooks:', poolConfig.hooks);
  console.log('\n' + '='.repeat(80) + '\n');

  // Create PoolManager contract instance
  const poolManager = new ethers.Contract(
    poolManagerAddr,
    [
      'function getSlot0(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
      'function getLiquidity(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint128)',
    ],
    provider
  );

  const poolKey = [
    [poolConfig.token0],  // Currency wrapper for token0
    [poolConfig.token1],  // Currency wrapper for token1
    poolConfig.fee,
    poolConfig.tickSpacing,
    poolConfig.hooks
  ];

  try {
    console.log('Attempting to query pool state...\n');

    // Try to get pool state
    const slot0 = await poolManager.getSlot0(poolKey);

    console.log('✅ POOL EXISTS!\n');
    console.log('Pool State:');
    console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
    console.log('  tick:', slot0.tick.toString());
    console.log('  protocolFee:', slot0.protocolFee.toString());
    console.log('  lpFee:', slot0.lpFee.toString());

    // Calculate readable price
    const tick = slot0.tick.toNumber();
    const price = Math.pow(1.0001, tick);
    console.log('  price (1.0001^tick):', price);

    // Try to get liquidity
    try {
      const liquidity = await poolManager.getLiquidity(poolKey);
      console.log('  liquidity:', liquidity.toString());

      if (liquidity.eq(0)) {
        console.log('\n⚠️  WARNING: Pool exists but has ZERO liquidity!');
        console.log('   Swaps will fail without liquidity.');
      }
    } catch (liqErr) {
      console.log('  liquidity: (could not query)');
    }

  } catch (error: any) {
    console.log('❌ POOL DOES NOT EXIST\n');
    console.log('Error:', error.message.substring(0, 200));
    console.log('\n' + '='.repeat(80));
    console.log('\n📝 ACTION REQUIRED:');
    console.log('   The V4 pool needs to be initialized before the keeper can execute takes.');
    console.log('   \n   Steps to initialize:');
    console.log('   1. Call PoolManager.initialize() with the PoolKey');
    console.log('   2. Add liquidity using PoolManager.modifyLiquidity()');
    console.log('   3. Or use a V4 Position Manager contract to add liquidity');
    console.log('\n' + '='.repeat(80));
  }
}

main().catch(console.error);
