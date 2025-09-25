# Production Setup Guide

This guide covers the recommended approach for running the Ajna keeper in production environments, based on real-world deployment experience on Avalanche, Hemi, Base, and other networks.

## Overview: Production vs Development Setup

While the main README covers the basic setup process, production deployments benefit from using hosted services rather than running everything locally. This approach is more reliable, easier to maintain, and better suited for 24/7 operation.

**Recommended Production Stack:**
- **RPC Provider**: Alchemy or QuickNode (hosted)
- **Subgraph**: BuiltByMom/Ajna-subgraph deployed on Goldsky (hosted)
- **DEX Integration**: 1inch API, Uniswap V3 Universal Router, SushiSwap V3 Router, or Curve
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

## Step 1.5: Critical Fee Tier Selection (Before Contract Deployment)

### Understanding Smart Contract Fee Tier Constraints

**IMPORTANT:** The fee tier you specify in router overrides gets compiled into the deployed smart contract. This creates a permanent constraint for external takes that cannot be changed without full redeployment.

```typescript
universalRouterOverrides: {
  defaultFeeTier: 3000, // ← THIS GETS COMPILED INTO SMART CONTRACT
  // ... other settings
},
sushiswapRouterOverrides: {
  defaultFeeTier: 500,  // ← THIS GETS COMPILED INTO SMART CONTRACT  
  // ... other settings
}
```

### Pre-Deployment Research Workflow

**Step 1: Inventory Your Pools**
```bash
# List all token pairs you'll be liquidating
# Example: USDC/WETH, DAI/USDC, WBTC/WETH, vcred/usdc_e, etc.
```

**Step 2: Research Fee Tier Liquidity**

**Fee Tier Mapping (Critical Reference):**
- `500` = 0.05% = 5 basis points (typically stablecoins)
- `3000` = 0.3% = 30 basis points (most common major pairs)  
- `10000` = 1.0% = 100 basis points (exotic pairs, higher volatility)

For Uniswap V3:
1. Visit [Uniswap Info](https://info.uniswap.org/#/pools) → your network
2. For each token pair, compare TVL across fee tiers:
   - 500 (0.05%): Usually stablecoins, lower volatility
   - 3000 (0.3%): Most common major pairs  
   - 10000 (1%): Exotic pairs, higher volatility
3. **Weight by expected liquidation volume/value**

For SushiSwap:
1. Check [SushiSwap Analytics](https://www.sushi.com/base/pool) → your network
2. Most pools use 500 (0.05%) or 3000 (0.3%)
3. Verify pools exist for your pairs before deployment

**Step 3: Make Strategic Fee Tier Decision**
```
Priority Matrix:
High-value pools + High-frequency pairs = Highest weight in decision
Medium-value pools = Medium weight  
Low-value/rare pairs = Optimize via LP reward overrides later
```

**Real-World Example Decision Process (Based on Production Configs):**
```
Hemi Network Pools Analysis:
- vcred/usdc_e (medium value): Most liquidity in 500 tier (0.05%)
- vusd/usdc_e (medium value): Most liquidity in 500 tier (0.05%)  
- usd_t1/usdc_t (high frequency): Most liquidity in 3000 tier (0.3%)

Production Decision: Use defaultFeeTier: 3000
Rationale: 
- Optimize for highest frequency pair (usd_t1/usdc_t) 
- External takes get optimal routing for most common liquidations
- Use fee: FeeAmount.LOW overrides in LP rewards for vcred/vusd pairs

Result in Production Config:
universalRouterOverrides: {
  defaultFeeTier: 3000, // All external takes use 0.3%
},
sushiswapRouterOverrides: {
  defaultFeeTier: 3000, // All external takes use 0.3%  
}
```

### Post-Deployment Flexibility

After contract deployment, you retain flexibility only for LP reward swaps:

```typescript
pools: [
  {
    name: "vcred/usdc_e",
    take: {
      // External takes: LOCKED to contract's defaultFeeTier (3000 = 0.3%)
      liquiditySource: LiquiditySource.SUSHISWAP,
    },
    collectLpReward: {
      rewardActionCollateral: {
        fee: FeeAmount.LOW, // FLEXIBLE: Can use optimal 0.05% for this pair
        dexProvider: PostAuctionDex.SUSHISWAP
      }
    }
  }
]
```

### When to Redeploy Contracts

Consider redeployment if:
- Market liquidity shifts significantly (quarterly review)
- You add pools with very different optimal fee tiers
- External take profitability drops due to poor routing
- Major liquidity migrations between fee tiers

**Redeployment Process:**
1. Research current market conditions
2. Update `defaultFeeTier` in config
3. Redeploy: `yarn ts-node scripts/deploy-factory-system.ts config.ts`  
4. Update config with new contract addresses
5. Test thoroughly before production

This makes fee tier selection a **strategic infrastructure decision**, not just a configuration parameter.

## Step 2: Contract Deployment for External Takes

**External takes** connect Ajna liquidation auctions directly to external DEX liquidity, enabling profitable liquidation of undercollateralized loans using external market prices.

### Decision Matrix: Which Approach to Use?

| Chain Type | 1inch Available? | Uniswap V3? | SushiSwap V3? | Curve? | Recommended Approach | Deployment Script |
|------------|------------------|-------------|---------------|--------|---------------------|-------------------|
| **Major Chains**<br/>(Ethereum, Avalanche, Base, Arbitrum) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | **1inch Single Contract** | `scripts/query-1inch.ts` |
| **Emerging L2s**<br/>(Hemi, Scroll, etc.) | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | **Factory System (Multi-DEX)** | `scripts/deploy-factory-system.ts` |
| **Stablecoin-Heavy Chains** | ❌ No | ✅ Yes | ❌ No | ✅ Yes | **Factory System (Uniswap V3 + Curve)** | `scripts/deploy-factory-system.ts` |
| **Uniswap-only Chains** | ❌ No | ✅ Yes | ❌ No | ❌ No | **Factory System (Uniswap V3 Only)** | `scripts/deploy-factory-system.ts` |


### Option A: 1inch Single Contract Deployment

**Best for:** Established chains with 1inch aggregator support

**IMPORTANT:** 1inch contract deployment is now **required even for LP reward swaps**.

**Prerequisites:**
```bash
# 1. Complete fee tier research (not applicable to 1inch - it auto-routes optimally)
# 2. Compile contracts first
yarn compile

# 3. Verify 1inch router addresses for your chain
# Ethereum: 0x1111111254EEB25477B68fb85Ed929f73A960582
# Avalanche: 0x111111125421ca6dc452d289314280a0f8842a65
# Base: 0x1111111254EEB25477B68fb85Ed929f73A960582
```

**Deployment Steps:**
```bash
# Deploy the single 1inch connector contract
yarn ts-node scripts/query-1inch.ts --config your-config.ts --action deploy

# Expected output:
# ✅ 1inch keeper taker deployed to: 0x[deployed-address]
# ✅ Contract verification successful
# ✅ Ready for external takes and LP reward swaps
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
# 1. COMPLETE FEE TIER RESEARCH (CRITICAL - see Step 1.5 above)
# 2. Compile contracts first
yarn compile

# 3. Verify Universal Router and SushiSwap addresses for your chain
# Uniswap V3 Gov Post: https://gov.uniswap.org/t/official-uniswap-v3-deployments-list/24323/8
# SushiSwap: Check official documentation or block explorers
```

**Deployment Steps:**
```bash
# Deploy factory + Uniswap V3 + SushiSwap taker system  
yarn ts-node scripts/deploy-factory-system.ts your-config.ts

# Expected output:
# ✅ AjnaKeeperTakerFactory deployed to: 0x[factory-address]
# ✅ UniswapV3KeeperTaker deployed to: 0x[uniswap-taker-address]
# ✅ SushiSwapKeeperTaker deployed to: 0x[sushiswap-taker-address]
# ✅ Factory configured with UniswapV3 and SushiSwap takers
# ✅ All verification checks passed
```

**Configuration Updates (Based on Production Hemi Config Pattern):**
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
    defaultFeeTier: 3000,    // ← COMPILED INTO CONTRACT: 0.3% fee tier
    defaultSlippage: 0.5,    // 0.5% slippage tolerance
  },
  
  // ADD: SushiSwap configuration
  sushiswapRouterOverrides: {
    swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
    quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
    factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
    wethAddress: '0x4200000000000000000000000000000000000006',
    defaultFeeTier: 3000,    // ← COMPILED INTO CONTRACT: 0.3% fee tier
    defaultSlippage: 1.0,    // 1% slippage tolerance
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
        targetToken: 'usdc_t',
        slippage: 2,
        dexProvider: PostAuctionDex.SUSHISWAP, // or UNISWAP_V3
        fee: FeeAmount.LOW, // Can use different fee tier than external takes!
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

## Step 3: Subgraph Setup with Goldsky

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

## Step 4: Known Good Contract Addresses

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


### Curve Pool Addresses

**Curve pools vary by network. Find current pools at [Curve.fi](https://curve.fi):**

| Network | Example Pools | Pool Type | Notes |
|---------|---------------|-----------|-------|
| Ethereum | 3Pool (USDC/USDT/DAI) | STABLE | `0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7` |
| Ethereum | TriCrypto2 (ETH/BTC/USDT) | CRYPTO | `0xD51a44d3FaE010294C616388b506AcdA1bfAAE46` |
| Base | TriCrypto (crvUSD/tBTC/ETH) | CRYPTO | `0x6e53131F68a034873b6bFA15502aF094Ef0c5854` |
| Base | crvUSD/USDC | STABLE | Check Curve.fi for current pools |

## Step 5: API Rate Limits and Service Tiers

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

**Curve:**
- No API rate limits (direct pool contract interaction)
- May have RPC rate limits depending on provider
- Pool discovery requires manual configuration

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

## Step 6: DEX Configuration Best Practices

### Pool Liquidity Verification

**Critical for Production Success:** DEX integrations require manual pool/fee tier selection. The bot will only use exactly what you configure - it cannot automatically find better routes.

**For Uniswap V3:**
1. Visit [Uniswap Info](https://info.uniswap.org/#/pools) → your network
2. Search each token pair in your pools (e.g., "USDC WETH")
3. Compare Total Value Locked (TVL) across fee tiers:
   - 500 (0.05%) - typically stablecoin pairs
   - 3000 (0.3%) - most common for major pairs  
   - 10000 (1%) - exotic or volatile pairs
4. Set `defaultFeeTier` to the highest TVL option
5. For LP rewards, set `fee: FeeAmount.MEDIUM` (or appropriate tier)

**For SushiSwap:**
1. Check [SushiSwap Analytics](https://www.sushi.com/pool) → your network
2. Verify pool existence and liquidity for your pairs
3. Most SushiSwap pools use 500 (0.05%) or 3000 (0.3%) tiers
4. Set `defaultFeeTier` conservatively (typically 500)
5. Use higher `defaultSlippage` (5-10%) due to potentially lower liquidity

**For Curve:**
1. Visit [Curve.fi](https://curve.finance) → your network
2. Manually identify pool addresses containing your token pairs
3. Verify pool type: StableSwap (int128 indices) vs CryptoSwap (uint256 indices)
4. Check recent volume and TVL before configuring
5. Use conservative slippage (2-5%) and test thoroughly

### Understanding External Takes vs Post-Auction Swaps

**External Takes (Time-Sensitive):**
- Execute during active auctions when timing is critical
- Use global DEX settings: `defaultFeeTier` from router overrides
- Cannot be customized per pool due to speed requirements
- Choose `defaultFeeTier` based on your most common/valuable token pairs

**Post-Auction Swaps (Flexible):**  
- Execute after auctions complete when timing is less critical
- Can override fee tiers per pool using the `fee` parameter in `rewardAction`
- Allow optimization for each specific token pair
- If no `fee` specified, falls back to global `defaultFeeTier`

### Configuration Strategy

**Step 1: Set Global Defaults for External Takes**
```typescript
universalRouterOverrides: {
  defaultFeeTier: 3000, // Optimize for most common pairs (WETH/USDC, etc.)
  defaultSlippage: 0.5,
  // ... other settings
}
```

**Step 2: Override Per Pool for LP Rewards**
```typescript
pools: [
  {
    name: "Stablecoin Pool (USDC/DAI)",
    collectLpReward: {
      rewardActionCollateral: {
        fee: FeeAmount.LOW, // 0.05% - better for stables
        dexProvider: PostAuctionDex.UNISWAP_V3
      }
    }
  },
  {
    name: "Volatile Pool (WETH/WBTC)",
    // No fee override = uses defaultFeeTier (3000)
    collectLpReward: {
      rewardActionCollateral: {
        dexProvider: PostAuctionDex.UNISWAP_V3 // Uses global default
      }
    }
  }
]
```

### Liquidity Research Workflow

1. **For External Takes**: Focus on your highest-value pools and most common token pairs
2. **For Post-Auction LP Rewards**: Research each specific token pair individually
3. Use Uniswap Info or SushiSwap Analytics to compare TVL across fee tiers
4. Set global defaults conservatively, then optimize individual pools as needed

### Production Monitoring

Once deployed, monitor for these signs of suboptimal pool configuration:
- Frequent "insufficient liquidity" errors
- Large price impact warnings in logs
- Lower-than-expected arbitrage profits
- High slippage on external takes

Regular review (monthly/quarterly) ensures configuration stays optimal as DEX liquidity evolves.

## Step 7: Chain-Specific Configuration Examples

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
  ethRpcUrl: 'https://rpc.hemi.network/rpc',  //you can put in your own Quicknode RPC here
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
    defaultFeeTier: 3000, // ← COMPILED INTO CONTRACT: All Uniswap external takes use 0.3%
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
    defaultFeeTier: 3000, // ← COMPILED INTO CONTRACT: All SushiSwap external takes use 0.3%
    defaultSlippage: 1.0,
  },
  
  // Hemi token addresses
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006',
    usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
    usd_t2: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
    usdc_t: '0x37eBf9aC1C05c023D329095B0b17A812ae9C66F6',
  },
  
  // Hemi Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0xE47b3D287Fc485A75146A59d459EC8CD0F8E5021',
    // ... other addresses
  },
  
  pools: [{
    name: 'usd_t1 / usdc_t',
    address: '0xf4a658cfaf358efdf5c2420fac783b160ae9b9e4',
    price: {
      source: PriceOriginSource.FIXED,
      value: 1.00,
    },
    kick: {
      minDebt: 0.1,
      priceFactor: 0.99,
    },
    settlement: {
      enabled: true,
      minAuctionAge: 18000,
      maxBucketDepth: 50,
      maxIterations: 10,
      checkBotIncentive: false,
    },
    take: {
      // External take via SushiSwap (uses contract's 0.3% tier)
      liquiditySource: LiquiditySource.SUSHISWAP,
      marketPriceFactor: 0.99,
      minCollateral: 0.01,
      // ArbTake as backup
      hpbPriceFactor: 0.985,
    },
    // LP reward swapping via SushiSwap (can override fee tier)
    collectLpReward: {
      rewardActionCollateral: {
        action: RewardActionLabel.EXCHANGE,
        targetToken: 'usdc_t',
        dexProvider: PostAuctionDex.SUSHISWAP,
        fee: FeeAmount.MEDIUM, // Can use different tier than external takes!
        slippage: 3,
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

### Base Curve Production Config Snippet

```typescript
const config: KeeperConfig = {
  // ... basic config
  
  // Factory System Setup with Curve
  keeperTakerFactory: '0x[DEPLOY_WITH_deploy-factory-system.ts]',
  takerContracts: {
    'Curve': '0x[DEPLOYED_CURVE_TAKER_ADDRESS]',
  },

  curveRouterOverrides: {
    poolConfigs: {
      'tbtc-weth': {  // crvUSD-tBTC-ETH 3 pool (tricrypto)
        address: '0x6e53131F68a034873b6bFA15502aF094Ef0c5854', // TriCrypto (Base)
        poolType: CurvePoolType.CRYPTO
      },
      'usdc_t-usd_t1': {  // 3-pool stablecoin configuration
        address: '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb', // 3 stable-coin pool (Base)
        poolType: CurvePoolType.STABLE
      }
    },
    defaultSlippage: 1.0,
    wethAddress: '0x4200000000000000000000000000000000000006'
  },

  // Required token address mapping for Curve
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tbtc: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
    usdc_t: '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
    usd_t1: '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
  },
  
  pools: [
    {
      name: 'USDC_T/USD_T1',
      address: '0xda5cc6f3ee0c9b80b2e4df9a34de7c4c81067c46',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1.00,
      },
      take: {
        liquiditySource: LiquiditySource.CURVE, // Use Curve for external takes
        marketPriceFactor: 0.99,
        minCollateral: 0.01,
        hpbPriceFactor: 0.98, // ArbTake backup
      },
      collectLpReward: {
        rewardActionCollateral: {
          action: RewardActionLabel.EXCHANGE,
          address: "0x53Be558aF29cCC65126ED0E585119FAC748FeB01B", // USDC_T
          targetToken: "usd_t1",
          slippage: 1,
          dexProvider: PostAuctionDex.CURVE, // Use Curve for LP rewards
        },
      },
      // ... other config
    }
  ]
};
```

## Step 8: Production Monitoring and Maintenance

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

## Step 9: Security Considerations

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

## Step 10: Troubleshooting External Takes

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

**Curve Pool Selection:**
- Use STABLE pools (int128) for stablecoin pairs (USDC/DAI/USDT)
- Use CRYPTO pools (uint256) for volatile pairs (ETH/BTC/volatile assets)
- Higher slippage tolerance needed for crypto pools (2-4%)
- Manual pool address configuration required (no universal router)

**Curve Gas Optimization:**
- Conservative gas limits (800k) due to complex pool mathematics
- L2 networks generally have lower gas costs for Curve operations
- Pool type affects gas usage (STABLE pools typically cheaper)
- Consider multiple pool routing for better rates on larger trades

**Curve Configuration Best Practices:**
- Always include `tokenAddresses` mapping for reliable pool discovery
- Test pool configurations with small amounts first
- Verify pool contents using block explorer before deployment
- Use established pools with good liquidity for production

### Production Monitoring

**Key Logs to Monitor:**
```bash
# Successful external take
"Factory Take successful - poolAddress: 0x..., borrower: 0x..."

# Price comparison (debug level)
"Price check: pool=usd_t1/usdc_t, auction=0.9950, market=1.0020, takeable=0.9920, profitable=true"

# Detection results
"Detection Results - Type: factory, Valid: true"

# LP reward swaps
"Successfully swapped 1.5 of 0x123... to usdc_t via sushiswap"

# Fee tier usage in external takes
"Using compiled fee tier 3000 (0.3%) for external take"

# Fee tier override in LP rewards  
"LP reward swap: Using fee override 500 (0.05%) instead of default 3000"
```

**Key Logs to Monitor for Curve:**
```bash
# Successful Curve external take
"Factory Curve Take successful - poolAddress: 0x..., borrower: 0x..."

# Curve price comparison (debug level)
"Curve price check: pool=USDC_T/USD_T1, auction=0.9980, market=1.0015, takeable=0.9915, profitable=true"

# Curve pool discovery
"Found Curve pool for usdc_t/usd_t1: 0x123... (STABLE)"

# Curve LP reward swaps
"Successfully swapped 1.2 of 0x456... to usd_t1 via curve"
```

**Health Check Commands:**
```bash
# Test 1inch integration
yarn ts-node scripts/query-1inch.ts --config config.ts --action quote --poolName "Pool Name" --amount 1

# Verify factory deployment
grep "Type: factory, Valid: true" logs/keeper.log

# Check fee tier compilation
grep "compiled fee tier" logs/keeper.log
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

**Smart Contract Fee Tier Issues:**
```bash
# Log: "External takes consistently unprofitable"
# Cause: Contract deployed with suboptimal fee tier
# Solution: Research current liquidity, consider redeploying with better tier

# Log: "High price impact on external takes"  
# Cause: Contract locked to low-liquidity fee tier
# Solution: Either redeploy or rely more on arbTake strategy

# Log: "LP rewards more profitable than external takes"
# Cause: LP rewards using optimal per-pool overrides, external takes using suboptimal contract tier
# Solution: Normal - this is expected with strategic fee tier choices
```

**SushiSwap Quote Provider Issues:**
```bash
# Log: "SushiSwap quote failed: INSUFFICIENT_LIQUIDITY"
# Solution: Check if pool exists for the token pair and fee tier

# Log: "SushiSwap quoter reverted"
# Solution: Verify quoterV2Address and factory addresses

# Log: "No SushiSwap pool for tokenA/tokenB with fee 3000"
# Solution: Try different fee tier (500) or verify token addresses
```

**Multi-DEX Factory Issues:**
```bash
# Log: "Factory: Unsupported liquidity source: 3"
# Solution: Ensure takerContracts includes 'SushiSwap' entry

# Log: "Factory: Missing required SushiSwap configuration"
# Solution: Add complete sushiswapRouterOverrides to config
```

This production setup guide reflects real-world deployment experience across multiple networks and DEX integrations, significantly reducing setup time and common issues when running the Ajna keeper in production environments.
