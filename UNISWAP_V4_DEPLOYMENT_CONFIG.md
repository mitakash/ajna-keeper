# Your Uniswap V4 Deployment Configuration

## Deployed Contracts (Base Mainnet)

### Core V4 Contracts
- **PoolManager**: `0x498581ff718922c3f8e6a244956af099b2652b2b`
- **UniversalRouter**: `0x6ff5693b99212da76ad316178a184ab56d299b43`
- **Permit2**: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

### Factory System
- **AjnaKeeperTakerFactory**: `0x1729Fc45642D0713Fac14803b7381e601c27A8A4`
- **UniswapV4KeeperTaker**: `0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f`

---

## Uniswap V4 Pools

### 1. B_T1-B_T2 Pool (0.01% fee)
- **Token0 (B_T1)**: `0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE` (6 decimals)
- **Token1 (B_T2)**: `0xd8A0af85E2539e22953287b436255422724871AB` (6 decimals)
- **Fee**: 100 (0.01%)
- **Tick Spacing**: 1
- **Hooks**: None

### 2. B_T3-B_T4 Pool (0.01% fee)
- **Token0 (B_T3)**: `0x082b59dcb966fea684b8c5f833b997b62bb0ca20`
- **Token1 (B_T4)**: `0x46c9b45628bc1cf680d151b4c5b1226c3d236187`
- **Fee**: 100 (0.01%)
- **Tick Spacing**: 10
- **Hooks**: None

### 3. B_T2-B_T4 Pool (0.05% fee)
- **Token0 (B_T4)**: `0x46c9b45628bc1cf680d151b4c5b1226c3d236187`
- **Token1 (B_T2)**: `0xd8A0af85E2539e22953287b436255422724871AB`
- **Fee**: 500 (0.05%)
- **Tick Spacing**: 10
- **Hooks**: None

---

## Ajna Pools

### 1. B_T2/B_T4 Pool
- **Address**: `0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef`
- **Collateral**: B_T2 (6 decimals)
- **Quote**: B_T4 (6 decimals)
- **V4 Pool for Swap**: B_T2-B_T4 (fee 500)

### 2. B_T2/B_T1 Pool
- **Address**: `0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c`
- **Collateral**: B_T2 (6 decimals)
- **Quote**: B_T1 (6 decimals)
- **V4 Pool for Swap**: B_T1-B_T2 (fee 100)

### 3. B_T3/B_T4 Pool
- **Address**: `0xf44ed07f91be6a46296084d4951a27015c58ff32`
- **Collateral**: B_T3 (6 decimals)
- **Quote**: B_T4 (6 decimals)
- **V4 Pool for Swap**: B_T3-B_T4 (fee 100)

---

## Configuration Settings

### Keeper Settings
- **Polling Interval**: 5 seconds (fast)
- **Action Delay**: 10 seconds
- **Dry Run**: **FALSE** (LIVE TRADING ENABLED)
- **Default Slippage**: 0.5%

### Take Settings (All Pools)
- **Liquidity Source**: UNISWAPV4
- **Market Price Factor**: 1.01 (aggressive - take at 1% premium)
- **Min Collateral**: 0.0001 tokens (low threshold)
- **HPB Price Factor**: 1.02 (aggressive)

### Post-Auction Settings
- **Slippage**: 5%
- **DEX Provider**: UNISWAP_V4
- **Redeem First**: Collateral

---

## Token Mappings

| Symbol | Address | Decimals |
|--------|---------|----------|
| B_T1 | `0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE` | 6 |
| B_T2 | `0xd8A0af85E2539e22953287b436255422724871AB` | 6 |
| B_T3 | `0x082b59dcb966fea684b8c5f833b997b62bb0ca20` | 6 |
| B_T4 | `0x46c9b45628bc1cf680d151b4c5b1226c3d236187` | 6 |
| WETH | `0x4200000000000000000000000000000000000006` | 18 |

---

## Atomic Swap Flow

For each Ajna pool, the keeper will:

1. **Detect Liquidation** - Monitor for undercollateralized positions
2. **Check Profitability** - Query V4 pool via `checkUniswapV4FactoryQuote()`
3. **Execute Take** - Call `takeWithUniswapV4Factory()` if profitable
4. **Atomic Swap** - Inside `unlockCallback()`:
   - Receive collateral from Ajna
   - Swap via V4 PoolManager
   - Settle input tokens (transfer to PoolManager)
   - Take output tokens
   - Pay Ajna pool
   - Keep profit

---

## Post-Auction Flow

After collecting LP rewards:

1. **Collect Rewards** - Redeem collateral first
2. **Exchange via V4** - Use `DexRouter.swap()` with `PostAuctionDex.UNISWAP_V4`
3. **Target Tokens**:
   - B_T2/B_T4 Pool: Swap B_T2 → B_T4
   - B_T2/B_T1 Pool: Swap B_T2 → B_T1
   - B_T3/B_T4 Pool: Swap B_T3 → B_T4

---

## Important Notes

### ⚠️ LIVE TRADING ACTIVE
Your configuration has `dryRun: false`, meaning actual transactions will be executed!

### Token Decimals
All test tokens (B_T1, B_T2, B_T3, B_T4) use **6 decimals**, not 18. This is critical for:
- Price calculations
- Amount conversions
- Quote comparisons

### Aggressive Settings
Your keeper is configured for aggressive trading:
- Takes at 1% premium over market
- Fast polling (5 second intervals)
- Low collateral thresholds (0.0001 tokens)
- High slippage tolerance (5%)

This maximizes opportunities but may reduce profitability per trade.

### Pool Pairing
Make sure V4 pools are properly initialized with liquidity:
- B_T1-B_T2 must have liquidity for B_T2/B_T1 Ajna pool
- B_T2-B_T4 must have liquidity for B_T2/B_T4 Ajna pool
- B_T3-B_T4 must have liquidity for B_T3/B_T4 Ajna pool

---

## Testing Your Configuration

### Run Tests
```bash
# Test with your actual configuration
npm run test:integration -- src/integration-tests/uniswapV4-actual-config.test.ts

# Or use the test runner
./scripts/run-v4-tests.sh
```

### Check Pool Status
```bash
# Check if pools are initialized in PoolManager
# Check if pools have liquidity
# Verify token balances
```

### Monitor Keeper
```bash
# Run keeper in debug mode
npm start -- example-uniswapV4-config\ copy.ts

# Watch logs for:
# - Pool detection
# - Quote checks
# - Take attempts
# - Swap executions
```

---

## Troubleshooting

### "Pool not initialized"
V4 pool may not have liquidity. Check pool state in PoolManager.

### "Insufficient liquidity"
Add more liquidity to the V4 pool or reduce take amounts.

### "Price moved beyond limits"
Increase slippage tolerance or reduce polling frequency.

### "ERC20: insufficient allowance"
Permit2 approvals may have expired. Keeper will automatically renew.

### Gas Estimation Failures
Pool state may be changing rapidly. Retry or increase gas limits.

---

## Next Steps

1. ✅ Review this configuration document
2. ⚠️ Verify all contracts are deployed correctly
3. ⚠️ Ensure V4 pools have sufficient liquidity
4. ⚠️ Check keeper wallet has enough ETH for gas
5. ⚠️ Check keeper has token balances for testing
6. 🧪 Run integration tests
7. 🚀 Start keeper with monitoring enabled
8. 👀 Watch first few transactions closely

---

## Links

- [Base Explorer](https://basescan.org/)
- [V4 PoolManager](https://basescan.org/address/0x498581ff718922c3f8e6a244956af099b2652b2b)
- [UniversalRouter](https://basescan.org/address/0x6ff5693b99212da76ad316178a184ab56d299b43)
- [Your Factory](https://basescan.org/address/0x1729Fc45642D0713Fac14803b7381e601c27A8A4)
- [Your Taker](https://basescan.org/address/0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f)
