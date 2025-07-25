import { FeeAmount } from '@uniswap/v3-sdk';
import {
  KeeperConfig,
  PriceOriginPoolReference,
  PriceOriginSource,
  RewardActionLabel,
  TokenToCollect,
  LiquiditySource,  // ← NEW: Import for external takes
} from './src/config-types';

const config: KeeperConfig = {
  dryRun: true,
  logLevel: 'info',
  ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  subgraphUrl: 'https://api.studio.thegraph.com/query/49479/ajna-base/version/latest',
  keeperKeystore: '/home/anon/keystore-files/keeper-keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 5022,
  delayBetweenRuns: 15,
  delayBetweenActions: 1,
  
  // ← NEW: 1inch Router Configuration (for chains with 1inch support)
  oneInchRouters: {
    1: '0x1111111254EEB25477B68fb85Ed929f73A960582',    // Ethereum
    8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',  // Base
    43114: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Avalanche
  },
  
  // ← OPTION 1: Single Contract Setup (for 1inch integration)
  // keeperTaker: '0x[DEPLOY_WITH_query-1inch.ts]',
  
  // ← OPTION 2: Factory System Setup (for Uniswap V3 and future DEXs)
  // keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
  // takerContracts: {
  //   'UniswapV3': '0x[DEPLOYED_TAKER_ADDRESS]'
  // },
  
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    weth: '0x4200000000000000000000000000000000000006',
  },
  
  // ← NEW: Connector tokens for 1inch optimization
  connectorTokens: [
    '0x24de8771bc5ddb3362db529fc3358f2df3a0e346',
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  ],
  
  // ← ENHANCED: Universal Router configuration (for Uniswap V3 integration)
  universalRouterOverrides: {
    universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Base UniversalRouter
    wethAddress: '0x4200000000000000000000000000000000000006', // WETH on Base
    permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    defaultFeeTier: 3000, // 0.3% fee tier
    defaultSlippage: 0.5, // 0.5% slippage tolerance
    poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Base pool factory
    quoterV2Address: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', // ← NEW: QuoterV2 for accurate pricing
  },
  
  ajna: {
    erc20PoolFactory: '0x214f62B5836D83f3D6c4f71F174209097B1A779C',
    erc721PoolFactory: '0xeefEC5d1Cc4bde97279d01D88eFf9e0fEe981769',
    poolUtils: '0x97fa9b0909C238D170C1ab3B5c728A3a45BBEcBa',
    positionManager: '0x59710a4149A27585f1841b5783ac704a08274e64',
    ajnaToken: '0xf0f326af3b1Ed943ab95C29470730CC8Cf66ae47',
    grantFund: '',
    burnWrapper: '',
    lenderHelper: '',
  },
  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
  pools: [
    {
      name: 'wstETH / WETH',
      address: '0x63a366fc5976ff72999c89f69366f388b7d233e8',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.15,
      },
      kick: {
        minDebt: 0.07,
        priceFactor: 0.9,
      },
      take: {
        minCollateral: 0.01,
        hpbPriceFactor: 0.9,
        
        // ← NEW: External Takes Example - uncomment and configure after contract deployment
        // liquiditySource: LiquiditySource.ONEINCH,      // Use 1inch (requires keeperTaker)
        // liquiditySource: LiquiditySource.UNISWAPV3,    // Use Uniswap V3 (requires keeperTakerFactory)
        // marketPriceFactor: 0.98,                       // Take when auction < market * 0.98
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.001,
        minAmountCollateral: 1000,
        rewardActionQuote: {
          action: RewardActionLabel.EXCHANGE,
          address: '0xaddressOfWstETH',
          targetToken: 'weth',
          slippage: 1,
          useOneInch: false,
          fee: FeeAmount.LOW,
        },
      },
      // Settlement configuration - handles completed auctions and bad debt
      settlement: {
        enabled: true,                    // Enable automatic settlement
        minAuctionAge: 18000,             // Wait 5 hours before settling (18000 seconds), Ajna auction price is at market price after 6 hours
        maxBucketDepth: 50,              // Process up to 50 buckets per settlement call
        maxIterations: 10,               // Maximum settlement iterations per auction
        checkBotIncentive: true,         // Only settle auctions this bot kicked (has bond rewards to recover), set to false if you are altruistic
      },
    },
    {
      name: 'WETH / USDC',
      address: '0x0b17159f2486f669a1f930926638008e2ccb4287',
      price: {
        source: PriceOriginSource.COINGECKO,
        query: 'price?ids=ethereum&vs_currencies=usd',
      },
      kick: {
        minDebt: 50,
        priceFactor: 0.95,
      },
      take: {
        minCollateral: 0.01,
        hpbPriceFactor: 0.9,
        
        // ← NEW: Example external take configuration for major pool
        // liquiditySource: LiquiditySource.ONEINCH,
        // marketPriceFactor: 0.99,  // More conservative for volatile pairs
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 1000,
        minAmountCollateral: 0.001,
        rewardActionCollateral: {
          action: RewardActionLabel.TRANSFER,
          to: '0x0000000000000000000000000000000000000000',
        },
      },
      // Settlement disabled for this pool - bonds may be locked longer
      // settlement: {
      //   enabled: false,
      // },
    },
    {
      name: 'cbETH / WETH',
      address: '0xcb1953ee28f89731c0ec088da0720fc282fcfa9c',
      price: {
        source: PriceOriginSource.POOL,
        reference: PriceOriginPoolReference.LUP,
      },
      kick: {
        minDebt: 0.08,
        priceFactor: 0.95,
      },
      take: {
        minCollateral: 0.01,
        hpbPriceFactor: 0.9,
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.001,
        minAmountCollateral: 100,
      },
    },
    {
      name: 'savUSD / USDC',
      address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.01,
      },
      kick: {
        minDebt: 0.07,
        priceFactor: 0.99,
      },
      take: {
        minCollateral: 0.07,
        hpbPriceFactor: 0.98,
        
        // ← NEW: Stable pair external take example
        liquiditySource: LiquiditySource.ONEINCH,
        marketPriceFactor: 0.98,  // Stable pairs can be more aggressive
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.05,
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E',
          targetToken: 'usdc',
          slippage: 1,
          useOneInch: true,  // ← LP reward swapping via 1inch (no contracts needed)
        },
      },
      // Settlement with longer wait time for stable pools
      settlement: {
        enabled: true,
        minAuctionAge: 18000,             // Wait 5 hours for stable pools (18000 seconds)
        maxBucketDepth: 100,             // Process more buckets for stable pools
        maxIterations: 5,                // Fewer iterations expected for stable pools
        checkBotIncentive: false,        // Settle ANY auction (even if this bot didn't kick it) for pool health
      },
    },
  ],
};

export default config;