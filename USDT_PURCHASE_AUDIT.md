# USDT Purchase Audit — RC12.1

## Transaction

| Field | Value |
|-------|-------|
| **Tx Hash** | `0x45e05e27c4f32c56785edc1642950bfb01499940625b7d59e691d55bf053b92a` |
| **Block** | `118844503` |
| **From (Buyer)** | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` |
| **To** | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` (Mock USDT) |
| **Status** | ✅ Success (status `0x1`) |
| **Gas Used** | 48,559 |

---

## 1. Decoded Events (1 event)

**Log 0 — Mock USDT (`0x701B...E7f`)**

| Field | Value |
|-------|-------|
| **Event Sig** | `Approval(address,address,uint256)` |
| **Topic0** | `0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925` |
| **Owner** | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` (buyer) |
| **Spender** | `0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106` (PaymentManager) |
| **Value** | `10,000,000,000,000,000,000` (10 USDT) |

**No other events were emitted.**

---

## 2. Was `TokensPurchased` emitted?

**No.** PaymentManager was not called. The only interaction was `approve()` on the Mock USDT contract.

---

## 3. Was ERC20 `Transfer` emitted?

**No.** No USDT or RLKO transfer occurred. The Approval event does not move tokens.

---

## 4. Balances

| Balance | Current Value |
|---------|--------------|
| `USDT.balanceOf(buyer)` | **100 USDT** (unchanged — from prior funding) |
| `USDT.balanceOf(PaymentManager)` | **0 USDT** (no USDT was transferred) |
| `RLKO.balanceOf(buyer)` | **9.8789 RLKO** (from a **previous** purchase, not this tx) |
| `RLKO.balanceOf(PaymentManager)` | **9,990.12 RLKO** |

---

## 5. PaymentManager State

| State Variable | Current Value |
|---------------|--------------|
| `totalRaised()` | **11.3607 USDT** (unchanged — from previous purchase) |
| `totalTokensSold()` | **9.8789 RLKO** (unchanged — from previous purchase) |
| `userInvestment(buyer)` | **11.3607 USDT** (unchanged — from previous purchase) |
| `allowance(buyer → PM)` | **10 USDT** (set by this transaction) |
| `currentStage()` | 0 |
| `tokenPrice()` | 1.15 USDT |

**Contract state was NOT updated by this transaction.**

---

## 6. Dashboard Comparison

Since no state was changed, the dashboard values (`totalRaised`, `totalTokensSold`, remaining supply) would match on-chain values. There is no discrepancy — both show the same pre-existing state from the previous successful purchase.

---

## Root Cause Determination

### Scenario: The transaction is only an ERC20 `approve()` call.

This transaction (`0x45e0...b92a`) **exclusively executed `approve()`** on the Mock USDT contract, giving the PaymentManager permission to spend 10 USDT. The actual purchase step (`buyWithToken()`) was **never called**.

| Check | Result |
|-------|--------|
| Was `buyWithToken()` called? | ❌ No — tx destination is Mock USDT, not PaymentManager |
| Was `TokensPurchased` emitted? | ❌ No |
| Was USDT transferred? | ❌ No |
| Was RLKO transferred? | ❌ No |
| Were `totalRaised` / `totalTokensSold` updated? | ❌ No |
| Is `allowance` set? | ✅ Yes — 10 USDT approved to PaymentManager |

### Verdict: The purchase flow was incomplete.

The approval step (step 1 of the ERC20 approve-then-transfer pattern) succeeded, but the `buyWithToken()` call (step 2) was never executed. This is **not a contract bug** — the `buyWithToken()` function works correctly. The failure is in the frontend or user interaction layer.

### Contributing Frontend UX Bug (Secondary)

In `PresalePurchasePanel.tsx:604-628`, after the approval transaction completes, the component displays a success banner reading **"Investment Complete"** with the subtext **"Your RLKO tokens have been credited"**, and saves the transaction as a `"Buy (USDT)"` entry in local history (`PresalePurchasePanel.tsx:148-155`). This is **incorrect** — the user has only approved, not purchased. This misleading UX can cause users to leave the page believing their purchase succeeded when only the allowance was set.

### Root Cause

**Primary:** The `buyWithToken()` call was never submitted after the approval. The contract state is correct and unchanged. No settlement bug exists.

**Secondary (Frontend):** The approval success handler mislabels the transaction as a completed purchase (`"Investment Complete"`, `"Your RLKO tokens have been credited"`), which can confuse users into thinking no further action is needed. After the 4-second timer resets `txStage` to `idle`, the Buy button reappears — but the user may have already navigated away.

---

## On-Chain Evidence

```
Tx Hash:     0x45e05e27c4f32c56785edc1642950bfb01499940625b7d59e691d55bf053b92a
Block:       118844503
From:        0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d
To:          0x701B81ea7F71a3c403cb53A6d465c37D96187E7f  ← USDT, not PaymentManager
Function:    approve(spender=0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106, value=10 USDT)
Events:      Approval (only)
Result:      No TokensPurchased, no Transfer, no state change
```
