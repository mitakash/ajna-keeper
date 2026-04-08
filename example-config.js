"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var v3_sdk_1 = require("@uniswap/v3-sdk");
var config_types_1 = require("./src/config-types");
var config = {
    dryRun: true,
    logLevel: 'info',
    ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    subgraphUrl: 'https://api.studio.thegraph.com/query/example_49479/ajna-base/version/latest_example',
    keeperKeystore: '/home/anon/keystore-files/keeper-keystore.json',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    multicallBlock: 5022,
    delayBetweenRuns: 15,
    delayBetweenActions: 1,
    // 1inch Router Configuration (for chains with 1inch support)
    oneInchRouters: {
        1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        43114: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Avalanche
    },
    // OPTION 1: Single Contract Setup (for 1inch integration)
    // keeperTaker: '0x[DEPLOY_WITH_query-1inch.ts]',
    // OPTION 2: Factory System Setup (for Uniswap V3 and SushiSwap)
    // keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
    // takerContracts: {
    //   'UniswapV3': '0x[DEPLOYED_TAKER_ADDRESS]',
    //   'SushiSwap': '0x[DEPLOYED_TAKER_ADDRESS]'
    // },
    tokenAddresses: {
        avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        weth: '0x4200000000000000000000000000000000000006',
    },
    // Connector tokens for 1inch optimization
    connectorTokens: [
        '0x24de8771bc5ddb3362db529fc3358f2df3a0e346',
        '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
        '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
        '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    ],
    // Universal Router configuration (for Uniswap V3 integration)
    universalRouterOverrides: {
        universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        wethAddress: '0x4200000000000000000000000000000000000006',
        permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        defaultFeeTier: 3000,
        defaultSlippage: 0.5,
        poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        quoterV2Address: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a', // QuoterV2 for accurate pricing
    },
    // SushiSwap configuration (for SushiSwap V3 integration)
    sushiswapRouterOverrides: {
        swapRouterAddress: '0x[SUSHISWAP_ROUTER_ADDRESS]',
        quoterV2Address: '0x[SUSHISWAP_QUOTER_ADDRESS]',
        factoryAddress: '0x[SUSHISWAP_FACTORY_ADDRESS]',
        wethAddress: '0x4200000000000000000000000000000000000006',
        defaultFeeTier: 500,
        defaultSlippage: 2.0, // 2% slippage tolerance (conservative for SushiSwap)
    },
    // Uniswap V4 configuration
    uniswapV4RouterOverrides: {
        // <— verify this on Basescan / official docs before using in prod
        router: '0x6ff5693b99212da76ad316178a184ab56d299b43',
        defaultSlippage: 0.5,
        pools: {
            // Example: WETH/USDC pool key you’ll use for quotes
            'WETH-USDC': {
                token0: '0x4200000000000000000000000000000000000006',
                token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                fee: 3000,
                tickSpacing: 60,
                hooks: '0x0000000000000000000000000000000000000000'
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
    coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
    pools: [
        {
            name: 'wstETH / WETH',
            address: '0x63a366fc5976ff72999c89f69366f388b7d233e8',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 1.15,
            },
            kick: {
                minDebt: 0.07,
                priceFactor: 0.9,
            },
            take: {
                minCollateral: 0.01,
                hpbPriceFactor: 0.9,
                // External Takes Example - uncomment and configure after contract deployment
                // liquiditySource: LiquiditySource.ONEINCH,      // Use 1inch (requires keeperTaker)
                // liquiditySource: LiquiditySource.UNISWAPV3,    // Use Uniswap V3 (requires keeperTakerFactory)
                // liquiditySource: LiquiditySource.SUSHISWAP,    // Use SushiSwap (requires keeperTakerFactory)
                // marketPriceFactor: 0.98,                       // Take when auction < market * 0.98
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.QUOTE,
                minAmountQuote: 0.001,
                minAmountCollateral: 1000,
                rewardActionQuote: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0xaddressOfWstETH',
                    targetToken: 'weth',
                    slippage: 1,
                    dexProvider: config_types_1.PostAuctionDex.UNISWAP_V3,
                    fee: v3_sdk_1.FeeAmount.LOW,
                },
            },
            // Settlement configuration - handles completed auctions and bad debt
            settlement: {
                enabled: true,
                minAuctionAge: 18000,
                maxBucketDepth: 50,
                maxIterations: 10,
                checkBotIncentive: true, // Only settle auctions this bot kicked (has bond rewards)
            },
        },
        {
            name: 'WETH / USDC',
            address: '0x0b17159f2486f669a1f930926638008e2ccb4287',
            price: {
                source: config_types_1.PriceOriginSource.COINGECKO,
                query: 'price?ids=ethereum&vs_currencies=usd',
            },
            kick: {
                minDebt: 50,
                priceFactor: 0.95,
            },
            take: {
                minCollateral: 0.01,
                hpbPriceFactor: 0.9,
                // Example external take configuration for major pool
                // liquiditySource: LiquiditySource.ONEINCH,     // 1inch for best pricing
                // liquiditySource: LiquiditySource.SUSHISWAP,   // SushiSwap for lower fees
                // marketPriceFactor: 0.99,  // More conservative for volatile pairs
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 1000,
                minAmountCollateral: 0.001,
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.TRANSFER,
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
                source: config_types_1.PriceOriginSource.POOL,
                reference: config_types_1.PriceOriginPoolReference.LUP,
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
                redeemFirst: config_types_1.TokenToCollect.QUOTE,
                minAmountQuote: 0.001,
                minAmountCollateral: 100,
            },
        },
        {
            name: 'savUSD / USDC',
            address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 1.01,
            },
            kick: {
                minDebt: 0.07,
                priceFactor: 0.99,
            },
            take: {
                minCollateral: 0.07,
                hpbPriceFactor: 0.98,
                // Stable pair external take example - multiple options
                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                // liquiditySource: LiquiditySource.SUSHISWAP,   // SushiSwap for direct routing
                marketPriceFactor: 0.98, // Stable pairs can be more aggressive
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.QUOTE,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.05,
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E',
                    targetToken: 'usdc',
                    slippage: 1,
                    dexProvider: config_types_1.PostAuctionDex.ONEINCH, // Options: ONEINCH, UNISWAP_V3, SUSHISWAP
                },
            },
            // Settlement with longer wait time for stable pools
            settlement: {
                enabled: true,
                minAuctionAge: 18000,
                maxBucketDepth: 100,
                maxIterations: 5,
                checkBotIncentive: false, // Settle ANY auction for pool health
            },
        },
        {
            name: 'Example SushiSwap Pool',
            address: '0x[example-pool-address]',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 1.0,
            },
            kick: {
                minDebt: 0.1,
                priceFactor: 0.99,
            },
            take: {
                minCollateral: 0.1,
                hpbPriceFactor: 0.95,
                // SushiSwap external take configuration
                liquiditySource: config_types_1.LiquiditySource.SUSHISWAP,
                marketPriceFactor: 0.99, // Take when auction < market * 0.99
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x[collateral-token-address]',
                    targetToken: 'usdc',
                    slippage: 10,
                    dexProvider: config_types_1.PostAuctionDex.SUSHISWAP,
                    fee: v3_sdk_1.FeeAmount.LOW, // 0.05% fee tier
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
    ],
};
exports.default = config;
//# sourceMappingURL=example-config.js.map