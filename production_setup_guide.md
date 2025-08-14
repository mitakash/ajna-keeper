# Production Setup Guide

This guide covers the recommended approach for running the Ajna keeper in production environments, based on real-world deployment experience on Avalanche, Hemi, and other networks.

## Overview: Production vs Development Setup

While the main README covers the basic setup process, production deployments benefit from using hosted services rather than running everything locally. This approach is more reliable, easier to maintain, and better suited for 24/7 operation.

**Recommended Production Stack:**
- **RPC Provider**: Alchemy or QuickNode (hosted)
- **Subgraph**: BuiltByMom/Ajna-subgraph deployed on Goldsky (hosted)
- **DEX Integration**: 1inch API, Uniswap V3 Universal Router, or SushiSwap V3 Router
- **Monitoring**: Goldsky subgraph monitoring + custom logging

## Step 1: RPC Provider Setup

### Option A: Alchemy (Recommended)
1. Create account at [alchemy.com](https://alchemy.com)
2. Create a new app for your target network (Avalanche, Base, Arbitrum, Hemi, etc.)
3. Navigate to Apps > Networks tab
4. Copy the HTTPS URL (format: `https://[network].g.alchemy.com/v2/[api-key]`)

### Option B: QuickNode
1. Create account at [quicknode.com](https://quicknode.com)
2. Create endpoint for your target network
3. Copy the provided HTTPS URL

**Why hosted RPC?** Running a local node requires significant infrastructure, storage, and maintenance. Hosted providers offer better uptime and are more cost-effective for most use cases.

## Step 1.5: Contract Deployment for External Takes

**External takes** connect Ajna liquidation auctions directly to external DEX liquidity, enabling profitable liquidation of undercollateralized loans using external market prices.

### Decision Matrix: Which Approach to Use?

| Chain Type | 1inch Available? | Uniswap V3? | SushiSwap V3? | Recommended Approach | Deployment Script |
|------------|------------------|-------------|---------------|---------------------|-------------------|
| **Major Chains**<br/>(Ethereum, Avalanche, Base, Arbitrum) | ✅ Yes | ✅ Yes | ✅ Yes | **1inch Single Contract** | `scripts/query-1inch.ts` |
| **Emerging L2s**<br/>(Hemi, Scroll, etc.) | ❌ No | ✅ Yes | ✅ Yes | **Factory System (Uniswap V3 + SushiSwap)** | `scripts/deploy-factory-system.ts` |
| **Uniswap-only Chains** | ❌ No | ✅ Yes | ❌ No | **Factory System (Uniswap V3 Only)** | `scripts/deploy-factory-system.ts` |
| **Testing/Basic** | N/A | N/A | N/A | **No External Takes** | Skip deployment |

### Option A: 1inch Single Contract Deployment

**Best for:** Established chains with 1inch aggregator support

**IMPORTANT:** 1inch contract deployment is now **required even for LP reward swaps**.

**Prerequisites:**
```bash
# 1. Compile contracts first
yarn compile

# 2. Verify 1inch router addresses for your chain
# Check: https://docs.1inch.io/docs/aggregation-protocol/api/swagger
```

**Deployment Steps:**
```bash
# Deploy the single 1inch connector contract
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy

# Expected output:
# AjnaKeeperTaker deployed to: 0x[contract-address]
# Update config.keeperTaker with this address
```

**Configuration Updates:**
```typescript
const config: KeeperConfig = {
  // ADD: Deployed contract address (REQUIRED for both external takes AND LP rewards)
  keeperTaker: '0x[deployed-contract-address]',
  
  // ADD: 1inch router addresses per chain
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65', // Avalanche
    8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',  // Base
    42161: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Arbitrum
  },
  
  // ADD: Connector tokens for better routing (optional)
  connectorTokens: [
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC
    '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    // ... more tokens for your chain
  ],
  
  pools: [{
    take: {
      // ADD: Configure external takes
      liquiditySource: LiquiditySource.ONEINCH,
      marketPriceFactor: 0.98, // Take when auction price < market * 0.98
      minCollateral: 0.01,     // Minimum collateral to attempt take
    },
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usdc',
        slippage: 1,
        dexProvider: PostAuctionDex.ONEINCH, // Use enum
      }
    }
  }]
}
```

### Option B: Factory System Deployment (Multi-DEX)

**Best for:** Newer chains without 1inch, chains with multiple DEX options

**Prerequisites:**
```bash
# 1. Compile contracts first
yarn compile

# 2. Verify Universal Router and SushiSwap addresses for your chain
# Uniswap V3: https://docs.uniswap.org/contracts/v3/reference/deployments
# SushiSwap: Check official documentation or block explorers
```

**Deployment Steps:**
```bash
# Deploy factory + Uniswap V3 + SushiSwap taker system  
yarn ts-node scripts/deploy-factory-system.ts your-config.ts

# Expected output:
# ✓ AjnaKeeperTakerFactory deployed to: 0x[factory-address]
# ✓ UniswapV3KeeperTaker deployed to: 0x[uniswap-taker-address]
# ✓ SushiSwapKeeperTaker deployed to: 0x[sushiswap-taker-address]
# ✓ Factory configured with UniswapV3 and SushiSwap takers
# ✓ All verification checks passed
```

**Configuration Updates:**
```typescript
const config: KeeperConfig = {
  // ADD: Factory system addresses
  keeperTakerFactory: '0x[factory-address]',
  takerContracts: {
    'UniswapV3': '0x[uniswap-taker-address]',
    'SushiSwap': '0x[sushiswap-taker-address]'
  },
  
  // ADD: Universal Router configuration for Uniswap V3
  universalRouterOverrides: {
    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
    defaultFeeTier: 3000,    // 0.3% fee tier
    defaultSlippage: 0.5,    // 0.5% slippage tolerance
  },
  
  // ADD: SushiSwap configuration
  sushiswapRouterOverrides: {
    swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
    quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
    factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
    wethAddress: '0x4200000000000000000000000000000000000006',
    defaultFeeTier: 500,     // 0.05% fee tier
    defaultSlippage: 10.0,   // 10% slippage tolerance
  },
  
  pools: [{
    take: {
      // ADD: Configure external takes - choose your preferred DEX
      liquiditySource: LiquiditySource.SUSHISWAP, // or UNISWAPV3
      marketPriceFactor: 0.99, // Take when auction price < market * 0.99
      minCollateral: 0.01,     // Minimum collateral to attempt take
    },
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usd_t2',
        slippage: 2,
        dexProvider: PostAuctionDex.SUSHISWAP, // or UNISWAP_V3
        fee: FeeAmount.MEDIUM,
      }
    }
  }]
}
```

### Option C: No External Takes (ArbTake Only)

**Best for:** Testing, conservative operation, or chains without suitable DEX integration

**No deployment needed** - just configure arbTake:
```typescript
const config: KeeperConfig = {
  // NO keeperTaker or keeperTakerFactory needed
  
  // ADD: For LP reward swaps only (no contracts needed for Uniswap V3/SushiSwap)
  universalRouterOverrides: {
    // ... Uniswap configuration for LP rewards
  },
  sushiswapRouterOverrides: {
    // ... SushiSwap configuration for LP rewards
  },
  
  pools: [{
    take: {
      // ONLY arbTake configuration
      minCollateral: 0.01,
      hpbPriceFactor: 0.95, // ArbTake when price < highest bucket * 0.95
      // NO liquiditySource or marketPriceFactor
    },
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usdc',
        slippage: 1,
        dexProvider: PostAuctionDex.SUSHISWAP, // LP rewards work without contracts
        fee: FeeAmount.MEDIUM,
      }
    }
  }]
}
```

### Deployment Validation

**For 1inch Single Contract:**
```bash
# Test the deployment
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action quote --poolName "Your Pool" --amount 1

# Expected: Quote data returned successfully
```

**For Factory System:**
```bash
# Verify factory deployment  
yarn start --config your-config.ts

# Expected log: "Detection Results - Type: factory, Valid: true"
```

## Step 2: Subgraph Setup with Goldsky

### Use BuiltByMom Fork + Goldsky Hosting

The recommended approach uses the [BuiltByMom/Ajna-subgraph](https://github.com/BuiltByMom/Ajna-subgraph) fork deployed on Goldsky, rather than running the subgraph locally.

**Why this approach:**
- BuiltByMom fork is often ahead of the official repo with important fixes
- Goldsky provides reliable hosting with 50 req/sec rate limit
- Much simpler than running Graph Node locally
- Better for production uptime

### Setup Steps:

1. **Install Goldsky CLI:**
   ```bash
   curl -fsSL https://cli.goldsky.com/install | bash
   goldsky --version
   ```

2. **Get Goldsky API Key:**
   - Create account at [goldsky.com](https://goldsky.com)
   - Generate API key in settings
   - Authenticate: `goldsky login`

3. **Clone and Deploy Subgraph:**
   ```bash
   git clone https://github.com/BuiltByMom/Ajna-subgraph.git
   cd Ajna-subgraph
   git checkout develop  # Latest network configurations
   npm install
   
   # Configure for your network (e.g., avalanche, base, arbitrum, hemi)
   npm run prepare:[network]
   npm run build
   
   # Deploy to Goldsky
   goldsky subgraph deploy ajna-[network]/1.0.0 --path .
   
   # Create production tag
   goldsky subgraph tag create ajna-[network]-prod --deployment ajna-[network]/1.0.0
   ```

4. **Get Subgraph URL:**
   After deployment, use the provided GraphQL endpoint URL in your keeper config.

## Step 3: Known Good Contract Addresses

### Ajna Deployment Addresses

[Ajna Deployment Addresses with Bridge Addresses](https://faqs.ajna.finance/info/deployment-addresses-and-bridges)

### Uniswap Universal Router Addresses

**Important:** Official Uniswap documentation sometimes contains outdated addresses. Use these verified addresses from production deployments:

| Network | Universal Router Address | Verified Source |
|---------|-------------------------|-----------------|
| Ethereum | `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` | [Uniswap Gov](https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323) |
| Avalanche | `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` | Production Verified |
| Base | `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` | [Uniswap Gov](https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323) |
| Arbitrum | `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD` | [Uniswap Gov](https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323) |
| Hemi | `0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B` | [Uniswap Gov](https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323) |

### SushiSwap V3 Router Addresses

**Production Verified Addresses:**

| Network | Swap Router | QuoterV2 | Factory | Notes |
|---------|-------------|----------|---------|-------|
| Hemi | `0x33d91116e0370970444B0281AB117e161fEbFcdD` | `0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C` | `0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959` | Production Tested |
| Base | `0x[verify-on-deployment]` | `0x[verify-on-deployment]` | `0x[verify-on-deployment]` | Check SushiSwap docs |
| Avalanche | `0x[verify-on-deployment]` | `0x[verify-on-deployment]` | `0x[verify-on-deployment]` | Check SushiSwap docs |

### 1inch Router Addresses

| Network | 1inch Router Address |
|---------|---------------------|
| Ethereum | `0x1111111254EEB25477B68fb85Ed929f73A960582` |
| Avalanche | `0x111111125421ca6dc452d289314280a0f8842a65` |
| Base | `0x1111111254EEB25477B68fb85Ed929f73A960582` |
| Arbitrum | `0x1111111254EEB25477B68fb85Ed929f73A960582` |

## Step 4: API Rate Limits and Service Tiers

### Understanding Rate Limits

**1inch API:**
- Free tier: 1 request/second, 100,000 requests/month, so only request once every 60 seconds to be under 100k limit
- Paid tiers: Higher limits available
- Get API key at [portal.1inch.dev](https://portal.1inch.dev/)

**SushiSwap:**
- No API rate limits (direct contract interaction)
- May have RPC rate limits depending on provider

**Uniswap V3:**
- No API rate limits (direct contract interaction)
- May have RPC rate limits depending on provider

**Goldsky:**
- 50 requests/second (generous for subgraph queries)
- Free tier available

**Alchemy/QuickNode:**
- Rate limits vary by plan
- Check your specific plan limits

### Recommended Bot Configuration

The keeper is configured with conservative timing to respect rate limits:

```typescript
{
  delayBetweenRuns: 15,        // 15 seconds between bot cycles
  delayBetweenActions: 61,     // 61 seconds between individual actions (for 1inch)
}
```

**For faster operation:** Upgrade to paid API tiers. The bot timing can be reduced with higher-tier service plans.

## Step 5: Chain-Specific Configuration Examples

### Avalanche Production Config Snippet

```typescript
const config: KeeperConfig = {
  dryRun: false,
  keeperKeystore: 'PUT_YOUR_FULL_PATH_HERE/keystore.json',
  logLevel: 'debug',
  ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  subgraphUrl: 'https://api.goldsky.com/api/public/project_[id]/subgraphs/ajna-avalanche/1.0.0/gn',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 11907934,
  delayBetweenRuns: 2,
  delayBetweenActions: 31,
  
  // 1inch Single Contract Setup
  keeperTaker: '0x[DEPLOY_WITH_query-1inch.ts]',
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65',
  },
  
  // Universal Router configuration (for LP rewards)
  universalRouterOverrides: {
    universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    wethAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    defaultFeeTier: 3000,
    defaultSlippage: 0.5,
    poolFactoryAddress: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
  },
  
  // Token addresses for swaps
  tokenAddresses: {
    avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
  
  // Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0x2aA2A6e6B4b20f496A4Ed65566a6FD13b1b8A17A',
    // ... other addresses
  },
  pools: [{
    name: 'savUSD / USDC',
    address: '0x936e0fdec18d4dc5055b3e091fa063bc75d6215c',
    price: {
      source: PriceOriginSource.FIXED,
      value: 1.01,
    },
    kick: {
      minDebt: 0.07,
      priceFactor: 0.99,
    },
    settlement: {
      enabled: true,
      minAuctionAge: 18000,
      maxBucketDepth: 50,
      maxIterations: 10,
      checkBotIncentive: true,
    },
    take: {
      // External take via 1inch
      liquiditySource: LiquiditySource.ONEINCH,
      marketPriceFactor: 0.98,
      minCollateral: 0.07,
      // ArbTake as backup
      hpbPriceFactor: 0.90,
    },
    // LP reward swapping via 1inch (requires contracts)
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usdc',
        dexProvider: PostAuctionDex.ONEINCH
      }
    }
  }],
  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
};
```

**Deployment Commands:**
```bash
# 1. Deploy 1inch connector
yarn ts-node scripts/query-1inch.ts --config avalanche-config.ts --action deploy

# 2. Update config with deployed address
# 3. Test with dry run first
yarn start --config avalanche-config.ts
```

### Hemi Production Config Snippet

```typescript
const config: KeeperConfig = {
  dryRun: false,
  keeperKeystore: 'PUT_YOUR_FULL_PATH_HERE/keystore.json',
  logLevel: 'debug',
  ethRpcUrl: 'https://rpc.hemi.network/rpc',
  subgraphUrl: 'https://api.goldsky.com/api/public/project_[id]/subgraphs/ajna-hemi/1.0.0/gn',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 484490,
  delayBetweenRuns: 2,
  delayBetweenActions: 31,

  // Factory System Setup
  keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
  takerContracts: {
    'UniswapV3': '0x[DEPLOYED_UNISWAP_TAKER_ADDRESS]',
    'SushiSwap': '0x[DEPLOYED_SUSHISWAP_TAKER_ADDRESS]'
  },
  
  // Universal Router configuration for Uniswap V3
  universalRouterOverrides: {
    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
    defaultFeeTier: 3000,
    defaultSlippage: 0.5,
    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
    quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
  },
  
  // SushiSwap configuration
  sushiswapRouterOverrides: {
    swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD', //address for Hemi Chain
    quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
    factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
    wethAddress: '0x4200000000000000000000000000000000000006',
    defaultFeeTier: 500,
    defaultSlippage: 10.0,
  },
  
  // Hemi token addresses
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006',
    usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
    usd_t2: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
    usd_t3: '0x9f60ec2c81308c753e84467e2526c7d8fc05cd0d',
    usd_t4: '0x00b2fee99fe3fc9aab91d1b249c99c9ffbb1ccde',
  },
  
  // Hemi Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0xE47b3D287Fc485A75146A59d459EC8CD0F8E5021',
    // ... other addresses
  },
  
  pools: [{
    name: 'USD_T1 / USD_T2',
    address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
    price: {
      source: PriceOriginSource.FIXED,
      value: 1.01,
    },
    kick: {
      minDebt: 0.07,
      priceFactor: 0.99,
    },
    settlement: {
      enabled: true,
      minAuctionAge: 18000,
      maxBucketDepth: 50,
      maxIterations: 10,
      checkBotIncentive: true,
    },
    take: {
      // External take via SushiSwap
      liquiditySource: LiquiditySource.SUSHISWAP,
      marketPriceFactor: 0.99,
      minCollateral: 0.1,
      // ArbTake as backup
      hpbPriceFactor: 0.98,
    },
    // LP reward swapping via SushiSwap (no contracts needed)
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usd_t2',
        dexProvider: PostAuctionDex.SUSHISWAP,
        fee: FeeAmount.LOW
      }
    }
  }],

  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
};
```

**Deployment Commands:**
```bash
# 1. Deploy factory system
yarn ts-node scripts/deploy-factory-system.ts hemi-config.ts

# 2. Update config with deployed addresses
# 3. Test with dry run first  
yarn start --config hemi-config.ts
```

## Step 6: Production Monitoring and Maintenance

### Monitoring Setup

1. **Subgraph Health:**
   ```bash
   goldsky subgraph log ajna-[network]/1.0.0 --tail
   ```

2. **Bot Logs:**
   - Use `logLevel: 'debug'` for detailed logging
   - Monitor for nonce issues, RPC failures, API rate limits

3. **Wallet Balance:**
   - Monitor gas token balance for transactions
   - Monitor quote token balance for liquidation bonds

### Common Production Issues

**Nonce Recovery:**
- The fork includes improved nonce handling for production reliability
- Monitor logs for nonce conflicts if running multiple bots

**API Rate Limiting:**
- Respect the configured delays
- Monitor for 429 (rate limit) responses
- Consider upgrading API tiers for faster operation

**RPC Reliability:**
- Use reputable providers (Alchemy, QuickNode)
- Consider backup RPC endpoints for redundancy

## Step 7: Security Considerations

### Keystore Security
- Store keystore files in secure locations with proper permissions
- Use separate wallets for each bot instance to avoid nonce conflicts
- Regularly backup keystore files

### API Key Management
- Store API keys in environment variables, not config files
- Rotate API keys periodically
- Use separate API keys for development and production

### Wallet Funding
- Maintain adequate gas token balances
- Fund quote tokens for liquidation bonds
- Monitor balances and set up alerts

## Step 8: Troubleshooting External Takes

### Contract Deployment Issues

**1inch Deployment Failures:**
```bash
# Error: "Contract creation failed"
# Solution: Check gas limits and network congestion
yarn ts-node scripts/query-1inch.ts --config config.ts --action deploy
```

**Factory Deployment Failures:**
```bash
# Error: "Missing universalRouterOverrides or sushiswapRouterOverrides"  
# Solution: Add complete router configs to config.ts

# Error: "Network mismatch"
# Solution: Ensure RPC URL matches the intended network

yarn ts-node scripts/deploy-factory-system.ts config.ts
```

### Configuration Validation Errors

**Smart Detection Issues:**
```bash
# Log: "Detection Results - Type: none, Valid: false"
# Cause: Missing required contract addresses
# Solution: Complete the contract deployment step

# Log: "TakeSettings: keeperTaker required when liquiditySource is ONEINCH"  
# Solution: Deploy 1inch contract or switch to factory approach

# Log: "universalRouterOverrides required when liquiditySource is UNISWAPV3"
# Solution: Add complete Universal Router configuration

# Log: "sushiswapRouterOverrides required when liquiditySource is SUSHISWAP"
# Solution: Add complete SushiSwap configuration
```

**LP Reward Configuration Issues:**
```bash
# Log: "Unsupported DEX provider: undefined"
# Cause: Missing dexProvider enum in rewardAction
# Solution: Replace old boolean logic with dexProvider: PostAuctionDex.ONEINCH/UNISWAP_V3/SUSHISWAP

# Log: "Configuration validation failed for oneinch: Missing keeperTaker"
# Solution: Deploy 1inch contract even for LP rewards
```

**External Take Not Executing:**
```bash
# Log: "No valid quote data"
# Cause: API rate limiting or misconfigured DEX addresses
# Solution: Increase delayBetweenActions, verify router addresses

# Log: "Wrong DEX for this contract"
# Cause: Contract/config mismatch  
# Solution: Ensure liquiditySource matches deployed contract type
```

### Performance Optimization

**1inch Rate Limiting:**
- Free tier: 1 req/sec, 100K/month
- Increase `delayBetweenActions` to 61+ seconds
- Consider paid tier for faster operation

**Uniswap V3 Gas Optimization:**
- Use `defaultFeeTier: 3000` for most pairs
- Adjust `defaultSlippage` based on volatility
- Monitor `quoterV2Address` for network-specific optimizations

**SushiSwap Configuration:**
- Use `defaultFeeTier: 500` for conservative approach
- Set higher slippage (10%+) for volatile pairs
- Verify factory and router addresses per chain

### Production Monitoring

**Key Logs to Monitor:**
```bash
# Successful external take
"Factory Take successful - poolAddress: 0x..., borrower: 0x..."

# Price comparison (debug level)
"Price check: pool=USD_T1/USD_T2, auction=0.9950, market=1.0020, takeable=0.9920, profitable=true"

# Detection results
"Detection Results - Type: factory, Valid: true"

# LP reward swaps
"Successfully swapped 1.5 of 0x123... to usdc via sushiswap"
```

**Health Check Commands:**
```bash
# Test 1inch integration
yarn ts-node scripts/query-1inch.ts --config config.ts --action quote --poolName "Pool Name" --amount 1

# Verify factory deployment
grep "Type: factory, Valid: true" logs/keeper.log
```

## Troubleshooting Production Issues

### Dependency Issues

**Yarn Lock Conflicts:**
If you encounter dependency version conflicts or installation errors:
```bash
rm yarn.lock
yarn install
yarn compile
```

**Why this happens:**
This is typically caused by:
- Different Node.js versions having different native module compatibility
- Package version conflicts between development and production environments  
- Lock file inconsistencies when multiple people contribute to the repo

### Subgraph Not Syncing
1. Check Goldsky deployment status
2. Verify contract addresses in subgraph config
3. Check start block numbers

### Bot Not Finding Liquidations
1. Verify pool addresses in config
2. Check price source configurations
3. Ensure adequate quote token balance for bonds

### Transaction Failures
1. Check gas price settings
2. Verify wallet has sufficient balance
3. Monitor for nonce issues in logs
4. Check RPC provider status

### Settlement-Related Issues

**Bonds Permanently Locked:**
1. Check if settlement is enabled: `settlement.enabled: true`
2. Verify minimum auction age hasn't been set too high
3. Check for auctions that actually need settlement vs normal auction activity
4. Monitor settlement logs for failure reasons

**Settlement Failures:**
1. Insufficient gas limits - settlement can be gas-intensive
2. Auction doesn't actually need settlement (check `needsSettlement` logs)
3. Multiple bots attempting settlement simultaneously
4. Network congestion causing timeouts

**Settlement Performance:**
1. High iteration counts may indicate complex debt structures
2. Failed settlements with `checkBotIncentive: true` suggest no rewards available
3. Consider setting checkBotIncentive to false

**Example Settlement Log Analysis:**
```bash
# Good settlement pattern
Settlement needed for borrower abc12345: Bad debt detected: 150.5 debt with 0 collateral
Settlement completed for abc12345 in 3 iterations

# Problematic pattern
Settlement incomplete for def67890 after 10 iterations: Partial settlement after 10 iterations
```

This indicates the auction needs more settlement iterations or has complex debt distribution.

### DEX-Specific Issues

**SushiSwap Quote Provider Issues:**
```bash
# Log: "SushiSwap quote failed: INSUFFICIENT_LIQUIDITY"
# Solution: Check if pool exists for the token pair and fee tier

# Log: "SushiSwap quoter reverted"
# Solution: Verify quoterV2Address and factory addresses

# Log: "No SushiSwap pool for tokenA/tokenB with fee 500"
# Solution: Try different fee tier (3000) or verify token addresses
```

**Multi-DEX Factory Issues:**
```bash
# Log: "Factory: Unsupported liquidity source: 3"
# Solution: Ensure takerContracts includes 'SushiSwap' entry

# Log: "Factory: Missing required SushiSwap configuration"
# Solution: Add complete sushiswapRouterOverrides to config
```

This production setup guide reflects real-world deployment experience across multiple networks and DEX integrations, significantly reducing setup time and common issues when running the Ajna keeper in production environments.
