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
  ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/PRIVATE',  //GET YOUR OWN ALCHEMY URL
  subgraphUrl: 'https://api.goldsky.com/api/public/PRIVATE/subgraphs/ajna-avalanche/v0.1.9-rc10/gn',//GET GOLDSKY SUBGRAPH OR LOCAL SUBGRAPH
  keeperKeystore: 'FULL_PATH/keystore.json', //YOU NEED FULL PATH TO YOUR KEYSTORE
  keeperTaker: '',  // Deploy smart contract using: yarn compile && scripts/query-1inch.ts --config [config] --action deploy
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 11907934,
  delayBetweenRuns: 15,
  delayBetweenActions: 61, //THIS IS IN SECONDS AND NEEDS TO BE CONSERVATIVE FOR FREE TIER OF 1INCH API KEY
  logLevel: 'debug',
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche
  },
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native AVAX
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
    savusd: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E', //savUSD on Avalanche
    usd_t1: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd', // Your USD_T1 token
    usd_t2: '0xAD47a9b2Bc081D074EC25A0953DDC11E650b1784', // Your USD_T2 token
  },
  //uniswapOverrides: {
  //  wethAddress: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH.e
  //  uniswapV3Router: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE', // UniversalRouter
  //},
  
  universalRouterOverrides: {
  universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Avalanche UniversalRouter
  wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // wrapped AVAX an intermediary token
  permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  defaultFeeTier: 3000, // 0.3% as default for this chain
  defaultSlippage: 0.5, // 0.5% as default slippage
  poolFactoryAddress: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
},

  //1inch connectorToken addresses to find the best path to destination token
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
  coinGeckoApiKey: 'private', //YOU NEED TO GET A COINGECKO API KEY, IF NOT USING STATIC PRICES
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

          // New take settings using 1inch
          liquiditySource: LiquiditySource.ONEINCH,
          marketPriceFactor: 0.98, // Take when auction price is 1% below 1inch market price

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
          useOneInch: true                                       // Set to true for 1inch
        },
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
      },
      collectBond: true, // Collect liquidation bonds
      collectLpReward: {
        redeemFirst: TokenToCollect.COLLATERAL, // For kickers, redeem collateral first
        minAmountQuote: 0.001, // Minimum quote to redeem
        minAmountCollateral: 0.001, // Minimum collateral to redeem
        // Configure both collateral to use Uniswap to get back quote_token
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd', // USD_T1
          targetToken: 'usd_t2', // Or keep as USD_T1 if preferred
          slippage: 2,
          useOneInch: false, // Use Uniswap V3
          fee: FeeAmount.MEDIUM,
        },
      },
    },
  ]
};

export default config;
