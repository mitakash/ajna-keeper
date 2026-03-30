import 'dotenv/config';
import {
  KeeperConfig,
  RewardActionLabel,
  PriceOriginSource,
  TokenToCollect,
  LiquiditySource,
  PostAuctionDex,
  CurvePoolType
} from './src/config-types';

const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, // Or use Base/Avalanche
  subgraphUrl: `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/YOUR_SUBGRAPH_ID`,
  keeperKeystore: '/path/to/your/keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 11907934, // Adjust for your network
  delayBetweenRuns: 15,
  delayBetweenActions: 35,
  logLevel: 'debug',
  
  // Factory system for Curve integration (requires deployment)
  keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
  takerContracts: {
    'Curve': '0x[DEPLOYED_CURVE_TAKER_ADDRESS]',
  },

  // Curve-specific configuration
  // NOTE: Curve pools often contain 3+ tokens, but you specify the exact pool address
  // that contains your desired token pair, even if that pool has additional tokens.
  curveRouterOverrides: {
    poolConfigs: {
      // STABLE pools (3-pool stablecoin example)
      // Both pairs below might use the same 3-pool address containing USDC/USDT/DAI
      'usdc-usdt': {
        address: '0x[YOUR_STABLECOIN_POOL_ADDRESS]', // Replace with actual 3-pool address
        poolType: CurvePoolType.STABLE
      },
      'usdc-dai': {
        address: '0x[YOUR_STABLECOIN_POOL_ADDRESS]', // Same pool as above if it's a 3-pool
        poolType: CurvePoolType.STABLE
      },
      // CRYPTO pools (tricrypto example)  
      // Both pairs below might use the same tricrypto pool containing ETH/BTC/USDT
      'weth-wbtc': {
        address: '0x[YOUR_CRYPTO_POOL_ADDRESS]', // Replace with actual tricrypto address
        poolType: CurvePoolType.CRYPTO
      },
      'weth-usdc': {
        address: '0x[YOUR_CRYPTO_POOL_ADDRESS]', // Same pool if it contains all 3 tokens
        poolType: CurvePoolType.CRYPTO
      }
    },
    defaultSlippage: 1.0, // 1% slippage tolerance
    wethAddress: '0x4200000000000000000000000000000000000006' // Replace with your network's WETH
  },

  // Token addresses for symbol lookup (required for Curve)
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006', // Replace with your WETH
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Replace with your USDC
    usdt: '0x[YOUR_USDT_ADDRESS]', // Replace with your USDT
    dai: '0x[YOUR_DAI_ADDRESS]', // Replace with your DAI  
    wbtc: '0x[YOUR_WBTC_ADDRESS]', // Replace with your WBTC
  },
  
  // Network-specific addresses (replace with your network's addresses)
  ajna: {
    erc20PoolFactory: '0x[YOUR_AJNA_FACTORY]', // Replace with actual address
    erc721PoolFactory: '0x[YOUR_AJNA_ERC721_FACTORY]',
    poolUtils: '0x[YOUR_POOL_UTILS]',
    positionManager: '0x[YOUR_POSITION_MANAGER]',
    ajnaToken: '0x[YOUR_AJNA_TOKEN]',
    grantFund: '',
    burnWrapper: '',
    lenderHelper: '',
  },
  
  coinGeckoApiKey: process.env.COINGECKO_API_KEY, // Get a free key from https://www.coingecko.com/en/developers/dashboard
  
  pools: [
    // Stablecoin pool example using Curve
    {
      name: 'USDC/USDT',
      address: '0x[YOUR_AJNA_POOL_ADDRESS]', // Replace with actual Ajna pool address
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.00, // USDC to USDT approximately 1:1
      },
      kick: {
        minDebt: 0.07,
        priceFactor: 0.99,
      },
      take: {
        minCollateral: 0.01, // Enable external takes when collateral >= 0.01
        liquiditySource: LiquiditySource.CURVE, // Use Curve for external takes
        marketPriceFactor: 0.99, // Take when auction < market * 0.99
        // ArbTake backup configuration
        hpbPriceFactor: 0.98, // ArbTake when price < hpb * 0.98
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.001,
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x[YOUR_COLLATERAL_TOKEN]", // Replace with collateral token address
          targetToken: "usdc", // Target token symbol (must match tokenAddresses)
          slippage: 1,
          dexProvider: PostAuctionDex.CURVE, // Use Curve for LP reward swaps
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 18000, // 5 hours
        maxBucketDepth: 100,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    },
    
    // Crypto pair example using Curve
    {
      name: 'WETH/WBTC',
      address: '0x[YOUR_CRYPTO_AJNA_POOL]', // Replace with actual crypto pool
      price: {
        source: PriceOriginSource.FIXED,
        value: 15.5, // Approximate WETH to WBTC ratio (adjust based on current rates)
      },
      kick: {
        minDebt: 0.0001, // Lower threshold for crypto assets
        priceFactor: 0.99,
      },
      take: {
        minCollateral: 0.0001, // Lower threshold for crypto
        liquiditySource: LiquiditySource.CURVE, // Use Curve for external takes
        marketPriceFactor: 0.97, // More conservative for volatile pairs
        hpbPriceFactor: 0.95, // ArbTake backup
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 0.0001, // Lower for crypto
        minAmountCollateral: 0.0001, // Lower for crypto
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x[YOUR_CRYPTO_COLLATERAL]", // Replace with crypto token address
          targetToken: "weth", // Target WETH
          slippage: 3, // Higher slippage for crypto pairs
          dexProvider: PostAuctionDex.CURVE, // Use Curve
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 14400, // 4 hours (shorter for crypto)
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: true,
      },
    },
  ]
};

export default config;