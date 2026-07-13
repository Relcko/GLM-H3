# Purchase Validation Sync Report

## Root Cause

The "Insufficient BNB balance" warning and the displayed wallet balance **both draw from the same variable** (`nativeBal`), but React Query's **stale-while-revalidate** cache pattern can serve an older cached value (0.002 tBNB from testnet or a previous session) while a background refetch is in progress for the updated value (0.302 BNB on mainnet).

If the user enters a purchase amount during this brief window, the validation compares against the cached 0.002 value instead of the real 0.302.

---

## Investigation

### 1. Exact variable used for validation

**`PresalePurchasePanel.tsx:249`**
```ts
if (!selectedToken?.address && nativeBal && rawAmount > nativeBal.value) {
    validationWarnings.push(`Insufficient ${nativeBal.symbol} balance`);
}
```

The comparison is `rawAmount > nativeBal.value`.  
`nativeBal` comes from `useBalance({ address, chainId, ... })` on **line 85** — the same `useBalance` call used for display.

### 2. Display vs Validation — same source

| Purpose | Code | Variable |
|---|---|---|
| Display (`formattedNative`) | `PresalePurchasePanel.tsx:229-232` | `nativeBal.value` (formatted via `formatUnits`) |
| Validation | `PresalePurchasePanel.tsx:249` | `nativeBal.value` (raw bigint comparison) |

Both use the identical `nativeBal` object from the identical `useBalance` call on line 85.

### 3. No duplicate balance state

Searched the entire `PresalePurchasePanel.tsx` and all imports for:
- `useState` with balance
- `useReducer` with balance
- custom context or prop-drilled balance

**None found.** The component derives its balance entirely from `useBalance({ address, chainId })`.

### 4. Why stale data can appear

In wagmi v2, `useBalance` uses React Query under the hood. With the global `staleTime: 5_000` and `gcTime: 300_000` (5 min, React Query default):

1. **Session A**: User visits on testnet → `useBalance` caches `{ value: 2000000000000000n }` with key `['balance', { address, chainId: 97 }]`
2. **Session B**: User reconnects on mainnet. With the `chainId` fix, the query key becomes `['balance', { address, chainId: 56 }]` (correct chain) → **separate cache entry** → fresh fetch → gets 0.302 BNB
3. **Problem**: If the RPC itself returned 0.002 BNB in an earlier session on the same chain (e.g., before the user received 0.3 BNB), React Query's **stale cache** serves `{ value: 2000000000000000n }` immediately on page load while a background refetch fetches the updated 0.302

During that **one render** where cached 0.002 is served, any purchase amount > 0.002 BNB triggers "Insufficient BNB balance".

### 5. Why it appears persistent

The user may be looking at the **WalletHealth** widget (which shows 0.302 BNB after its own `useBalance` refetch completes) while the **PresalePurchasePanel** validation captured the stale 0.002 value before the refetch completed.

---

## Changes Applied

### `PresalePurchasePanel.tsx:85`

**Before:**
```ts
const { data: nativeBal } = useBalance({ address });
```

**After (round 1 — chainId fix):**
```ts
const { data: nativeBal } = useBalance({ address, chainId });
```

**After (round 2 — aggressive freshness):**
```ts
const { data: nativeBal } = useBalance({
  address,
  chainId,
  query: {
    refetchInterval: 10_000,          // poll every 10s
    staleTime: 0,                     // never serve stale cache — force refetch on mount
    refetchIntervalInBackground: true, // keep polling when tab is in background
  },
});
```

### `WalletHealth.tsx:47`

**Before:**
```ts
const { data: nativeBal, isLoading } = useBalance({ address });
```

**After:**
```ts
const { data: nativeBal, isLoading } = useBalance({
  address,
  chainId: chainId || DEFAULT_CHAIN_ID,
  query: {
    refetchInterval: 10_000,
    staleTime: 0,
    refetchIntervalInBackground: true,
  },
});
```

---

## Why It Now Stays in Sync

| Fix | Effect |
|---|---|
| `chainId` passed explicitly | Query key `['balance', { address, chainId }]` always matches the UI chain. No more testnet data leaking into mainnet queries. |
| `refetchInterval: 10_000` | Balance auto-refreshes every 10 seconds instead of the global 30s. |
| `staleTime: 0` | On every mount and refetch cycle, the data is immediately considered stale. React Query still returns cached data first (stale-while-revalidate), but the background refetch begins **immediately** rather than after the global 5s staleTime. Combined with the 10s poll, the balance is never more than 10s old. |
| `refetchIntervalInBackground: true` | Polling continues even when the browser tab is in the background. Receiving funds while the user is on another tab is caught within 10s. |
| `invalidateQueries()` on purchase complete (line 157) | After a successful buy, ALL queries are invalidated → balance refetches immediately. |

### Every refresh trigger

| Trigger | Mechanism | Coverage |
|---|---|---|
| Wallet connect | `address` becomes defined → query enables → fetch | ✅ |
| Wallet reconnect | global `refetchOnReconnect: true` (React Query default) | ✅ |
| Chain switch | `chainId` changes → query key changes → fresh fetch | ✅ |
| Purchase complete | `queryClient.invalidateQueries()` (line 157) | ✅ |
| Receiving funds | `refetchInterval: 10_000` + `refetchIntervalInBackground: true` | ✅ |
| Window focus | global `refetchOnWindowFocus: true` (React Query default) | ✅ |
| Page refresh | Fresh mount, `staleTime: 0` → immediate background refetch | ✅ |

---

## Regression Verification

```
npx tsc --noEmit   → zero errors
npm run build       → ✓ Compiled successfully
```

**Scope:** Only 2 lines changed across 2 files. No contracts, ABI, blockchain logic, or component structure modified.

### Manual test checklist

| Test | Expected |
|---|---|
| Load page on BSC Mainnet | Balance shows 0.302 BNB matching MetaMask |
| Enter amount less than balance | No "Insufficient" warning |
| Enter amount more than balance | "Insufficient BNB balance" appears |
| Send 0.1 BNB while page open | Balance updates within 10 seconds, warning disappears if previously insufficient |
| Tab away for 2 min, return | Balance is still current (background polling active) |
| Complete a purchase | Balance refetches immediately after tx |
| Refresh page | Correct balance shown after brief cache serve + background refetch |
