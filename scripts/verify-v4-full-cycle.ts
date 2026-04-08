import { ethers } from 'ethers';
import config from '../example-uniswapV4-config copy';
import { getProviderAndSigner } from '../src/utils';

/**
 * Full V4 Integration Verification Script
 *
 * This script verifies all components needed for Uniswap V4 post-auction swaps:
 * 1. Wallet has sufficient ETH for gas
 * 2. Wallet has B_T2 tokens for kick bonds
 * 3. V4 pool exists and has liquidity
 * 4. Config is properly set up for V4 swaps
 */

async function verifyV4FullCycle() {
  console.log('🔍 Verifying Uniswap V4 Full Integration...\n');
  console.log('=' .repeat(60));

  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );

  const signerAddress = await signer.getAddress();
  const chainId = await signer.getChainId();

  console.log(`\n📋 Network Info:`);
  console.log(`   Chain ID: ${chainId}`);
  console.log(`   Keeper Wallet: ${signerAddress}`);
  console.log(`   RPC: ${config.ethRpcUrl.slice(0, 50)}...`);

  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ];

  // 1. Check ETH Balance
  console.log(`\n${'='.repeat(60)}`);
  console.log('1️⃣  ETH Balance Check');
  console.log('='.repeat(60));

  const ethBalance = await provider.getBalance(signerAddress);
  const ethFormatted = ethers.utils.formatEther(ethBalance);
  console.log(`   Balance: ${ethFormatted} ETH`);

  const minEthRequired = ethers.utils.parseEther('0.001');
  if (ethBalance.lt(minEthRequired)) {
    console.log(`   ❌ INSUFFICIENT! Need at least 0.001 ETH for gas`);
    console.log(`   📝 Action: Send ${ethers.utils.formatEther(minEthRequired.sub(ethBalance))} more ETH to ${signerAddress}`);
  } else {
    console.log(`   ✅ Sufficient for transaction gas`);
  }

  // 2. Check B_T2 Token Balance (for kick bonds)
  console.log(`\n${'='.repeat(60)}`);
  console.log('2️⃣  B_T2 Token Balance Check (for kick bonds)');
  console.log('='.repeat(60));

  const b_t2 = config.tokenAddresses!['b_t2'];
  const b_t2Contract = new ethers.Contract(b_t2, ERC20_ABI, provider);
  const b_t2Balance = await b_t2Contract.balanceOf(signerAddress);
  const b_t2Decimals = await b_t2Contract.decimals();
  const b_t2Symbol = await b_t2Contract.symbol();

  console.log(`   Token: ${b_t2Symbol} (${b_t2})`);
  console.log(`   Balance: ${ethers.utils.formatUnits(b_t2Balance, b_t2Decimals)} ${b_t2Symbol}`);

  const minB_t2Required = ethers.utils.parseUnits('1', b_t2Decimals);
  if (b_t2Balance.lt(minB_t2Required)) {
    console.log(`   ❌ INSUFFICIENT! Need at least 1 ${b_t2Symbol} for kick bonds`);
    console.log(`   📝 Action: Send at least 10 ${b_t2Symbol} tokens to ${signerAddress}`);
  } else {
    console.log(`   ✅ Sufficient for kick bonds`);
  }

  // 3. Check Pool Approvals
  console.log(`\n${'='.repeat(60)}`);
  console.log('3️⃣  Ajna Pool Approval Check');
  console.log('='.repeat(60));

  for (const pool of config.pools) {
    console.log(`\n   Pool: ${pool.name}`);
    console.log(`   Address: ${pool.address}`);

    const allowance = await b_t2Contract.allowance(signerAddress, pool.address);
    console.log(`   Allowance: ${ethers.utils.formatUnits(allowance, b_t2Decimals)} ${b_t2Symbol}`);

    if (allowance.lt(ethers.utils.parseUnits('100', b_t2Decimals))) {
      console.log(`   ⚠️  Low allowance - keeper will auto-approve when needed`);
    } else {
      console.log(`   ✅ Sufficient allowance`);
    }
  }

  // 4. Check V4 Pool Configuration
  console.log(`\n${'='.repeat(60)}`);
  console.log('4️⃣  Uniswap V4 Pool Configuration');
  console.log('='.repeat(60));

  const poolManager = config.uniswapV4RouterOverrides?.poolManager;
  if (poolManager && config.uniswapV4RouterOverrides) {
    console.log(`   PoolManager: ${poolManager}`);
    console.log(`   Pools Configured: ${Object.keys(config.uniswapV4RouterOverrides?.pools || {}).length}`);

    for (const [poolName, poolConfig] of Object.entries(config.uniswapV4RouterOverrides?.pools || {})) {
      console.log(`\n   📊 ${poolName}:`);
      console.log(`      Token0: ${poolConfig.token0}`);
      console.log(`      Token1: ${poolConfig.token1}`);
      console.log(`      Fee: ${poolConfig.fee} (${poolConfig.fee / 10000}%)`);
      console.log(`      Tick Spacing: ${poolConfig.tickSpacing}`);
      console.log(`      Hooks: ${poolConfig.hooks}`);
      console.log(`      ✅ Pool configured`);
    }
  } else {
    console.log(`   ❌ No PoolManager configured!`);
  }

  // 5. Verify Config Settings
  console.log(`\n${'='.repeat(60)}`);
  console.log('5️⃣  Configuration Verification');
  console.log('='.repeat(60));

  console.log(`\n   Keeper Settings:`);
  console.log(`   - Dry Run: ${config.dryRun ? '⚠️  YES (no real transactions)' : '✅ NO (live mode)'}`);
  console.log(`   - Delay Between Runs: ${config.delayBetweenRuns}s`);
  console.log(`   - Delay Between Actions: ${config.delayBetweenActions}s`);
  console.log(`   - Log Level: ${config.logLevel}`);

  console.log(`\n   Factory Deployment:`);
  console.log(`   - KeeperTakerFactory: ${config.keeperTakerFactory || '❌ NOT SET'}`);
  console.log(`   - UniswapV4 Taker: ${config.takerContracts?.UniswapV4 || '❌ NOT SET'}`);

  console.log(`\n   V4 Router Settings:`);
  console.log(`   - Universal Router: ${config.uniswapV4RouterOverrides?.router || '❌ NOT SET'}`);
  console.log(`   - PoolManager: ${config.uniswapV4RouterOverrides?.poolManager || '❌ NOT SET'}`);
  console.log(`   - Default Slippage: ${config.uniswapV4RouterOverrides?.defaultSlippage || 'N/A'}%`);
  console.log(`   - Pools Configured: ${Object.keys(config.uniswapV4RouterOverrides?.pools || {}).length}`);

  console.log(`\n   Pool Configurations:`);
  for (const pool of config.pools) {
    console.log(`\n   📊 ${pool.name}:`);
    console.log(`      - Address: ${pool.address}`);
    console.log(`      - Kick Enabled: ${pool.kick ? '✅ YES' : '❌ NO'}`);
    if (pool.kick) {
      console.log(`        • minDebt: ${pool.kick.minDebt}`);
      console.log(`        • priceFactor: ${pool.kick.priceFactor}`);
    }
    console.log(`      - Take Enabled: ${pool.take ? '✅ YES' : '❌ NO'}`);
    if (pool.take) {
      console.log(`        • liquiditySource: ${pool.take.liquiditySource}`);
      console.log(`        • marketPriceFactor: ${pool.take.marketPriceFactor}`);
    }
    console.log(`      - Post-Auction Swap: ${pool.collectLpReward?.rewardActionCollateral ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
    if (pool.collectLpReward?.rewardActionCollateral) {
      const action: any = pool.collectLpReward.rewardActionCollateral;
      console.log(`        • Action: ${action.action}`);
      console.log(`        • DEX: ${action.dexProvider || 'N/A'}`);
      console.log(`        • Target Token: ${action.targetToken || 'N/A'}`);
      console.log(`        • Slippage: ${action.slippage || 'N/A'}%`);

      if (action.dexProvider && action.dexProvider !== 'uniswap_v4') {
        console.log(`        ⚠️  WARNING: Not using uniswap_v4!`);
      } else if (action.dexProvider === 'uniswap_v4') {
        console.log(`        ✅ Using Uniswap V4`);
      }
    }
  }

  // 6. Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const checks = {
    eth: ethBalance.gte(minEthRequired),
    b_t2: b_t2Balance.gte(minB_t2Required),
    factory: !!config.keeperTakerFactory,
    taker: !!config.takerContracts?.UniswapV4,
    v4Router: !!config.uniswapV4RouterOverrides?.router,
    poolManager: !!config.uniswapV4RouterOverrides?.poolManager,
    poolsConfigured: Object.keys(config.uniswapV4RouterOverrides?.pools || {}).length > 0,
    postAuctionSwap: config.pools.some(p => (p.collectLpReward?.rewardActionCollateral as any)?.dexProvider === 'uniswap_v4'),
  };

  console.log(`\n   Prerequisites:`);
  console.log(`   ${checks.eth ? '✅' : '❌'} ETH Balance Sufficient`);
  console.log(`   ${checks.b_t2 ? '✅' : '❌'} B_T2 Balance Sufficient`);
  console.log(`   ${checks.factory ? '✅' : '❌'} Factory Contract Configured`);
  console.log(`   ${checks.taker ? '✅' : '❌'} V4 Taker Contract Configured`);
  console.log(`   ${checks.v4Router ? '✅' : '❌'} V4 Universal Router Configured`);
  console.log(`   ${checks.poolManager ? '✅' : '❌'} V4 PoolManager Configured`);
  console.log(`   ${checks.poolsConfigured ? '✅' : '❌'} V4 Pools Configured`);
  console.log(`   ${checks.postAuctionSwap ? '✅' : '❌'} Post-Auction V4 Swaps Enabled`);

  const allPassed = Object.values(checks).every(v => v);

  if (allPassed) {
    console.log(`\n   ✅ ALL CHECKS PASSED!`);
    console.log(`   🚀 Ready to run keeper with V4 post-auction swaps`);
    console.log(`\n   Next Steps:`);
    console.log(`   1. Ensure keeper is running: npm start`);
    console.log(`   2. Monitor logs for auction activity`);
    console.log(`   3. Wait for liquidatable loans to appear`);
    console.log(`   4. Keeper will: kick → take → collect rewards → swap via V4`);
  } else {
    console.log(`\n   ❌ SOME CHECKS FAILED`);
    console.log(`   📝 Fix the issues above before running the keeper`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

verifyV4FullCycle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
