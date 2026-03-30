import 'dotenv/config';
import {
  KeeperConfig,
  RewardActionLabel,
  PriceOriginSource,
  TokenToCollect,
  LiquiditySource,  // Import for external takes
  PostAuctionDex    // NEW: Import for LP reward swaps
} from './src/config-types';
import { FeeAmount } from '@uniswap/v3-sdk';

const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  subgraphUrl: `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/YOUR_AVALANCHE_SUBGRAPH_ID`,
  keeperKeystore: '/path/to/your/keystore.json',
  
  // 1inch Single Contract Setup for External Takes (deploy with scripts/query-1inch.ts --action deploy)
  keeperTaker: '0x[DEPLOY_WITH_query-1inch.ts]',  // Deploy smart contract using: yarn compile && scripts/query-1inch.ts --config [config] --action deploy
  
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 11907934,
  delayBetweenRuns: 15,
  delayBetweenActions: 61, // THIS IS IN SECONDS AND NEEDS TO BE CONSERVATIVE FOR FREE TIER OF 1INCH API KEY
  logLevel: 'debug',
  
  // 1inch Router Configuration for External Takes
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche
  },
  
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native AVAX
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
    savusd: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E', // savUSD on Avalanche
    usd_t1: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd', // Your USD_T1 token
    usd_t2: '0xAD47a9b2Bc081D074EC25A0953DDC11E650b1784', // Your USD_T2 token
  },
  
  // Universal Router configuration (for LP reward swapping via Uniswap V3)
  universalRouterOverrides: {
    universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Avalanche UniversalRouter
    wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // wrapped AVAX as intermediary token
    permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    defaultFeeTier: 3000, // 0.3% as default for this chain
    defaultSlippage: 0.5, // 0.5% as default slippage
    poolFactoryAddress: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
  },

  // 1inch connector token addresses to find the best path to destination token
  connectorTokens: [
    '0x24de8771bc5ddb3362db529fc3358f2df3a0e346',
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  ],
  
  // Avalanche-specific Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0x2aA2A6e6B4b20f496A4Ed65566a6FD13b1b8A17A',
    erc721PoolFactory: '0xB3d773147A086A23fB72dcc03828C66DcE5D6627',
    poolUtils: '0x9e407019C07b50e8D7C2d0E2F796C4eCb0F485b3',
    positionManager: '0x0bf183a32614b3Cd11C0268441D96047D05967e0',
    ajnaToken: '0xE055Ee581c637C419e55B8d5fFBA84375546f70f',
    grantFund: '',
    burnWrapper: '',
    lenderHelper: '',
  },
  coinGeckoApiKey: process.env.COINGECKO_API_KEY, // Get a free key from https://www.coingecko.com/en/developers/dashboard
  pools: 
  [
    {
      name: 'savusd / usdc',
      address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
      price: {
          source: PriceOriginSource.FIXED,
          value: 1.04,
        },
        kick: {
          minDebt: 0.07,
          priceFactor: 0.99,
  	},
      take: {
          minCollateral: 0.07,
          hpbPriceFactor: 0.90,

          // External Takes via 1inch (requires keeperTaker deployment)
          liquiditySource: LiquiditySource.ONEINCH,
          marketPriceFactor: 0.98, // Take when auction price < market * 0.98

        },	
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.01,       // don't redeem LP for less than a penny
        minAmountCollateral: 0.05,  // don't redeem LP for less than what it may cost to swap collateral for USDC
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x06d47F3fb376649c3A9Dafe069B3D6E35572219E", // Token to swap (savUSD)
          targetToken: "usdc",                                   // Target token (USDC)
          slippage: 1,                                           // Slippage percentage (0-100)
          dexProvider: PostAuctionDex.ONEINCH,                   // NEW: Use enum instead of useOneInch: true
        },
      },
      // Settlement configuration for stable pools - conservative settings
      settlement: {
        enabled: true,                    // Enable settlement
        minAuctionAge: 18000,             // Wait 5 hours for stable pools (18000 seconds)
        maxBucketDepth: 100,             // Process more buckets for stable pools
        maxIterations: 8,                // More iterations may be needed for complex settlements
        checkBotIncentive: false,        // Settle even without kicker rewards for stable pools, being altruistic for the pool
      },
    },
    {
      name: 'USD_T1 / USD_T2',
      address: '0x87250b9d571aac691f9a14205ecd2a0259f0bf72',
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
        hpbPriceFactor: 0.99, // ArbTake when price < hpb * 0.99
        
        // OPTION: Could also use 1inch for external takes here
        // liquiditySource: LiquiditySource.ONEINCH,
        // marketPriceFactor: 0.98,
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure collateral to use Uniswap V3 to get back quote_token (no external contracts needed for LP rewards)
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd', // USD_T1
          targetToken: 'usd_t2', // Or keep as USD_T1 if preferred
          slippage: 2,
          dexProvider: PostAuctionDex.UNISWAP_V3, // NEW: Use enum instead of useOneInch: false
          fee: FeeAmount.MEDIUM,
        },
      },
      // Settlement configuration for test tokens - standard settings
      settlement: {
        enabled: true,                    // Enable settlement
        minAuctionAge: 3600,             // Wait 1 hour before settling (3600 seconds)
        maxBucketDepth: 50,              // Process 50 buckets per settlement call
        maxIterations: 10,               // Max 10 settlement iterations
        checkBotIncentive: true,         // Only settle if bot has rewards to claim
      },
    },
  ]
};

export default config;