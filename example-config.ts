import { FeeAmount } from '@uniswap/v3-sdk';
import {
  KeeperConfig,
  PriceOriginPoolReference,
  PriceOriginSource,
  RewardActionLabel,
  TokenToCollect,
} from './src/config-types';

const config: KeeperConfig = {
  dryRun: true,
  logLevel: 'info',
  ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/<api-key>',
  subgraphUrl:
    'https://api.studio.thegraph.com/query/49479/ajna-base/version/latest',
  keeperKeystore: '/home/anon/keystore-files/keeper-keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 5022,
  delayBetweenRuns: 15,
  delayBetweenActions: 1,
  oneInchRouters: {
    1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    43114: '0x1111111254EEB25477B68fb85Ed929f73A960582',
  },
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    weth: '0x4200000000000000000000000000000000000006',
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
  coinGeckoApiKey: '<api-key>',
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
        priceFactor: 0.9,
      },
      collectBond: true,
      collectLpReward: {
        redeemAs: TokenToCollect.QUOTE,
        minAmount: 0.001,
        rewardAction: {
          action: RewardActionLabel.EXCHANGE,
          address: '0xaddressOfWstETH',
          targetToken: 'weth',
          slippage: 1,
          useOneInch: false,
          fee: FeeAmount.LOW,
        },
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
        priceFactor: 0.9,
      },
      collectBond: true,
      collectLpReward: {
        redeemAs: TokenToCollect.COLLATERAL,
        minAmount: 0.001,
        rewardAction: {
          action: RewardActionLabel.TRANSFER,
          to: '0x0000000000000000000000000000000000000000',
        },
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
        priceFactor: 0.9,
      },
      collectBond: true,
      collectLpReward: {
        redeemAs: TokenToCollect.QUOTE,
        minAmount: 0.001,
      },
    },
  ],
};

export default config;
