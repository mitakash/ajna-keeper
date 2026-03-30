import 'dotenv/config';
import { FeeAmount } from '@uniswap/v3-sdk';
import {
  KeeperConfig,
  PriceOriginPoolReference,
  PriceOriginSource,
  RewardActionLabel,
  TokenToCollect,
  LiquiditySource,
  PostAuctionDex,
} from './src/config-types';

const config: KeeperConfig = {
  // Start in dry-run mode for testing
  dryRun: true,
  logLevel: 'debug',

  // Base Chain RPC - Uses Alchemy API key from .env file
  ethRpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,

  // Subgraph URL - The Graph gateway (requires API key from https://thegraph.com/studio/)
  subgraphUrl: `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/9npza28cZyi8R94SJjm9Y3fuWeBZZK4CHr2r8NCvsr98`,

  // Keystore path - update to your keystore location
  keeperKeystore: '/path/to/your/keystore.json',

  // Base Chain Multicall
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 5022,

  // Timing configuration (conservative for testing)
  delayBetweenRuns: 30,      // 30 seconds between cycles
  delayBetweenActions: 2,     // 2 seconds between actions

  // 1inch Router Configuration (optional for now)
  oneInchRouters: {
    8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',  // Base
  },

  // Token addresses on Base
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },

  // Universal Router configuration for Uniswap V3 on Base
  universalRouterOverrides: {
    universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    quoterV2Address: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    defaultFeeTier: 3000,      // 0.3% fee tier
    defaultSlippage: 0.5,      // 0.5% slippage
  },

  // Ajna contract addresses on Base
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

  // CoinGecko API Key - Optional, will fallback to Alchemy Prices API if not provided
  // Get a free key from https://www.coingecko.com/en/developers/dashboard
  coinGeckoApiKey: process.env.COINGECKO_API_KEY,

  // Pool configurations - Example pools on Base
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
        // External takes disabled for now - enable after contract deployment
        // liquiditySource: LiquiditySource.UNISWAPV3,
        // marketPriceFactor: 0.98,
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.001,
        minAmountCollateral: 1000,
      },
      settlement: {
        enabled: true,
        minAuctionAge: 18000,     // 5 hours
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: true,
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
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 1000,
        minAmountCollateral: 0.001,
      },
      settlement: {
        enabled: true,
        minAuctionAge: 18000,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: true,
      },
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
      settlement: {
        enabled: true,
        minAuctionAge: 18000,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: true,
      },
    },
  ],
};

export default config;
