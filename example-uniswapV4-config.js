"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_types_1 = require("./src/config-types");
var config = {
    dryRun: true,
    ethRpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    subgraphUrl: 'https://api.goldsky.com/api/public/project_cme0ohnrjwmp301tb9p300h2a/subgraphs/ajna-base/1.0.0/gn',
    keeperKeystore: '/path/to/your/keystore.json',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    multicallBlock: 11907934,
    delayBetweenRuns: 15,
    delayBetweenActions: 35,
    logLevel: 'debug',
    // Deploy these using: npx ts-node scripts/deploy-factory-system.ts base-config.ts
    keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
    takerContracts: {
        'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63', // Get from deployment
    },
    // V4 Configuration - Using official PoolManager address
    uniswapV4RouterOverrides: {
        // Official V4 PoolManager address (works across networks)
        router: '0x000000000004444c5dc75cB358380D2e3dE08A90',
        poolManager: '0x000000000004444c5dc75cB358380D2e3dE08A90',
        defaultSlippage: 1.0,
        pools: {
            // Token ordering: B_T1 < B_T2 (lexicographically), so B_T1 = token0, B_T2 = token1
            'B_T1-B_T2': {
                token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
                token1: '0xd8A0af85E2539e22953287b436255422724871AB',
                fee: 3000,
                tickSpacing: 60,
                hooks: '0x0000000000000000000000000000000000000000', // No hooks
            }
        }
    },
    // Base network Ajna addresses
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
            name: 'B_T1/B_T2 Test Pool',
            address: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
            price: {
                source: config_types_1.PriceOriginSource.FIXED,
                value: 1.0, // 1:1 ratio for testing
            },
            kick: {
                minDebt: 0.01,
                priceFactor: 0.99,
            },
            take: {
                // V4 external takes
                liquiditySource: config_types_1.LiquiditySource.UNISWAPV4,
                marketPriceFactor: 0.95,
                // ArbTake backup
                minCollateral: 0.001,
                hpbPriceFactor: 0.95,
            },
            collectBond: true,
            collectLpReward: {
                redeemFirst: config_types_1.TokenToCollect.COLLATERAL,
                minAmountQuote: 0.001,
                minAmountCollateral: 0.001,
                rewardActionCollateral: {
                    action: config_types_1.RewardActionLabel.EXCHANGE,
                    address: "0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE",
                    targetToken: "b_t2",
                    slippage: 2,
                    dexProvider: config_types_1.PostAuctionDex.UNISWAP_V4,
                },
            },
            settlement: {
                enabled: true,
                minAuctionAge: 3600,
                maxBucketDepth: 50,
                maxIterations: 5,
                checkBotIncentive: false,
            },
        },
    ],
    // Token mappings for LP reward exchanges
    tokenAddresses: {
        'b_t1': '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
        'b_t2': '0xd8A0af85E2539e22953287b436255422724871AB',
        'weth': '0x4200000000000000000000000000000000000006', // Base WETH
    },
};
exports.default = config;
//# sourceMappingURL=example-uniswapV4-config.js.map