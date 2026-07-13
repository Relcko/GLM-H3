# RC16.1.4 — Fix 100% Staking Amount Precision

**Date:** 2026-07-13
**File:** `components/staking/StakePanel/index.tsx`
**Status:** Built clean

---

## Bug

Wallet balance = 55.11 RLKO. Clicking **100%** autofills an amount that triggers **"Insufficient RLKO balance"**, even though manually entering `55.1` succeeds.

## Root Cause

Two floating-point precision bugs in the percentage → wei conversion chain:

### 1. Percentage chip calculation (old line 180)

```ts
onClick={() => setAmount(((balanceNum * pct) / 100).toFixed(2))}
```

- `balanceNum = Number(balance) / 1e18` — `Number(bigint)` loses precision because the wei value (e.g. `55110000000000000000n`) exceeds `Number.MAX_SAFE_INTEGER` (9e15). The resulting float may be slightly above or below the true balance.
- `.toFixed(2)` on an imprecise float can round up, producing a string like `"55.11"` that corresponds to more wei than the wallet actually holds.

### 2. `rawAmount` parsing (old line 56)

```ts
const rawAmount = BigInt(Math.floor(numericAmount * 1e18));
```

- `parseFloat(amount)` converts the amount string to a 53-bit float, losing sub-cent precision.
- `Math.floor(x * 1e18)` at large magnitudes introduces rounding errors. The resulting `bigint` can exceed the actual on-chain balance by 1+ wei, triggering `isOverBalance`.

### Result

| Step | Value | Problem |
|---|---|---|
| `balance` (on-chain) | `55110000000000000000n` | exact |
| `Number(balance)` | ~`5.5110000000001e19` | ±8192 wei error |
| `.toFixed(2)` | `"55.11"` | may round up |
| `parseFloat("55.11") * 1e18` | `55110000000000008192` | imprecise |
| `rawAmount > balance` | `true` | **overbalance — button disabled** |

## Fix

### Change 1: Quick amounts use BigInt arithmetic

The 25/50/75/100 chips now compute the wei amount in BigInt space, then convert to a decimal string with `viem`'s `formatUnits`:

```ts
onClick={() => {
    if (!balance) return;
    const wei = (balance * BigInt(pct)) / 100n;
    setAmount(formatUnits(wei, 18).replace(/\.?0+$/, ""));
}}
```

- `(balance * 100n) / 100n` = `balance` — **exact**, no rounding for 100%.
- `(balance * 25n) / 100n` — integer division truncates toward zero, always ≤ balance.
- `formatUnits(bigint, 18)` converts wei → decimal string without floating point.
- Trailing zeros are trimmed for clean display in the input field.

### Change 2: `rawAmount` uses string-based parsing

A new `parseAmount()` helper converts the decimal amount string directly to wei, avoiding `Number` / `Math.floor` / `* 1e18` entirely:

```ts
function parseAmount(value: string, decimals: number): bigint {
  if (!value) return 0n;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) {
    try { return BigInt(cleaned) * 10n ** BigInt(decimals); } catch { return 0n; }
  }
  const whole = cleaned.substring(0, dot) || "0";
  const frac = cleaned.substring(dot + 1).padEnd(decimals, "0").slice(0, decimals);
  try { return BigInt(whole + frac); } catch { return 0n; }
}
```

Used at the component level:

```ts
const rawAmount = parseAmount(amount, 18);
```

### Change 3: `balanceNum` display uses `formatUnits`

```ts
const balanceNum = balance !== undefined ? Number(formatUnits(balance, 18)) : 0;
```

`formatUnits` first produces an exact decimal string, then `Number()` converts it for the display-only `.toFixed(2)`. This avoids the `Number(bigint)` overflow.

## Verification

- **25%**: `(balance * 25n) / 100n` = `balance / 4n` (truncated) → always ≤ balance ✓
- **50%**: `(balance * 50n) / 100n` = `balance / 2n` → always ≤ balance ✓
- **75%**: `(balance * 75n) / 100n` = `(balance * 3n) / 4n` → always ≤ balance ✓
- **100%**: `(balance * 100n) / 100n` = `balance` → exactly equal to balance ✓
- **`rawAmount > balance`**: with `parseAmount` producing exact wei from the displayed string, and percentage chips never exceeding `balance`, this comparison is now always correct ✓

## Result

The selected amount will **never exceed the wallet balance by even 1 wei**, regardless of decimal precision, token magnitude, or percentage chip used.
