# RPC Fix Report

**Date:** July 2026
**Bug:** Frontend making repeated requests to `https://eth.merkle.io` — CORS failures, 429 errors, `getEnsName()` lookups
**Application:** BNB Smart Chain only — Ethereum RPC should never be used

---

## Root Cause

Three files included Ethereum mainnet (chain ID 1) in wagmi configuration, causing RainbowKit to create an Ethereum public client and trigger ENS resolution for connected wallet addresses:

### 1. `lib/blockchain/client.ts`

```ts
import { mainnet, bsc, bscTestnet, polygon } from "wagmi/chains";  // ❌ mainnet imported

export const wagmiConfig = getDefaultConfig({
  chains: [mainnet, bsc, bscTestnet, polygon],  // ❌ mainnet in chain list
  transports: {
    [mainnet.id]: http(),  // ❌ default transport → eth.merkle.io
    ...
  },
});
```

`http()` with no URL argument uses the chain's default public RPC. For viem's `mainnet` chain, the default is `https://eth.merkle.io`.

### 2. `lib/blockchain/chains.ts`

```ts
export const CHAIN_IDS = { ethereum: 1, ... };  // ❌ Ethereum chain ID defined
export const SUPPORTED_CHAINS = [mainnet, ...]; // ❌ mainnet in supported chains
export const SUPPORTED_CHAIN_IDS = [1, ...];    // ❌ Ethereum chain ID supported
```

### 3. Downstream consumers referencing `CHAIN_IDS.ethereum`

- `components/presale/PresalePurchasePanel.tsx` — CHAIN_LABELS mapping
- `lib/presale/config.ts` — PAYMENT_TOKENS entry for Ethereum

### Why It Caused `eth.merkle.io` Requests

1. RainbowKit internally calls wagmi's `useEnsName()` hook for every connected wallet address
2. `useEnsName()` requires a public client for Ethereum (ENS is Ethereum-native)
3. Wagmi creates this client using the configured transport for chain ID 1
4. The transport `http()` resolves to `https://eth.merkle.io` (viem's mainnet default)
5. Every connected wallet triggers one or more `eth_call` requests to resolve ENS
6. The public endpoint rate-limits → 429 errors + CORS failures

---

## Files Changed

| File | Change |
|---|---|
| `lib/blockchain/client.ts` | Removed `mainnet` import, removed from `chains` array, removed `[mainnet.id]: http()` transport |
| `lib/blockchain/chains.ts` | Removed `ethereum` from `CHAIN_IDS`, removed from `SUPPORTED_CHAINS` and `SUPPORTED_CHAIN_IDS`, removed from `CHAIN_NAMES` |
| `lib/presale/config.ts` | Removed `[CHAIN_IDS.ethereum]` PAYMENT_TOKENS entry (ETH/USDT on Ethereum) |
| `components/presale/PresalePurchasePanel.tsx` | Removed `[CHAIN_IDS.ethereum]` from CHAIN_LABELS |

---

## Why Ethereum RPC Was Selected

Before the fix, the wagmi configuration included:

```ts
chains: [mainnet, bsc, bscTestnet, polygon]
```

The `mainnet` chain was included because:
1. RainbowKit's default template includes all major EVM chains
2. It was never explicitly removed as the application was initially scoped more broadly
3. `CHAIN_IDS.ethereum` was used in `PAYMENT_TOKENS` for Ethereum USDT support (never actually used)

---

## Why Only BNB RPC Is Now Used

After the fix, the wagmi configuration is:

```ts
chains: [bsc, bscTestnet, polygon]
transports: {
  [56]: http("https://bsc-dataseed.binance.org/"),  // BSC Mainnet
  [97]: http(),                                        // BSC Testnet (public)
  [137]: http("https://polygon-bor.publicnode.com"),   // Polygon
}
```

### No Ethereum chain in config means:

| Behavior | Before | After |
|---|---|---|
| Transport for chain ID 1 | Created → connects to `eth.merkle.io` | Not created → no Ethereum RPC |
| ENS resolution (`getEnsName`) | Active — called for every wallet | Skipped — no Ethereum transport exists |
| RainbowKit ENS display | Tries to resolve → fails with CORS/429 | Not attempted — Ethereum unavailable |
| Connected wallet on any chain | Triggers ENS lookup on Ethereum | No Ethereum RPC call |
| Browser requests to `eth.merkle.io` | Multiple per page load | Zero |

### Wallet users on unsupported chains

Users connected to Ethereum or other non-BSC chains still see the "Wrong network" prompt — this is handled by `useChainId()` in `PresalePurchasePanel` and `StakePanel`, not by the chains array.

---

## Verification

- `npm run build` — ✅ Passes with zero errors
- No CORS errors in browser devtools
- No 429 errors in network tab
- No `getEnsName()` calls in network tab
- No requests to `eth.merkle.io` in network tab
- Wallet connection still works (MetaMask, WalletConnect, Coinbase)
- BSC and BSC Testnet RPC calls work as expected
- Polygon RPC calls work as expected
