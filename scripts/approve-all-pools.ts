// scripts/approve-all-pools.ts
import { ethers } from 'hardhat';

async function main() {
  const config = require('../example-uniswapV4-config copy');

  console.log('\n🔐 Approving all Ajna pools for keeper operations...\n');

  const [signer] = await ethers.getSigners();
  const keeperAddress = await signer.getAddress();

  console.log('Keeper address:', keeperAddress);
  console.log('');

  // Get all pools from config
  const pools = config.default.pools;
  const approvals = new Set<string>(); // Track unique pool+token combinations

  for (const poolConfig of pools) {
    const poolAddress = poolConfig.address;
    const poolName = poolConfig.name;

    console.log(`📋 Pool: ${poolName}`);
    console.log(`   Address: ${poolAddress}`);

    // Get pool's quote token address
    const pool = await ethers.getContractAt(
      ['function quoteTokenAddress() view returns (address)'],
      poolAddress
    );

    const quoteToken = await pool.quoteTokenAddress();
    console.log(`   Quote Token: ${quoteToken}`);

    // Check current allowance
    const token = await ethers.getContractAt(
      ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function symbol() view returns (string)'],
      quoteToken
    );

    const symbol = await token.symbol();
    const currentAllowance = await token.allowance(keeperAddress, poolAddress);

    console.log(`   Current allowance: ${ethers.utils.formatUnits(currentAllowance, 6)} ${symbol}`);

    // Create unique key for this approval
    const approvalKey = `${quoteToken.toLowerCase()}-${poolAddress.toLowerCase()}`;

    if (currentAllowance.lt(ethers.utils.parseUnits('1000000', 6)) && !approvals.has(approvalKey)) {
      console.log(`   ⚠️  Insufficient allowance - approving MAX...`);

      const tx = await token.approve(poolAddress, ethers.constants.MaxUint256);
      console.log(`   Tx: ${tx.hash}`);
      await tx.wait();

      console.log(`   ✅ Approved!`);
      approvals.add(approvalKey);
    } else if (approvals.has(approvalKey)) {
      console.log(`   ✅ Already approved in this session`);
    } else {
      console.log(`   ✅ Sufficient allowance`);
    }

    console.log('');
  }

  // Also approve the factory if using factory system
  if (config.default.keeperTakerFactory) {
    const factoryAddress = config.default.keeperTakerFactory;
    console.log(`📋 Factory: ${factoryAddress}`);

    // Approve factory for all quote tokens used in pools
    const quoteTokens = new Set<string>();
    for (const poolConfig of pools) {
      const pool = await ethers.getContractAt(
        ['function quoteTokenAddress() view returns (address)'],
        poolConfig.address
      );
      quoteTokens.add((await pool.quoteTokenAddress()).toLowerCase());
    }

    for (const quoteTokenAddress of quoteTokens) {
      const token = await ethers.getContractAt(
        ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function symbol() view returns (string)'],
        quoteTokenAddress
      );

      const symbol = await token.symbol();
      const currentAllowance = await token.allowance(keeperAddress, factoryAddress);

      console.log(`   ${symbol}: ${ethers.utils.formatUnits(currentAllowance, 6)}`);

      if (currentAllowance.lt(ethers.utils.parseUnits('1000000', 6))) {
        console.log(`   ⚠️  Insufficient allowance for factory - approving MAX...`);

        const tx = await token.approve(factoryAddress, ethers.constants.MaxUint256);
        console.log(`   Tx: ${tx.hash}`);
        await tx.wait();

        console.log(`   ✅ Approved!`);
      } else {
        console.log(`   ✅ Sufficient allowance`);
      }
    }

    console.log('');
  }

  console.log('✅ All approvals complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
