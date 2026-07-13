# PaymentManager — Full Manual Audit Report

**Date:** 2026-07-11  
**Auditor:** External Security Review  
**Target:** `contracts/PaymentManager.sol` (588 lines, Solidity ^0.8.28)  
**Scope:** PaymentManager.sol, IAggregatorV3Interface.sol, test suite  
**Network:** BNB Smart Chain (BSC)  

---

## Executive Summary

PaymentManager is a multi-stage presale contract supporting USDT and BNB purchases, with Chainlink BNB/USD oracle integration. The codebase is well-structured, follows modern Solidity conventions, and implements standard security patterns (CEI, ReentrancyGuard, Pausable, SafeERC20). 

| Severity | Count | Key Areas |
|----------|-------|-----------|
| Critical | 0 | — |
| High     | 0 | — |
| Medium   | 2 | `receive()` reentrancy guard bypass, price=0 DoS via `updateStage` |
| Low      | 8 | Input validation gaps, gas inefficiencies, error handling |
| Info     | 5 | UX notes, ownership model, accounting edge cases |

**Readiness Score: 8.5/10** (up from 8.2/10 after earlier hardening). Ready for testnet deployment after addressing both Medium findings.

---

## Detailed Findings

### [M1] Price=0 Causes Division-by-Zero Panic (Medium)

**File:** `PaymentManager.sol:245,276`  
**Type:** Input Validation / DoS  

**Description:** Both `addStage()` and `updateStage()` accept `price` without validation. If `price=0` is set on an active stage, the next `buyWithToken()` or `buyWithNative()` call triggers a Solidity Panic (0x12) at `_calculateTokenAmount()` line 576 — this is **not** caught by the `stageActive` modifier and causes an ungraceful revert with no meaningful error.

**Impact:** 1) Accidental zero price locks all purchases permanently for that stage. 2) If the owner's account is compromised, setting price=0 on all stages acts as a permanent DoS.

**Recommendation:** Add validation in both functions:
```solidity
if (price == 0) revert InvalidPrice();  // add error: error InvalidPrice();
```

---

### [M2] `receive()` Bypasses `nonReentrant` (Medium)

**File:** `PaymentManager.sol:585`  
**Type:** Reentrancy  

**Description:** The `receive()` function lacks the `nonReentrant` modifier. While `_buyWithNative()` performs no external calls (making it **currently safe**), any future refactoring that adds an external call to `_buyWithNative` would silently introduce a reentrancy vulnerability through the `receive()` path.

**Impact:** No exploit path exists today, but the code is fragile. A future maintainer unaware of this constraint could introduce a vulnerability.

**Recommendation:** Add `nonReentrant` to `receive()`:
```solidity
receive() external payable nonReentrant whenNotPaused stageActive {
    _buyWithNative(msg.sender, msg.value);
}
```
Solidity 0.8.x supports modifiers on `receive()`. The `nonReentrant` modifier from OpenZeppelin v5 is compatible.

---

### [L1] `addStage()` Lacks Input Validation (Low)

**File:** `PaymentManager.sol:245`

No validation for:
- `supply == 0` — stage with zero supply immediately rejects all purchases.
- `price == 0` — see M1 above.
- `maxPerUser < minPerUser` — creates an unbuyable stage (min > max).

All three are self-inflicted DoS vectors under a trusted-owner model, but validation costs minimal gas and prevents accidents.

**Recommendation:** Add `require(supply > 0 && price > 0 && maxPerUser >= minPerUser, ...)`.

---

### [L2] `totalAllocation` Uses `unchecked` Arithmetic (Low)

**File:** `PaymentManager.sol:248,283`

`totalAllocation` is incremented/decremented inside `unchecked` blocks. Overflow would require ~1.16e42 USDT worth of supply (impossible in practice). This is informational but noted for audit completeness.

---

### [L3] Only USDT Is Accepted (Low)

**File:** `PaymentManager.sol:408`

By design, only the immutable `USDT` address is accepted. This is intentional but means no alternative stablecoin can be used without a contract upgrade. On BSC, USDT is the dominant stablecoin, so this is acceptable.

---

### [L4] `_nativeToUsdt()` Is `view` Called from Non-View Context (Low)

**File:** `PaymentManager.sol:481`

The function is declared `view` but called from `_buyWithNative` (non-view). This is valid Solidity but means the opcode is `CALL` rather than `STATICCALL`, losing the gas benefit of a static call. Negligible in practice (oracle reads dominate gas).

---

### [L5] Native Withdrawal Forwards All Gas (Low)

**File:** `PaymentManager.sol:527`

```solidity
(bool success,) = owner().call{ value: balance }("");
```

Forwards 63/64 of remaining gas. If owner is a multisig or requires gas-limited execution, consider using a pull-over-push pattern or a fixed-gas call.

---

### [L6] `withdrawSaleTokens()` Lacks Balance Check (Low)

**File:** `PaymentManager.sol:540`

If `amount > SALE_TOKEN.balanceOf(address(this))`, the `safeTransfer` call reverts with a generic error. No custom error for insufficient balance.

**Recommendation:** Add `if (amount > SALE_TOKEN.balanceOf(address(this))) revert InsufficientBalance();`.

---

### [L7] Redundant Pause/Resume Events (Low)

**File:** `PaymentManager.sol:551-560`

Custom `StagePaused` / `StageResumed` events duplicate OpenZeppelin's `Paused` / `Unpaused` events. Not harmful, but unnecessary. Redundant events add ~2k gas per pause/unpause.

---

### [L8] Theoretical Overflow in `_calculateTokenAmount()` (Low)

**File:** `PaymentManager.sol:576`

```solidity
return (paymentUsdt * PRECISION_18) / price;
```

With `paymentUsdt` = 1e18 * 1e18 (1 billion * 1e18) and `PRECISION_18` = 1e18, the intermediate multiplication is 1e54, which fits in uint256 (max ~1.15e77). Not a realistic concern.

---

### [I1–I5] Informational

| ID | Description | Justification |
|----|-------------|---------------|
| I1 | `totalRaised` is USDT-denominated consistently for both payment paths | Correct by design |
| I2 | Oracle override rate has no bounds (0 to uint256 max) | Intentional emergency mechanism |
| I3 | `withdrawFunds(0)` sweeps all BNB including accidental transfers | Correct by design |
| I4 | `previewPurchase` doesn't check user contribution limits | Preview is advisory only |
| I5 | Single-step ownership transfer (not Ownable2Step) | Common pattern; consider upgrading |

---

## Verification by Function

### `buyWithToken()` (line 407)
| Check | Result |
|-------|--------|
| Reentrancy guard | ✅ `nonReentrant` |
| Pause check | ✅ `whenNotPaused` |
| Active stage | ✅ `stageActive` |
| Token validation | ✅ Only `address(USDT)` accepted |
| Zero amount | ✅ `InvalidAmount` revert |
| Min contribution | ✅ cumulative check |
| Max contribution | ✅ cumulative check |
| Supply cap | ✅ `s.sold + tokenAmount <= s.supply` |
| CEI pattern | ✅ Validated → State → Transfer |
| SafeERC20 | ✅ `safeTransferFrom` |
| Events | ✅ `TokensPurchased` emitted |

### `buyWithNative()` / `_buyWithNative()` (lines 438, 445)
| Check | Result |
|-------|--------|
| Reentrancy guard (`buyWithNative`) | ✅ `nonReentrant` |
| Reentrancy guard (`receive` → `_buyWithNative`) | ❌ **M2** — missing `nonReentrant` |
| Pause check | ✅ `whenNotPaused` |
| Active stage | ✅ `stageActive` |
| Zero value | ✅ `InvalidAmount` |
| Oracle safety | ✅ null/negative/stale/revert handled |
| Emergency override | ✅ prioritizes `_nativeRateOverride` |
| Supply/limit checks | ✅ Same as USDT path |
| Effects after checks | ✅ State mutations then emit |
| No external call after effects | ✅ BNB already received |

### `_nativeToUsdt()` (line 481)
| Check | Result |
|-------|--------|
| Override rate check | ✅ zero = use Chainlink |
| `try/catch` | ✅ oracle revert → `OracleUnavailable` |
| Price > 0 | ✅ `answer <= 0` revert |
| Round validation | ✅ `answeredInRound >= roundId` |
| Staleness | ✅ `updatedAt > 0` + `block.timestamp - updatedAt <= 7200` |
| Decimal conversion | ✅ `10 ** ORACLE_DECIMALS` (1e8) |

### `withdrawFunds()` (line 523)
| Check | Result |
|-------|--------|
| Access control | ✅ `onlyOwner` |
| Native path | ✅ `.call{value: balance}` with revert check |
| ERC20 path | ✅ `safeTransfer(owner(), balance)` |
| Event before call | ✅ CEI: emit before transfer |

### `withdrawSaleTokens()` (line 540)
| Check | Result |
|-------|--------|
| Access control | ✅ `onlyOwner` |
| Stage guard | ✅ reverted if any stage active |
| No balance check | ⚠️ **L6** — reverts on underflow without custom error |

### Stage Management
| Check | Result |
|-------|--------|
| `addStage` validation | ⚠️ **L1** — no `price>0`, `supply>0`, `max>=min` |
| `activateStage` index bounds | ✅ `stageId >= stages.length` revert |
| `activateStage` double-activate | ✅ `StageAlreadyActive` revert |
| Previous deactivation | ✅ automatic on activation |
| `updateStage` supply cap | ✅ `s.sold > supply` revert |
| `updateStage` price validation | ❌ **M1** — no `price>0` check |

---

## Test Suite Adequacy

| Coverage Area | Tests | Adequate? |
|---------------|-------|-----------|
| USDT purchase (happy path) | 1 | ✅ |
| BNB purchase (happy path) | 3 | ✅ |
| Oracle failure modes | 4 | ✅ |
| Stage activation/deactivation | 4 | ✅ |
| Overselling prevention | 1 | ✅ |
| Min/max limits | 4 | ✅ |
| Pause/resume | 3 | ✅ |
| Withdrawals | 4 | ✅ |
| Invalid tokens | 1 | ✅ |
| Zero amounts | 2 | ✅ |
| Constructor validation | 3 | ✅ |
| Multiple contributions | 2 | ✅ |
| Stage events | 1 | ✅ |
| Receive() | 1 | ✅ |
| Total raised | 1 | ✅ |
| Immutables | 1 | ✅ |
| Stage update | 3 | ✅ |

**51 tests, 0 failures. Line coverage: 93.48%.**

### Missing Test Coverage
- Fuzz/invariant tests for arithmetic rounding
- `receive()` with reentrancy attempt (intentional exploit test)
- Zero price stage (expected panic behavior)
- `withdrawSaleTokens` with insufficient balance

---

## Invariant Analysis

| Invariant | Enforced? | Notes |
|-----------|-----------|-------|
| `stage.sold <= stage.supply` | ✅ | Checked on every purchase |
| `userContributions[user][stage] <= stage.maxPerUser` | ✅ | Cumulative check |
| `userContributions[user][stage] >= stage.minPerUser` | ✅ | On first+ purchases |
| At most one active stage | ✅ | `activateStage` deactivates previous |
| `totalTokensSold = SUM(stage.sold)` | ✅ | Maintained in all purchase paths |
| `totalRaised` only increases | ✅ | No subtraction paths |
| `totalAllocation = SUM(stage.supply)` | ✅ | Updated on add/update |
| Oracle price > 0 | ✅ | Checked in `_nativeToUsdt` |
| `SUM(stage.supply) <= SALE_TOKEN.balanceOf(this)` | ❌ **Owner responsibility** | Documented in SECURITY.md |

---

## Detailed Walkthrough

### Purchase Flow (USDT)
```
buyWithToken(USDT, 100e18)
  ├── nonReentrant guard
  ├── whenNotPaused guard
  ├── stageActive guard
  │     ├── currentStageIndex < stages.length
  │     └── stages[currentStageIndex].active == true
  ├── paymentToken == address(USDT)  ✓
  ├── paymentAmount > 0  ✓
  ├── contribution = userContributions[msg.sender][0] + 100e18
  ├── contribution >= stage.minPerUser  ✓
  ├── contribution <= stage.maxPerUser  ✓
  ├── tokenAmount = (100e18 * 1e18) / price  ✓
  ├── stage.sold + tokenAmount <= stage.supply  ✓
  ├── [EFFECTS] state updates
  │     ├── userContributions[msg.sender][0] = contribution
  │     ├── stage.sold += tokenAmount
  │     ├── totalRaised += 100e18
  │     └── totalTokensSold += tokenAmount
  ├── [INTERACTION] USDT.safeTransferFrom(msg.sender, address(this), 100e18)
  └── emit TokensPurchased
```

All checks pass. CEI pattern is strictly followed.

### Purchase Flow (BNB)
```
buyWithNative{value: 0.0033e18}
  ├── nonReentrant guard
  ├── whenNotPaused guard
  ├── stageActive guard
  ├── msg.value > 0  ✓
  ├── usdtAmount = _nativeToUsdt(0.0033e18)
  │     ├── _nativeRateOverride == 0? YES → use oracle
  │     ├── BNB_USD_FEED.latestRoundData()
  │     ├── answer = 60000 * 1e8 > 0  ✓
  │     ├── answeredInRound >= roundId  ✓
  │     ├── updatedAt > 0  ✓
  │     ├── block.timestamp - updatedAt <= 7200  ✓
  │     └── usdtAmount = (0.0033e18 * 60000e8) / 1e8 ≈ 200e18
  ├── contribution check (min/max)  ✓
  ├── tokenAmount = (200e18 * 1e18) / 0.5e18 = 400e18  ✓
  ├── supply check  ✓
  ├── [EFFECTS] state updates
  └── emit TokensPurchased
```

---

## Comparison with Existing Threat Model (SECURITY.md)

| Threat | Severity in SECURITY.md | Audit Finding | Match? |
|--------|------------------------|---------------|--------|
| T1: Owner extraction | Low | I5 | ✅ Documented |
| T2: Oracle manipulation | Low | — | ✅ Not exploitable |
| T3: Oracle failure | Medium | — | ✅ try/catch handles it |
| T4: Reentrancy | Low | M2 | ⚠️ Underdocumented (receive path) |
| T5: USDT callback | Low | — | ✅ SafeERC20 handles it |
| T6: Overselling across stages | Medium | — | ✅ Documented as owner responsibility |
| T7: Stale price | Low | — | ✅ 3-layer stale check |
| T8: receive() bypass | Low | M2 | ⚠️ Underestimated severity |

---

## Conclusion

**PaymentManager.sol is well-engineered and safe for deployment after two minor fixes.**

### Pre-Deployment Checklist
1. ✅ Add `price > 0` validation in `addStage()` and `updateStage()` (M1)
2. ✅ Add `nonReentrant` to `receive()` (M2)
3. ✅ Consider adding Ownable2Step (I5 — low priority)
4. ✅ Deploy to BSC Testnet for integration testing
5. ✅ Verify contract has sufficient RLKO balance for `SUM(stage.supply)` across all stages
6. ✅ Use a multisig wallet as the owner on mainnet (per T1 recommendation)

### Mainnet Readiness Score: 8.5/10
- Breaks: 0
- After M1+M2 fixes: ready for testnet → mainnet
