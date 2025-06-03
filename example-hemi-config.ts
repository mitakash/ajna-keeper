import {
  KeeperConfig,
  RewardActionLabel,
  PriceOriginSource,
  TokenToCollect,
  LiquiditySource
} from './src/config-types';
import { FeeAmount } from '@uniswap/v3-sdk';

const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: 'https://rpc.hemi.network/rpc', //THIS CURRENTLY WORKS FOR HEMI, BUT THEY MIGHT RATE LIMIT IN THE FUTURE
  subgraphUrl: 'https://api.goldsky.com/api/public/project_PRIVATE_ID_YOU_NEED_FROM_GOLDSKY/subgraphs/ajna-hemi/1.0.0/gn', //YOU NEED TO CHANGE THIS
  keeperKeystore: 'FULL_PATH/keystore.json', //YOU NEED TO CHANGE THIS
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 484490,
  delayBetweenRuns: 2,  //IN SECONDS
  delayBetweenActions: 31, //VERY CONSERVATIVE 31 SECONDS BETWEEN ACTIONS
  logLevel: 'debug',
  
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006', // Wrapped ETH on HEMI
    usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // Your USD_T1 token
    usd_t2: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // Your USD_T2 token
    usd_t3: '0x9f60ec2c81308c753e84467e2526c7d8fc05cd0d', // Your USD_T3 token
    usd_t4: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde', // Your USD_T4 token
  },
  
  universalRouterOverrides: {
  universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B', // HEMI UniversalRouter based on gov proposal
  wethAddress: '0x4200000000000000000000000000000000000006', // wrapped AVAX an intermediary token
  permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
  defaultFeeTier: 3000, // 0.3% as default for this chain
  defaultSlippage: 0.5, // 0.5% as default slippage
  poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
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
  coinGeckoApiKey: 'PRIVATE', //GET YOUR OWN COINGECKO API KEY
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
        hpbPriceFactor: 0.99, // ArbTake when price < hpb * 0.99
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure both collateral to use Uniswap to get back quote_token
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // USD_T1
          targetToken: 'usd_t2', // Or keep as USD_T1 if preferred
          slippage: 2,
          useOneInch: false, // Use Uniswap V3
          fee: FeeAmount.MEDIUM,
        },
      },
      // Settlement configuration for test tokens - aggressive settings for faster testing
      settlement: {
        enabled: true,                    // Enable settlement
        minAuctionAge: 18000,             // Wait 5 hour before settling (good for testing)
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
        value: 0.99, // Static price ratio USD_T1/USD_T2
      },
      kick: {
        minDebt: 0.1, // Minimum debt in USD_T2 to kick
        priceFactor: 0.99, // Kick when NP * 0.99 > current price
      },
      take: {
        minCollateral: 0.1, // Enable arbTake when collateral >= 0.1
        hpbPriceFactor: 0.99, // ArbTake when price < hpb * 0.99
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure both collateral to use Uniswap to get back quote_token
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde', // USD_T4
          targetToken: 'usd_t3', // Or keep as USD_T3 if preferred
          slippage: 2,
          useOneInch: false, // Use Uniswap V3
          fee: FeeAmount.MEDIUM,
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
  ]
};

export default config;
