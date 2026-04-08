// scripts/deploy-v4-taker-only.ts
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  const config = require('../example-uniswapV4-config copy');

  console.log('\n🚀 Deploying UniswapV4KeeperTaker...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer address:', deployer.address);
  console.log('Deployer balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH\n');

  const keeperTakerFactory = config.default.keeperTakerFactory;
  const poolManager = config.default.uniswapV4RouterOverrides.poolManager;
  // AUDIT FIX: Use ajna.erc20PoolFactory for pool validation
  const ajnaPoolFactory = config.default.ajna?.erc20PoolFactory;

  if (!keeperTakerFactory) {
    throw new Error('keeperTakerFactory not found in config');
  }

  if (!poolManager) {
    throw new Error('poolManager not found in config.uniswapV4RouterOverrides');
  }

  if (!ajnaPoolFactory) {
    throw new Error('ajna.erc20PoolFactory not found in config - required for pool validation');
  }

  console.log('V4 PoolManager address:', poolManager);
  console.log('Ajna Pool Factory address:', ajnaPoolFactory);
  console.log('Authorized Factory address:', keeperTakerFactory);
  console.log('');

  // Load artifact
  const artifactPath = path.join(
    __dirname, '..', 'artifacts', 'contracts', 'takers',
    'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json'
  );
  const artifact = require(artifactPath);

  console.log('Contract bytecode size:', artifact.bytecode.length / 2, 'bytes\n');

  // Deploy
  const Factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

  console.log('Deploying contract...');
  // Constructor is (address _poolManager, PoolDeployer _poolFactory, address _authorizedFactory)
  // AUDIT FIX: Now includes Ajna pool factory for pool validation
  const taker = await Factory.deploy(
    poolManager,           // First arg: _poolManager (V4 PoolManager)
    ajnaPoolFactory,       // Second arg: _poolFactory (Ajna pool factory for validation)
    keeperTakerFactory,    // Third arg: _authorizedFactory (factory that can call takeWithAtomicSwap)
    {
      gasLimit: 3000000,   // Explicit gas limit for deployment
    }
  );

  console.log('Deploy tx:', taker.deployTransaction.hash);
  console.log('Waiting for confirmation...');

  await taker.deployed();

  console.log('\n✅ UniswapV4KeeperTaker deployed at:', taker.address);
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Update factory to use this taker:');
  console.log(`   npx hardhat run scripts/update-v4-taker-in-factory.ts --network base`);
  console.log('');
  console.log('2. Update your config file with:');
  console.log(`   takerContracts: {`);
  console.log(`     'UniswapV4': '${taker.address}',`);
  console.log(`   }`);
  console.log('');
  console.log('3. Restart your keeper');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
