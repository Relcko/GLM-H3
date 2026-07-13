# Premium Purchase Review Modal — RC13.1

## Objective

Replace the inline Purchase Summary card with a centered premium modal that guides users through review → approve/confirm → success in a single focused flow.

## Files Changed

| File | Change |
|------|--------|
| `components/presale/PresalePurchasePanel.tsx` | All changes |

No smart contracts, wagmi hooks, or purchase calculations were modified.

---

## What Changed

### Removed
- Inline Purchase Summary card (previously displayed below the input)
- Inline `AnimatePresence` tx status banners (tx-stage indicator, error, success)
- Inline Approve/Buy button group

### Added
- **"Continue" button** — appears after the user enters a valid amount; opens the modal
- **Premium centered modal** with three views
- **Derived state** (`isModalReview`, `isModalProcessing`, `isModalSuccess`) to control modal view
- **`showModal` state** — tracks whether the modal is open
- **`handleDone`** — resets `intentNonce`, `flowPhase`, and closes the modal
- Balance projection helpers (`currentUsdt`, `currentRlko`, `afterUsdt`, `afterRlko`)
- Explorer link (`txUrl`)

### Preserved
- All wagmi hooks (`useWriteContract`, `useWaitForTransactionReceipt`)
- All purchase logic (`handleApprove`, `handleBuy`, auto-buy effect, `flowPhase` reducer)
- All form validation
- All config/read hooks

---

## Modal Views

### View 1: Review Your Investment

```
┌─────────────────────────────────────────┐
│ ─ Review Your Investment                │
│                                         │
│ You Pay                     100.00 USDT │
│ ≈ USD                       $115.00     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      You Receive                │     │
│ │      ≈ 86.96                   │ ← focus
│ │      RLKO                      │     │
│ └─────────────────────────────────┘     │
│                                         │
│ Current Stage              Stage 1      │
│ 1 RLKO                    1.1500 USDT   │
│ Remaining Supply          9,900 RLKO    │
│                                         │
│ Your Balances                           │
│ Current     100.00 USDT / 9.88 RLKO     │
│ After        0.00 USDT / 96.84 RLKO     │
│                                         │
│ Estimated Gas              ~$0.30–$0.80 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Security notice text                │ │
│ └─────────────────────────────────────┘ │
│ ─────────────────────────────────────── │
│ ┌─────────────────────────────────────┐ │
│ │    Approve USDT / Confirm Purchase  │ │ ← fixed bottom CTA
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

| Element | Location | Implementation |
|---------|----------|----------------|
| Review Your Investment | Header | `dashboard-accent-line` + `dashboard-label` |
| You Pay | Row | `numericAmount` formatted, token symbol |
| ≈ USD | Optional row | `usdAmount` formatted (only if > 0) |
| You Receive | **Visual focus** | `text-3xl font-light tracking-tight text-cyber` centered card |
| Current Stage | Row | `stageFormatted` |
| RLKO Price | Row | `tokenPriceFormatted` with 4 decimals |
| Remaining Supply | Row | `remainingSupplyFormatted` |
| Current Wallet Balance | Row | USDT + RLKO balances |
| Wallet Balance After Purchase | Row | Computed: `current - amount` for USDT, `current + estimated` for RLKO |
| Estimated Gas | Row | Static `~$0.30–$0.80` |
| Security notice | Box | "Your tokens will be deposited to your connected wallet..." |
| CTA | **Fixed bottom** | `Approve USDT` or `Confirm Purchase` based on `needsApproval` |

### View 2: Processing

```
┌─────────────────────────────────────────┐
│      ◌ (spinning)                       │
│      Confirming on BNB Chain            │
└─────────────────────────────────────────┘
```

- Centered spinner with current `TX_LABEL[txStage]`
- Shows friendly error if transaction fails
- CTA disabled with spinner text

### View 3: Success

```
┌─────────────────────────────────────────┐
│            ✓ (checkmark)                │
│                                         │
│        Investment Complete              │
│    Your RLKO tokens have been credited  │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │      RLKO Received              │     │
│ │      86.96                      │     │
│ │      RLKO                       │     │
│ └─────────────────────────────────┘     │
│                                         │
│ Updated Wallet Balance    96.84 RLKO    │
│                                         │
│              View on Explorer →          │
│ ─────────────────────────────────────── │
│ ┌─────────────────────────────────────┐ │
│ │              Done                   │ │ ← fixed bottom
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

| Element | Detail |
|---------|--------|
| Checkmark | Spring-animated circular icon, `bg-success/10` |
| Investment Complete | Heading + subtitle |
| RLKO Received | Large `text-cyber` number, centered card |
| Updated Wallet Balance | Computed `afterRlko` |
| View on Explorer | Link to `{explorerUrl}/tx/{buyHash}` |
| Done button | Calls `handleDone()` — resets all state and closes modal |

---

## Flow Diagram

```
User enters amount
        │
        ▼
  ┌──────────────┐
  │ "Continue"   │  (shown when txStage === "idle" && amount > 0)
  │  button      │
  └──────┬───────┘
         │ click
         ▼
  ┌──────────────────┐
  │ MODAL OPENS      │
  │ isModalReview    │  ← shows all summary data
  │ CTA: Approve/    │
  │ Confirm          │
  └──────┬───────────┘
         │ click CTA
         ▼
  ┌──────────────────┐
  │ MODAL:           │
  │ isModalProcessing│  ← spinner + status text
  │ (approve →       │
  │  auto-buy)       │
  └──────┬───────────┘
         │ buy succeeds
         ▼
  ┌──────────────────┐
  │ MODAL:           │
  │ isModalSuccess   │  ← checkmark, RLKO received,
  │ CTA: Done        │     updated balance, explorer link
  └──────┬───────────┘
         │ click Done
         ▼
  ┌──────────────────┐
  │ MODAL CLOSES     │
  │ State resets     │
  │ (intentNonce=0,  │
  │  flowPhase=idle) │
  └──────────────────┘
```

---

## Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit --strict` | ✅ Zero errors |
| `eslint` on changed file | ✅ Zero errors, zero warnings |
| `npm run build` | ✅ Compiled successfully (Next.js 16.2.10) |
| Smart contract changes | ✅ None |
| Wagmi hook changes | ✅ None (hooks untouched) |
| Purchase calculation changes | ✅ None (all existing logic preserved) |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User enters 0 or empty amount | "Continue" button hidden |
| Validation warnings active | "Continue" button disabled |
| Supply exhausted (`preview[3] === 0`) | "Continue" button disabled |
| User rejects wallet transaction | `flowPhase` resets, modal stays on Review view, error shown |
| BNB purchase (no approval needed) | Modal shows "Confirm Purchase" (never "Approve") |
| USDT with sufficient allowance | Modal shows "Confirm Purchase" (skip approve, go straight to buy) |
| Refresh page after success | Data re-read from chain — correct balances displayed |
| Explorer link on testnet | Uses `CHAIN_EXPLORERS[97] = https://testnet.bscscan.com` |
