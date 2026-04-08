# Uniswap V4 Integration Testing Guide

This document describes the comprehensive test suite for Uniswap V4 integration with the Ajna Keeper.

## Overview

The Uniswap V4 integration enables:
1. **Atomic Swaps During Auctions** - Take liquidation collateral and instantly swap via V4
2. **Post-Auction LP Reward Exchange** - Exchange collected LP rewards using V4 pools

## Test Suite Structure

### 1. Atomic Swap Tests
**File**: `src/integration-tests/uniswapV4-atomic-swap.test.ts`

Tests the complete atomic swap flow during auction takes:

#### Quote Provider Tests
- ✅ Initialize quote provider with StateView contract
- ✅ Get market price from V4 pool (sqrtPriceX96 → human-readable price)
- ✅ Get accurate swap quotes with fee/slippage calculations
- ✅ Check profitability vs auction price

#### Atomic Swap Execution Tests
- ✅ Validate pool configuration
- ✅ Check token balances before swap
- ✅ Execute V4 swap via Universal Router
- ✅ Verify PERMIT2_TRANSFER_FROM → V4_SWAP command sequence
- ✅ Validate SETTLE_ALL and TAKE_ALL actions

#### Error Handling Tests
- ✅ Handle invalid pool gracefully
- ✅ Handle zero amount gracefully
- ✅ Handle failed decimals lookup

---

### 2. Post-Auction Swap Tests
**File**: `src/integration-tests/uniswapV4-post-auction.test.ts`

Tests LP reward collection and exchange via DexRouter:

#### DexRouter V4 Integration
- ✅ Initialize DexRouter with V4 configuration
- ✅ Find V4 pool for token pair
- ✅ Validate token addresses and decimals

#### Post-Auction Swap Execution
- ✅ Check balances before swap
- ✅ Execute swap via `DexRouter.swap()` with `PostAuctionDex.UNISWAP_V4`
- ✅ Handle insufficient balance gracefully
- ✅ Validate slippage protection

#### Multi-Token Swap Scenarios
- ✅ Swap token0 → token1 (B_T1 → B_T2)
- ✅ Swap token1 → token0 (B_T2 → B_T1)
- ✅ Verify correct zeroForOne calculation

#### Gas Estimation Tests
- ✅ Estimate gas for V4 swaps
- ✅ Validate reasonable gas usage

---

### 3. Factory End-to-End Tests
**File**: `src/integration-tests/uniswapV4-factory-e2e.test.ts`

Tests the complete factory pattern flow: detection → quote → atomic swap:

#### Factory Configuration Tests
- ✅ Validate AjnaKeeperTakerFactory deployment
- ✅ Validate UniswapV4KeeperTaker deployment
- ✅ Validate V4 contracts (PoolManager + UniversalRouter)

#### Quote Check Tests
- ✅ Check V4 quote for profitable take
- ✅ Reject unprofitable takes
- ✅ Handle small amounts correctly
- ✅ Verify marketPriceFactor application

#### Factory Take Execution Tests
- ✅ Prepare V4SwapDetails struct correctly
- ✅ Encode PoolKey with Currency structs
- ✅ Calculate slippage and limits correctly
- ✅ Validate swap data encoding

#### Integration Flow Test
- ✅ Complete full detection → quote → prepare → execute flow
- ✅ Verify profitability calculation
- ✅ Test atomic callback execution path

#### Error Handling Tests
- ✅ Handle missing V4 configuration gracefully
- ✅ Handle invalid pool key gracefully
- ✅ Handle contract deployment failures

---

## Test Configuration

### Environment Setup

The tests use the following configuration from `example-uniswapV4-config.ts`:

```typescript
{
  poolManager: '0x000000000004444c5dc75cB358380D2e3dE08A90',
  universalRouter: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',

  poolKey: {
    token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // B_T1
    token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2
    fee: 3000,        // 0.3%
    tickSpacing: 60,  // Standard for 0.3%
    hooks: '0x0000000000000000000000000000000000000000',
  }
}
```

### Required Environment Variables

```bash
# Base RPC URL (required)
export BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# Keeper keystore (required for execution tests)
export KEEPER_KEYSTORE="/path/to/keystore.json"
export KEEPER_PASSWORD="your_password"
```

---

## Running the Tests

### Run All V4 Integration Tests

```bash
npm run test:integration -- --grep "Uniswap V4"
```

### Run Individual Test Suites

```bash
# Atomic swap tests
npm run test:integration -- src/integration-tests/uniswapV4-atomic-swap.test.ts

# Post-auction tests
npm run test:integration -- src/integration-tests/uniswapV4-post-auction.test.ts

# Factory E2E tests
npm run test:integration -- src/integration-tests/uniswapV4-factory-e2e.test.ts
```

### Run Specific Test Cases

```bash
# Test only quote provider
npm run test:integration -- --grep "Quote Provider Tests"

# Test only swap execution
npm run test:integration -- --grep "Atomic Swap Execution"

# Test only error handling
npm run test:integration -- --grep "Error Handling"
```

---

## Test Requirements

### Balance Requirements

Tests require small amounts of test tokens:
- **B_T1 (token0)**: ~0.05 tokens minimum
- **B_T2 (token1)**: ~0.05 tokens minimum

If balances are insufficient, tests will be automatically skipped with warnings.

### Network Requirements

- **Chain**: Base Mainnet (Chain ID: 8453)
- **Contracts**: All V4 contracts must be deployed
  - PoolManager: `0x000000000004444c5dc75cB358380D2e3dE08A90`
  - UniversalRouter: `0x6fF5693b99212Da76ad316178A184AB56D299b43`
  - Permit2: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

---

## Test Coverage

### Core Functionality
✅ Quote provider initialization and StateView integration
✅ Market price calculation (sqrtPriceX96 conversion)
✅ Swap quote calculation with fees and slippage
✅ Profitability checks vs auction prices
✅ Universal Router command encoding (PERMIT2_TRANSFER_FROM + V4_SWAP)
✅ V4 action sequence (SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL)
✅ PoolKey encoding with Currency structs
✅ DexRouter integration for post-auction swaps
✅ Factory pattern integration for atomic swaps

### Edge Cases
✅ Invalid pool handling
✅ Zero amount handling
✅ Insufficient balance handling
✅ Tight slippage handling
✅ Failed decimals lookup handling
✅ Missing configuration handling
✅ Contract deployment verification

### Integration Points
✅ LiquiditySource.UNISWAPV4 enum usage
✅ PostAuctionDex.UNISWAP_V4 enum usage
✅ UniswapV4RouterOverrides configuration
✅ AjnaKeeperTakerFactory integration
✅ UniswapV4KeeperTaker contract integration
✅ Permit2 approval flow
✅ NonceTracker integration

---

## Debugging Failed Tests

### Common Issues

#### 1. RPC Connection Errors
```
Error: could not detect network
```
**Solution**: Verify `BASE_RPC_URL` is set and valid

#### 2. Insufficient Balance
```
⚠️  No B_T1 balance - swap test will be skipped
```
**Solution**: Add test tokens to your keeper account

#### 3. Contract Not Deployed
```
Error: call revert exception
```
**Solution**: Verify all contract addresses are correct for Base mainnet

#### 4. Permit2 Approval Failed
```
Error: ERC20: insufficient allowance
```
**Solution**: Ensure Permit2 approval steps are executing correctly

#### 5. Slippage Too Tight
```
Error: Price moved beyond limits
```
**Solution**: Increase slippage tolerance in test configuration

---

## Expected Test Output

### Successful Test Run

```
Uniswap V4 Atomic Swap Integration Tests
  Quote Provider Tests
    ✓ should initialize quote provider successfully
    ✓ should get market price from V4 pool
    ✓ should get accurate quote for swap
    ✓ should check profitability correctly
  Atomic Swap Execution Tests
    ✓ should validate pool configuration
    ✓ should check token balances before swap
    ✓ should execute V4 swap successfully
  Error Handling Tests
    ✓ should handle invalid pool gracefully
    ✓ should handle zero amount gracefully

Uniswap V4 Post-Auction Reward Exchange Tests
  DexRouter V4 Integration
    ✓ should initialize DexRouter with V4 configuration
    ✓ should validate token addresses
  Post-Auction Swap Execution
    ✓ should execute post-auction swap via V4
    ✓ should handle insufficient balance gracefully

Uniswap V4 Factory End-to-End Tests
  Factory Configuration Tests
    ✓ should validate factory address is deployed
    ✓ should validate taker contract is deployed
  Quote Check Tests
    ✓ should check V4 quote for profitable take
  Integration Flow Test
    ✓ should complete full detection → quote → prepare flow

✅ 18 passing (45s)
```

---

## Next Steps

After running tests successfully:

1. **Review Logs**: Check detailed output for any warnings or edge cases
2. **Verify Gas Usage**: Ensure gas consumption is reasonable for production
3. **Test on Testnet**: Run on Base Sepolia before mainnet deployment
4. **Monitor Transactions**: Watch first few mainnet swaps closely
5. **Adjust Configuration**: Tune slippage, gas limits based on results

---

## Additional Resources

- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/)
- [Universal Router Guide](https://docs.uniswap.org/contracts/universal-router/overview)
- [Permit2 Documentation](https://docs.uniswap.org/contracts/permit2/overview)
- [Ajna Protocol Documentation](https://docs.ajna.finance/)

---

## Support

For issues or questions:
1. Check test logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure sufficient token balances for testing
4. Review contract addresses match your deployment
