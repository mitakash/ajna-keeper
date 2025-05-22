# Production Setup Guide

This guide covers the recommended approach for running the Ajna keeper in production environments, based on real-world deployment experience on Avalanche and Hemi networks.

## Overview: Production vs Development Setup

While the main README covers the basic setup process, production deployments benefit from using hosted services rather than running everything locally. This approach is more reliable, easier to maintain, and better suited for 24/7 operation.

**Recommended Production Stack:**
- **RPC Provider**: Alchemy or QuickNode (hosted)
- **Subgraph**: BuiltByMom/Ajna-subgraph deployed on Goldsky (hosted)
- **DEX Integration**: 1inch API or Uniswap Universal Router
- **Monitoring**: Goldsky subgraph monitoring + custom logging

## Step 1: RPC Provider Setup

### Option A: Alchemy (Recommended)
1. Create account at [alchemy.com](https://alchemy.com)
2. Create a new app for your target network (Avalanche, Base, Arbitrum, etc.)
3. Navigate to Apps > Networks tab
4. Copy the HTTPS URL (format: `https://[network].g.alchemy.com/v2/[api-key]`)

### Option B: QuickNode
1. Create account at [quicknode.com](https://quicknode.com)
2. Create endpoint for your target network
3. Copy the provided HTTPS URL

**Why hosted RPC?** Running a local node requires significant infrastructure, storage, and maintenance. Hosted providers offer better uptime and are more cost-effective for most use cases.

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
   
   # Configure for your network (e.g., avalanche, base, arbitrum)
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
  delayBetweenActions: 61,     // 61 seconds between individual actions
}
```

**For faster operation:** Upgrade to paid API tiers. The bot timing can be reduced with higher-tier service plans.

## Step 5: Chain-Specific Configuration Examples

### Avalanche Production Config

```typescript
const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
  subgraphUrl: 'https://api.goldsky.com/api/public/project_[id]/subgraphs/ajna-avalanche/1.0.0/gn',
  keeperKeystore: 'PUT_YOUR_FULL_PATH_HERE/keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11', //This is generally same on most chains
  multicallBlock: 11907934,  //This will vary depending on what chain you are on
  delayBetweenRuns: 15,
  delayBetweenActions: 61, //conservative for free tier 1inch api key
  
  // 1inch configuration
  oneInchRouters: {
    43114: '0x111111125421ca6dc452d289314280a0f8842a65',
  },
  
  // Universal Router configuration
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
  
  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
  // ... pool configurations
};
```

### Hemi Production Config

```typescript
const config: KeeperConfig = {
  dryRun: false,
  ethRpcUrl: 'https://rpc.hemi.network/rpc',
  subgraphUrl: 'https://api.goldsky.com/api/public/project_[id]/subgraphs/ajna-hemi/1.0.0/gn',
  keeperKeystore: 'PUT_YOUR_FULL_PATH_HERE/keystore.json',
  multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
  multicallBlock: 484490,
  delayBetweenRuns: 15,
  delayBetweenActions: 61,
  
  // Universal Router configuration for Hemi
  universalRouterOverrides: {
    universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
    wethAddress: '0x4200000000000000000000000000000000000006',
    permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
    defaultFeeTier: 3000,
    defaultSlippage: 0.5,
    poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
  },
  
  // Hemi token addresses
  tokenAddresses: {
    weth: '0x4200000000000000000000000000000000000006',
    // ... other token addresses
  },
  
  // Hemi Ajna contract addresses
  ajna: {
    erc20PoolFactory: '0xE47b3D287Fc485A75146A59d459EC8CD0F8E5021',
    // ... other addresses
  },
  
  coinGeckoApiKey: 'YOUR_COINGECKO_API_KEY',
  // ... pool configurations
};
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

## Troubleshooting Production Issues

### Dependency Issues

**Yarn Lock Conflicts:**
If you encounter dependency version conflicts or installation errors:
```bash
rm yarn.lock
yarn install
yarn compile
```
## Why this happens:
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

This production setup guide reflects real-world deployment experience and should significantly reduce setup time and common issues when running the Ajna keeper in production environments.
