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
  ajna: {
    erc20PoolFactory: '$AJNA_ERC20_POOL_FACTORY',
    erc721PoolFactory: '$AJNA_ERC721_POOL_FACTORY',
    poolUtils: '$AJNA_POOL_UTILS',
    positionManager: '$AJNA_POSITION_MANAGER',
    ajnaToken: '$AJNA_TOKEN',
    grantFund: '$AJNA_GRANT_FUND',
    burnWrapper: '$AJNA_BURN_WRAPPER',
    lenderHelper: '$AJNA_LENDER_HELPER',
  },
  coinGeckoApiKey: '$COINGECKO_API_KEY',
  pools: 
$POOLS_JSON
};

export default config;
