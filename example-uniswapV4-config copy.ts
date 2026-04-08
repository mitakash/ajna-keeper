import {
  KeeperConfig,
  RewardActionLabel,
  PriceOriginSource,
  TokenToCollect,
  LiquiditySource,
  PostAuctionDex,
} from './src/config-types';

const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz',
  subgraphUrl: 'https://api.goldsky.com/api/public/project_cme0ohnrjwmp301tb9p300h2a/subgraphs/ajna-base/1.0.0/gn',
  keeperKeystore: '/Users/bigdellis/keystore-files/keeper-keystore2.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 11907934,
  delayBetweenRuns: 5,  // Faster polling - check every 5 seconds
  delayBetweenActions: 10,  // Faster actions - reduce delay between operations
  logLevel: 'debug',

  keeperTakerFactory: '0x237c94A15edFA2aBb80253e078834F053CDb853A',
  takerContracts: {
    'UniswapV4': '0x68d1C8e4D315Ce565cB04A1C4289D948187e7675',
  },

  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native AVAX
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
    savusd: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E', // savUSD on Avalanche
    usd_t1: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd', // Your USD_T1 token
    usd_t2: '0xAD47a9b2Bc081D074EC25A0953DDC11E650b1784', // Your USD_T2 token
    test_A1: '0x2354201FDeA4b038B582B16545fb9BB8a222Fc81',
    test_A2: '0xCAA2495035FCb92E9175Dbc1c6C79909aa545EF7',
    test_A3: '0x9A19D2A451C607248D027c5E3d94585B97d41427',
    test_A4: '0x5dB99e789514eC42200e1B7BaA243823Aa1f9cEC',
    b_t1: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
    b_t2: '0xd8A0af85E2539e22953287b436255422724871AB',
    b_t3: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
    b_t4: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
    weth: '0x4200000000000000000000000000000000000006',
  },
  
  // ✅ FIXED: V4 Configuration for BASE network
  uniswapV4RouterOverrides: {
    router: '0x6ff5693b99212da76ad316178a184ab56d299b43',        // ✅ Universal Router (Base)
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',   // ✅ PoolManager (Base) - lowercase
    stateView: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',    // ✅ StateView (Base) - explicit to avoid default lookup flaking
    defaultSlippage: 0.5,
    
    pools: {
      // B_T1/B_T2 pool - both tokens are 6 decimals
      'B_T1-B_T2': {
        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // B_T1 (6 decimals)
        token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2 (6 decimals)
        fee: 100,
        tickSpacing: 1,
        hooks: '0x0000000000000000000000000000000000000000',
      },
      
      // B_T3/B_T4 pool - 0.01% fee with tickSpacing 1
      'B_T3-B_T4': {
        token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
        token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
        fee: 100,
        tickSpacing: 1,  // Fixed: was 10, actual pool uses 1
        hooks: '0x0000000000000000000000000000000000000000',
      },

      'B_T2-B_T4': {
        token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
        fee: 500,
        tickSpacing: 10,
        hooks: '0x0000000000000000000000000000000000000000',
      }
    }
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

  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY', // ⚠️ Replace with actual key

  pools: [
    {
      name: 'B_T2/B_T4 Test Pool',
      address: '0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.0,
      },
      kick: {
        minDebt: 0.001,  
        priceFactor: 0.99, 
      },
      take: {
        liquiditySource: LiquiditySource.UNISWAPV4,
        marketPriceFactor: 1.01,  // Very aggressive - take even at slight premium
        minCollateral: 0.0001,  // Lower threshold
        hpbPriceFactor: 1.02,  // More aggressive on HPB
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.001,
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0xd8A0af85E2539e22953287b436255422724871AB",
          targetToken: "b_t4",
          slippage: 5,
          dexProvider: PostAuctionDex.UNISWAP_V4,
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 3600,
        maxBucketDepth: 50,
        maxIterations: 10,   // Increased from 5 - logs showed 5 wasn't enough for some auctions
        checkBotIncentive: false,
      },
    },
    {
      name: 'B_T2/B_T1 Test Pool',
      address: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.0,
      },
      kick: {
        minDebt: 0.001,  // Lower threshold - kick smaller debts
        priceFactor: 0.99, 
      },
      take: {
        liquiditySource: LiquiditySource.UNISWAPV4,
        marketPriceFactor: 1.01,  // Very aggressive - take even at slight premium
        minCollateral: 0.0001,  // Lower threshold
        hpbPriceFactor: 1.02,  // More aggressive on HPB
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.001,
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0xd8A0af85E2539e22953287b436255422724871AB",
          targetToken: "b_t1",
          slippage: 5,
          dexProvider: PostAuctionDex.UNISWAP_V4,
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 3600,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    },
    {
      name: 'B_T3/B_T4 Test Pool',
      address: '0xf44ed07f91be6a46296084d4951a27015c58ff32',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.0,
      },
      kick: {
        minDebt: 0.001,  // Lower threshold - kick smaller debts
        priceFactor: 0.99, 
      },
      take: {
        liquiditySource: LiquiditySource.UNISWAPV4,
        marketPriceFactor: 1.01,  // Very aggressive - take even at slight premium
        minCollateral: 0.0001,  // Lower threshold
        hpbPriceFactor: 1.02,  // More aggressive on HPB
      },
      collectBond: true,
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL,
        minAmountQuote: 0.001,
        minAmountCollateral: 0.001,
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x082b59dCB966FEa684b8C5F833b997b62BB0ca20",
          targetToken: "b_t4",
          slippage: 5,
          dexProvider: PostAuctionDex.UNISWAP_V4,
        },
      },
      settlement: {
        enabled: true,
        minAuctionAge: 3600,
        maxBucketDepth: 50,
        maxIterations: 10,
        checkBotIncentive: false,
      },
    }
  ],

};

export default config;