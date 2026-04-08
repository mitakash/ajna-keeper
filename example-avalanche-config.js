"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_types_1 = require("./src/config-types");
var v3_sdk_1 = require("@uniswap/v3-sdk");
var config = {
    dryRun: false,
    ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY',
    subgraphUrl: 'https://api.goldsky.com/api/public/YOUR_GOLDSKY_PROJECT_ID/subgraphs/ajna-avalanche/v0.1.9-rc10/gn',
    keeperKeystore: 'FULL_PATH/keystore.json',
    // 1inch Single Contract Setup for External Takes (deploy with scripts/query-1inch.ts --action deploy)
    keeperTaker: '0x[DEPLOY_WITH_query-1inch.ts]',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    multicallBlock: 11907934,
    delayBetweenRuns: 15,
    delayBetweenActions: 61,
    logLevel: 'debug',
    // 1inch Router Configuration for External Takes
    oneInchRouters: {
        43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche
    },
    tokenAddresses: {
        avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
        usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        savusd: '0x06d47F3fb376649c3A9Dafe069B3D6E35572219E',
        usd_t1: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd',
        usd_t2: '0xAD47a9b2Bc081D074EC25A0953DDC11E650b1784', // Your USD_T2 token
    },
    // Universal Router configuration (for LP reward swapping via Uniswap V3)
    universalRouterOverrides: {
        universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
        permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        defaultFeeTier: 3000,
        defaultSlippage: 0.5,
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
    coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
    pools: [
        {
            name: 'savusd / usdc',
            address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
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
                liquiditySource: config_types_1.LiquiditySource.ONEINCH,
                marketPriceFactor: 0.98, // Take when auction price < market * 0.98
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.QUOTE,
                minAmountQuote: 0.01,
                minAmountCollateral: 0.05,
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: "0x06d47F3fb376649c3A9Dafe069B3D6E35572219E",
                    targetToken: "usdc",
                    slippage: 1,
                    dexProvider: config_types_1.PostAuctionDex.ONEINCH, // NEW: Use enum instead of useOneInch: true
                },
            },
            // Settlement configuration for stable pools - conservative settings
            settlement: {
                enabled: true,
                minAuctionAge: 18000,
                maxBucketDepth: 100,
                maxIterations: 8,
                checkBotIncentive: false, // Settle even without kicker rewards for stable pools, being altruistic for the pool
            },
        },
        {
            name: 'USD_T1 / USD_T2',
            address: '0x87250b9d571aac691f9a14205ecd2a0259f0bf72',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 0.99, // Static price ratio USD_T1/USD_T2
            },
            kick: {
                minDebt: 0.1,
                priceFactor: 0.99, // Kick when NP * 0.99 > current price
            },
            take: {
                minCollateral: 0.1,
                hpbPriceFactor: 0.99, // ArbTake when price < hpb * 0.99
                // OPTION: Could also use 1inch for external takes here
                // liquiditySource: LiquiditySource.ONEINCH,
                // marketPriceFactor: 0.98,
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                // Configure collateral to use Uniswap V3 to get back quote_token (no external contracts needed for LP rewards)
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x9a522edA6e9420CD15143b1610193E6a657A7dBd',
                    targetToken: 'usd_t2',
                    slippage: 2,
                    dexProvider: config_types_1.PostAuctionDex.UNISWAP_V3,
                    fee: v3_sdk_1.FeeAmount.MEDIUM,
                },
            },
            // Settlement configuration for test tokens - standard settings
            settlement: {
                enabled: true,
                minAuctionAge: 3600,
                maxBucketDepth: 50,
                maxIterations: 10,
                checkBotIncentive: true, // Only settle if bot has rewards to claim
            },
        },
    ]
};
exports.default = config;
//# sourceMappingURL=example-avalanche-config.js.map