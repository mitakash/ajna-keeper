import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import * as path from 'path';
import { password } from '@inquirer/prompts';
import { readConfigFile, KeeperConfig } from '../src/config-types';

/**
 * Universal Factory System Deployment Script
 * 
 * Deploys AjnaKeeperTakerFactory + DEX-specific takers for any chain
 * Usage: npx ts-node scripts/deploy-factory-system.ts <config-file-path>
 * 
 * Features:
 * - Chain-agnostic (works on any chain with proper config)
 * - Config-driven (reads all addresses from config file)  
 * - Fixed deployment order (factory → taker with factory authorization)
 * - Interactive password input (same as main bot)
 * - Comprehensive validation and error handling
 * - Manual gas limits for problematic networks
 */

interface DeploymentAddresses {
  factory?: string;
  uniswapTaker?: string;
  sushiTaker?: string;
  curveTaker?: string;
  uniswapV4?: string;
  // Future: uniswapV4, pancakeswap, balancer, izumi, etc.
}

// Gas configuration for different networks
const GAS_CONFIGS: { [chainId: number]: { gasLimit: string; gasPrice?: string } } = {
  43111: { // Hemi Mainnet - Reasonable settings for large contract deployment
    gasLimit: '6000000', // 6M gas limit (reasonable for Hemi)
    gasPrice: '100000000', // 0.1 gwei (much cheaper for Hemi)
  },
  43114: { // Avalanche
    gasLimit: '6000000',
    gasPrice: '10000000000', // 10 gwei
  },
  1: { // Ethereum Mainnet
    gasLimit: '6000000',
  },
  8453: { // Base
    gasLimit: '4000000', // Reduced from 6M
    gasPrice: '100000000', // 0.1 gwei (much lower)
  },

  // Add more networks as needed
};

async function getKeystorePassword(): Promise<string> {
  // Same approach as main bot - just prompt directly
  const pswd = await password({
    message: 'Please enter your keystore password',
    mask: '*',
  });

  return pswd;
}

async function detectChainInfo(config: KeeperConfig): Promise<{ chainId: number; name: string }> {
  const provider = new ethers.providers.JsonRpcProvider(config.ethRpcUrl);
  const network = await provider.getNetwork();
  
  // Map common chain IDs to human-readable names
  const chainNames: { [chainId: number]: string } = {
    1: 'Ethereum Mainnet',
    43114: 'Avalanche',
    8453: 'Base',
    42161: 'Arbitrum One',
    43111: 'Hemi Mainnet',
    // Add more as needed
  };

  return {
    chainId: network.chainId,
    name: chainNames[network.chainId] || `Chain ${network.chainId}`
  };
}

function getGasConfig(chainId: number) {
  const config = GAS_CONFIGS[chainId];
  if (!config) {
    console.log(`⚠️  No gas config for chain ${chainId}, using default settings`);
    return { gasLimit: '5000000' }; // Default 5M gas
  }
  return config;
}

async function validateConfig(config: KeeperConfig): Promise<void> {
  console.log('Validating configuration...');

  // Check required Ajna addresses
  if (!config.ajna?.erc20PoolFactory) {
    throw new Error('Missing ajna.erc20PoolFactory in config');
  }

  // Check if contract artifacts exist
  const factoryArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json');
  const takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json');
  
  try {
    require(factoryArtifactPath);
    require(takerArtifactPath);
  } catch (error) {
    throw new Error('Contract artifacts not found. Please run: yarn compile');
  }

  // Check if any pools are configured for Uniswap V3 takes
  const uniswapPools = config.pools?.filter(pool => 
    pool.take?.liquiditySource === 2 // LiquiditySource.UNISWAPV3
  ) || [];

  if (uniswapPools.length > 0) {
    console.log(`Found ${uniswapPools.length} pools configured for Uniswap V3 takes`);
    
    // Validate Uniswap V3 configuration
    if (!config.universalRouterOverrides) {
      throw new Error('universalRouterOverrides required for Uniswap V3 pools');
    }

    const required = [
      'universalRouterAddress',
      'wethAddress', 
      'permit2Address',
      'poolFactoryAddress',
      'quoterV2Address'
    ];

    for (const field of required) {
      if (!config.universalRouterOverrides[field as keyof typeof config.universalRouterOverrides]) {
        throw new Error(`Missing universalRouterOverrides.${field} for Uniswap V3`);
      }
    }
  }

//   const curvePools = config.pools?.filter(pool =>
//     pool.take?.liquiditySource === 4 // LiquiditySource.CURVE
//   ) || [];

//   if (curvePools.length > 0) {
//     console.log(`Found ${curvePools.length} pools configured for Curve takes`);
  
//   // Validate Curve configuration
//   if (!config.curveRouterOverrides) {
//     throw new Error('curveRouterOverrides required for Curve pools');
//   }
//   if (!config.curveRouterOverrides.poolConfigs || Object.keys(config.curveRouterOverrides.poolConfigs).length === 0) {
//     throw new Error('Missing curveRouterOverrides.poolConfigs for Curve');
//   }
//   if (!config.curveRouterOverrides.wethAddress) {
//     throw new Error('Missing curveRouterOverrides.wethAddress for Curve');
//   }
// }

  const v4Pools = (config.pools || []).filter(
    p => p.take?.liquiditySource === 5 // LiquiditySource.UNISWAPV4
  );

  if (v4Pools.length > 0) {
    const v4 = config.uniswapV4RouterOverrides;
    if (!v4) throw new Error('uniswapV4RouterOverrides required when using UNISWAPV4');
    if (!v4.router) throw new Error('uniswapV4RouterOverrides.router is missing');
    if (!v4.pools || Object.keys(v4.pools).length === 0)
      throw new Error('uniswapV4RouterOverrides.pools must have at least one poolKey');
    
      const v4ArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json');
      try { require(v4ArtifactPath); } catch {
        throw new Error('UniswapV4KeeperTaker artifact not found. Run: yarn compile');
      }
    
  }

    console.log('Configuration validation passed');
}

async function deployFactory(
  deployer: ethers.Wallet,
  ajnaPoolFactory: string,
  chainId: number
): Promise<string> {
  console.log('\n📦 Step 1: Deploying AjnaKeeperTakerFactory...');
  
  const factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
  const AjnaKeeperTakerFactory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    deployer
  );
  
  // Get gas configuration for this chain
  const gasConfig = getGasConfig(chainId);
  console.log(`⛽ Using gas config: limit=${gasConfig.gasLimit}${gasConfig.gasPrice ? `, price=${gasConfig.gasPrice}` : ''}`);
  
  // Prepare deployment options with manual gas settings
  const deployOptions: any = {
    gasLimit: gasConfig.gasLimit,
  };
  
  if (gasConfig.gasPrice) {
    deployOptions.gasPrice = gasConfig.gasPrice;
  }
  
  console.log('🚀 Deploying with manual gas settings...');
  
  try {
    const factory = await AjnaKeeperTakerFactory.deploy(ajnaPoolFactory, deployOptions);
    console.log('✅ Factory deployment tx:', factory.deployTransaction.hash);
    
    console.log('⏳ Waiting for deployment confirmation...');
    await factory.deployed();
    console.log('🎉 AjnaKeeperTakerFactory deployed to:', factory.address);
    
    return factory.address;
  } catch (error: any) {
    console.log('❌ Factory deployment failed with manual gas settings');
    
    // Try with higher gas limit as fallback
    if (error.message?.includes('gas')) {
      console.log('🔄 Retrying with higher gas limit...');
      const higherGasLimit = (parseInt(gasConfig.gasLimit) * 1.5).toString();
      
      const retryOptions = {
        ...deployOptions,
        gasLimit: higherGasLimit,
      };
      
      console.log(`⛽ Retry gas limit: ${higherGasLimit}`);
      
      const factory = await AjnaKeeperTakerFactory.deploy(ajnaPoolFactory, retryOptions);
      console.log('✅ Factory deployment tx (retry):', factory.deployTransaction.hash);
      
      await factory.deployed();
      console.log('🎉 AjnaKeeperTakerFactory deployed to:', factory.address);
      
      return factory.address;
    }
    
    throw error;
  }
}

async function deployUniswapTaker(
  deployer: ethers.Wallet,
  ajnaPoolFactory: string,
  factoryAddress: string,
  chainId: number
): Promise<string> {
  console.log('\n📦 Step 2: Deploying UniswapV3KeeperTaker...');
  
  const takerArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json'));
  const UniswapV3KeeperTaker = new ethers.ContractFactory(
    takerArtifact.abi,
    takerArtifact.bytecode,
    deployer
  );
  
  // Get gas configuration
  const gasConfig = getGasConfig(chainId);
  const deployOptions: any = {
    gasLimit: gasConfig.gasLimit,
  };
  
  if (gasConfig.gasPrice) {
    deployOptions.gasPrice = gasConfig.gasPrice;
  }
  
  // Correct deployment order with factory authorization
  const taker = await UniswapV3KeeperTaker.deploy(
    ajnaPoolFactory,    // Ajna pool factory
    factoryAddress,     // Authorized factory (CRITICAL FIX)
    deployOptions
  );
  console.log('✅ UniswapV3 taker deployment tx:', taker.deployTransaction.hash);
  
  await taker.deployed();
  console.log('🎉 UniswapV3KeeperTaker deployed to:', taker.address);
  
  return taker.address;
}

async function deploySushiSwapTaker(
  deployer: ethers.Wallet,
  ajnaPoolFactory: string,
  factoryAddress: string,
  chainId: number
): Promise<string> {
  console.log('\n📦 Step 2b: Deploying SushiSwapKeeperTaker...');
  
  const takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'SushiSwapKeeperTaker.sol', 'SushiSwapKeeperTaker.json');
  const takerArtifact = require(takerArtifactPath);
  const SushiSwapKeeperTaker = new ethers.ContractFactory(
    takerArtifact.abi,
    takerArtifact.bytecode,
    deployer
  );
  
  // Get gas configuration
  const gasConfig = getGasConfig(chainId);
  const deployOptions: any = {
    gasLimit: gasConfig.gasLimit,
  };
  
  if (gasConfig.gasPrice) {
    deployOptions.gasPrice = gasConfig.gasPrice;
  }
  
  // Deploy with factory authorization
  const taker = await SushiSwapKeeperTaker.deploy(
    ajnaPoolFactory,    // Ajna pool factory
    factoryAddress,     // Authorized factory
    deployOptions
  );
  console.log('✅ SushiSwap taker deployment tx:', taker.deployTransaction.hash);
  
  await taker.deployed();
  console.log('🎉 SushiSwapKeeperTaker deployed to:', taker.address);
  
  return taker.address;
}

async function deployUniswapV4KeeperTaker(
  deployer: ethers.Wallet,
  poolManagerAddress: string,
  authorizedFactoryAddress: string,
  chainId: number
): Promise<string> {
  console.log('\n📦 Deploying UniswapV4KeeperTaker…');

  const artifactPath = path.join(
    __dirname, '..', 'artifacts', 'contracts', 'takers',
    'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json'
  );
  const art = require(artifactPath);

  const Factory = new ethers.ContractFactory(art.abi, art.bytecode, deployer);

  // Gas configuration
  const gasConfig = getGasConfig(chainId);
  const deployOptions: any = { gasLimit: gasConfig.gasLimit };
  if (gasConfig.gasPrice) deployOptions.gasPrice = gasConfig.gasPrice;

  // UniswapV4KeeperTaker constructor takes 2 arguments:
  // constructor(address _poolManager, address _authorizedFactory)
  // Owner is set to msg.sender (deployer) in constructor
  console.log('  constructor args:');
  console.log('   - poolManager       :', poolManagerAddress);
  console.log('   - authorizedFactory :', authorizedFactoryAddress);

  const taker = await Factory.deploy(
    poolManagerAddress,        // First arg: _poolManager (V4 PoolManager)
    authorizedFactoryAddress,  // Second arg: _authorizedFactory (factory that can call takeWithAtomicSwap)
    deployOptions              // overrides (last)
  );

  console.log('  tx:', taker.deployTransaction.hash);
  await taker.deployed();
  console.log('  ✅ UniswapV4KeeperTaker at', taker.address);
  return taker.address;
}

async function deployCurveKeeperTaker(
  deployer: ethers.Wallet,
  ajnaPoolFactory: string,
  factoryAddress: string,
  chainId: number
): Promise<string> {
  console.log('\n📦 Step 2c: Deploying CurveKeeperTaker...');

  const takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'CurveKeeperTaker.sol', 'CurveKeeperTaker.json');
  const takerArtifact = require(takerArtifactPath);

  const CurveKeeperTaker = new ethers.ContractFactory(
    takerArtifact.abi,
    takerArtifact.bytecode,
    deployer
  );

  // Get gas configuration
  const gasConfig = getGasConfig(chainId);
  const deployOptions: any = {
    gasLimit: gasConfig.gasLimit,
  };

  if (gasConfig.gasPrice) {
    deployOptions.gasPrice = gasConfig.gasPrice;
  }

  // Deploy with factory authorization
  const taker = await CurveKeeperTaker.deploy(
    ajnaPoolFactory,  // Ajna pool factory
    factoryAddress,   // Authorized factory
    deployOptions
  );

  console.log('✅ Curve taker deployment tx:', taker.deployTransaction.hash);
  await taker.deployed();
  console.log('🎉 CurveKeeperTaker deployed to:', taker.address);

  return taker.address;
}

async function configureFactory(
  deployer: ethers.Wallet,
  factoryAddress: string,
  addresses: DeploymentAddresses,
  chainId: number  // ✅ ADD chainId parameter
): Promise<void> {
  console.log('\n⚙️  Step 3: Configuring factory with takers...');
  
  const factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
  const factory = new ethers.Contract(factoryAddress, factoryArtifact.abi, deployer);
  
  // ✅ Get gas configuration for setTaker calls
  const gasConfig = getGasConfig(chainId);
  const txOptions = {
    gasLimit: 200000,  // setTaker is a simple storage write, 200k is plenty
    gasPrice: gasConfig.gasPrice || undefined
  };
  
  console.log(`⛽ Using gas config for setTaker: limit=200000${gasConfig.gasPrice ? `, price=${gasConfig.gasPrice}` : ''}`);
 
  // Register UniswapV3 taker (LiquiditySource.UNISWAPV3 = 2)
  if (addresses.uniswapTaker) {
    const setUniTakerTx = await factory.setTaker(2, addresses.uniswapTaker, txOptions);  // ✅ ADD txOptions
    console.log('✅ UniswapV3 configuration tx:', setUniTakerTx.hash);
    await setUniTakerTx.wait();
    console.log('🎉 Factory configured with UniswapV3 taker');
  }
  
  // Register SushiSwap taker (LiquiditySource.SUSHISWAP = 3)
  if (addresses.sushiTaker) {
    const setSushiTakerTx = await factory.setTaker(3, addresses.sushiTaker, txOptions);  // ✅ ADD txOptions
    console.log('✅ SushiSwap configuration tx:', setSushiTakerTx.hash);
    await setSushiTakerTx.wait();
    console.log('🎉 Factory configured with SushiSwap taker');
  }

  if (addresses.uniswapV4) {
    const tx = await factory.setTaker(5, addresses.uniswapV4, txOptions);  // ✅ ADD txOptions
    console.log('  setTaker(UNISWAPV4):', tx.hash);
    await tx.wait();
    console.log('  ✅ Factory wired to UniswapV4 taker');
  }

  // Register Curve taker (LiquiditySource.CURVE = 4)
  if (addresses.curveTaker) {
    const setCurveTakerTx = await factory.setTaker(4, addresses.curveTaker, txOptions);  // ✅ ADD txOptions
    console.log('✅ Curve configuration tx:', setCurveTakerTx.hash);
    await setCurveTakerTx.wait();
    console.log('🎉 Factory configured with Curve taker');
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function verifyDeployment(
  deployer: ethers.Wallet,
  addresses: DeploymentAddresses
): Promise<void> {
  console.log('\n🔍 Step 4: Verifying deployment...');
  
  if (!addresses.factory) {
    throw new Error('Factory address is missing from deployment');
  }
  
  const factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
  const factory = new ethers.Contract(addresses.factory, factoryArtifact.abi, deployer);
  
  // Verify factory configuration
  const hasUniswapTaker = await factory.hasConfiguredTaker(2);
  const registeredTaker = await factory.takerContracts(2);
  const factoryOwner = await factory.owner();
  
  console.log('📋 Verification Results:');
  console.log(`- Factory Owner: ${factoryOwner}`);
  console.log(`- Expected Owner: ${deployer.address}`);
  console.log(`- UniswapV3 Configured: ${hasUniswapTaker}`);
  console.log(`- Registered Taker: ${registeredTaker}`);
  console.log(`- Expected Taker: ${addresses.uniswapTaker}`);
  
  // Verify taker authorization
  if (addresses.uniswapTaker) {
    const takerArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json'));
    const taker = new ethers.Contract(addresses.uniswapTaker, takerArtifact.abi, deployer);
    
    const takerOwner = await taker.owner();
    const authorizedFactory = await taker.authorizedFactory();
    
    console.log(`- Taker Owner: ${takerOwner}`);
    console.log(`- Authorized Factory: ${authorizedFactory}`);
    console.log(`- Expected Factory: ${addresses.factory}`);
    
    // Validation checks
    if (!hasUniswapTaker || registeredTaker !== addresses.uniswapTaker) {
      throw new Error('❌ Factory configuration verification failed');
    }
    
    if (authorizedFactory !== addresses.factory) {
      throw new Error('❌ Taker authorization verification failed');
    }
    
    if (takerOwner !== deployer.address || factoryOwner !== deployer.address) {
      throw new Error('❌ Owner verification failed');
    }
  }
  
  console.log('✅ All verification checks passed');
}

function generateConfigUpdate(
  addresses: DeploymentAddresses,
  configPath: string,
  chainName: string
): void {
  console.log('\n🎉 DEPLOYMENT COMPLETE!');
  console.log('\n📝 Update your configuration file:');
  console.log(`📁 File: ${configPath}`);
  console.log('\n```typescript');
  console.log('// ADD/UPDATE these lines in your config:');
  
  if (addresses.factory) {
    console.log(`keeperTakerFactory: '${addresses.factory}',`);
  }
  
  if (addresses.uniswapTaker || addresses.sushiTaker || addresses.curveTaker || addresses.uniswapV4) {
    console.log('takerContracts: {');
    if (addresses.uniswapTaker) {
      console.log(`  'UniswapV3': '${addresses.uniswapTaker}',`);
    }
    if (addresses.sushiTaker) {
      console.log(`  'SushiSwap': '${addresses.sushiTaker}'`);
    }
    if (addresses.curveTaker) {
    console.log(`  'Curve': '${addresses.curveTaker}',`);
    }
    if (addresses.uniswapV4) {
      console.log(`  'UniswapV4': '${addresses.uniswapV4}',`);
      }
    console.log('},');
  }
  console.log('```');
  
  console.log('\n📋 Deployed Contract Addresses:');
  if (addresses.factory) {
    console.log(`🏭 AjnaKeeperTakerFactory: ${addresses.factory}`);
  }
  if (addresses.uniswapTaker) {
    console.log(`🦄 UniswapV3KeeperTaker: ${addresses.uniswapTaker}`);
  }
  if (addresses.sushiTaker) {
    console.log(`🍣 SushiSwapKeeperTaker: ${addresses.sushiTaker}`);
  }
  if (addresses.uniswapV4) {
    console.log(`🦄 UniswapV4KeeperTaker: ${addresses.uniswapV4}`);
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Update your config file with the addresses above');
  console.log('2. Test with: yarn start --config your-config-file.ts');
  console.log('3. Expected result: "Type: factory, Valid: true"');
  console.log(`4. Factory system ready for ${chainName}! 🎊`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npx ts-node scripts/deploy-factory-system.ts <config-file-path>');
    console.error('Example: npx ts-node scripts/deploy-factory-system.ts hemi-conf-settlement.ts');
    console.error('\n Prerequisites:');
    console.error('1. Compile contracts: yarn compile');
    console.error('2. Have your keystore.json file ready');
    console.error('3. Ensure sufficient ETH balance (recommended: >0.01 ETH)');
    process.exit(1);
  }
  
  const configPath = args[0];
  
  try {
    console.log('🚀 Universal Factory System Deployment');
    console.log('=====================================');
    
    // Step 1: Load and validate configuration
    console.log(`📖 Loading configuration from: ${configPath}`);
    const config = await readConfigFile(configPath);
    await validateConfig(config);
    
    // Step 2: Detect chain information
    const chainInfo = await detectChainInfo(config);
    console.log(`🌐 Target Network: ${chainInfo.name} (Chain ID: ${chainInfo.chainId})`);
    
    // Step 3: Load wallet from keystore
    console.log('\n🔐 Loading wallet from keystore...');
    const keystoreJson = readFileSync(config.keeperKeystore, 'utf8');
    const pswd = await getKeystorePassword();
    
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, pswd);
    console.log('👤 Loaded wallet:', wallet.address);
    
    // Step 4: Connect to network
    const provider = new ethers.providers.JsonRpcProvider(config.ethRpcUrl);
    const deployer = wallet.connect(provider);
    
    const balance = await deployer.getBalance();
    console.log('💰 Account balance:', ethers.utils.formatEther(balance), 'ETH');
    
    // Balance check for Hemi - much lower gas costs
    const minRequiredBalance = ethers.utils.parseEther('0.0005'); // 0.0005 ETH minimum for Hemi
    if (balance.lt(minRequiredBalance)) {
      console.warn('⚠️  WARNING: Low balance detected!');
      console.warn('💡 You may need more ETH for deployment');
    } else {
      console.log('✅ Balance sufficient for Hemi deployment');
    }
    
    // Step 5: Verify network matches
    const networkCheck = await provider.getNetwork();
    if (networkCheck.chainId !== chainInfo.chainId) {
      throw new Error(`Network mismatch! Config suggests ${chainInfo.chainId}, connected to ${networkCheck.chainId}`);
    }
    
    console.log('\n📋 Deployment Configuration:');
    console.log(`- Network: ${chainInfo.name} (${chainInfo.chainId})`);
    console.log(`- Ajna Pool Factory: ${config.ajna.erc20PoolFactory}`);
    console.log(`- Deployer: ${deployer.address}`);
    
    // Step 6: Execute deployment (CORRECT ORDER)
    const addresses: DeploymentAddresses = {};
    
    // Deploy factory FIRST
    addresses.factory = await deployFactory(deployer, config.ajna.erc20PoolFactory, chainInfo.chainId);
    
    // ADD DELAY AFTER FACTORY DEPLOYMENT
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay


    // Deploy Uniswap V3 taker if configured
    if (config.universalRouterOverrides) {
      addresses.uniswapTaker = await deployUniswapTaker(
        deployer,
        config.ajna.erc20PoolFactory,
        addresses.factory,  // Pass factory address for authorization
        chainInfo.chainId
      );
    // ADD DELAY AFTER UNISWAP DEPLOYMENT
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }

    // Deploy SushiSwap taker if configured
    if (config.sushiswapRouterOverrides) {
      addresses.sushiTaker = await deploySushiSwapTaker(
        deployer,
        config.ajna.erc20PoolFactory,
        addresses.factory,
        chainInfo.chainId
      ); 
    // ADD DELAY AFTER UNISWAP DEPLOYMENT
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }

    if (config.uniswapV4RouterOverrides) {
      // ✅ Validate poolManager exists
      if (!config.uniswapV4RouterOverrides.poolManager) {
        throw new Error('Missing uniswapV4RouterOverrides.poolManager address');
      }
      if (!addresses.factory) {
        throw new Error('Factory must be deployed before UniswapV4KeeperTaker');
      }

      addresses.uniswapV4 = await deployUniswapV4KeeperTaker(
        deployer,
        config.uniswapV4RouterOverrides.poolManager,
        addresses.factory,  // Pass factory address for authorization
        chainInfo.chainId
      );
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Deploy curve taker if configured
    // if (config.curveRouterOverrides) {
    //   addresses.curveTaker = await deployCurveKeeperTaker(
    //   deployer,
    //   config.ajna.erc20PoolFactory,
    //   addresses.factory,
    //   chainInfo.chainId
    //   );
    // // ADD DELAY AFTER CURVE DEPLOYMENT
    // await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    // }
    // ADD DELAY BEFORE CONFIGURATION
    console.log('\n⏳ Waiting before configuration...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

    
    // Step 7: Configure factory
    if (!addresses.factory) {
      throw new Error('Missing factory address for configuration');
    }
    await configureFactory(deployer, addresses.factory, addresses, chainInfo.chainId);  // ✅ ADD chainInfo.chainId
    
    

    // Step 8: Verify everything works
    await verifyDeployment(deployer, addresses);
    
    // Step 9: Generate configuration update instructions
    generateConfigUpdate(addresses, configPath, chainInfo.name);
    
  } catch (error: any) {
    console.error('\n💥 Deployment failed:', error.message);
    
    // Provide helpful troubleshooting tips
    if (error.message?.includes('insufficient funds')) {
      console.log('\n💡 Tip: Add more ETH to your wallet for deployment');
      console.log('💰 Recommended: 0.01+ ETH for large contract deployments');
    } else if (error.message?.includes('nonce')) {
      console.log('\n💡 Tip: Try again - might be a nonce issue');
      console.log('🔄 Or wait a few seconds and retry');
    } else if (error.message?.includes('gas')) {
      console.log('\n💡 Tip: Gas issues detected');
      console.log('⛽ The script now uses manual gas limits');
      console.log('💰 You may need more ETH for the deployment');
      console.log('🔄 Try adding more ETH and retrying');
    } else if (error.message?.includes('Contract artifacts not found')) {
      console.log('\n💡 Tip: Compile contracts first: yarn compile');
    } else if (error.message?.includes('Cannot find module')) {
      console.log('\n💡 Tip: Make sure contracts are compiled: yarn compile');
    } else if (error.message?.includes('incorrect password')) {
      console.log('\n💡 Tip: Check your keystore password and try again');
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default main;
