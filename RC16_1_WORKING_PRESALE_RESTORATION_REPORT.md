# Working Presale Restoration — RC16.1

## Summary

Restored the Presale frontend to its last working state after it was reverted
to an earlier version. The page now uses the full `DashboardShell` layout with
investor portal, purchase modal, auto-buy after approval, transaction history
with duplicate protection, and dashboard auto-refresh.

## Files Changed

### `app/presale/page.tsx` — Restored full dashboard layout

Rewrote the page from a minimal layout (hero + stats + purchase panel) to the
full working layout:

| Component | Purpose |
|-----------|---------|
| `InvestorPortalScreen` | Portal gate with connect wallet / authentication animation |
| `DashboardShell` | Sidebar, testnet banner, responsive grid wrapper |
| `DashboardHero` | Top-level hero with presale status |
| `PortfolioKPI` | Investment KPIs (total invested, tokens, etc.) |
| `RewardsCard` | Staking rewards summary |
| `InvestorActivity` | Recent activity feed |
| `TransactionTimeline` | Timeline of past transactions |
| `StickyBuyConsole` | Sticky sidebar wrapping `PresalePurchasePanel` |
| `WalletHealth` | Wallet status and balance |
| `InvestorStats` | Presale statistics |
| `SectionHeader` | Reusable animated section header |
| `TransactionHistory` | Transaction history table (newly added) |
| `AdminDashboard` | Admin controls |
| `DocsFAQ` | FAQ section |

Added `SectionHeader` helper, `sectionVariant` / `sidebarFirstVariant` motion
variants, and staggered entrance animations via `staggerChildren`.

### `components/presale/PresalePurchasePanel.tsx` — Added modal + auto-buy + tx saving

**What was restored:**

| Feature | Implementation |
|---------|---------------|
| **Purchase modal** | `AnimatePresence` + `motion.div` centered at `z-[9999]`, backdrop `bg-black/90 backdrop-blur-lg` |
| **Scroll lock** | `document.body.style.overflow = "hidden"` when modal open, restored on close |
| **Sticky header** | Modal header with title and close button, `sticky top-0` |
| **Sticky footer** | Modal footer with Cancel / Confirm / Done buttons, `sticky bottom-0` |
| **Processing screen** | Spinning icon + stage label + contextual description |
| **Success screen** | Checkmark + token amount + "View on Explorer" link |
| **Failed screen** | Warning icon + error message |
| **Explorer link** | Uses `CHAIN_EXPLORERS[chainId]` from `@/lib/blockchain/txHistory` |
| **Cancel / Done buttons** | Cancel on idle, Done on complete/failed |
| **Auto-buy after approval** | `prevStageRef` tracks stage transitions; when approve completes, `needsAutoBuy` triggers the buy tx automatically |
| **Tx history saving** | `saveTxEntry` called on buy completion, duplicate protection built into `saveTxEntry` |
| **`pendingAction` tracking** | Distinguishes approve vs buy flow for auto-buy logic |
| **Purchase summary** | You pay / You receive / Rate display in the modal |

## Verification

```
npm run build  →  ✓ Compiled successfully (18.7s)
                 ✓ TypeScript passed (8.8s)
                 ✓ All static pages generated
```

## Scope Confirmation

| Not modified | Status |
|--------------|--------|
| Smart contracts | ✅ Unchanged |
| PaymentManager | ✅ Unchanged |
| Staking contracts | ✅ Unchanged |
| RewardsCalculator | ✅ Unchanged |
| Wallet connection (wagmi) | ✅ Unchanged |
| Backend | ✅ Unchanged |
