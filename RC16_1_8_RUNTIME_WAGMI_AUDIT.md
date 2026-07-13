# RC16.1.8 — Runtime Wagmi Audit

**Date:** 2026-07-13
**File:** `components/staking/StakePanel/index.tsx`
**Method:** Console instrumentation added (build clean)
**Target:** Verify allowance lifecycle and `useReadContract` refetch behavior

---

## What Was Instrumented

Logging was added at every key point in the stake flow. See console output prefixed by `[Render #N]`, `[Approve]`, `[Stake]`, `[Allowance refetch]`, `[Balance refetch]`, etc.

### Log Points

| Prefix | Trigger | Values Logged |
|---|---|---|
| `[Render #N]` | Every render | `allowance`, `balance`, `needsApproval`, `step`, `writeHash`, `isTxSuccess`, `isTxLoading`, `isFetchingAllowance`, `isFetchingBalance`, `rawAmount`, `numericAmount`, `isOverBalance`, `planIndex`, `amount` |
| `[Allowance] isFetching` | Allowance query starts fetching | — |
| `[Allowance refetch]` | `allowance` or `isFetchingAllowance` changes | `allowance`, `isFetchingAllowance` |
| `[Balance] isFetching` | Balance query starts fetching | — |
| `[Approve] before writeContract` | User clicks Approve button | Full debug snapshot via ref (latest values, no stale closure) |
| `[Approve] mined` | Approve tx receipt confirms | Full debug snapshot |
| `[Stake] before writeContract` | User clicks Stake button | Full debug snapshot |
| `[Stake] mined` | Stake tx receipt confirms | Full debug snapshot |

---

## How to Run

1. Open browser DevTools → Console
2. Clear console
3. Open the staking page
4. Note the initial `[Render #1]` log — confirms initial `allowance`
5. Enter a manual amount (e.g., `81.62`) and observe any new renders
6. Click **Approve** — watch `[Approve] before writeContract`
7. Confirm the tx in MetaMask
8. Watch for:
   - `[Approve] mined` — tx confirmed
   - `[Allowance isFetching]` — wagmi starts refetching
   - `[Allowance refetch]` — new allowance value arrives
   - `[Render #N]` — component re-renders with new allowance
9. Note whether the button transitions from Approve → Stake
10. If it does, click **Stake** and repeat the observation

---

## What to Verify

### 1. Does `allowance` update after approve?

After the `[Approve] mined` log, look for:

```
[Allowance] isFetching = true    ← wagmi refetching
[Allowance refetch]              ← new value received
[Render #N]                      ← component re-renders
```

If you see `isFetchingAllowance = true` but never a subsequent `[Allowance refetch]` with the new value, the `useReadContract` query is **not refetching** after the approve tx — this would explain why the button stays on "Approve" instead of switching to "Stake".

### 2. Stale closure test

The `[Approve] before writeContract` log uses a **ref snapshot** (`_debug.current`), NOT the callback's closure. Compare these values with the most recent `[Render #N]` log:

- If `rawAmount` matches the latest render → no stale closure
- If `rawAmount` is from an earlier render → stale closure exists

### 3. `isFetchingAllowance` duration

If `isFetchingAllowance` stays `true` for many renders without a new allowance value appearing, the query is stuck (RPC timeout, rate-limit, or cache issue).

### 4. `queryClient.invalidateQueries()` effect

After a successful stake (not approve), the code calls `queryClient.invalidateQueries()` on line 94. This should trigger refetches of all active queries (both balance and allowance). Look for:

```
[Balance] isFetching = true
[Allowance] isFetching = true
[Allowance refetch]
[Balance refetch] (not instrumented separately, but balance value changes)
```

If these don't appear, the invalidation isn't reaching the allowance/balance queries.

---

## Expected Log Sequence (Happy Path)

```
[Render #1]    allowance=0, needsApproval=true, step=idle
               User types "163.24"
[Render #2]    allowance=0, rawAmount=163240..., needsApproval=true
               User clicks Approve
[Approve] before writeContract   allowance=0, rawAmount=163240..., step=approving
[Render #3]    step=approving, isFetchingAllowance=false
               User confirms in MetaMask
               (tx pending...)
[Render #4]    isTxLoading=true
               (tx mined)
[Approve] mined   isTxSuccess=true
[Render #5]    step=idle (from setStep("idle"))
[Allowance] isFetching = true      ← wagmi refetches allowance
[Allowance refetch]  allowance=163240...  ← new allowance value
[Render #6]    allowance=163240..., needsApproval=false
               → Button switches to "Stake" ✓
               User clicks Stake
[Stake] before writeContract  allowance=163240..., rawAmount=163240...
               User confirms
               (tx pending...)
[Stake] mined  isTxSuccess=true
[Render #7]    step=idle, amount="" (reset)
[Allowance] isFetching = true      ← from invalidateQueries
[Balance] isFetching = true        ← same
```

---

## Troubleshooting from Logs

| Observed Pattern | Root Cause |
|---|---|
| `[Approve] before writeContract` → no wallet popup | wagmi `writeContract` throws or wallet extension not responding |
| Wallet popup → no `[Approve] mined` after confirming | RPC not relaying the tx; hash returned but never confirmed |
| `[Approve] mined` → no `[Allowance] isFetching` | `useReadContract` query not invalidated; `refetchInterval: 30_000` means it won't check for 30s |
| `[Allowance] isFetching` → no `[Allowance refetch]` | RPC fetch failed silently (rate-limit, 429, timeout) |
| `[Allowance refetch]` → same value (0) | Approve tx reverted or allowance wasn't actually set |
| `[Render #N]` shows stale `rawAmount` | Closure captured old value — but ref-based logging would show latest |

---

## Important Notes

- The `_debug` ref-based logging (`_debug.current`) ensures the console always shows the **latest** state values, regardless of which render's callback fired. Compare it side-by-side with the `[Render #N]` log for closure detection.
- `[Render #N]` logs EVERY render. Filter in DevTools by prefix to reduce noise.
- `[Allowance isFetching]` only logs when `isFetchingAllowance` transitions to `true`. Silent updates (false→false) are not logged.
- `isFetchingAllowance` comes from `@tanstack/react-query` and is `true` while the query is refetching (even in the background). It is NOT the same as `isLoading` (initial load) or `isPending`.
- After removing instrumentation, delete the `_debug`, `_renderCount`, `useRef` import, all `console.log` lines, and the `isFetching`/`refetch` destructuring.
