# Ajna Keeper Bot - AI Copilot Instructions

## Project Overview
Ajna Keeper is an automated liquidation bot for the Ajna lending protocol. It monitors pools for underwater loans and executes liquidations, bonds collection, settlement, and reward gathering. Each instance runs **one chain + one wallet** and can manage multiple pools.

## Architecture Overview

### Core Loop Structure (`src/run.ts`)
The keeper uses **five parallel async loops**, each polling at configurable intervals:

1. **kickPoolsLoop** → `src/kick.ts` - Initiates liquidations via `poolKick()` 
2. **takePoolsLoop** → `src/take.ts` - Liquidates via liquidity swaps + settlement
3. **settlementLoop** → `src/settlement.ts` - Finalizes auctions after liquidations
4. **collectBondLoop** → `src/collect-bond.ts` - Recovers liquidation bonds
5. **collectLpRewardsLoop** → `src/collect-lp.ts` - Harvests LP position rewards

Each loop is **independent** and handles errors gracefully. Pool data fetched once at startup via AjnaSDK, then cached in a `PoolMap`.

### Three Deployment Models

**1. Single Contract Mode** (`keeperTaker` config)
- Legacy approach using single `AjnaKeeperTaker.sol` contract
- Integrated 1inch DEX routing for all swaps
- Used on major chains (Base, Avalanche, Arbitrum)
- `SmartDexManager` detects and routes here

**2. Factory Pattern** (`keeperTakerFactory` config, new standard)
- `AjnaKeeperTakerFactory.sol` maintains mapping of `LiquiditySource → taker contract`
- Multiple DEX implementations: `SushiSwapKeeperTaker.sol`, `UniswapV3KeeperTaker.sol`, `UniswapV4KeeperTaker.sol`
- Each taker validates pool and executes swaps via respective DEX
- Enables multi-DEX strategy per pool via config

**3. No DEX Integration** (`none` deployment)
- `arbTake()` only - takes use existing liquidity in Ajna pools
- Settlement still executes
- Used when no DEX contracts deployed

Smart detection in `SmartDexManager.detectDeploymentType()` checks priority: factory > single > none.

### Data Flow: Liquidation Process
```
Subgraph query (undercollateralized loans)
  ↓
Calculate liquidation bond + flash loan requirements
  ↓
[Kick] poolKick() - initiate auction, lock bond
  ↓
[Take] Smart DEX routing:
    - Single: send collateral to AjnaKeeperTaker → 1inch swap
    - Factory: route to appropriate taker (Sushi/UniV3/V4) → execute swap
    - arbTake: use Ajna internal liquidity
  ↓
[Settlement] poolSettle() - finalize auction, release bonds
  ↓
[Collect] claimRewards() - harvest LP positions or bonds
```

## Critical Config Patterns

### Configuration Structure (`config-types.ts`)
```typescript
KeeperConfig {
  // Chain RPC + subgraph endpoints (REQUIRED)
  ethRpcUrl: string;
  subgraphUrl: string;
  
  // ONE OF: keeperTaker OR keeperTakerFactory (determines deployment mode)
  keeperTaker?: string;           // Single contract mode
  keeperTakerFactory?: string;     // Factory mode
  takerContracts?: { [source: string]: string }; // Maps LiquiditySource to addresses
  
  // Per-pool configuration
  pools: PoolConfig[] {
    address: string;
    kick?: KickConfig;      // Enable with specific collateral price source
    take?: TakeConfig;      // Enable + choose liquiditySource (1inch/arbTake/SushiSwap/etc)
    settlement?: SettlementConfig;
    collectBond?: true;
    collectLP?: CollectLpConfig;
  }
  
  // Price sources - flexible per pool
  PriceOriginSource.FIXED | COINGECKO | POOL
  PriceOriginPoolReference.HPB | HTP | LUP | LLB
}
```

**Common Config Mistakes:**
- Missing `multicallAddress` for chain → fails pool data fetch
- `dryRun: true` but expecting transactions → no-op silently
- Mismatched `chainId` in hardhat vs actual network
- `liquiditySource: '1inch'` without `keeperTaker` deployed → crash

### Pool-Level Configuration
Each pool independently configures which features enabled:
```typescript
pools: [
  {
    address: '0x...',
    kick: { priceOrigin: {...} },          // Only this pool uses kick
    take: { liquiditySource: 'SushiSwap' }, // Uses factory taker routing
    settlement: { enabled: true },
    collectBond: true
  }
]
```

## Key Modules & Their Boundaries

### External Data Sources
- **Subgraph queries** (`src/subgraph.ts`) - Loans, auctions, pool state
- **CoinGecko** (`src/coingecko.ts`) - Token prices (rate-limited via API key)
- **DEX Quotes** (`src/dex-providers/`) - Swap minimums to prevent slippage:
  - `uniswap-quote-provider.ts` - UniV3 routing calculation
  - `sushiswap-quote-provider.ts` - SushiSwap quote
  - `uniswapV4-quote-provider.ts` - UniV4 hook calldata calculation

### Liquidation Execution Modules
- **kick.ts** - Bond math, allowance management, auction initiation
- **take.ts** - Routes via SmartDexManager, calls appropriate executor
  - `handleFactoryTakes()` - Factory pattern dispatch
  - `liquidationArbTake()` - Direct Ajna internal liquidity use
- **settlement.ts** - Auction finalization with global deduplication lock
- **transactions.ts** - Direct contract calls via ethers (poolKick, liquidationArbTake, poolSettle)

### Infrastructure
- **provider.ts** - JsonRpcProvider wrapper + fork detection
- **dex-router.ts** - DexRouter orchestrates quote lookup → swap execution
- **nonce.ts** - NonceTracker prevents tx submission collisions (per signer)
- **reward-action-tracker.ts** - Tracks executed rewards to prevent duplicates
- **utils.ts** - Decimals, WAD conversions, retry logic

## Developer Workflows

### Build & Compile
```bash
yarn install              # Install deps + compile Solidity
npx hardhat compile       # Regenerate TypeChain types (if contracts change)
```

### Testing
```bash
npm run unit-tests             # Mocha tests in src/unit-tests/**
npm run integration-tests      # Hardhat tests in src/integration-tests/** (use fork)
npm run fork-base              # Start hardhat fork of Base for manual testing
```

### Running Locally
```bash
yarn start --config ./config.ts     # Requires config.ts + .env (ALCHEMY_API_KEY, MNEMONIC)
```

### Hardhat Fork Testing
Edit `hardhat.config.ts` `forking.url` to target chain, then:
```bash
FORK_ENABLED=true FORK_NETWORK=base npx hardhat node
# In another terminal:
npx hardhat test --network localhost
```

### Deployment Workflow (Smart Contracts)
Two options based on deployment model:

**1. Single AjnaKeeperTaker** (legacy, 1inch mode):
```bash
npx hardhat run scripts/query-1inch.ts    # Test 1inch endpoint
npx hardhat deploy-factory-system         # Actually deploys factory + single taker
```

**2. Factory + Multi-Taker** (new standard):
```bash
npx hardhat run scripts/deploy-factory-system.ts
# Deploys: AjnaKeeperTakerFactory + SushiSwapKeeperTaker + UniswapV3/V4 takers
```

Then **update config**:
```typescript
keeperTakerFactory: '0x...from-deploy',
takerContracts: {
  'SushiSwap': '0x...',
  'UniswapV3': '0x...',
  'UniswapV4': '0x...'
}
```

## Project-Specific Patterns & Conventions

### 1. Async Iteration Pattern
Used throughout for handling collections without loading all into memory:
```typescript
for await (const item of getItems(...)) {
  await process(item);
  await delay(config.delayBetweenActions); // Avoid rate limits
}
```
See: `kick.ts:getLoansToKick()`, `take.ts` auction iteration.

### 2. Decimals Handling - CRITICAL
Token amounts use **WAD format** (18 decimals) internally; convert at boundaries:
```typescript
decimaledToWei(amount, decimals)   // User input → internal
weiToDecimaled(wadAmount, decimals) // Internal → display/calc
convertWadToTokenDecimals(wad, decimals) // Pool state → token amount
```
**Never** mix WAD + token decimals. See `src/utils.ts` and `erc20.ts`.

### 3. Error Handling in Loops
Loops **never crash** - errors logged, loop continues:
```typescript
try {
  await handleKicks({...});
} catch (error) {
  logger.error(`Failed to handle kicks for pool: ${pool.name}.`, error);
}
// Loop continues to next pool
```

### 4. Dry Run Mode
When `dryRun: true`, transactions are logged but **not submitted**. Useful for validation. Check `src/transactions.ts` condition:
```typescript
if (config.dryRun) {
  logger.info(`[DRY RUN] Would execute: ${action}`);
  return;
}
```

### 5. Nonce Management (Multi-Keeper Scenario)
`NonceTracker` prevents nonce collisions when multiple keepers use same account:
```typescript
const nonce = await nonceTracker.getNextNonce();
await tx(..., { nonce });
```
Increments **locally** - doesn't query chain each time.

### 6. Configuration Validation
`validateTakeSettings()` and `configureAjna()` in `config-types.ts` validate config at startup. Example: ensures `liquiditySource` matches deployment type.

### 7. Subgraph Dependency
Most queries use GraphQL via `subgraph.ts`. If subgraph down, keeper stalls. Monitor via logs:
```typescript
const loans = await subgraph.getUndercollateralizedLoans(pool.address);
```
Subgraph **must** be configured correctly for each chain.

## Common Pitfalls & Debugging

| Issue | Cause | Fix |
|-------|-------|-----|
| "Pool not found" error | `multicallAddress` missing for chain | Add to config, check Ajna docs |
| No kicks executed | Price source not configured or loan not underwater | Verify `priceOrigin` config + subgraph data |
| Settlement stuck in loop | Auction not finalizable (collateral gap) | Check `settlement.ts` validation logic |
| "Taker not set" error | Factory mode but `takerContracts` missing source | Deploy all taker contracts, update config |
| DEX swap fails silently | Slippage/minimum calculation wrong | Check `dex-providers/` quote accuracy |
| Nonce collision | Multiple keepers same account | Use different accounts per keeper |

## References & Key Files

| Purpose | File |
|---------|------|
| Entry point | `src/index.ts` |
| Main loop orchestration | `src/run.ts` |
| Configuration types + validation | `src/config-types.ts` |
| Liquidation initiation | `src/kick.ts` |
| Liquidation execution | `src/take.ts` |
| Auction settlement | `src/settlement.ts` |
| Smart contract factory | `contracts/factories/AjnaKeeperTakerFactory.sol` |
| DEX integration factory detection | `src/smart-dex-manager.ts` |
| Test configuration | `src/integration-tests/test-config.ts` |
| Example configs | `example-*.ts` |

## Adding New Features

**New liquidation strategy?** Add to `src/take.ts`, route via `SmartDexManager`.

**New DEX integration?** Create `contracts/takers/NewDexKeeperTaker.sol`, implement `IAjnaKeeperTaker`, deploy via factory system.

**New reward source?** Create module in `src/collect-*.ts`, add loop to `run.ts`, update config.

Always test with `dryRun: true` first, then fork tests before mainnet.
