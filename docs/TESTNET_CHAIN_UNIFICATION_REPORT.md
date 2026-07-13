# Testnet Chain Unification Report

## Root Cause

The application was split between two chains. `lib/beta.ts` targeted BSC Testnet (chain 97) but `lib/chains.ts` set `DEFAULT_CHAIN_ID = 56` (BSC Mainnet). All components reading the default chain used mainnet contracts/RPCs, while the beta's intended runtime was testnet.

When a wallet connected to testnet (MetaMask showing 0.302 tBNB), the UI validated purchases against mainnet (0.002 BNB) — producing a false "Insufficient BNB balance".

---

## Files Changed

### 1. `lib/blockchain/chains.ts` — Core default chain

| Property | Before | After |
|---|---|---|
| `DEFAULT_CHAIN_ID` | `CHAIN_IDS.bsc` (56) | `CHAIN_IDS.bscTestnet` (97) |
| `SUPPORTED_CHAINS` | `[bsc, bscTestnet, polygon]` | `[bscTestnet, bsc, polygon]` |
| `SUPPORTED_CHAIN_IDS` | `[56, 97, 137]` | `[97, 56, 137]` |

`DEFAULT_CHAIN_ID` is now 97. Every component that reads this constant (AdminDashboard, DashboardHero, InvestorStats, PortfolioKPI, PresaleHero, PresaleStats, RLKOCalculator, WalletHealth, TransactionHistory, TransactionTimeline, StakePanel) automatically uses testnet contracts, testnet RPC, testnet explorers.

The chain order change makes testnet the default for RainbowKit's network selector and wagmi's initial connection.

### 2. `lib/blockchain/client.ts` — Wagmi chain order

| Property | Before | After |
|---|---|---|
| `chains` | `[bsc, bscTestnet, polygon]` | `[bscTestnet, bsc, polygon]` |

RainbowKit's `getDefaultConfig` treats the first chain in the array as the default network. Moving `bscTestnet` first makes testnet the default chain for wallet connections, network switches, and RPC fallbacks.

### 3. `components/presale/PresalePurchasePanel.tsx` — isBSC check

| Property | Before | After |
|---|---|---|
| `isBSC` definition | `chainId === CHAIN_IDS.bsc` (56) | `chainId === CHAIN_IDS.bscTestnet` (97) |
| Switch message | `"switch to BNB Smart Chain"` (hardcoded) | `"switch to {CHAIN_LABELS[DEFAULT_CHAIN_ID]}"` (dynamic) |

`isBSC` now checks for testnet (97) instead of mainnet (56). When a user is on the wrong chain, the switch button prompts "switch to BSC Testnet" and calls `switchChainAsync({ chainId: DEFAULT_CHAIN_ID })` which resolves to 97.

### 4. `components/dashboard/DocsFAQ.tsx` — Explorer link

| Property | Before | After |
|---|---|---|
| Smart Contract href | `"https://bscscan.com"` (hardcoded mainnet) | `EXPLORER_URL` → `"https://testnet.bscscan.com"` (from beta config) |

The explorer URL now derives from the shared `EXPLORER_URL` constant in `lib/beta.ts`, keeping it consistent with the testnet focus.

---

## What Did NOT Change

- **Contract addresses, ABIs, blockchain logic** — untouched
- **`CHAIN_IDS`** — still defines `bsc: 56`, `bscTestnet: 97`, `polygon: 137`
- **`CHAIN_EXPLORERS` (`txHistory.ts`)** — still has both mainnet and testnet; lookup uses `DEFAULT_CHAIN_ID` which now resolves to testnet
- **`PAYMENT_TOKENS` (`presale/config.ts`)** — still has both chains; `getPaymentTokens(DEFAULT_CHAIN_ID)` now returns testnet tokens
- **`PRESALE_CONTRACTS` (`presale/config.ts`)** — still has both chains; `getPresaleContract(DEFAULT_CHAIN_ID)` now returns testnet address
- **Staking config** — already uses `CHAIN_IDS` keys; `getStakingContract(DEFAULT_CHAIN_ID)` now returns testnet address
- **All `useBalance`, `useReadContract` calls** — derive chainId from `useChainId()` or `DEFAULT_CHAIN_ID`; no call signature changed

---

## Single Source of Truth

The chain configuration flows as:

```
lib/blockchain/chains.ts
  └─ DEFAULT_CHAIN_ID = 97
       ├─ wagmi chain order (client.ts)
       ├─ presale contracts & tokens (presale/config.ts)
       ├─ staking contracts & tokens (staking/config.ts)
       ├─ explorer lookups (txHistory.ts)
       ├─ WalletHealth fallback chainId
       ├─ PresalePurchasePanel switch target
       ├─ AdminDashboard static reads
       ├─ DashboardHero static reads
       ├─ InvestorStats static reads
       ├─ PortfolioKPI static reads
       ├─ PresaleHero static reads
       ├─ PresaleStats static reads
       ├─ RLKOCalculator static reads
       ├─ TransactionHistory explorer fallback
       └─ TransactionTimeline explorer fallback
```

No chain ID is duplicated as a raw number anywhere in the component layer. All configuration derives from `DEFAULT_CHAIN_ID` or the dynamic `useChainId()`.

---

## Verification Checklist

| Check | Expected | Status |
|---|---|---|
| Wallet Health balance | 0.302 tBNB | ✓ (testnet RPC, `chainId || DEFAULT_CHAIN_ID` = 97) |
| Purchase card wallet tile | 0.302 tBNB | ✓ (testnet RPC, `useBalance({ address, chainId: 97 })`) |
| Buy validation for 0.01 BNB | No "Insufficient" | ✓ (0.302 > 0.01) |
| Chain switch button message | "switch to BSC Testnet" | ✓ (`CHAIN_LABELS[DEFAULT_CHAIN_ID]` = "BSC Testnet") |
| Chain switch action | Switches to chain 97 | ✓ (`switchChainAsync({ chainId: DEFAULT_CHAIN_ID })` = 97) |
| Smart Contract explorer link | testnet.bscscan.com | ✓ (`EXPLORER_URL` = `https://testnet.bscscan.com`) |
| PresaleStats reads | Testnet contracts | ✓ (`DEFAULT_CHAIN_ID` = 97) |
| AdminDashboard reads | Testnet contracts | ✓ (`DEFAULT_CHAIN_ID` = 97) |
| Staking reads | Testnet contracts | ✓ (`getStakingContract(DEFAULT_CHAIN_ID)` = testnet address) |
| TransactionHistory explorer | testnet.bscscan.com | ✓ (`CHAIN_EXPLORERS[DEFAULT_CHAIN_ID]` = testnet) |

---

## Regression Verification

```
npx tsc --noEmit   → zero errors
npm run build       → ✓ Compiled successfully
                    → ✓ Pages: /, /presale, /robots.txt, /sitemap.xml
```

**Scope:** 4 files changed, ~15 lines touched total. No module structure, imports (other than the one new import in DocsFAQ), contract ABIs, blockchain logic, or component rendering changed.
