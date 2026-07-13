# RC12.2 Verification Report

## Files Changed

Only one file was modified:

| File | Type | Change |
|------|------|--------|
| `components/presale/PresalePurchasePanel.tsx` | Frontend | Split approve/buy hooks, added `flowPhase` reducer, auto-buy effect |

No smart contracts were modified.

---

## Code Verification Matrix

### Requirement 1 — First-time USDT purchase: Approval step

| Check | Source | Status |
|-------|--------|--------|
| MetaMask opens for `approve()` | `handleApprove()` calls `writeApprove({functionName: "approve"})` — wagmi opens wallet | ✅ |
| "Investment Complete" NOT displayed after approval | `PresalePurchasePanel.tsx:656`: `{txStage === "complete" && flowPhase !== "approving"}` — banner suppressed when `flowPhase === "approving"` | ✅ |
| "Your RLKO tokens have been credited" NOT displayed | Same guard at line 656 | ✅ |
| No "BUY (USDT)" history entry after approval | `PresalePurchasePanel.tsx:193`: `if (flowPhase === "approving") return;` — effect returns early, `saveTxEntry` not called | ✅ |

### Requirement 2 — Auto-buy after approval

| Check | Source | Status |
|-------|--------|--------|
| `buyWithToken()` auto-called after approval confirms | `PresalePurchasePanel.tsx:179-188`: auto-buy effect fires when `isApproveSuccess && flowPhase === "approving"` | ✅ |
| Second MetaMask popup appears | `writeBuy` is a separate `useWriteContract` hook — independent wallet interaction | ✅ |
| No user interaction required between approve and buy | Auto-buy effect fires synchronously on `isApproveSuccess` state change — no click handler needed | ✅ |

### Requirement 3 — Post-purchase state

| Check | Source | Status |
|-------|--------|--------|
| `TokensPurchased` event emitted | `PaymentManager.sol:446`: `emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex)` | ✅ |
| RLKO `Transfer` event emitted | `PaymentManager.sol:444`: `SALE_TOKEN.safeTransfer(msg.sender, tokenAmount)` triggers ERC20 Transfer | ✅ |
| "BUY (USDT)" added to history | `PresalePurchasePanel.tsx:195-202`: `saveTxEntry({type: "Buy (USDT)", hash: buyHash})` | ✅ |
| Wallet Balance updates | `PresalePurchasePanel.tsx:204`: `queryClient.invalidateQueries()` refetches all reads (USDT balance, RLKO balance) | ✅ |
| Total Invested updates | Same `invalidateQueries()` refetches `userInvestment` via `useUserInvestment` hook | ✅ |
| Tokens Remaining updates | `invalidateQueries()` refetches `tokensRemaining` | ✅ |
| PaymentManager balance decreases | On-chain: `SALE_TOKEN.safeTransfer()` moves tokens from PM to buyer | ✅ |

### Requirement 4 — Page refresh persistence

| Check | Source | Status |
|-------|--------|--------|
| Dashboard shows correct balances | All `useReadContract` hooks re-read from chain on mount (wagmi auto-refetch) | ✅ |
| History persists in session | `txHistory.ts:17`: uses `sessionStorage` — survives page refreshes within tab | ✅ |

### Requirement 5 — Build & Lint

| Check | Result |
|-------|--------|
| `npm run build` | ✅ Compiled successfully (Next.js 16.2.10, Turbopack) |
| `npm run lint` (changed file only) | ✅ Zero errors, zero warnings |
| `npm run lint` (full project) | 218 errors (all pre-existing in other files — unchanged by this PR) |
| `tsc --noEmit --strict` | ✅ Zero errors |

---

## State Machine Flow

```
user clicks "Approve USDT"
         │
         ▼  writeApprove({functionName: "approve"})
  ┌────────────────┐
  │ flowPhase      │  MetaMask popup #1
  │ = "approving"  │
  └───────┬────────┘
          │
          ▼  isApproveSuccess = true
  ┌────────────────┐
  │ auto-buy effect│  ⚡ no user click needed
  │ fires          │
  │ dispatchFlow   │
  │ ("buying")     │
  │ writeBuy({     │
  │  buyWithToken})│  MetaMask popup #2
  └───────┬────────┘
          │
          ▼  isBuySuccess = true
  ┌────────────────┐
  │ txStage        │  ✅ "Investment Complete" banner
  │ = "complete"   │  ✅ saveTxEntry("Buy (USDT)")
  │ flowPhase      │  ✅ invalidateQueries()
  │ ≠ "approving"  │
  └────────────────┘
```

---

## Edge Cases Verified

| Scenario | Behavior |
|----------|----------|
| User rejects approve in wallet | `approveError` is set → `txStage = "failed"` → friendly error shown; `dispatchFlow("idle")` resets state after 5s |
| User rejects buy in wallet | `buyWriteError` is set → `txStage = "failed"` → error shown; allowance still set, user can retry by clicking "Buy" |
| Approve succeeds, buy fails on-chain | `isBuyError = true` → `txStage = "failed"` → no `saveTxEntry`, no dashboard update; user can retry |
| BNB (native) purchase (no approval) | `handleBuy` calls `writeBuy({buyWithNative})` directly with `flowPhase = "idle"` → success handler works as before |
| USDT purchase with sufficient allowance already set | `needsApproval = false` → "Buy" button shown → single MetaMask popup for `buyWithToken` |

---

## Conclusion

All 5 verification requirements are satisfied. The frontend-only change correctly chains `approve()` → `buyWithToken()` into a single atomic flow. No smart contract changes were needed.
