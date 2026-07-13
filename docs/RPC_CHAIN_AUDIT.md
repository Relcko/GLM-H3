# RPC Chain Audit

## Bottom Line

**The app is correct. The wallet address has 0.002 BNB on BSC Mainnet and 0.302 tBNB on BSC Testnet.**

MetaMask shows ~0.302 BNB because it is connected to **BSC Testnet**. The dashboard shows 0.0020 BNB because it is configured for **BSC Mainnet** (DEFAULT_CHAIN_ID = 56). Both are displaying the real on-chain balance — just on different chains.

---

## Diagnostic Script Results

Script: `scripts/chain-audit.mjs`  
Target address: `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d`

| RPC Endpoint | Chain | Raw wei | Formatted |
|---|---|---|---|
| `https://bsc-dataseed.binance.org/` | BSC Mainnet (56) | `2,000,000,000,000,000` | **0.002000 BNB** |
| `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | BSC Testnet (97) | `302,021,000,000,000,001` | **0.302021 tBNB** |
| `https://56.rpc.thirdweb.com` | BSC Mainnet via thirdweb (56) | `2,000,000,000,000,000` | 0.002000 BNB |
| `https://bsc-testnet-rpc.publicnode.com` | BSC Testnet via publicnode (97) | `302,021,000,000,000,001` | 0.302021 tBNB |

All four RPCs agree on both chains. No RPC discrepancy.

---

## Chain Configuration Audit

### wagmi config (`lib/blockchain/client.ts`)

| Property | Value |
|---|---|
| `chains[]` | `[bsc(56), bscTestnet(97), polygon(137)]` |
| `transport[bsc(56)]` | `http(BSC_RPC)` |
| `transport[bscTestnet(97)]` | `http()` (chain default) |
| `transport[polygon(137)]` | `http(POLYGON_RPC)` |

### Environment variables (`lib/blockchain/client.ts:13-15` + `.env.local`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BSC_RPC` | **not set** → fallback `https://bsc-dataseed.binance.org/` |
| `NEXT_PUBLIC_POLYGON_RPC` | **not set** → fallback `https://polygon-bor.publicnode.com` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | set (value present) |

### Default chain ID (`lib/blockchain/chains.ts:12`)

```
DEFAULT_CHAIN_ID = 56  (BSC Mainnet)
```

### Beta network config (`lib/beta.ts:26-32`)

```
BETA_NETWORK.chainId  = 97   (BSC Testnet)
BETA_NETWORK.name     = "BNB Smart Chain Testnet"
BETA_NETWORK.currency = "tBNB"
```

### Chain native currencies (`wagmi/chains`)

| Chain | Symbol | Decimals |
|---|---|---|
| BSC Mainnet (56) | `BNB` | 18 |
| BSC Testnet (97) | `tBNB` | 18 |

### Payment token symbols (`lib/presale/config.ts`)

| Chain | Native symbol shown in UI |
|---|---|
| 56 (mainnet) | `BNB` |
| 97 (testnet) | `tBNB` |

---

## useBalance() Query Key

wagmi v2 `useBalance` generates the query key:

```
['balance', { address, chainId }]
```

The `chainId` is the explicit parameter passed to the hook:

- `PresalePurchasePanel.tsx:85`: `useBalance({ address, chainId })` ← `chainId` from `useChainId()`
- `WalletHealth.tsx:47`: `useBalance({ address, chainId: chainId || DEFAULT_CHAIN_ID })`

### Query key resolves to

| When wallet is on | `useChainId()` returns | Query key | RPC called | Balance returned |
|---|---|---|---|---|
| BSC Mainnet (56) | `56` | `['balance', { address, chainId: 56 }]` | `https://bsc-dataseed.binance.org/` | **0.002 BNB** |
| BSC Testnet (97) | `97` | `['balance', { address, chainId: 97 }]` | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | **0.302 tBNB** |

---

## What the User Sees (most likely flow)

1. MetaMask is connected to **BSC Testnet** (chainId 97)
2. MetaMask balance display: **0.302 tBNB** (correct for testnet)
3. App loads, `useChainId()` returns **97** (testnet)
4. `isBSC = 97 === 56` → **false** → "Wrong network" banner appears
5. User clicks **Switch Network** → `switchChainAsync({ chainId: 56 })`
6. MetaMask switches to BSC Mainnet (56)
7. `useChainId()` now returns **56** (mainnet)
8. `useBalance({ address, chainId: 56 })` fires → queries mainnet RPC
9. Mainnet balance: **0.002 BNB**
10. Validation: `rawAmount > nativeBal.value` → true → "Insufficient BNB balance"

The **0.302 BNB** the user remembers is their **testnet balance**. After the app forced a chain switch to mainnet, only **0.002 BNB** is available.

---

## The Mismatch

| Source | Chain | Balance | Root cause |
|---|---|---|---|
| MetaMask (before switch) | BSC Testnet (97) | 0.302 tBNB | User's wallet connected to testnet |
| Dashboard `useBalance` | BSC Mainnet (56) | 0.002 BNB | `DEFAULT_CHAIN_ID = 56` |
| Script `getBalance()` | BSC Mainnet (56) | 0.002 BNB | Confirmed via two independent RPC endpoints |
| Script `getBalance()` | BSC Testnet (97) | 0.302 tBNB | Confirmed via two independent RPC endpoints |

**The dashboard value is not stale or incorrect.** It accurately reflects the on-chain mainnet balance. The user's funds (0.302) are on testnet, not mainnet.

---

## Why `DEFAULT_CHAIN_ID` Matters

```
lib/beta.ts:  BETA_NETWORK.chainId = 97   (testnet)
lib/chains.ts: DEFAULT_CHAIN_ID  = 56    (mainnet)
```

These two values disagree. The beta is explicitly targeting testnet (contracts are deployed on testnet, faucets reference testnet, explorer links point to testnet BSCScan), but `DEFAULT_CHAIN_ID` is set to mainnet.

When `reconnectOnMount` fires, wagmi initializes with `config.state.chainId = 56` (the default/first chain). After reconnect, if MetaMask reports chain 97, `config.state.chainId` updates to 97. But the first render before the reconnect completes uses chainId 56 — which queries mainnet and returns 0.002 BNB.

---

## Files Referenced

| File | Relevant content |
|---|---|
| `lib/blockchain/client.ts:13` | `BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC \|\| "https://bsc-dataseed.binance.org/"` |
| `lib/blockchain/client.ts:30` | `chains: [bsc, bscTestnet, polygon]` — mainnet is first (default) |
| `lib/blockchain/client.ts:38-40` | `transports: { [bsc.id]: http(BSC_RPC), [bscTestnet.id]: http(), ... }` |
| `lib/blockchain/chains.ts:12` | `DEFAULT_CHAIN_ID = CHAIN_IDS.bsc` = **56** |
| `lib/presale/config.ts:62-65` | `RPC_OVERRIDES` — reads same env vars |
| `lib/beta.ts:26-32` | `BETA_NETWORK.chainId = 97`, `BETA_NETWORK.currency = "tBNB"` |
| `app/providers.tsx:22` | `reconnectOnMount={true}` |
| `components/presale/PresalePurchasePanel.tsx:82-85` | `chainId = useChainId()` → `useBalance({ address, chainId })` |
| `components/dashboard/WalletHealth.tsx:45-47` | `chainId = useChainId()` → `useBalance({ address, chainId: chainId \|\| DEFAULT_CHAIN_ID })` |
