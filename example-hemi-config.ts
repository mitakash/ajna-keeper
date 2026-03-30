import 'dotenv/config';
import {
  KeeperConfig,
  RewardActionLabel,
  PriceOriginSource,
  TokenToCollect,
  LiquiditySource,  // Import for external takes
  PostAuctionDex    // Import for LP reward swaps
} from './src/config-types';
import { FeeAmount } from '@uniswap/v3-sdk';

const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: 'https://rpc.hemi.network/rpc', // Hemi public RPC (may be rate limited in the future)
  subgraphUrl: `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/YOUR_HEMI_SUBGRAPH_ID`,
  keeperKeystore: '/path/to/your/keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 484490,
  delayBetweenRuns: 2,  // IN SECONDS
  delayBetweenActions: 31, // VERY CONSERVATIVE 31 SECONDS BETWEEN ACTIONS
  logLevel: 'debug',
  
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006', // Wrapped ETH on HEMI
    usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // Your USD_T1 token
    usd_t2: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // Your USD_T2 token
    usd_t3: '0x9f60ec2c81308c753e84467e2526c7d8fc05cd0d', // Your USD_T3 token
    usd_t4: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde', // Your USD_T4 token
  },
  
  // Factory System Setup for External Takes (deploy with scripts/deploy-factory-system.ts)
  keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]', // Factory contract address
  takerContracts: {
    'UniswapV3': '0x[DEPLOYED_UNISWAP_TAKER_ADDRESS]',  // Individual taker contract addresses
    'SushiSwap': '0x[DEPLOYED_SUSHISWAP_TAKER_ADDRESS]' // SushiSwap taker contract
  }, 
  
  // Universal Router configuration for Uniswap V3 with QuoterV2 address
  universalRouterOverrides: {
    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B', // HEMI UniversalRouter based on gov proposal
    wethAddress: '0x4200000000000000000000000000000000000006', // Wrapped ETH on HEMI
    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
    defaultFeeTier: 3000, // 0.3% as default for this chain
    defaultSlippage: 0.5, // 0.5% as default slippage
    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // QuoterV2 for accurate pricing
  },

  // SushiSwap configuration for both external takes and LP reward swaps
  sushiswapRouterOverrides: {
    swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD', // From production test
    quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',   // From production test  
    factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',   // From production test
    wethAddress: '0x4200000000000000000000000000000000000006',      // WETH on Hemi
    defaultFeeTier: 500,    // 0.05% fee tier (from production test)
    defaultSlippage: 10.0,  // 10% conservative slippage (from production test)
  },

  // HEMI-specific Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0xE47b3D287Fc485A75146A59d459EC8CD0F8E5021',
    erc721PoolFactory: '0x3E0126d3B10596b7E13e42E34B7cBD0E9735e4c0',
    poolUtils: '0xab57F608c37879360D622C32C6eF3BBa79AA667D',
    positionManager: '0xCD7496b83D92c5e4F2CD9C90ccC5A5B3a578cF95',
    ajnaToken: '0x63D367531B460Da78a9EBBAF6c1FBFC397E5d40A',
    grantFund: '',
    burnWrapper: '',
    lenderHelper: '',
  },
  coinGeckoApiKey: process.env.COINGECKO_API_KEY, // Get a free key from https://www.coingecko.com/en/developers/dashboard
  pools: 
  [
    {   
      name: 'USD_T1 / USD_T2',
      address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
      price: {
        source: PriceOriginSource.FIXED, // Use fixed price for simpler testing
        value: 0.99, // Static price ratio USD_T1/USD_T2
      },
      kick: {
        minDebt: 0.1, // Minimum debt in USD_T2 to kick
        priceFactor: 0.99, // Kick when NP * 0.99 > current price
      },
      take: {
        minCollateral: 0.1, // Enable arbTake when collateral >= 0.1
        hpbPriceFactor: 0.98, // ArbTake when price < hpb * 0.98
        
        // External Takes via Uniswap V3 (requires factory deployment)
        liquiditySource: LiquiditySource.UNISWAPV3, // Use Uniswap V3 for external takes
        // liquiditySource: LiquiditySource.SUSHISWAP, // Alternative: Use SushiSwap for external takes
        marketPriceFactor: 0.99, // Take when auction price < market * 0.99
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure collateral to use Uniswap V3 to get back quote_token
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // USD_T1
          targetToken: 'usd_t2', // Or keep as USD_T1 if preferred
          slippage: 2,
          dexProvider: PostAuctionDex.UNISWAP_V3, // Use Uniswap V3 for LP rewards
          fee: FeeAmount.MEDIUM,
        },
      },
      // Settlement configuration for test tokens - aggressive settings for faster testing
      settlement: {
        enabled: true,                    // Enable settlement
        minAuctionAge: 18000,             // Wait 5 hours before settling (good for testing)
        maxBucketDepth: 50,              // Process 50 buckets per settlement call
        maxIterations: 10,               // Max 10 settlement iterations
        checkBotIncentive: false,         // set to false to help pool altruistically
      },
    },
    {
      name: 'USD_T4 / USD_T3',
      address: '0xf6d57bcebb553a0c74812386a71984f3ab3b176f',
      price: {
        source: PriceOriginSource.FIXED, // Use fixed price for simpler testing
        value: 0.99, // Static price ratio USD_T4/USD_T3
      },
      kick: {
        minDebt: 0.1, // Minimum debt in USD_T3 to kick
        priceFactor: 0.99, // Kick when NP * 0.99 > current price
      },
      take: {
        minCollateral: 0.1, // Enable arbTake when collateral >= 0.1
        hpbPriceFactor: 0.98, // ArbTake when price < hpb * 0.98
        
        // External Takes via SushiSwap (requires factory deployment)
        liquiditySource: LiquiditySource.SUSHISWAP, // Use SushiSwap for external takes
        // liquiditySource: LiquiditySource.UNISWAPV3, // Alternative: Use Uniswap V3 for external takes
        marketPriceFactor: 0.99, // Take when auction price < market * 0.99
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure collateral to use SushiSwap to get back quote_token
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde', // USD_T4
          targetToken: 'usd_t3', // Or keep as USD_T3 if preferred
          slippage: 10, // Higher slippage for SushiSwap
          dexProvider: PostAuctionDex.SUSHISWAP, // Use SushiSwap for LP rewards
          fee: FeeAmount.LOW, // 0.05% fee tier
        },
      },
      // Settlement configuration - similar to first pool
      settlement: {
        enabled: true,                    // Enable settlement
        minAuctionAge: 18000,             // Wait 5 hours before settling
        maxBucketDepth: 50,              // Process 50 buckets per settlement call
        maxIterations: 10,               // Max 10 settlement iterations
        checkBotIncentive: true,         // Only settle if bot address has rewards to claim
      },
    },
    {
      name: 'Example Mixed DEX Pool',
      address: '0x[example-pool-address]',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.0,
      },
      kick: {
        minDebt: 0.1,
        priceFactor: 0.99,
      },
      take: {
        minCollateral: 0.1,
        hpbPriceFactor: 0.97,
        
        // Example: Use Uniswap V3 for external takes (typically lower slippage)
        liquiditySource: LiquiditySource.UNISWAPV3,
        marketPriceFactor: 0.99,
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.001,
        rewardActionQuote: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x[quote-token-address]',
          targetToken: 'weth',
          slippage: 1,
          dexProvider: PostAuctionDex.UNISWAP_V3, // Use Uniswap V3 for quote rewards
          fee: FeeAmount.MEDIUM,
        },
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x[collateral-token-address]',
          targetToken: 'weth',
          slippage: 10,
          dexProvider: PostAuctionDex.SUSHISWAP, // Use SushiSwap for collateral rewards (higher slippage tolerance)
          fee: FeeAmount.LOW,
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 18000,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: true,
      },
    },
  ]
};

export default config;