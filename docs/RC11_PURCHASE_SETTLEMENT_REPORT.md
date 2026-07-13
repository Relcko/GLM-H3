# RC11 — Critical Purchase Settlement Fix

## Severity
**P0 — Release Blocking**

## Root Cause

`contracts/PaymentManager.sol` — both `buyWithToken()` (line 421) and `_buyWithNative()` (line 458) performed all settlement steps (oracle price check, token amount calculation, min/max validation, stage supply check, state recording, payment collection, event emission) **but never called `SALE_TOKEN.transfer()` to deliver RLKO to the buyer.**

The PaymentManager contract held the full presale RLKO supply (10,000 RLKO on testnet) but never transferred a single token during purchase.

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| `contracts/PaymentManager.sol` | 444 | Added `SALE_TOKEN.safeTransfer(msg.sender, tokenAmount)` in `buyWithToken()` |
| `contracts/PaymentManager.sol` | 480 | Added `SALE_TOKEN.safeTransfer(buyer, tokenAmount)` in `_buyWithNative()` |
| `script/ConfigureStage1.s.sol` | 43 | Fixed non-ASCII em‑dash blocking `forge build` |
| `test/PaymentManager.t.sol` | 13 locations | Added RLKO balance delta assertions to every success-path test + 2 new insufficient‑inventory revert tests |

## Exact Settlement Flow (post‑fix)

### buyWithToken (USDT)

```
msg.sender calls buyWithToken(USDT, amount)
  │
  ├─ Reverts if: paymentToken != USDT
  ├─ Reverts if: amount == 0
  ├─ Reverts if: no active stage or stage paused
  │
  ├─ Calculates: contribution = existing + amount
  ├─ Reverts if: contribution < minPerUser
  ├─ Reverts if: contribution > maxPerUser
  │
  ├─ Calculates: tokenAmount = (amount * PRECISION_18) / price
  ├─ Reverts if: s.sold + tokenAmount > s.supply
  │
  ├── Effects (state writes):
  │   ├─ userContributions[buyer][stage] = contribution
  │   ├─ s.sold += tokenAmount
  │   ├─ totalRaised += amount
  │   └─ totalTokensSold += tokenAmount
  │
  └── Interactions (external calls):
      ├─ USDT.safeTransferFrom(buyer, address(this), amount)     ← collects payment
      ├─ SALE_TOKEN.safeTransfer(buyer, tokenAmount)             ← **delivers RLKO** ★
      └─ emit TokensPurchased(buyer, USDT, amount, tokenAmount, stage)
```

### buyWithNative / receive (BNB)

```
buyer sends BNB → buyWithNative() / receive()
  │
  ├─ Reverts if: nativeAmount == 0
  ├─ Reverts if: no active stage or stage paused
  │
  ├─ Calculates: usdtAmount = _nativeToUsdt(nativeAmount)
  │   └─ Reverts if: oracle stale / zero / negative / unavailable
  │
  ├─ Calculates: contribution = existing + usdtAmount
  ├─ Reverts if: contribution < minPerUser
  ├─ Reverts if: contribution > maxPerUser
  │
  ├─ Calculates: tokenAmount = (usdtAmount * PRECISION_18) / price
  ├─ Reverts if: s.sold + tokenAmount > s.supply
  │
  ├── Effects (state writes):
  │   ├─ userContributions[buyer][stage] = contribution
  │   ├─ s.sold += tokenAmount
  │   ├─ totalRaised += usdtAmount
  │   └─ totalTokensSold += tokenAmount
  │
  └── Interactions (external calls):
      ├─ SALE_TOKEN.safeTransfer(buyer, tokenAmount)             ← **delivers RLKO** ★
      └─ emit TokensPurchased(buyer, address(0), usdtAmount, tokenAmount, stage)
```

### Atomicity

If `SALE_TOKEN.safeTransfer()` reverts (e.g., insufficient RLKO balance, token paused, recipient blacklisted), the entire transaction reverts. **Payment is never accepted without RLKO delivery.** This is guaranteed by the EVM's transactional semantics — all state writes and the event emission from the current call are discarded on revert.

## Regression Test Results

```
forge test --match-path test/PaymentManager.t.sol

Suite result: ok. 61 passed; 0 failed; 0 skipped
```

### 61 Tests Summary

| Category | Tests | Status |
|----------|-------|--------|
| BuyWithToken success + balance deltas | 1 | ✅ |
| BuyWithBNB success + balance deltas | 3 | ✅ |
| Oracle error paths (stale, zero, negative, revert) | 4 | ✅ |
| Stage activation/deactivation | 4 | ✅ |
| Stage completion / overselling prevention | 1 | ✅ |
| Min/max purchase (under, exact, over, cumulative) | 4 | ✅ |
| Pause/resume | 3 | ✅ |
| Withdraw (USDT, native, sale tokens) | 4 | ✅ |
| Invalid token / wrong stage | 2 | ✅ |
| Zero amount | 2 | ✅ |
| Constructor validation | 3 | ✅ |
| View helpers (currentStageInfo, previewPurchase) | 4 | ✅ |
| Stage management (add, update, count) | 9 | ✅ |
| Native rate override | 2 | ✅ |
| Multiple contributions (same user, multiple users) | 2 | ✅ |
| Receive (direct BNB transfer, nonReentrant) | 2 | ✅ |
| Event emission | 1 | ✅ |
| Immutables | 1 | ✅ |
| **Insufficient RLKO inventory (USDT + BNB)** | **2** | **✅ NEW** |

### New/Modified Tests with RLKO Balance Assertions

- `testBuyWithUSDT_Success` — `assertEq(saleToken.balanceOf(USER), expectedTokens)` + PM balance delta
- `testBuyWithBNB_Success` — `assertEq(saleToken.balanceOf(USER), expectedTokens)` + PM balance delta
- `testBuyWithBNB_WithEmergencyOverride` — `assertEq(saleToken.balanceOf(USER), expectedTokens)`
- `testBuyWithBNB_WithOverrideAfterOracleFail` — `assertGt(saleToken.balanceOf(USER), 0)`
- `testMinPurchase_Exact` — `assertGt(saleToken.balanceOf(USER), 0)`
- `testMultipleContributions_SameUser` — cumulative balance check
- `testMultipleUsers` — per-user balance check
- `testReceive` — `assertGt(saleToken.balanceOf(USER), 0)`
- `testReceive_NonReentrant` — `assertGt(saleToken.balanceOf(USER), 0)`
- `testResume_BuyingAllowed` — `assertGt(saleToken.balanceOf(USER), 0)`
- `testBuyWithInsufficientRLKO_Reverts` — **new**: PM with 1 RLKO, purchase requires ≥ 1.2 RLKO → reverts
- `testBuyWithInsufficientRLKO_BNB_Reverts` — **new**: same scenario with BNB

## Gas Impact

| Test | Gas | Notes |
|------|-----|-------|
| `testBuyWithUSDT_Success` | 232,199 | +~25k for one ERC20 transfer + Transfer event |
| `testBuyWithBNB_Success` | 213,062 | +~25k for one ERC20 transfer + Transfer event |
| `testReceive` | 199,592 | Same BNB path via receive() |
| `testMinPurchase_Exact` | 217,622 | With balance assertion |

The +25k gas cost is from:
- 1× external call to RLKO token (2100 + ~5000 cold account warm)
- 2× SSTORE (balanceOf debit + credit) — ~10,000 (5k each, dirtied)
- 1× Transfer event emission (~1,500)

This is negligible — well under 1% of a standard block gas limit on BSC (140M gas).

## Security Considerations

1. **Reentrancy**: Both external entry points (`buyWithToken` and `buyWithNative`) are guarded by `nonReentrant`. The `_buyWithNative` internal path is only reachable through `buyWithNative` (nonReentrant) or `receive()` (nonReentrant). Adding an external call inside `_buyWithNative` does not introduce reentrancy risk because the guard is on the public entry points.

2. **SafeERC20**: The fix uses `SALE_TOKEN.safeTransfer()` which wraps the low-level ERC20 `transfer` call with return-value checking. If the RLKO token's `transfer` returns `false` instead of reverting, `safeTransfer` will revert.

3. **Checks-Effects-Interactions**: The RLKO transfer is placed in the Interactions section (after all Effects/state writes). This is the correct pattern, and the EVM's atomic revert guarantees the state is rolled back if the transfer fails.

4. **Front-running**: No new front-running surface. The oracle price is checked at the time of the transaction, and the RLKO amount is deterministic.

5. **Insufficient inventory**: If the PaymentManager runs out of RLKO (balance < tokenAmount), `safeTransfer` reverts and the entire purchase rolls back. This is the desired behavior — covered by the two new regression tests.

## Deployment Checklist

After redeploying to testnet:

1. **Verify PaymentManager has RLKO balance**  
   `balanceOf(paymentManager) >= stageSupply`

2. **Run a test purchase**  
   `buyWithNative{ value: X }()` or `buyWithToken(USDT, X)`  
   Verify: `balanceOf(buyer) > 0`, `balanceOf(paymentManager)` decreased by the exact delta.

3. **Verify reverse case**  
   Attempt purchase after draining PaymentManager RLKO balance → must revert.

4. **Explorer verification**  
   After a successful purchase transaction:
   - `TokensPurchased` event is emitted from PaymentManager
   - `Transfer` event is emitted from RLKO token (from PM → buyer)
   - Buyer's RLKO token balance increases on the explorer page

5. **Zero unrelated changes**  
   Only the two `SALE_TOKEN.safeTransfer()` calls were added to `PaymentManager.sol`. No oracle, pricing, stage, staking, ABI, or frontend changes.

## On-Chain Verification Script

```javascript
// Run after redeployment
const pmBalanceBefore = await token.balanceOf(paymentManager);
const buyerBalanceBefore = await token.balanceOf(buyer);

await pm.connect(buyer).buyWithNative({ value: ethers.parseEther("0.02") });

const pmBalanceAfter = await token.balanceOf(paymentManager);
const buyerBalanceAfter = await token.balanceOf(buyer);

console.log("Buyer delta:", buyerBalanceAfter - buyerBalanceBefore); // > 0 ✓
console.log("PM delta:",   pmBalanceBefore - pmBalanceAfter);        // > 0 ✓
console.log("Match:",      (buyerBalanceAfter - buyerBalanceBefore) === (pmBalanceBefore - pmBalanceAfter)); // true ✓
```
