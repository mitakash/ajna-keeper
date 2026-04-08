import { ethers } from 'ethers';
import config from '../example-uniswapV4-config copy';
import { getProviderAndSigner } from '../src/utils';

async function approvePools() {
  console.log('🔐 Approving Ajna Pools for Quote Token Spending...\n');

  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );

  const signerAddress = await signer.getAddress();
  const chainId = await signer.getChainId();

  console.log(`Chain: ${chainId}`);
  console.log(`Wallet: ${signerAddress}\n`);

  const ERC20_ABI = [
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
  ];

  // Approve each pool to spend its quote token
  for (const pool of config.pools) {
    console.log(`\n📋 Pool: ${pool.name}`);
    console.log(`   Address: ${pool.address}`);

    // Determine quote token (the token lenders deposit)
    // For B_T2/B_T4 pool, quote token is B_T2
    // For B_T2/B_T1 pool, quote token is B_T2
    let quoteToken: string;
    let quoteSymbol: string;

    if (pool.name.includes('B_T2/B_T4')) {
      quoteToken = config.tokenAddresses!['b_t2'];
      quoteSymbol = 'B_T2';
    } else if (pool.name.includes('B_T2/B_T1')) {
      quoteToken = config.tokenAddresses!['b_t2'];
      quoteSymbol = 'B_T2';
    } else {
      console.log('   ⚠️  Unknown pool type - skipping');
      continue;
    }

    console.log(`   Quote Token: ${quoteSymbol} (${quoteToken})`);

    const tokenContract = new ethers.Contract(quoteToken, ERC20_ABI, signer);
    const currentAllowance = await tokenContract.allowance(signerAddress, pool.address);

    console.log(`   Current Allowance: ${ethers.utils.formatUnits(currentAllowance, 6)} ${quoteSymbol}`);

    if (currentAllowance.lt(ethers.utils.parseUnits('1000000', 6))) {
      console.log(`   Approving pool for unlimited ${quoteSymbol} spending...`);
      const tx = await tokenContract.approve(pool.address, ethers.constants.MaxUint256);
      console.log(`   TX: ${tx.hash}`);
      await tx.wait();
      console.log('   ✅ Approval complete');
    } else {
      console.log('   ✅ Already approved - skipping');
    }
  }

  console.log('\n✅ All pool approvals complete!\n');
}

approvePools()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Approval failed:', error);
    process.exit(1);
  });
