# ajna-keeper

## Purpose

A bot to automate liquidations on the Ajna platform.

## Design

- Each instance of the keeper connects to exactly one chain using a single RPC endpoint. The same keeper instance may interact with multiple pools on that chain.
- Pool addresses must be explicitly configured.
- Each instance of the keeper may unlock only a single wallet using a JSON keystore file. As such, if running multiple keepers on the same chain, different accounts should be used for each keeper to avoid nonce conflicts.
- Kick, ArbTake, Bond Collection, Reward LP Collection, Settlement, Take (connect outside liquidity to Ajna Liquidations) - can all be enabled/disabled per pool through the provided config.

## Quick Setup

You must setup one bot per-chain, per-signer.

### Installation and Prerequisites

You'll need `node` and related tools (`npm`, `yarn`). This was developed with node v22 but should work with later versions.

Download node here: https://nodejs.org/en Downloading `node` also installs `npm`.

Install `yarn` and dependencies:

```bash
npm install --global yarn
yarn --frozen-lockfile
```

Note: If you encounter dependency conflicts or version mismatches, try:

```bash
rm yarn.lock
yarn install
```

Compile to generate types using TypeChain:

```bash
yarn compile
```

## Production Deployment

**For production deployments**, see the **[Production Setup Guide](production_setup_guide.md)**.

The production guide covers the recommended approach using hosted services:
- Hosted RPC setup (Alchemy/QuickNode) vs local nodes
- Hosted subgraph deployment (BuiltByMom fork + Goldsky) vs local Graph Node  
- Verified contract addresses for major chains (Avalanche, Hemi, Base, Arbitrum)
- API rate limits and service tier recommendations
- Real-world configuration examples
- Production monitoring and troubleshooting
- See `example-avalanche-config.ts` and `example-hemi-config.ts` for chain-specific examples.

*The production approach is more reliable and easier to maintain than running everything locally.*


### Create a new config file

Create a new `config.ts` file in the `ajna-keeper/` folder and copy the contents from `example-config.ts`.

### Get Alchemy URL with API token.

(Any RPC endpoint can be used. But, these instructions are for Alchemy.)
Go to your acount on Alchemy.
Make sure you have an app with your L2 network enabled.
Navigate to the Apps > Networks tab and copy the url under your network. It will look something like: `https://avax-mainnet.g.alchemy.com/v2/asf...`
Replace the `ethRpcUrl` in your `config.ts` file with the url you got from alchemy.

### Get Coingecko token

Create an account on Coingecko and go to the URL https://www.coingecko.com/en/developers/dashboard
Here you will click "Add New Key" to add a new key.
In your `config.ts` file replace `coinGeckoApiKey` with the key you just created.

### Configure ajna

In `config.ts` for the section `ajna`, you will need to provide addresses for all the ajna specific contracts. These addresses can be found here: https://faqs.ajna.finance/info/deployment-addresses-and-bridges

### Configure multicall

In `config.ts` you may need to provide an address for `multicallAddress` for your specific chain. These addresses can be found here https://www.multicall3.com/deployments
If you add `multicallAddress`, then you will also need to add `multicallBlock` which is the block that multicall was added.

### Setup Ajna-Subgraph

In a different folder clone the ajna-finance repo. It is recommended that you checkout the develop branch so that you have the latests networks settings for L2s.

```bash
git clone https://github.com/ajna-finance/subgraph.git
cd subgraph
git checkout develop
```

Update your `ajna-subgraph/.env` file to contain your alchemy key.

`ajna-subgraph/.env`

```.env
ETH_RPC_URL=https://avax-mainnet.g.alchemy.com/v2/asf.....
ETH_NETWORK=avalanche:https://avax-mainnet.g.alchemy.com/v2/asf.....
```

[Install docker](https://www.docker.com/).

Follow the setup instructions in ajna-subgraph/README.

### Setting up a keystore.

Keeper uses ethers [Encrypted JSON Wallet](https://docs.ethers.org/v5/api/signer/#Wallet-fromEncryptedJson), which is encrypted using a password.

The easiest way to create an encrypted JSON wallet is to use the create-keystore script provided in keeper:
Run the script with `yarn create-keystore`. Then follow the onscreen prompts.
Ensure that the generated wallet is saved in the directory specified by the `keeperKeystore` property in `config.ts`.

### Execution

```bash
yarn start --config config.ts
```

## Requirements

For each desired chain:

- A JSON-RPC endpoint is needed to query pool data and submit transactions.
- A subgraph connection is needed to iterate through buckets/borrowers/liquidations within a configured pool.
- Funds used to pay gas on that chain.
- Funds (quote token) to post liquidation bonds in each pool configured to kick.

## Features

### Kick

Starts a liquidation when a loan's threshold price exceeds the lowest utilized price in the pool by a configurable percentage.


### Take

When auction price drops a configurable percentage below a DEX price, swaps collateral for quote token using a DEX or DEX aggregator, repaying debt and earning profit for the taker.
This usually requires contract deployment for either 1inch or individual DEX's like Uniswap. Please see contract deployment section below.

### Arbtake

When auction price drops a configurable percentage below the highest price bucket, exchanges quote token in that bucket for collateral, earning a share of that bucket.

Note if keeper is configured to both `take` and `arbTake`, and prices are appropriate for both, the keeper will attempt to execute both strategies.  Whichever transaction is included in a block first will "win", with the other strategy potentially reverting onchain.  To conserve gas when using both, ensure one is configured at a more aggressive price than the other.

### Collect Liquidation Bond

Collects liquidation bonds (which were used to kick loans) once they are fully claimable. Note: This does not settle auctions.

### Collect Reward LP

Redeems rewarded LP for either Quote or Collateral based on config. Note: This will only collect LP rewarded while the bot is running and will not collect deposits.

### Settlement

Automatically settles completed auctions to unlock kicker bonds and handle bad debt scenarios. Settlement is triggered when:

- Auctions have ended with remaining bad debt (collateral = 0, debt > 0)
- Kicker bonds are locked and preventing normal operations
- Auctions meet the configured minimum age requirement

Settlement processes auctions in multiple iterations if needed, settling debt against available buckets in the pool. The keeper can be configured to only settle auctions where the bot has bond rewards to claim, ensuring profitability.

**Key Benefits:**
- **Automated bond recovery**: Unlocks kicker bonds automatically when auctions complete
- **Bad debt handling**: Processes auctions with remaining debt that need settlement
- **Reactive operation**: Triggers settlement when bond collection or LP collection fails due to locked bonds
- **Configurable timing**: Respects minimum auction age before attempting settlement

**Settlement Configuration:**
- `enabled` - Enable/disable settlement for this pool
- `minAuctionAge` - Minimum time (seconds) to wait before settling an auction
- `maxBucketDepth` - Number of buckets to process per settlement transaction
- `maxIterations` - Maximum settlement iterations per auction
- `checkBotIncentive` - 'true' means only settle if bot is the kicker with bond rewards, 'false' means you are altruistically protecting the pool.

Settlement integrates seamlessly with other keeper operations - when bond collection or LP reward collection fails due to locked bonds, the keeper automatically attempts settlement before retrying the operation.

## Configuration

### Configuration file

While `*.json` config files are supported, it is recommended to use `*.ts` config files so that you get the benefits of type checking.
See `example-config.ts` for reference.

### Price sources

- [coingecko](https://www.coingecko.com/) - using their [simple price](https://docs.coingecko.com/v3.0.1/reference/simple-price) API
- **fixed** - hardcoded number, useful for stable pools
- **pool** - can use _lup_ or _htp_

If the price source only has quote token priced in collateral, you may add `"invert": true` to `price` config to invert the configured price.

### Dex Router

#### Configuring for 1inch

To enable 1inch swaps, you need to set up environment variables and add specific fields to config.ts.  Also be sure to set `delayBetweenActions` to 1 second or greater to avoid 1inch API rate limiting.

##### Environment Variables

Create a .env file in your project root with:

```
ONEINCH_API=https://api.1inch.dev/swap/v6.0
ONEINCH_API_KEY=[your-1inch-api-key-here]
```

A 1inch API key may be obtained from their [developer portal](https://portal.1inch.dev/).

## Contract Deployment (Required for External Takes)

**External takes** connect Ajna liquidation auctions to external DEX liquidity with Atomic Swaps. This requires deploying smart contracts to atomically take collateral and swap it.

### Choose Your Deployment Approach

**Option A: 1inch Integration (Major Chains)**
- For chains with 1inch support (Ethereum, Avalanche, Base, Arbitrum)
- Single contract deployment
- Uses 1inch aggregator for best pricing

```bash
# Compile contracts first
yarn compile

# Deploy 1inch connector contract
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy

# Update your config with the deployed address
# keeperTaker: '0x[deployed-address]'
```

**Option B: Factory System (Newer Chains)**  
- For chains without 1inch (Hemi, emerging L2s)
- Multi-DEX factory pattern supporting Uniswap V3 + future DEXs
- Direct Uniswap V3 integration via Universal Router

```bash
# Compile contracts first  
yarn compile

# Deploy factory system
yarn ts-node scripts/deploy-factory-system.ts your-config.ts

# Update your config with deployed addresses:
# keeperTakerFactory: '0x[factory-address]'
# takerContracts: { 'UniswapV3': '0x[taker-address]' }
```

**Option C: No External Takes**
- Skip contract deployment
- Use arbTake and settlement only
- Still supports LP reward swapping (no contracts needed)

> **Note**: LP reward swapping works on both approaches without additional contracts.

---

## Dex Router Configuration:

### Configuring for External Takes

External takes require contract deployment and specific configuration:

#### 1inch Integration (Single Contract)

**Contract Deployment:**
```bash
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy
```

**Config.ts Setup:**
```typescript
const config: KeeperConfig = {
  // Required for 1inch external takes
  keeperTaker: '0x[deployed-address]',
  oneInchRouters: {
    1: '0x1111111254EEB25477B68fb85Ed929f73A960582',    // Ethereum
    43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche  
    8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',  // Base
  },
  
  pools: [{
    take: {
      liquiditySource: LiquiditySource.ONEINCH,
      marketPriceFactor: 0.98, // Take when auction < market * 0.98
    }
  }]
}
```

#### Uniswap V3 Integration (Factory System)

**Contract Deployment:**
```bash  
yarn ts-node scripts/deploy-factory-system.ts your-config.ts
```

**Config.ts Setup:**
```typescript
const config: KeeperConfig = {
  // Required for Uniswap V3 external takes
  keeperTakerFactory: '0x[factory-address]',
  takerContracts: {
    'UniswapV3': '0x[taker-address]'
  },
  universalRouterOverrides: {
    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
    defaultFeeTier: 3000,
    defaultSlippage: 0.5,
  },
  
  pools: [{
    take: {
      liquiditySource: LiquiditySource.UNISWAPV3,
      marketPriceFactor: 0.99, // Take when auction < market * 0.99
    }
  }]
}
```

### Configuring for LP Reward Swapping (Post-Auction Swaps)

**IMPORTANT:** LP reward swapping now uses an enum-based system and **requires contract deployment even for 1inch**.

#### Using 1inch for LP Rewards (Requires Contract Deployment)
```bash
# REQUIRED: Deploy 1inch contract first
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy
```

```typescript
const config: KeeperConfig = {
  // REQUIRED: Must deploy contract even for LP reward swaps
  keeperTaker: '0x[deployed-address]',
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche
  },
  
  pools: [{
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        address: '0x[collateral-token]',
        targetToken: 'usdc',
        slippage: 1,
        dexProvider: PostAuctionDex.ONEINCH,  // NEW: Use enum instead of useOneInch: true
      }
    }
  }]
}
```

#### Using Uniswap V3 for LP Rewards (No Contract Deployment Needed)
```typescript
const config: KeeperConfig = {
  // Universal Router configuration (for Uniswap V3 swaps)
  universalRouterOverrides: {
    universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    poolFactoryAddress: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    defaultFeeTier: 3000,
    defaultSlippage: 0.5,
  },
  
  pools: [{
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        address: '0x[collateral-token]', 
        targetToken: 'usdc',
        slippage: 1,
        dexProvider: PostAuctionDex.UNISWAP_V3, // NEW: Use enum instead of useOneInch: false
        fee: FeeAmount.MEDIUM,
      }
    }
  }]
}
```

#### Using SushiSwap for LP Rewards (No Contract Deployment Needed)
```typescript
const config: KeeperConfig = {
  // SushiSwap configuration 
  sushiswapRouterOverrides: {
    swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
    quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
    factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
    wethAddress: '0x4200000000000000000000000000000000000006',
    defaultFeeTier: 500,
    defaultSlippage: 10.0,
  },
  
  pools: [{
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        address: '0x[collateral-token]', 
        targetToken: 'usdc',
        slippage: 10,
        dexProvider: PostAuctionDex.SUSHISWAP, // NEW: SushiSwap option
        fee: FeeAmount.LOW, // 0.05% fee tier
      }
    }
  }]
}
```

### Automatic Detection

The keeper automatically detects your configuration:
- **Single**: Uses existing 1inch integration (`src/take.ts`)
- **Factory**: Uses multi-DEX system (`src/take-factory.ts`) 
- **None**: ArbTake and settlement only

No manual selection needed - the bot chooses based on your config.

### Enhanced Configuration Examples

**Major Chain Example (1inch):**
```typescript
// example-avalanche-config.ts shows 1inch external takes
const config: KeeperConfig = {
  keeperTaker: '0x[deployed-1inch-contract]',
  oneInchRouters: { 43114: '0x111111125421ca6dc452d289314280a0f8842a65' },
  
  pools: [{
    take: {
      liquiditySource: LiquiditySource.ONEINCH,
      marketPriceFactor: 0.98
    }
  }]
}
```

**Newer Chain Example (Factory):**  
```typescript
// hemi-conf-settlement.ts shows factory external takes
const config: KeeperConfig = {
  keeperTakerFactory: '0x[factory-address]',
  takerContracts: { 'UniswapV3': '0x[taker-address]' },
  universalRouterOverrides: { /* addresses */ },
  
  pools: [{
    take: {
      liquiditySource: LiquiditySource.UNISWAPV3,
      marketPriceFactor: 0.99
    }
  }]
}
```

**See `example-avalanche-config.ts`, `example-hemi-config.ts`, for complete examples.**

### Detailed LP Reward Configuration

The following sections provide comprehensive examples for configuring LP reward swapping:

##### 1inch LP Reward Configuration

**IMPORTANT:** 1inch LP reward swaps now require smart contract deployment.

```bash
# Deploy 1inch contract first (REQUIRED)
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy
```

Edit config.ts to include these fields:

`oneInchRouters`:

A dictionary of 1inch router addresses for each chain ID you want to support.

- Format: `{ [chainId]: "router-address" }`
- Example:

```
oneInchRouters: {
  1: "0x1111111254EEB25477B68fb85Ed929f73A960582",    // Ethereum Mainnet
  8453: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Base
  43114: "0x1111111254EEB25477B68fb85Ed929f73A960582" // Avalanche
},
```

`tokenAddresses`:
A dictionary of token addresses for swaps (required for Avalanche, optional otherwise).

- Format: `{ [tokenName]: "token-address" }`
- Example:

```
tokenAddresses: {
  weth: "0x4200000000000000000000000000000000000006", // WETH on Base
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  avax: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"  // Native AVAX
},
```

`connectorTokens` (Optional):
An array of token addresses used as intermediate connectors in 1inch swap routes. These tokens can facilitate multi-hop trades to optimize the swap path between the input and output tokens.

- Format: `Array<string>`
- Example:

```
connectorTokens: [
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
  "0x6B175474E89094C44Da98b954EedeAC495271d0F"  // DAI on Ethereum
],
```

`pools.collectLpReward.rewardAction`:
LP in buckets can be reedemed for quote token and/or collateral, depending on what the bucket holds at time of redemption. `redeemFirst` controls the redemption strategy, favoring either quote token (most situations) or collateral (useful in shorting pools). To defer redeeming the second token, it's `minAmount` can be set to a sufficiently high value that manually swapping tokens on an exchange becomes practical.

Separate reward actions may be assigned to quote token and collateral, allowing tokens to be swapped out as desired. For pools where you want to swap rewards with 1inch, set `dexProvider: PostAuctionDex.ONEINCH` in the `rewardAction`.

- Example: Volatile-to-volatile pool, swap both tokens for stables

```
pools: [
  {
    name: "wstETH / WETH",
    address: "0x63a366fc5976ff72999c89f69366f388b7d233e8",
    ...
    collectLpReward: {
      redeemFirst: TokenToCollect.QUOTE, // favor redeeming LP for WETH before redeeming for wstETH
      minAmountQuote: 0.001,             // don't redeem LP for dust amount of WETH
      minAmountCollateral: 0.005,        // ensure we're redeeming enough to cover swapping fees
      rewardActionQuote: {
        action: RewardActionLabel.EXCHANGE,
        address: "0x4200000000000000000000000000000000000006", // Token to swap (WETH)
        targetToken: "DAI",                                    // Desired token
        slippage: 1,                                           // Slippage percentage (0-100)
        dexProvider: PostAuctionDex.ONEINCH                    // NEW: Use enum instead of useOneInch: true
      }
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", // Token to swap (wstETH)
        targetToken: "DAI",                                    // Desired token
        slippage: 1,                                           // Slippage percentage (0-100)
        dexProvider: PostAuctionDex.ONEINCH                    // NEW: Use enum instead of useOneInch: true
      },
    },
  }
],
```

- Example: Stablecoin pool, swap collateral for quote token

```
pools: [
  {
      name: 'savUSD / USDC',
      address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
      ...
      collectLpReward: {
        redeemFirst: TokenToCollect.QUOTE,
        minAmountQuote: 0.01,       // don't redeem LP for less than a penny
        minAmountCollateral: 0.05,  // don't redeem LP for less than what it may cost to swap collateral for USDC
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x06d47F3fb376649c3A9Dafe069B3D6E35572219E", // Token to swap (savUSD)
          targetToken: "usdc",                                   // Target token (USDC)
          slippage: 1,                                           // Slippage percentage (0-100)
          dexProvider: PostAuctionDex.ONEINCH                    // NEW: Use enum instead of useOneInch: true
        },
      },
  }
],
```

- Example: Shorting pool, no automated swapping

```
pools: [
  {
    name: "DAI / wSOL",
    address: "0x63a366fc5976ff72999c89f69366f388b7d233e8",
    ...
    collectLpReward: {
      redeemFirst: TokenToCollect.COLLATERAL, // favor redeeming LP for DAI
      minAmountQuote: 200,                    // don't exchange LP for an amount of wSOL not worth manually swapping
      minAmountCollateral: 0.15,              // don't redeem LP for less than transaction fees
    },
  }
],

```

##### Notes

- **Contract deployment is required** even for LP reward swaps using 1inch
- If `dexProvider: PostAuctionDex.ONEINCH` but `keeperTaker` is missing, the script will fail.
- Ensure the `.env` file is loaded (via `dotenv/config`) in your project.

##### Uniswap V3 LP Reward Configuration

Edit `config.ts` to include these optional fields:

`universalRouterOverrides`:
Required for Uniswap V3 swaps. Provides addresses for Universal Router integration.

- Format:

```
universalRouterOverrides: {
  universalRouterAddress: "0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B",
  wethAddress: "0x4200000000000000000000000000000000000006",
  permit2Address: "0xB952578f3520EE8Ea45b7914994dcf4702cEe578",
  poolFactoryAddress: "0x346239972d1fa486FC4a521031BC81bFB7D6e8a4",
  defaultFeeTier: 3000,
  defaultSlippage: 0.5,
}
```

`tokenAddresses` (Optional):
Useful for specifying target tokens (e.g., WETH) if not using `universalRouterOverrides`.

- Example:

```
tokenAddresses: {
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  // USDC on Ethereum
},
```

`pools.collectLpReward.rewardAction`:
For pools where you want to swap rewards with Uniswap V3, set `dexProvider: PostAuctionDex.UNISWAP_V3` and optionally add a `fee`.

- Format:

```
{
  name: "Your Pool Name",
  address: "0xpoolAddress",
  // Other pool settings...
  collectLpReward: {
    redeemFirst: "QUOTE", // or "COLLATERAL"
    minAmount: 0.001,
    rewardAction: {
      action: "EXCHANGE",
      address: "0xtokenAddress", // Token to swap
      targetToken: "weth",      // Target token (e.g., "weth", "usdc")
      slippage: 1,             // Slippage (ignored for Uniswap)
      dexProvider: PostAuctionDex.UNISWAP_V3, // NEW: Use enum instead of useOneInch: false
      fee: 3000               // Fee tier (500, 3000, 10000)
    }
  }
}
```

- Example:

```
pools: [
  {
    name: "WETH / USDC",
    address: "0x0b17159f2486f669a1f930926638008e2ccb4287",
    collectLpReward: {
      redeemFirst: "COLLATERAL",
      minAmount: 0.001,
      rewardAction: {
        action: RewardActionLabel.EXCHANGE,
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        targetToken: "usdc",
        slippage: 1,
        dexProvider: PostAuctionDex.UNISWAP_V3, // NEW: Use enum instead of useOneInch: false
        fee: 3000 // 0.3% fee tier
      }
    }
  }
],
```

##### SushiSwap LP Reward Configuration

For SushiSwap integration, add the `sushiswapRouterOverrides` configuration:

`sushiswapRouterOverrides`:
Required for SushiSwap swaps. Provides addresses for SushiSwap router integration.

- Format:

```
sushiswapRouterOverrides: {
  swapRouterAddress: "0x33d91116e0370970444B0281AB117e161fEbFcdD",
  quoterV2Address: "0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C",
  factoryAddress: "0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959",
  wethAddress: "0x4200000000000000000000000000000000000006",
  defaultFeeTier: 500,
  defaultSlippage: 10.0,
}
```

- Example:

```
pools: [
  {
    name: "USD_T1 / USD_T2",
    address: "0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7",
    collectLpReward: {
      redeemFirst: "COLLATERAL",
      minAmount: 0.001,
      rewardAction: {
        action: RewardActionLabel.EXCHANGE,
        address: "0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6",
        targetToken: "usd_t2",
        slippage: 10,
        dexProvider: PostAuctionDex.SUSHISWAP, // NEW: SushiSwap option
        fee: 500 // 0.05% fee tier
      }
    }
  }
],
```

##### Notes

- `fee` is the fee tier (e.g., `500` for 0.05%, `3000` for 0.3%, `10000` for 1%).
- `slippage` is respected for all DEX providers.
- If `targetToken` isn't WETH, ensure it matches the configured WETH address.

## Testing

Follow instructions for [Installation and Prequisites](#installation-and-prerequisites).
Then [get your alchemy API token](#installation-and-prerequisites) and [your Goingecko API token](#installation-and-prerequisites).

### Add Alchemy API key and Coingecko API to .env

Add your alchemy API key and coingecko API key to .env

```.env
ALCHEMY_API_KEY="<api_key>"
COINGECKO_API_KEY="<api_key>"
```

Note: You will need to enable mainnet in Alchemy since hardhat queries from mainnet.

### Running tests

#### Unit tests
```bash
yarn unit-tests
```

#### Integration tests

In one terminal run:

```bash
npx hardhat node
```

In a second terminal run:

```bash
yarn integration-tests
```

## Disclaimer

User assumes all risk of data presented and transactions placed by this keeper; see license for more details.