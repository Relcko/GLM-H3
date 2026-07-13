# RC16.1.6 — Percentage Chip Runtime Diff

**Date:** 2026-07-13
**Method:** Code-path trace against `components/staking/StakePanel/index.tsx`
**Status:** Complete

---

## Scenario

Wallet balance: `55.11 RLKO` (`55110000000000000000n` wei)
Allowance: `0n` (not yet approved)
`MIN_STAKE_AMOUNT = 50`

---

## Execution Trace

### Common derived state (before any interaction)

```
balance          = 55110000000000000000n    (from useReadContract)
allowance        = 0n                       (from useReadContract)
amount           = ""                       (initial state)
numericAmount    = parseFloat("") || 0      = 0
rawAmount        = parseAmount("", 18)      = 0n
needsApproval    = 0n > 0n                  = false       ← shows "Stake" button
isOverBalance    = 0n > balance             = false
```

The "Stake" button is shown initially but disabled because `numericAmount <= 0`.

---

### Path A — Manual entry "50"

| Step | Expression | Result |
|---|---|---|
| 1 | `onChange` → `setAmount("50")` | `amount = "50"` |
| 2 | `numericAmount = parseFloat("50") \|\| 0` | **50** |
| 3 | `parseAmount("50", 18)` — cleaned `"50"`, no dot → `BigInt("50") * 10n**18n` | `rawAmount = 50000000000000000000n` |
| 4 | `needsApproval = allowance !== undefined ? rawAmount > allowance : true` → `50000000000000000000n > 0n` | **true** → shows "Approve" button |
| 5 | `isOverBalance = balance !== undefined && rawAmount > balance` → `50000000000000000000n > 55110000000000000000n` | **false** |
| 6 | Approve button disabled? `numericAmount <= 0` = false, `numericAmount < MIN_STAKE_AMOUNT` = `50 < 50` | **false → ENABLED** |
| 7 | User clicks Approve → `writeContract({ rlkoToken, ERC20_ABI, "approve", [staking, 50000000000000000000n] })` | wallet prompt → tx sent |
| 8 | After approve confirms: `needsApproval = 50000000000000000000n > 50000000000000000000n` | **false** → shows "Stake" button |
| 9 | Stake button disabled? `isOverBalance` = false | **false → ENABLED** |
| 10 | User clicks Stake → stake tx sent | ✅ Works |

---

### Path B — 50% chip click

| Step | Expression | Result |
|---|---|---|
| 1 | Click handler: `wei = (55110000000000000000n * 50n) / 100n = 27555000000000000000n` | |
| | `formatUnits(27555000000000000000n, 18)` = `"27.555"` | |
| | `.replace(/\.?0+$/, "")` = `"27.555"` | |
| | `setAmount("27.555")` | `amount = "27.555"` |
| 2 | `numericAmount = parseFloat("27.555") \|\| 0` | **27.555** ← **FIRST DIFFERENCE** |
| 3 | `parseAmount("27.555", 18)` — cleaned `"27.555"`, dot at 2, whole=`"27"`, frac=`"555000000000000000"` → `BigInt("27" + "555000000000000000")` | `rawAmount = 27555000000000000000n` |
| 4 | `needsApproval = 27555000000000000000n > 0n` | **true** → shows "Approve" |
| 5 | `isOverBalance = 27555000000000000000n > 55110000000000000000n` | **false** |
| 6 | **`numericAmount < MIN_STAKE_AMOUNT` = `27.555 < 50`** | **true → DISABLED** |
| 7 | Button never clickable. Approve transaction never sent. | ❌ Blocked |

**First differing value:** `numericAmount` at step 2 (50 vs 27.555).

**First behavioral difference:** Step 6 — `numericAmount < MIN_STAKE_AMOUNT` evaluates to `true`, disabling the button.

---

### Path C — 100% chip click

| Step | Expression | Result |
|---|---|---|
| 1 | Click handler: `wei = balance = 55110000000000000000n` | |
| | `formatUnits(55110000000000000000n, 18)` = `"55.11"` | |
| | `.replace(/\.?0+$/, "")` = `"55.11"` | |
| | `setAmount("55.11")` | `amount = "55.11"` |
| 2 | `numericAmount = parseFloat("55.11") \|\| 0` | **55.11** |
| 3 | `parseAmount("55.11", 18)` → `BigInt("55" + "110000000000000000")` | `rawAmount = 55110000000000000000n` (= balance) |
| 4 | `needsApproval = 55110000000000000000n > 0n` | **true** → shows "Approve" |
| 5 | `isOverBalance = 55110000000000000000n > 55110000000000000000n` | **false** |
| 6 | `numericAmount < MIN_STAKE_AMOUNT` = `55.11 < 50` | **false → ENABLED** |
| 7 | User clicks Approve → approve tx sent | ✅ |
| 8 | After confirming: `needsApproval = false`, "Stake" shown | ✅ |
| 9 | `isOverBalance = 55110000000000000000n > 55110000000000000000n` = false | ✅ |
| 10 | User clicks Stake → stake tx sent | ✅ Works |

100% chip works end-to-end (when balance ≥ 50 RLKO).

---

## Comparison Table

| Value | Manual "50" | 50% chip | 100% chip |
|---|---|---|---|
| `amount` | `"50"` | `"27.555"` | `"55.11"` |
| `numericAmount` | **50** | **27.555** ← **δ** | **55.11** |
| `rawAmount` | `50000000000000000000n` | `27555000000000000000n` | `55110000000000000000n` |
| `isOverBalance` | `false` | `false` | `false` |
| `needsApproval` | `true` | `true` | `true` |
| `numericAmount < 50` | **false** ✅ | **true** ❌ | **false** ✅ |
| Button state | **Enabled** | **Disabled** | **Enabled** |

---

## First Difference

**Value:** `numericAmount` (step 2 in the trace)
**Manual:** `50`
**50% chip:** `27.555`
**100% chip:** `55.11`

## Root Cause

The button disabled check at `StakePanel/index.tsx:239` (approve) and `StakePanel/index.tsx:256` (stake):

```tsx
disabled={numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT || ...}
```

When the wallet balance is **55.11 RLKO**, the 50% chip produces `numericAmount = 27.555`, which is below `MIN_STAKE_AMOUNT (50)`. The button is disabled by design.

This is **not a precision bug** — the RC16.1.4 fix correctly converts BigInt to string. The difference is that `27.555` is genuinely less than `MIN_STAKE_AMOUNT`, and the `parseFloat` → comparison correctly reflects this.

## Is This a Bug?

**No** — the percentage chips are working as designed. They compute an exact percentage of the wallet balance. If that amount falls below `MIN_STAKE_AMOUNT`, the button is correctly disabled.

For a wallet with 55.11 RLKO:
- 25%, 50%, 75% → amounts < 50 → button disabled (by design)
- 100% → amount = 55.11 ≥ 50 → button enabled (works correctly)

## Required Fix (if any)

If the intent is that percentage chips should always produce a viable stake, the chip amounts could be clamped to `MIN_STAKE_AMOUNT` when the computed value is below the minimum. This is a product decision, not a bug fix.

Alternatively, if the intent is that the 100% chip should work for any balance (even below 50), the `MIN_STAKE_AMOUNT` check could be skipped when the user explicitly chooses to stake their full balance. Again, a product decision.
