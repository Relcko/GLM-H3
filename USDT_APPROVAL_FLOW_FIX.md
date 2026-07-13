# USDT Approval Flow Fix — RC12.2

## Problem

USDT purchases stopped after `approve()`. The UI incorrectly displayed:

- "Investment Complete"
- "Your RLKO tokens have been credited"

immediately after the approval transaction confirmed, even though `buyWithToken()` was never called. No purchase occurred; no state was updated.

**Root cause:** The component treated approval and purchase as two independent steps requiring separate user clicks. The approval success handler fired the same "purchase complete" UI as an actual `buyWithToken(txhash)`.

---

## Solution

The approval and purchase are now chained into a single atomic flow:

1. User clicks **Approve USDT**
2. Approval tx is submitted → tracked via dedicated `useWriteContract` + `useWaitForTransactionReceipt` hooks
3. When approval **confirms on-chain** → `buyWithToken()` is triggered **automatically**
4. Buy tx is submitted → tracked via a second dedicated set of hooks
5. When buy **confirms** → "Investment Complete" + history entry + dashboard refresh
6. If buy **fails** → error shown, no entry recorded, no dashboard update

---

## Files Changed

| File | Change |
|------|--------|
| `components/presale/PresalePurchasePanel.tsx` | All changes |

No smart contracts were modified.

---

## Detailed Changes (`PresalePurchasePanel.tsx`)

### 1. Two independent write+receipt hook sets

- **`useWriteContract` + `useWaitForTransactionReceipt`** → `approveHash`, `writeApprove`, `isApproveSuccess`, `approveError`  
  Tracks the approval transaction only.

- **Second `useWriteContract` + `useWaitForTransactionReceipt`** → `buyHash`, `writeBuy`, `isBuySuccess`, `buyWriteError`  
  Tracks the buy transaction (both auto-buy after approval and direct BNB/USDT buys).

### 2. `flowPhase` reducer (useReducer)

```typescript
type FlowStep = 'idle' | 'approving' | 'buying';
const [flowPhase, dispatchFlow] = useReducer(
  (state: FlowStep, action: FlowStep) => action,
  'idle'
);
```

Drives which UI state to show and guards against premature success display.

### 3. Auto-buy effect

```typescript
useEffect(() => {
  if (isApproveSuccess && flowPhase === "approving" && presaleContract && selectedToken?.address) {
    dispatchFlow("buying");
    writeBuy({
      address: presaleContract,
      abi: PRESALE_ABI,
      functionName: "buyWithToken",
      args: [selectedToken.address, rawAmount],
    });
  }
}, [isApproveSuccess, flowPhase, ...]);
```

When approval confirms, automatically submits `buyWithToken()` with the same amount.

### 4. `txStage` derivation split by phase

```typescript
if (flowPhase === "approving") {
  // use isApproveSuccess / isApproveError / isApproveLoading / isApprovePending
}
// else: use isBuySuccess / isBuyError / isBuyLoading / isBuyWritePending
```

### 5. Success banner gated

```tsx
{txStage === "complete" && flowPhase !== "approving" && (
  // "Investment Complete — Your RLKO tokens have been credited"
)}
```

Only renders after `buyWithToken` confirms, never after approval.

### 6. Transaction history gated

```typescript
if (txStage === "complete") {
  if (flowPhase === "approving") return; // ← blocks entry for approval-only
  saveTxEntry({ type: "Buy (USDT)" });   // ← only for actual buys
  ...
}
```

### 7. Error handling

Uses the phase-specific error (`approveError` vs `buyWriteError`) for the `friendlyError` message.

---

## Purchase Flow Diagram

```
User clicks "Approve USDT"
        │
        ▼
  ┌─────────────────┐
  │  writeApprove()  │  submit approve() tx
  │  dispatchFlow    │
  │  ("approving")   │
  └────────┬────────┘
           │
           ▼  (wallet confirms → tx pending)
  ┌─────────────────┐
  │  awaiting        │  UI: "Awaiting Wallet"
  │  confirmation    │      → "Confirming on BNB Chain"
  └────────┬────────┘
           │
           ▼  (approve tx MINED)
  ┌─────────────────┐
  │  isApproveSuccess│
  │  = true          │
  └────────┬────────┘
           │
           ▼  (auto effect fires)
  ┌─────────────────────┐
  │  dispatchFlow        │
  │  ("buying")          │
  │  writeBuy({           │  submit buyWithToken()
  │   buyWithToken...})   │
  └────────┬────────────┘
           │
           ▼  (wallet confirms → tx pending)
  ┌─────────────────┐
  │  awaiting        │  UI: "Awaiting Wallet"
  │  confirmation    │      → "Confirming on BNB Chain"
  └────────┬────────┘
           │
           ▼  (buy tx SUCCEEDS)
  ┌─────────────────────┐
  │  isBuySuccess = true │
  │  txStage = "complete"│
  │  flowPhase ≠         │
  │  "approving"         │
  └────────┬────────────┘
           │
           ▼
  ┌─────────────────────┐
  │  "Investment         │
  │   Complete" banner   │
  │  saveTxEntry("Buy")  │
  │  invalidateQueries() │
  │  reset nonce after   │
  │  4s                  │
  └─────────────────────┘
```

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript `tsc --noEmit --strict` | ✅ Zero errors |
| ESLint | ✅ Zero errors, zero warnings |
| Smart contract changes | ✅ None (frontend only) |

---

## Rollback

If needed, restore the original file from git:

```bash
git checkout -- components/presale/PresalePurchasePanel.tsx
```

Then re-deploy the frontend.
