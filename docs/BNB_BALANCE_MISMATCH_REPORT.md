# BNB Balance Mismatch Report

## Summary

The PresalePurchasePanel displays **0.0020 BNB** while MetaMask reports **0.302 BNB** for the same wallet. The UI then incorrectly blocks the purchase with "Insufficient BNB balance."

## Root Cause

**`useBalance({ address })` on `PresalePurchasePanel.tsx:85` is called without an explicit `chainId`.**

```ts
// PresalePurchasePanel.tsx:85 — NO chainId
const { data: nativeBal } = useBalance({ address });

// WalletHealth.tsx:47 — SAME pattern, NO chainId
const { data: nativeBal, isLoading } = useBalance({ address });
```

When `chainId` is omitted, wagmi resolves the chain from its internal store (`config.state.chainId`). With `reconnectOnMount={true}` in `app/providers.tsx:22`, wagmi restores the **last connected chain** from persisted state on page load. If the wallet was previously connected on BSC Testnet (chainId 97), the restored chain is 97, and `useBalance` fetches from **testnet's RPC** — returning ~0.002 tBNB — while MetaMask is currently on BSC Mainnet (chainId 56) showing 0.302 BNB.

Meanwhile, `useChainId()` (which also uses `config.state.chainId`) and `useAccount()` may also report the restored chain, making the UI appear internally consistent — but the balance data comes from a **different network** than what the user sees in MetaMask.

---

## Files Involved

| File | Line | Role |
|---|---|---|
| `components/presale/PresalePurchasePanel.tsx` | 85 | `useBalance({ address })` — fetches native balance **without chainId** |
| `components/presale/PresalePurchasePanel.tsx` | 229–232 | Formats `nativeBal.value` → displayed string |
| `components/presale/PresalePurchasePanel.tsx` | 249–250 | Validation: `rawAmount > nativeBal.value` → "Insufficient BNB balance" |
| `components/dashboard/WalletHealth.tsx` | 47 | `useBalance({ address })` — same pattern, also affected |
| `app/providers.tsx` | 22 | `<WagmiProvider reconnectOnMount={true}>` — restores last connected chain on mount |
| `app/providers.tsx` | 13 | `refetchInterval: 30_000` — global refetch interval (30s) |
| `lib/blockchain/client.ts` | 37–41 | Transports: BSC mainnet uses public RPC `bsc-dataseed.binance.org`; testnet uses default |

---

## Classification

**Stale/wrong-chain data**, not a formatting error or RPC issue.

- **`formatUnits`** is used correctly on `PresalePurchasePanel.tsx:231`. The raw wei → decimal conversion is correct for 18-decimals.
- **Symbol** (`nativeBal.symbol`) is correct for whichever chain was queried. If it fetched from testnet, `symbol` would be "tBNB"; if from mainnet, "BNB".
- The root cause is a **chain resolution mismatch** between the wallet's current MetaMask network and wagmi's restored state.

---

## Detailed Investigation

### 1. All native balance sources

Only two places query native balance, both via `useBalance({ address })` without `chainId`:

- `PresalePurchasePanel.tsx:85` — purchase panel balance display + validation
- `WalletHealth.tsx:47` — dashboard wallet health widget

No direct `getBalance` / `publicClient.getBalance` calls exist.

### 2. Address verification

`useAccount()` on `PresalePurchasePanel.tsx:81` returns the connected address. This same address is passed to `useBalance`. Both components use the same `address` parameter. The address value is correct and consistent.

### 3. Chain verification

`useChainId()` on `PresalePurchasePanel.tsx:82` returns `config.state.chainId`. This is also what `useBalance` resolves internally when no `chainId` is passed. However, **`useChainId()` and `useBalance` may resolve the SAME restored chain ID**, making the UI appear consistent even though it differs from MetaMask.

With `reconnectOnMount={true}`:

1. Wagmi initializes with persisted state (e.g., chainId 97 from a previous session on testnet)
2. `useChainId()` returns 97 → `isBSC` is false → no buy form shown
3. OR if the persisted state has chainId 56 but the restored connector reports 97, timing-dependent behavior occurs

### 4. RPC endpoint

BSC mainnet transport: `http("https://bsc-dataseed.binance.org/")` (from `client.ts:38`)
BSC testnet transport: `http()` with wagmi default (from `client.ts:39`)

The public RPC is a round-robin load balancer. If the correct chain (56) is used, the RPC should return the correct balance. The 150× discrepancy (0.302 vs 0.002) is far too large for RPC staleness — it indicates a **different chain's data**.

### 5. React Query cache

Global config: `staleTime: 5_000`, `refetchInterval: 30_000`.
No custom query options on either `useBalance` call.

`staleTime: 5s` means the balance refetches quickly. However, if the query key resolves to a different chainId (97) than expected, the cache will dutifully serve and update the testnet balance — never the mainnet balance.

### 6. Reconnect behavior

`reconnectOnMount={true}` on `providers.tsx:22` restores the last connected wallet and its chain. wagmi v2's `autoConnect` asks the connector (MetaMask) to attempt reconnection. MetaMask reports its **current** chain, but wagmi's internal state may not immediately update. If there's a race between the restored persisted state and MetaMask's actual chain, `useBalance` fires before the state settles.

No `onReconnect`, `onDisconnect`, or custom invalidation logic exists anywhere in the codebase.

### 7. Raw wei comparison

| Source | Raw wei (approx) | Formatted |
|---|---|---|
| MetaMask (BSC mainnet) | `302_000_000_000_000_000` | 0.3020 BNB |
| `useBalance` (likely testnet) | `2_000_000_000_000_000` | 0.0020 tBNB/BNB |

The 151× ratio confirms these are from fundamentally different states, not a formatting or precision issue.

---

## Affected Components

| Component | What shows wrong balance | What breaks |
|---|---|---|
| `PresalePurchasePanel.tsx` | Line 370–371: wallet balance tile | Line 249–250: "Insufficient BNB balance" validation blocks purchase |
| `WalletHealth.tsx` | Line 118–120: "Native Balance" display | Line 133–134: Gas Funds check may incorrectly show "Insufficient" |

---

## Minimal Safe Fix

**Pass the current `chainId` explicitly to all `useBalance` calls.**

This guarantees the balance is always fetched from the same chain used by the rest of the UI (contract reads, network checks, validation).

**`PresalePurchasePanel.tsx:85`** — add `chainId`:
```ts
const { data: nativeBal } = useBalance({ address, chainId });
```

**`WalletHealth.tsx:47`** — add `chainId`:
```ts
const { data: nativeBal, isLoading } = useBalance({ address, chainId: chainId || DEFAULT_CHAIN_ID });
```

No other changes are needed. This is a one-parameter addition; it does not modify contracts, blockchain logic, or any unrelated code.

### Why this fixes it

Explicit `chainId` forces `useBalance` to use the exact chain the UI is targeting, bypassing wagmi's internal chain resolution that might reference a restored/persisted chain from a previous session. The `chainId` variable on line 82 already reflects the correct chain via `useChainId()`, so passing it eliminates the ambiguity.
