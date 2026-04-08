# Uniswap V4 Post-Auction Swaps - Full Integration Testing Checklist

## Overview
This checklist verifies that your Uniswap V4 implementation works end-to-end with the Ajna keeper bot, from auction participation to post-auction swaps.

---

## Phase 1: Pre-Flight Checks

### 1.1 Run Verification Script
```bash
npx ts-node scripts/verify-v4-full-cycle.ts
```

**Expected Output:**
- ✅ All checks pass
- ETH balance > 0.001
- B_T2 balance > 1.0
- All contracts configured
- V4 pools have liquidity

### 1.2 Manual Swap Test (Already Verified ✅)
```bash
npx ts-node scripts/test-v4swaps-manual.ts
```

**Status:** ✅ WORKING (confirmed successful swap on tx: 0x2886a658...)

---

## Phase 2: Component Verification

### 2.1 Keeper Configuration
**File:** `example-uniswapV4-config copy.ts`

Verify these settings:

- [ ] `dryRun: false` (live mode)
- [ ] `keeperTakerFactory` is set to deployed factory address
- [ ] `takerContracts.UniswapV4` is set to deployed taker address
- [ ] `uniswapV4RouterOverrides.router` points to Universal Router (Base)
- [ ] `uniswapV4RouterOverrides.poolManager` points to PoolManager (Base)
- [ ] `uniswapV4RouterOverrides.pools` contains B_T2-B_T4 pool config
- [ ] Pool configs have `collectLpReward.rewardActionCollateral.dexProvider: PostAuctionDex.UNISWAP_V4`
- [ ] Slippage set to 5% for V4 swaps

### 2.2 Smart DEX Detection
**Expected:** Factory deployment type detected automatically

```bash
# Check logs for:
grep "Detection Results" logs/debug.log | tail -5
```

**Expected Output:**
```
Detection Results - Type: factory, Valid: true
Using factory (multi-DEX) take handler for pool: B_T2/B_T4 Test Pool
```

### 2.3 V4 Router Module
**File:** `src/uniswapV4-router-module.ts`

- [x] Uses Universal Router (0x6ff5693b99212da76ad316178a184ab56d299b43)
- [x] Uses PoolManager (0x498581ff718922c3f8e6a244956af099b2652b2b)
- [x] Implements Permit2 approval flow
- [x] Encodes V4_SWAP, SETTLE_ALL, TAKE_ALL commands
- [x] Applies 1% price impact buffer in quote provider

---

## Phase 3: Full Auction Cycle Test

### 3.1 Start Keeper
```bash
# Terminal 1 - Start keeper
npm start

# OR run in background
nohup npm start > keeper-output.log 2>&1 &
```

### 3.2 Monitor Logs
```bash
# Terminal 2 - Watch debug logs
tail -f logs/debug.log

# Terminal 3 - Watch error logs
tail -f logs/error.log
```

### 3.3 Auction Cycle Checkpoints

**Step 1: Kick Detection**
```bash
grep "Kicking loan" logs/debug.log | tail -5
```

**Expected:**
```
[debug]: Kicking loan - pool: B_T2-B_T4, borrower: 0x...
[info]: Kicked loan successfully. Pool: B_T2-B_T4, Borrower: 0x...
```

**Verify:**
- [ ] Keeper detects liquidatable loans
- [ ] NP * priceFactor > Pool Price (with priceFactor: 1.05 or 0.99)
- [ ] Kick transaction succeeds
- [ ] No "insufficient allowance" errors
- [ ] No "insufficient balance" errors

**Step 2: Take Execution**
```bash
grep "take.*B_T2-B_T4\|Using factory" logs/debug.log | tail -10
```

**Expected:**
```
[debug]: Using factory (multi-DEX) take handler for pool: B_T2-B_T4
[debug]: Attempting factory take...
[info]: Factory take successful. Pool: B_T2-B_T4
```

**Verify:**
- [ ] Factory take handler is used
- [ ] V4 taker contract is called
- [ ] Collateral (B_T4) is acquired
- [ ] Transaction succeeds on-chain

**Step 3: Bond/Reward Collection**
```bash
grep "collectLpReward\|BucketTakeLPAwarded" logs/debug.log | tail -10
```

**Expected:**
```
[debug]: Collecting LP rewards for pool: B_T2-B_T4
[debug]: Redeeming collateral from bucket...
[info]: Collected rewards - Quote: X.XX, Collateral: Y.YY
```

**Verify:**
- [ ] LP rewards are detected
- [ ] Collateral is redeemed from buckets
- [ ] Bond is collected

**Step 4: Post-Auction V4 Swap**
```bash
grep -i "v4\|uniswap.*swap" logs/debug.log | tail -20
```

**Expected:**
```
[info]: Using Uniswap V4 pool: 0x46c9b4.../ 0xd8A0af... (fee: 500)
[info]: ✅ V4 QuoteProvider initialized successfully
[info]:    PoolManager: 0x498581ff718922c3f8e6a244956af099b2652b2b
[info]: 📊 V4 Market Price: 1.00XXX
[info]: 💰 Expected output: ~X.XXX B_T2 tokens
[info]: Executing V4 swap via Universal Router...
[info]: ✅ V4 swap successful!
```

**Verify:**
- [ ] V4 QuoteProvider initializes
- [ ] Market price is fetched from V4 pool
- [ ] Expected output is calculated correctly
- [ ] Universal Router is called
- [ ] Swap transaction succeeds
- [ ] B_T4 → B_T2 swap completes
- [ ] Keeper receives B_T2 tokens

---

## Phase 4: On-Chain Verification

### 4.1 BaseScan Transaction Analysis

**Find Recent Keeper Transactions:**
https://basescan.org/address/[YOUR_KEEPER_ADDRESS]

**Look for these transaction types:**

1. **Kick Transaction**
   - Method: `kick(address borrower, uint256 limitIndex)`
   - To: Ajna Pool (0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef)
   - Status: Success ✅

2. **Take Transaction**
   - Method: `execute(...)`
   - To: KeeperTakerFactory (0xA6b2f243b582c8219dFAA19EdaD8929Ee12b1b18)
   - Internal Calls: Should show V4 Taker contract
   - Status: Success ✅

3. **Collect Rewards**
   - Method: `removeQuoteToken` or `removeCollateral`
   - To: Ajna Pool
   - Status: Success ✅

4. **V4 Swap Transaction**
   - Method: `execute(bytes commands, bytes[] inputs)`
   - To: Universal Router (0x6ff5693b99212da76ad316178a184ab56d299b43)
   - Logs: Should show `Swap` event from PoolManager
   - Token Flow: B_T4 out → B_T2 in
   - Status: Success ✅

### 4.2 Token Balance Verification

**Before Auction:**
```bash
# Check B_T2 balance
cast call 0xd8A0af85E2539e22953287b436255422724871AB \
  "balanceOf(address)(uint256)" [KEEPER_ADDRESS] \
  --rpc-url https://base-mainnet.g.alchemy.com/v2/[API_KEY]
```

**After Full Cycle:**
- B_T2 should increase (from swap)
- B_T4 should be 0 or minimal (all swapped)

---

## Phase 5: Error Scenarios

### 5.1 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `insufficient funds for gas` | Low ETH balance | Add 0.001+ ETH to keeper wallet |
| `ERC20: insufficient allowance` | Pool not approved or low B_T2 | Keeper auto-approves; ensure B_T2 balance |
| `V4TooLittleReceived` | Slippage too tight or price impact | Increase slippage to 5% |
| `Not kicking loan since NP * Factor < Price` | priceFactor too strict | Adjust priceFactor (1.05 for aggressive) |
| `Pool not found in config` | V4 pool missing in config | Add pool to `uniswapV4RouterOverrides.pools` |
| `QuoteProvider failed` | Wrong PoolManager address | Verify PoolManager address for Base network |

### 5.2 Validation Tests

**Test 1: Quote Provider Accuracy**
```bash
# Compare manual swap vs keeper swap
# Manual swap got: 9086 tokens
# Keeper should get: ~9086 tokens (±1% price impact buffer)
```

**Test 2: Slippage Handling**
```bash
# With 5% slippage and 1% price impact buffer:
# Quote: 100 → Expected: 99 → Minimum: 94.05
# Actual should be: 98-99 tokens
```

---

## Phase 6: Comparison with Working DEXes

### 6.1 Sushiswap (Known Working ✅)
**Config Pattern:**
```typescript
rewardActionCollateral: {
  action: RewardActionLabel.EXCHANGE,
  dexProvider: PostAuctionDex.SUSHISWAP,
  targetToken: "quote_token",
  slippage: 2,
}
```

### 6.2 Uniswap V3 (Known Working ✅)
**Config Pattern:**
```typescript
rewardActionCollateral: {
  action: RewardActionLabel.EXCHANGE,
  dexProvider: PostAuctionDex.UNISWAP_V3,
  targetToken: "quote_token",
  slippage: 2,
}
```

### 6.3 Uniswap V4 (Testing Now)
**Config Pattern:**
```typescript
rewardActionCollateral: {
  action: RewardActionLabel.EXCHANGE,
  dexProvider: PostAuctionDex.UNISWAP_V4,
  targetToken: "b_t4", // or "b_t1"
  slippage: 5, // Higher due to V4 tick rounding
}
```

**Key Differences:**
- V4 uses PoolManager instead of individual pool contracts
- V4 requires Universal Router (not SwapRouter02)
- V4 needs Permit2 approvals
- V4 has additional price impact from tick rounding

---

## Success Criteria

### ✅ Full Test Passes When:

1. **Kick Phase**
   - [x] Keeper detects liquidatable loan
   - [x] Kick transaction succeeds on-chain
   - [x] B_T2 bond is posted

2. **Take Phase**
   - [x] Factory take handler is used
   - [x] V4 taker contract executes
   - [x] B_T4 collateral is acquired
   - [x] Transaction succeeds

3. **Reward Collection**
   - [x] LP rewards are collected
   - [x] Bond is returned
   - [x] Collateral is redeemed

4. **V4 Swap Phase**
   - [x] V4 QuoteProvider initializes
   - [x] Market price is fetched correctly
   - [x] Expected output is calculated
   - [x] Universal Router swap succeeds
   - [x] B_T4 → B_T2 swap completes
   - [x] Keeper receives expected amount (±5%)

5. **On-Chain Verification**
   - [x] All transactions visible on BaseScan
   - [x] Token balances update correctly
   - [x] No reverted transactions
   - [x] Gas costs reasonable

---

## Quick Reference Commands

```bash
# 1. Verify setup
npx ts-node scripts/verify-v4-full-cycle.ts

# 2. Test manual swap
npx ts-node scripts/test-v4swaps-manual.ts

# 3. Start keeper
npm start

# 4. Watch logs
tail -f logs/debug.log | grep -i "v4\|swap\|kick\|take"

# 5. Check for errors
tail -f logs/error.log

# 6. Check keeper address
grep "Wallet:" logs/debug.log | head -1

# 7. Find recent kicks
grep "Kicking loan" logs/debug.log | tail -10

# 8. Find recent swaps
grep "swap.*successful\|V4.*swap" logs/debug.log | tail -10
```

---

## Notes

- **Manual swap test:** ✅ WORKING (confirmed)
- **V3 & Sushiswap:** ✅ FULLY OPERATIONAL (use as reference)
- **V4 Quote accuracy:** Fixed with 1% price impact buffer
- **Slippage:** Increased to 5% for V4 due to tick rounding
- **Factory deployment:** Automatically detected by SmartDexManager
- **Aggressive settings:** priceFactor 1.05, marketPriceFactor 1.01

---

## Next Steps After Successful Test

1. Monitor keeper for 24 hours
2. Verify multiple auction cycles complete
3. Check profit/loss on swaps
4. Adjust slippage if needed based on actual execution
5. Consider production deployment on mainnet pools
