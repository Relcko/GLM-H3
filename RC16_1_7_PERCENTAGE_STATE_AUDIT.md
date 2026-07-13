# RC16.1.7 — Percentage Chip React State Audit

**Date:** 2026-07-13
**File:** `components/staking/StakePanel/index.tsx`
**Method:** Code-path trace of React state lifecycle, closures, and event ordering
**Status:** Complete — no stale state found in code analysis

---

## State Ownership

The component's state is defined at lines 47–49:

```
amount         → useState("")       // string
selectedPlan   → useState(STAKING_PLANS[0])
step           → useState<"idle" | "approving" | "staking">("idle")
```

All derived values (`numericAmount`, `rawAmount`, `needsApproval`, `isOverBalance`) are computed **synchronously during render** from `amount` (line 76–79). There is no `useMemo` — every render recomputes them fresh from the current `amount` string.

---

## Path Comparison: Manual vs Percentage Chip

### Scenario

Balance: `163.24 RLKO` (`163240000000000000000n` wei)  
Allowance: `0n` (needs approval)  

### Manual entry "163.24"

```
Event: input onChange → setAmount("163.24")
       │
       ▼
Render: amount = "163.24"
         numericAmount = parseFloat("163.24")         → 163.24
         rawAmount     = parseAmount("163.24", 18)    → 163240000000000000000n
         needsApproval = rawAmount > allowance        → true
         isOverBalance = rawAmount > balance          → false (equal)
         MIN_STAKE check: 163.24 >= 50                → pass
         │
         ▼
Show:  <Approve button>   onClick={handleApprove}
         handleApprove closure captures rawAmount = 163240000000000000000n  ✓
```

### 100% chip click

```
Event: button onClick → setAmount("163.24")
       │
       ▼
Render: amount = "163.24"
         numericAmount = parseFloat("163.24")         → 163.24
         rawAmount     = parseAmount("163.24", 18)    → 163240000000000000000n
         needsApproval = rawAmount > allowance        → true
         isOverBalance = rawAmount > balance          → false (equal)
         MIN_STAKE check: 163.24 >= 50                → pass
         │
         ▼
Show:  <Approve button>   onClick={handleApprove}
         handleApprove closure captures rawAmount = 163240000000000000000n  ✓
```

**Output `amount` string identical** — both produce `"163.24"`.

---

## Audit Items

### 1. `useCallback` Dependency Arrays

| Callback | Dependencies | Stale Risk |
|---|---|---|
| `handleApprove` (line 110–119) | `[rlkoToken, stakingContract, rawAmount, writeContract]` | `rawAmount` is a render-time derived value, recalculated every render from `amount`. No stale capture. ✅ |
| `handleStake` (line 125–134) | `[stakingContract, rawAmount, planIndex, writeContract]` | Same — `rawAmount` and `planIndex` are recomputed every render. ✅ |

Every item in each dependency array is either:
- A hook return value (`rlkoToken`, `stakingContract`, `writeContract`) — stable reference from wagmi/rainbowkit
- A render-time derived value (`rawAmount`, `planIndex`) — always reflects current `amount` and `selectedPlan`

### 2. Closure Capture Walkthrough

```
Render 1 (before any input):
  amount = ""
  rawAmount = 0n
  handleApprove = memoized(fn1) with rawAmount=0n

Event: click 100% chip
  onClick handler calls setAmount("163.24")
  React queues state update

[React 18 processes the update synchronously before next event]
▼

Render 2:
  amount = "163.24"
  rawAmount = 163240000000000000000n
  handleApprove = RE-CREATED (rawAmount changed)
    → memoized(fn2) with rawAmount=163240000000000000000n

Event: click Approve button
  handleApprove = fn2 fires
  rawAmount = 163240000000000000000n  ✓  (fresh from closure)
```

**React 18 automatic batching ensures Render 2 commits before the Approve click is processed.** There is no window where the user can trigger a stale `handleApprove` from Render 1.

### 3. Derived Values (lines 76–81)

```
const numericAmount = parseFloat(amount) || 0;
const rawAmount = parseAmount(amount, 18);
const needsApproval = allowance !== undefined ? rawAmount > allowance : true;
const balanceNum = balance !== undefined ? Number(formatUnits(balance, 18)) : 0;
const reward = numericAmount > 0 ? (numericAmount * selectedPlan.returnPct) / 100 : 0;
const totalReturn = numericAmount + reward;
```

These are **not memoized** — they recompute on every render from the current `amount` string. `numericAmount` and `rawAmount` are always consistent because both derive from the same `amount` string (one via `parseFloat`, the other via `parseAmount`).

### 4. Disabled Conditions (lines 264, 282)

**Approve button disabled if:**
```
numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT || step === "approving" || (step === "staking" && isTxLoading)
```

**Stake button disabled if:**
```
numericAmount <= 0 || numericAmount < MIN_STAKE_AMOUNT || step === "staking" || (step === "approving" && isWritePending) || isOverBalance
```

For balance = 163.24:
| Chip | Amount | numericAmount | < 50? | Button |
|---|---|---|---|---|
| 25% | 40.81 | 40.81 | **true** | **Disabled** (by design) |
| 50% | 81.62 | 81.62 | false | Enabled |
| 75% | 122.43 | 122.43 | false | Enabled |
| 100% | 163.24 | 163.24 | false | Enabled |

Only 25% is expected to be disabled. 50%/75%/100% all have `numericAmount >= 50`.

### 5. `useEffect` for write success (lines 83–101)

```
useEffect([isTxSuccess, writeHash, step, numericAmount, chainId, queryClient, rawAmount])
```

Note: `numericAmount` and `rawAmount` are in the dependency array. After `setAmount("")` (on success), these change, which re-fires the effect. But by then `step` is already `"idle"`, so neither branch executes. **No stale writeHash issue** — wagmi resets `writeHash`/`isTxSuccess` when a new `writeContract` is called.

### 6. `useEffect` for write error (lines 103–108)

```
useEffect([writeError, chainId])
```

If `writeContract` throws (user rejects in wallet, RPC error, etc.), `writeError` is set and the effect resets `step → "idle"`. **Orphaned "approving" state cannot persist.**

### 7. `React.memo` wrapper (line 41)

```tsx
const StakePanel = memo(function StakePanel() {
```

Component takes **zero props**. `memo` only prevents re-renders triggered by parent prop changes — which never happen here. All re-renders come from internal state/hook changes. **No impact on state freshness.**

### 8. Event Ordering & React Batching

```
User action                Browser event           React processing
─────────────────────────────────────────────────────────────
Click chip                 pointerdown
                           pointerup
                           click
                             → chip onClick fires
                               → setAmount(newValue)
                             ← onClick returns
                                                     [React 18 batch]
                                                     → re-render with new amount
                                                     → new rawAmount computed
                                                     → handleApprove re-created
                                                     → DOM updated
Click Approve              pointerdown
                           pointerup
                           click
                             → Approve onClick fires (NEW handleApprove)
                               → writeContract({ rawAmount: fresh_value })
```

**JavaScript is single-threaded.** The chip click handler's state update is committed before the event loop can process the next click event. The Approve button always has the handler from the latest render. **No race condition.**

---

## Findings

### No stale closures found
All `useCallback` dependencies are correct. `rawAmount` is recomputed every render from `amount` and captured fresh in each new callback instance. There is no scenario where `handleApprove` or `handleStake` can fire with a `rawAmount` from a previous render.

### No React batching bug
React 18's automatic batching ensures the percentage chip's `setAmount()` is committed before the next user interaction. The Approve/Stake button always reflects the latest `amount`.

### No disabled condition mismatch
For balance = 163.24 RLKO, 50%/75%/100% chips all produce `numericAmount >= 50`, so the button is not disabled by `MIN_STAKE_AMOUNT`. The 25% chip correctly produces 40.81 < 50 (disabled by design).

### Conclusion
**Based on code analysis alone, the React state management is correct and contains no stale-closure or event-ordering bug.** Both manual entry and percentage chips produce identical `amount` → `rawAmount` → `handleApprove` → `writeContract` chains. If percentage chips are not working while manual entry of the same value succeeds, the root cause lies outside this component's state management — possibly in:

- wagmi's `useWriteContract` behavior (wallet prompt timing, `writeContract` reference stability)
- Browser wallet extension state (e.g., MetaMask stuck on a previous pending request)
- Network-level issue with `http()` transport (timeout before wallet responds, then stale `isPending`)
- A runtime difference not observable from static code analysis

---

## Appendix: Exact String Values (verification)

| Chip | `balance * pct / 100` (wei) | `formatUnits(wei, 18)` | `parseAmount` result |
|---|---|---|---|
| 25% | `40810000000000000000n` | `"40.81"` | `40810000000000000000n` |
| 50% | `81620000000000000000n` | `"81.62"` | `81620000000000000000n` |
| 75% | `122430000000000000000n` | `"122.43"` | `122430000000000000000n` |
| 100% | `163240000000000000000n` | `"163.24"` | `163240000000000000000n` |

All mappings are exact — no precision loss in the wei → string → wei round-trip.
