# Known Issues

Identified 2026-03-24 via code audit.

## 1. `tokenChangeDecimals()` crashes on small values — FIXED

**Severity:** Medium
**File:** `src/utils.ts:125`

When converting from higher decimals to lower (e.g., 18 → 6), the function uses
`tokenWeiStr.slice(0, targetDecimals - currDecimals)` which relies on JavaScript's
negative `slice()` index. For values where the string representation has fewer
characters than the decimal difference (e.g., any value < 10^12 when going 18 → 6),
`slice()` returns an empty string and `BigNumber.from('')` throws.

**Reproduction:**
```typescript
tokenChangeDecimals(BigNumber.from('100'), 18, 6);
// '100'.slice(0, -12) → '' → BigNumber.from('') → THROWS
```

**Affected call sites:**
- `reward-action-tracker.ts:282` — dust reward transfers would crash
- `dex-router.ts:457` — dust DEX quote amounts would crash
- `kick.ts:167` — safe (only uses the 6→18 path which appends zeroes)

**Existing test coverage:** `src/unit-tests/utils.test.ts:170-172` only tests
the happy path. No test for small values.

**Fix:**
```typescript
} else if (currDecimals > targetDecimals) {
  const charsToRemove = currDecimals - targetDecimals;
  if (tokenWeiStr.length <= charsToRemove) return BigNumber.from(0);
  return BigNumber.from(tokenWeiStr.slice(0, -charsToRemove));
}
```

---

## 2. Hemi network URL uses wrong string delimiter — FIXED

**Severity:** Medium
**File:** `hardhat.config.ts:43`

```typescript
url: "https://boldest-soft-moon.hemi-mainnet.quiknode.pro/${process.env.QUICKNODE_API_KEY}",
```

Uses double quotes instead of backticks. The environment variable is never
interpolated — the literal string `${process.env.QUICKNODE_API_KEY}` is sent as
part of the URL. Any operation targeting the Hemi network (deploy, verify) fails
with an authentication error.

**Fix:** Change `"` to `` ` `` (backtick template literal).

---

## 3. `fork-base` script does not fork Base — FIXED

**Severity:** Low
**File:** `package.json:13`

```json
"fork-base": "FORK_ENABLED=true FORK_NETWORK=base hardhat node"
```

The hardhat config does not read `FORK_ENABLED` or `FORK_NETWORK` environment
variables. It unconditionally forks Ethereum mainnet at block 21731352. Running
`yarn fork-base` produces a mainnet fork, not a Base fork. Misleading for anyone
trying to test against Base state locally.

**Fix:** Add conditional forking logic to `hardhat.config.ts` that reads
`FORK_NETWORK` and selects the appropriate RPC URL and block number.

---

## 4. NonceTracker race condition on concurrent transactions — FIXED

**Severity:** Low
**File:** `src/nonce.ts`

`pendingTransactions` map (line 7) is declared but never used. `queueTransaction`
does not actually serialize execution — concurrent calls get sequential nonces but
run in parallel. If one transaction fails and triggers `resetNonce()`, it can corrupt
the nonce state for another in-flight transaction, potentially causing that
transaction to fail with a "nonce too low" error.

**Fix:** Either implement actual transaction queuing using the `pendingTransactions`
map, or document that callers must serialize their own calls. Consider using a mutex
or promise chain per address.

---

## 5. `getMaxPriorityFeePerGas()` not guarded in `getFeeData()` — FIXED

**Severity:** Medium
**File:** `src/provider.ts:23-28`

```typescript
const [block, gasPrice, priorityFee] = await Promise.all([
  this.getBlock('latest'),
  this.getGasPrice().catch(() => null),       // guarded
  this.getMaxPriorityFeePerGas(),             // NOT guarded
]);
```

`getGasPrice()` has a `.catch()` fallback but `getMaxPriorityFeePerGas()` does not.
On chains that don't support `eth_maxPriorityFeePerGas` (some L2s, pre-EIP-1559
networks), this throws and takes down the entire `getFeeData()` call. Since this
provider is used for all configured chains (including Avalanche, Hemi), this could
break initial connectivity.

**Fix:** Add `.catch(() => null)` to `getMaxPriorityFeePerGas()` and handle `null`
in the priority fee fallback (line 38 already has a null guard).

---

## 6. No CI/CD pipeline

**Severity:** Medium

No `.github/workflows/` directory exists. Tests are manual-only. Nothing prevents
merging broken code to master. Recent commit history shows direct merges without
automated checks.

**Fix:** Add a GitHub Actions workflow that runs `yarn unit-tests` and
`yarn integration-tests` on PRs targeting master.

---

## 7. Integration test coverage gaps

**Severity:** Low

The following scenarios have no test coverage:

- `tokenChangeDecimals` with dust values (18 → 6 direction)
- Network/RPC failure and recovery paths
- Concurrent transaction nonce handling
- Multi-chain forking (Base, Avalanche, Hemi)
- Factory-based multi-DEX take flow at integration level
- Settlement race conditions between competing keeper instances
