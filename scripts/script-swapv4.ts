import { ethers, BigNumber } from 'ethers';

// ============================================================================
// CONFIGURATION - Verified from on-chain logs
// ============================================================================
const CONFIG = {
  RPC_URL: 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz',
  CHAIN_ID: 8453,
  
  POOL_MANAGER: '0x498581ff718922c3f8e6a244956af099b2652b2b',
  
  // Your tokens (verified from on-chain)
  TOKEN_B_T2: '0xd8A0af85E2539e22953287b436255422724871AB', // currency1
  TOKEN_B_T4: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187', // currency0
  
  // Pool parameters (verified from Initialize event)
  POOL_FEE: 500,
  TICK_SPACING: 10,
  HOOKS: '0x0000000000000000000000000000000000000000',
  
  // Swap
  AMOUNT_IN: '0.01',
  SLIPPAGE: 5, // Increase to 5%
};

// ============================================================================
// ABIs
// ============================================================================
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

const POOL_MANAGER_ABI = [
  'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (int256)',
  'function settle() external payable returns (uint256)',
  'function take(address currency, address to, uint256 amount) external',
  'function unlock(bytes calldata data) external returns (bytes memory)'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSqrtPriceLimitX96(zeroForOne: boolean): BigNumber {
  if (zeroForOne) {
    return BigNumber.from('4295128740'); // MIN_SQRT_RATIO + 1
  } else {
    return BigNumber.from('1461446703485210103287273052203988822378723970341'); // MAX_SQRT_RATIO - 1
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function executeDirectSwap() {
  console.log('🔄 Direct PoolManager Swap Test\n');
  console.log('═'.repeat(80));
  
  const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
  
  // Load wallet
  const keystore = require('fs').readFileSync('/Users/bigdellis/keystore-files/keeper-keystore2.json', 'utf8');
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const password = await new Promise<string>((resolve) => {
    rl.question('Enter keystore password: ', (pwd: string) => {
      rl.close();
      resolve(pwd);
    });
  });
  
  const wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
  const signer = wallet.connect(provider);
  const signerAddress = await signer.getAddress();
  
  console.log(`✓ Wallet: ${signerAddress}`);
  console.log(`✓ Chain: Base (${CONFIG.CHAIN_ID})\n`);
  
  // Get token info
  const tokenIn = new ethers.Contract(CONFIG.TOKEN_B_T2, ERC20_ABI, signer);
  const tokenOut = new ethers.Contract(CONFIG.TOKEN_B_T4, ERC20_ABI, signer);
  
  const [symbolIn, symbolOut, decimalsIn, decimalsOut, balanceIn, balanceOut] = await Promise.all([
    tokenIn.symbol(),
    tokenOut.symbol(),
    tokenIn.decimals(),
    tokenOut.decimals(),
    tokenIn.balanceOf(signerAddress),
    tokenOut.balanceOf(signerAddress)
  ]);
  
  console.log(`📊 Current Balances:`);
  console.log(`   ${symbolIn}: ${ethers.utils.formatUnits(balanceIn, decimalsIn)}`);
  console.log(`   ${symbolOut}: ${ethers.utils.formatUnits(balanceOut, decimalsOut)}\n`);
  
  const amountIn = ethers.utils.parseUnits(CONFIG.AMOUNT_IN, decimalsIn);
  
  // Approve PoolManager
  console.log(`🔓 Checking approval for PoolManager...`);
  const allowance = await tokenIn.allowance(signerAddress, CONFIG.POOL_MANAGER);
  if (allowance.lt(amountIn)) {
    console.log(`   Approving...`);
    const tx = await tokenIn.approve(CONFIG.POOL_MANAGER, ethers.constants.MaxUint256);
    await tx.wait();
    console.log(`   ✓ Approved`);
  } else {
    console.log(`   ✓ Already approved\n`);
  }
  
  // Build pool key (must match on-chain exactly)
  const poolKey = {
    currency0: CONFIG.TOKEN_B_T4, // Lower address
    currency1: CONFIG.TOKEN_B_T2, // Higher address
    fee: CONFIG.POOL_FEE,
    tickSpacing: CONFIG.TICK_SPACING,
    hooks: CONFIG.HOOKS
  };
  
  // We're swapping B_T2 → B_T4
  // B_T2 is currency1, B_T4 is currency0
  // So we're selling currency1 to get currency0 = zeroForOne: false
  const zeroForOne = false;
  
  // For exactInput swap, amountSpecified is negative (we're specifying input amount)
  const amountSpecified = amountIn.mul(-1);
  
  const sqrtPriceLimitX96 = getSqrtPriceLimitX96(zeroForOne);
  
  const swapParams = {
    zeroForOne,
    amountSpecified,
    sqrtPriceLimitX96
  };
  
  console.log(`🔧 Swap Parameters:`);
  console.log(`   Amount In: ${ethers.utils.formatUnits(amountIn, decimalsIn)} ${symbolIn}`);
  console.log(`   Direction: ${zeroForOne ? 'zeroForOne' : 'oneForZero'}`);
  console.log(`   Amount Specified: ${amountSpecified.toString()}`);
  console.log(`   Price Limit: ${sqrtPriceLimitX96.toString()}\n`);
  
  console.log(`📋 Pool Key:`);
  console.log(`   Currency0: ${poolKey.currency0}`);
  console.log(`   Currency1: ${poolKey.currency1}`);
  console.log(`   Fee: ${poolKey.fee}`);
  console.log(`   TickSpacing: ${poolKey.tickSpacing}`);
  console.log(`   Hooks: ${poolKey.hooks}\n`);
  
  // Connect to PoolManager
  const poolManager = new ethers.Contract(CONFIG.POOL_MANAGER, POOL_MANAGER_ABI, signer);
  
  console.log(`🚀 Attempting direct swap via PoolManager...\n`);
  
  try {
    // First, let's try estimating gas to see the error
    console.log(`📊 Estimating gas...`);
    const gasEstimate = await poolManager.estimateGas.swap(
      poolKey,
      swapParams,
      '0x' // empty hookData
    );
    
    console.log(`   Estimated gas: ${gasEstimate.toString()}\n`);
    
    // Execute swap
    console.log(`⏳ Executing swap...`);
    const tx = await poolManager.swap(
      poolKey,
      swapParams,
      '0x',
      {
        gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
      }
    );
    
    console.log(`   Tx: ${tx.hash}`);
    const receipt = await tx.wait();
    
    console.log(`\n✅ Swap successful!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Explorer: https://basescan.org/tx/${tx.hash}`);
    
    // Check new balances
    const [newBalanceIn, newBalanceOut] = await Promise.all([
      tokenIn.balanceOf(signerAddress),
      tokenOut.balanceOf(signerAddress)
    ]);
    
    console.log(`\n💰 New Balances:`);
    console.log(`   ${symbolIn}: ${ethers.utils.formatUnits(newBalanceIn, decimalsIn)} (Δ ${ethers.utils.formatUnits(newBalanceIn.sub(balanceIn), decimalsIn)})`);
    console.log(`   ${symbolOut}: ${ethers.utils.formatUnits(newBalanceOut, decimalsOut)} (Δ ${ethers.utils.formatUnits(newBalanceOut.sub(balanceOut), decimalsOut)})`);
    
  } catch (error: any) {
    console.error(`\n❌ Swap failed!`);
    console.error(`   ${error.message}`);
    
    if (error.error) {
      console.error(`\n🔍 Error details:`);
      console.error(error.error);
    }
    
    if (error.reason) {
      console.error(`\n📝 Reason: ${error.reason}`);
    }
  }
  
  console.log('\n' + '═'.repeat(80));
}

executeDirectSwap()
  .then(() => {
    console.log('\n✓ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });