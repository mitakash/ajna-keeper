import { FeeAmount } from '@uniswap/v3-sdk';
import {
  KeeperConfig,
  PriceOriginPoolReference,
  PriceOriginSource,
  TokenToCollect,
} from './src/config-types';

const config: KeeperConfig = {
  dryRun: $DRY_RUN,
  ethRpcUrl: '$ETH_RPC_URL',
  subgraphUrl: '$SUBGRAPH_URL',
  keeperKeystore: '$KEEPER_KEYSTORE',
  multicallAddress: '$MULTICALL_ADDRESS',
  wethAddress: '$WETH_ADDRESS',
  uniswapV3Router: '$UNISWAP_V3_ROUTER',
  multicallBlock: $MULTICALL_BLOCK,
  delayBetweenRuns: $DELAY_BETWEEN_RUNS,
  delayBetweenActions: $DELAY_BETWEEN_ACTIONS,
  logLevel: '$LOG_LEVEL',
  oneInchRouters: {
    43114: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Avalanche
  },
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native AVAX
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Wrapped AVAX
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
  },
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
  coinGeckoApiKey: '$COINGECKO_API_KEY',
  pools: 
$POOLS_JSON
};

export default config;
