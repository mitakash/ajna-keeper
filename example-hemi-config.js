"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_types_1 = require("./src/config-types");
var v3_sdk_1 = require("@uniswap/v3-sdk");
var config = {
    dryRun: false,
    ethRpcUrl: 'https://rpc.hemi.network/rpc',
    subgraphUrl: 'https://api.goldsky.com/api/public/project_YOUR_GOLDSKY_PROJECT_ID/subgraphs/ajna-hemi/1.0.0/gn',
    keeperKeystore: 'FULL_PATH/keystore.json',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    multicallBlock: 484490,
    delayBetweenRuns: 2,
    delayBetweenActions: 31,
    logLevel: 'debug',
    tokenAddresses: {
        weth: '0x4200000000000000000000000000000000000006',
        usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
        usd_t2: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
        usd_t3: '0x9f60ec2c81308c753e84467e2526c7d8fc05cd0d',
        usd_t4: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde', // Your USD_T4 token
    },
    // Factory System Setup for External Takes (deploy with scripts/deploy-factory-system.ts)
    keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
    takerContracts: {
        'UniswapV3': '0x[DEPLOYED_UNISWAP_TAKER_ADDRESS]',
        'SushiSwap': '0x[DEPLOYED_SUSHISWAP_TAKER_ADDRESS]' // SushiSwap taker contract
    },
    // Universal Router configuration for Uniswap V3 with QuoterV2 address
    universalRouterOverrides: {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        wethAddress: '0x4200000000000000000000000000000000000006',
        permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
        defaultFeeTier: 3000,
        defaultSlippage: 0.5,
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // QuoterV2 for accurate pricing
    },
    // SushiSwap configuration for both external takes and LP reward swaps
    sushiswapRouterOverrides: {
        swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
        quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
        factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
        wethAddress: '0x4200000000000000000000000000000000000006',
        defaultFeeTier: 500,
        defaultSlippage: 10.0, // 10% conservative slippage (from production test)
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
    coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
    pools: [
        {
            name: 'USD_T1 / USD_T2',
            address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
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
                hpbPriceFactor: 0.98,
                // External Takes via Uniswap V3 (requires factory deployment)
                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                // liquiditySource: LiquiditySource.SUSHISWAP, // Alternative: Use SushiSwap for external takes
                marketPriceFactor: 0.99, // Take when auction price < market * 0.99
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                // Configure collateral to use Uniswap V3 to get back quote_token
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
                    targetToken: 'usd_t2',
                    slippage: 2,
                    dexProvider: config_types_1.PostAuctionDex.UNISWAP_V3,
                    fee: v3_sdk_1.FeeAmount.MEDIUM,
                },
            },
            // Settlement configuration for test tokens - aggressive settings for faster testing
            settlement: {
                enabled: true,
                minAuctionAge: 18000,
                maxBucketDepth: 50,
                maxIterations: 10,
                checkBotIncentive: false, // set to false to help pool altruistically
            },
        },
        {
            name: 'USD_T4 / USD_T3',
            address: '0xf6d57bcebb553a0c74812386a71984f3ab3b176f',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 0.99, // Static price ratio USD_T4/USD_T3
            },
            kick: {
                minDebt: 0.1,
                priceFactor: 0.99, // Kick when NP * 0.99 > current price
            },
            take: {
                minCollateral: 0.1,
                hpbPriceFactor: 0.98,
                // External Takes via SushiSwap (requires factory deployment)
                liquiditySource: config_types_1.LiquiditySource.SUSHISWAP,
                // liquiditySource: LiquiditySource.UNISWAPV3, // Alternative: Use Uniswap V3 for external takes
                marketPriceFactor: 0.99, // Take when auction price < market * 0.99
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                // Configure collateral to use SushiSwap to get back quote_token
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde',
                    targetToken: 'usd_t3',
                    slippage: 10,
                    dexProvider: config_types_1.PostAuctionDex.SUSHISWAP,
                    fee: v3_sdk_1.FeeAmount.LOW, // 0.05% fee tier
                },
            },
            // Settlement configuration - similar to first pool
            settlement: {
                enabled: true,
                minAuctionAge: 18000,
                maxBucketDepth: 50,
                maxIterations: 10,
                checkBotIncentive: true, // Only settle if bot address has rewards to claim
            },
        },
        {
            name: 'Example Mixed DEX Pool',
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
                hpbPriceFactor: 0.97,
                // Example: Use Uniswap V3 for external takes (typically lower slippage)
                liquiditySource: config_types_1.LiquiditySource.UNISWAPV3,
                marketPriceFactor: 0.99,
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.QUOTE,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                rewardActionQuote: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x[quote-token-address]',
                    targetToken: 'weth',
                    slippage: 1,
                    dexProvider: config_types_1.PostAuctionDex.UNISWAP_V3,
                    fee: v3_sdk_1.FeeAmount.MEDIUM,
                },
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: '0x[collateral-token-address]',
                    targetToken: 'weth',
                    slippage: 10,
                    dexProvider: config_types_1.PostAuctionDex.SUSHISWAP,
                    fee: v3_sdk_1.FeeAmount.LOW,
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
    ]
};
exports.default = config;
//# sourceMappingURL=example-hemi-config.js.map