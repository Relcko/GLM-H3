# BNB Balance Sync Report

## Root Cause

The native BNB balance stayed stale because **`useBalance({ address })` was called without an explicit `chainId` and without a `refetchInterval`**. Two independent problems combined:

### Problem 1 — Wrong chain (query key mismatch)

`useBalance` without `chainId` resolves to wagmi's internal `config.state.chainId`. With `reconnectOnMount={true}`, wagmi restores the **last connected chain** from persisted state. If the wallet had previously connected on BSC Testnet (chainId 97), the query key became:

```
['balance', { address: '0x...', chainId: 97 }]
```

This fetched **testnet** balance (~0.002 tBNB) while MetaMask was on **mainnet** (0.302 BNB). The cache key never changed because `chainId` wasn't part of the calling code — wagmi silently resolved it to 97.

**Fix:** Pass `chainId` explicitly so the query key always matches the UI's current chain:
```ts
useBalance({ address, chainId })                           // PresalePurchasePanel
useBalance({ address, chainId: chainId || DEFAULT_CHAIN_ID }) // WalletHealth
```

### Problem 2 — No auto-refetch (stale after receiving funds)

Both `useBalance` calls inherited the global `refetchInterval: 30_000` from the `QueryClient` default options. If the user received funds while the page was open, the balance stayed stale for **up to 30 seconds** before the next poll.

**Fix:** Override `refetchInterval` on the balance queries to **10 seconds**:
```ts
useBalance({ ..., query: { refetchInterval: 10_000 } })
```

This polls the RPC every 10 seconds, catching incoming transfers within that window.

---

## Files Changed

| File | Before | After |
|---|---|---|
| `components/presale/PresalePurchasePanel.tsx` | `useBalance({ address })` | `useBalance({ address, chainId, query: { refetchInterval: 10_000 } })` |
| `components/dashboard/WalletHealth.tsx` | `useBalance({ address })` | `useBalance({ address, chainId: chainId \|\| DEFAULT_CHAIN_ID, query: { refetchInterval: 10_000 } })` |

Zero other files touched. No imports added or removed.

---

## Why Stale Data Occurred

The stale data had two contributing mechanisms:

| Mechanism | How it manifested |
|---|---|
| **Persisted chain mismatch** | `reconnectOnMount` restored chainId 97 (testnet) from a previous session. `useBalance({ address })` without `chainId` used 97 internally → fetched testnet balance (0.002 tBNB) instead of mainnet balance (0.302 BNB). |
| **No polling on balance** | Both `useBalance` calls relied on the global `refetchInterval: 30_000`. After receiving funds, the displayed balance remained unchanged for up to 30s. |
| **No local state invalidation** | `queryClient.invalidateQueries()` on `PresalePurchasePanel.tsx:157` fires only after a successful purchase. Receiving funds through a transfer (not via the purchase flow) never triggers invalidation. |

---

## Why the Balance Now Updates Correctly

### Refresh triggers covered

| Trigger | Mechanism | Coverage |
|---|---|---|
| **Wallet connect** | `useBalance` mounts when `address` becomes defined → fresh fetch | ✅ |
| **Wallet reconnect** | Global `refetchOnReconnect` (React Query default) → stale queries refetch on reconnect | ✅ |
| **Chain switch** | `chainId` in explicit param → query key `['balance', { address, chainId }]` changes → wagmi fires fresh fetch | ✅ |
| **Successful purchase** | `queryClient.invalidateQueries()` on line 157 → all queries including balance marked stale → immediate refetch | ✅ |
| **Receiving native BNB** | `refetchInterval: 10_000` → auto-poll every 10s catches incoming transfers | ✅ |
| **Window focus** | Global `refetchOnWindowFocus: true` → refetches when user returns to tab | ✅ |
| **Page refresh** | Fresh page mount → `reconnectOnMount` → correct chainId from MetaMask → correct balance | ✅ |

### Query key is now deterministic

Before:
```
['balance', { address: '0x...' }]
// chainId silently resolved to restored persisted state (possibly 97)
```

After:
```
['balance', { address: '0x...', chainId: 56 }]
// chainId is always the explicit current chain from useChainId()
```

This ensures the cache key always matches the expected chain. A cached entry from testnet (key `chainId: 97`) will never be served when the UI is on mainnet (key `chainId: 56`).

### Duplicate local state audit

Checked all files for `useState`, `useReducer`, or context-based native balance storage. **No duplicate local state exists.** Both components read directly from wagmi's `useBalance` hook. The only derived value is `nativeBalance` (a `Number`) in `WalletHealth.tsx`, which is recomputed on every render from `nativeBal`.

---

## Regression Verification

### TypeScript

```
npx tsc --noEmit    → zero errors
```

### Build

```
npm run build       → ✓ Compiled successfully
                    → ✓ TypeScript finished
                    → ✓ Pages generated: /, /presale
```

### Change scope

Only two lines changed across two files. No contracts, ABI, blockchain logic, imports, or component structure modified.

### Manual test checklist

| Test | Expected result |
|---|---|
| Load page on BSC Mainnet | Balance reads 0.302 BNB (matches MetaMask) |
| Switch MetaMask to BSC Testnet | Balance switches to testnet amount (~0.002 tBNB) |
| Send 0.1 BNB to wallet while page open | Balance updates within 10 seconds |
| Complete a BNB purchase | Balance refetches immediately after tx |
| Close tab, reopen | Correct chain restored by MetaMask → correct balance |
| Switch to another app, return | `refetchOnWindowFocus` → balance refreshed |
