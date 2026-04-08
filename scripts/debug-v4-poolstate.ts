// scripts/debug-v4-pool-state.ts
import { ethers } from 'ethers';
import config from '../example-uniswapV4-config copy';
import { getProviderAndSigner } from '../src/utils';

// StateView ABI for reading pool state
const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) view returns (uint128)'
];

// Utility to generate pool ID (keccak256 of encoded pool key)
function generatePoolId(poolKey: any): string {
  const encoded = ethers.utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  return ethers.utils.keccak256(encoded);
}

async function debugPoolState() {
  const { provider } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );

  // StateView address for Base mainnet
  const stateViewAddress = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71';
  const stateView = new ethers.Contract(stateViewAddress, STATE_VIEW_ABI, provider);

  const poolKey = config.uniswapV4RouterOverrides!.pools!['B_T2-B_T4']
  
  console.log('🔍 Checking V4 Pool State...\n');
  console.log('StateView:', stateViewAddress);
  console.log('Pool Key:');
  console.log('  token0:', poolKey.token0);
  console.log('  token1:', poolKey.token1);
  console.log('  fee:', poolKey.fee);
  console.log('  tickSpacing:', poolKey.tickSpacing);
  console.log('  hooks:', poolKey.hooks);
  console.log('');

  try {
    // Generate pool ID
    const poolId = generatePoolId(poolKey);
    console.log('Pool ID:', poolId);
    console.log('');

    // Get slot0 (price info)
    const [sqrtPriceX96, tick, protocolFee, lpFee] = await stateView.getSlot0(poolId);
    
    console.log('📊 Pool State:');
    console.log('  sqrtPriceX96:', sqrtPriceX96.toString());
    console.log('  tick:', tick.toString());
    console.log('  protocolFee:', protocolFee.toString());
    console.log('  lpFee:', lpFee.toString());
    
    // Get liquidity
    const liquidity = await stateView.getLiquidity(poolId);
    console.log('  Liquidity:', liquidity.toString());
    console.log('');

    if (liquidity.eq(0)) {
      console.log('❌ CRITICAL: Pool has ZERO liquidity!');
      console.log('');
      console.log('This is why your swap is failing. Solutions:');
      console.log('');
      console.log('1. Add liquidity to this pool using Uniswap V4 UI or contracts');
      console.log('2. Use a different pool (like B_T3-B_T4) that has liquidity');
      console.log('3. If this is a test pool, you need to provide liquidity first');
      console.log('');
      console.log('To add liquidity, you need to:');
      console.log('  - Call PoolManager.modifyLiquidity() with appropriate parameters');
      console.log('  - Or use a liquidity manager contract if available');
    } else {
      console.log('✅ Pool has liquidity:', ethers.utils.formatUnits(liquidity, 0));
      console.log('');
      console.log('Pool should be able to execute swaps.');
      console.log('If swaps are still failing, check:');
      console.log('  - Price slippage limits');
      console.log('  - Router approval');
      console.log('  - Correct router address');
    }

    // Calculate readable price
    const Q96 = ethers.BigNumber.from(2).pow(96);
    const price = sqrtPriceX96.mul(sqrtPriceX96).div(Q96).div(Q96);
    console.log('');
    console.log('Pool price (raw):', price.toString());

  } catch (error) {
    console.error('❌ Error reading pool state:', error);
    console.log('\nPossible issues:');
    console.log('1. Pool does not exist (not initialized)');
    console.log('2. StateView address is incorrect');
    console.log('3. Pool ID calculation is wrong');
  }
}

debugPoolState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  });