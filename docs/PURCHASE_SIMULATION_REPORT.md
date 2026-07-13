# Purchase Simulation Failure — Investigation Report

## Symptom

Wallet (MetaMask) opens the transaction confirmation screen, but shows **"Review alert"** before the user can confirm. The frontend has no JavaScript errors. `writeContract` from wagmi is called, but `eth_estimateGas` fails, preventing MetaMask from showing a gas estimate.

---

## Methodology

- Read `contracts/PaymentManager.sol` (601 lines) — the deployed contract
- Read `deployments/testnet.json` — Stage 1 configuration on BSC Testnet
- Read `contracts/mocks/MockAggregator.sol` — Chainlink mock behavior
- Read `docs/AUDIT_FULL_REPORT.md` — pre-existing security audit
- Traced the full call chain for `buyWithNative()` and `buyWithToken()`

---

## Call Chain: `buyWithNative()` (BNB Purchase)

```
buyWithNative()  (msg.value = user's BNB)
  ├─ nonReentrant              → reverts only on reentrant call
  ├─ whenNotPaused             → reverts EnforcedPause if contract paused
  ├─ stageActive               → reverts NoStagesConfigured / StageInactive
  └─ _buyWithNative(buyer, msg.value)
       ├─ nativeAmount == 0    → reverts InvalidAmount
       ├─ _nativeToUsdt(amount)  ★ PRIMARY REVERT CANDIDATE
       │    ├─ _nativeRateOverride > 0? → use override (skip oracle)
       │    └─ Chainlink oracle path:
       │         ├─ BNB_USD_FEED.latestRoundData() call reverts → OracleUnavailable
       │         ├─ answer <= 0                                → InvalidOraclePrice
       │         ├─ answeredInRound < roundId                  → StaleOracleData
       │         ├─ updatedAt == 0                             → StaleOracleData
       │         └─ block.timestamp - updatedAt > 7200         → StaleOracleData
       ├─ contribution = existing + usdtAmount
       │    ├─ contribution < stage.minPerUser → BelowUserMinimum
       │    └─ contribution > stage.maxPerUser → ExceedsUserLimit
       ├─ tokenAmount = (usdtAmount * 1e18) / stage.price
       └─ s.sold + tokenAmount > s.supply → ExceedsStageSupply
```

**The `eth_estimateGas` failure path:** MetaMask's node calls `eth_estimateGas`, which executes the transaction in a simulated EVM context. If ANY revert occurs during this simulation, `eth_estimateGas` returns an error, and MetaMask shows "Review alert" instead of a confirmation with gas estimate.

---

## Revert Condition Analysis

### 1. Chainlink Oracle (most likely)

**File:** `PaymentManager.sol:493–514`

```solidity
function _nativeToUsdt(uint256 nativeAmount) internal view returns (uint256 usdtAmount) {
    if (_nativeRateOverride > 0) {
        return (nativeAmount * _nativeRateOverride) / PRECISION_18;
    }
    try BNB_USD_FEED.latestRoundData() returns (
        uint80 roundId, int256 answer, uint256, uint256 updatedAt, uint80 answeredInRound
    ) {
        if (answer <= 0) revert InvalidOraclePrice();          // [R1]
        if (answeredInRound < roundId) revert StaleOracleData(); // [R2]
        if (updatedAt == 0) revert StaleOracleData();           // [R3]
        if (block.timestamp - updatedAt > 7200) revert StaleOracleData(); // [R4]
        return (nativeAmount * uint256(answer)) / (10 ** 8);
    } catch {
        revert OracleUnavailable();                             // [R5]
    }
}
```

| Revert | Condition | Likelihood on Testnet |
|--------|-----------|----------------------|
| **R5: `OracleUnavailable`** | Chainlink feed contract at `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` does not exist or `latestRoundData()` reverts | **HIGH** — BSC Testnet Chainlink feeds are frequently not deployed, deprecated, or non-functional |
| **R4: `StaleOracleData`** | `block.timestamp - updatedAt > 7200` (2 hours since last update) | **MEDIUM** — testnet feeds update irregularly or have stopped entirely |
| **R2/R3: `StaleOracleData`** | `answeredInRound < roundId` or `updatedAt == 0` — round never completed | **LOW** — indicates corrupted round data |
| **R1: `InvalidOraclePrice`** | `answer <= 0` — feed returns zero or negative | **LOW** — extremely rare unless feed is broken |

**Verdict:** This is the **most probable root cause**. On BSC Testnet, Chainlink price feeds for BNB/USD are notoriously unreliable. The feed at the deployed address may have been deprecated, paused, or simply never updated. The `try/catch` correctly catches the failure but the resulting `OracleUnavailable` revert causes `eth_estimateGas` to fail.

---

### 2. Below Minimum Purchase

**File:** `PaymentManager.sol:464–465`

```solidity
uint256 contribution = userContributions[buyer][currentStageIndex] + usdtAmount;
if (contribution < s.minPerUser) revert BelowUserMinimum();
```

**Config (testnet.json):** `stageMin: 10000000000000000000` = **10 USDT** (18 decimals)

For BNB purchases, `usdtAmount` = `nativeAmount * bnbPrice / 1e8`. At a BNB price of ~$600:
- User sends 0.01 BNB → `usdtAmount ≈ $6` → **below 10 USDT min** → `BelowUserMinimum`
- User sends 0.02 BNB → `usdtAmount ≈ $12` → **above 10 USDT min** → passes

If the user types a small amount (or the `Max` button computes a value below $10 equivalent), the simulation reverts at this check.

**Verdict:** **Possible** — especially during testing with small amounts (0.001–0.01 BNB). This is a **configuration** issue (min too high for testnet testing), not a code bug.

---

### 3. No Active Stage

**File:** `PaymentManager.sol:240–244`

```solidity
modifier stageActive() {
    if (currentStageIndex >= stages.length) revert NoStagesConfigured();
    if (!stages[currentStageIndex].active) revert StageInactive();
    _;
}
```

If `activateStage()` was never called after deployment, or the active stage was deactivated, all purchase transactions revert here. This would also cause `usePreviewPurchase` to return zeros, and the frontend would show 0 for token price / remaining supply — which the user would notice in the Purchase Summary UI.

**Verdict:** **Unlikely** — the user reported seeing price and supply data in the UI (`previewPurchase` works), which means a stage is active. But worth verifying on-chain.

---

### 4. Supply Exhausted

**File:** `PaymentManager.sol:469`

```solidity
if (s.sold + tokenAmount > s.supply) revert ExceedsStageSupply();
```

**Config:** `stageSupply: 10000 * 10^18` = 10,000 RLKO

If all 10,000 RLKO for Stage 1 have been sold, any further purchase reverts. The frontend's `previewPurchase` would return `remainingSupply: 0`, and the UI would show "Supply exhausted" — again, something the user would likely notice.

**Verdict:** **Unlikely** — the frontend shows a "Supply exhausted" alert when `previewPurchase[3] === 0n`. If the user didn't see this alert, supply is not exhausted.

---

### 5. Contract Paused

**File:** OpenZeppelin `Pausable.sol`

```solidity
modifier whenNotPaused() {
    require(!paused(), "EnforcedPause()");
    _;
}
```

If the owner called `pause()`, all purchase transactions revert. No frontend UI currently checks or displays the pause state.

**Verdict:** **Possible** — the frontend has no pause detection. The owner may have paused the contract (e.g., during maintenance). This is a **configuration** cause, not a code issue.

---

### 6. Exceeds User Limit

**File:** `PaymentManager.sol:466`

```solidity
if (contribution > s.maxPerUser) revert ExceedsUserLimit();
```

**Config:** `stageMax: 100000 * 10^18` = 100,000 USDT

A user would need to attempt purchasing >100,000 USDT worth of tokens. Realistically, this is not the cause for a normal user.

**Verdict:** **Very unlikely** for a standard test transaction.

---

## PaymentManager RLKO Balance

The contract does **not** check `SALE_TOKEN.balanceOf(address(this))` during purchase. RLKO balance is only verified in `withdrawSaleTokens()`. Therefore, insufficient RLKO balance in the PaymentManager does **not** cause `eth_estimateGas` to fail.

However, if the contract has zero RLKO, users can still "buy" tokens (state is updated) but will never be able to claim them. This is a separate operational risk.

---

## Conclusion

### Exact Revert Condition

The `eth_estimateGas` failure and resulting "Review alert" in MetaMask is most likely caused by **one of these reverts** in `_buyWithNative()`, in order of probability:

| Rank | Revert | Error | Location | Type |
|------|--------|-------|----------|------|
| **1** | `OracleUnavailable()` | Chainlink feed call fails on testnet | `PaymentManager.sol:512` | **Code** (try/catch handles it, but oracle is broken) |
| **2** | `StaleOracleData()` | Oracle data > 2 hours old | `PaymentManager.sol:504-508` | **Configuration** (testnet feed not maintained) |
| **3** | `BelowUserMinimum()` | BNB value < 10 USDT after conversion | `PaymentManager.sol:465` | **Configuration** (min too high for test amounts) |
| **4** | `EnforcedPause()` | Contract paused by owner | OpenZeppelin Pausable | **Configuration** |
| **5** | `StageInactive()` / `NoStagesConfigured()` | No active stage | `PaymentManager.sol:241-242` | **Configuration** |

### Expected Revert Reason (from MetaMask)

MetaMask does not surface the raw revert reason in the "Review alert" UI. To discover the exact error, open the browser console and look for the wagmi error object. The error's `cause` or `shortMessage` will contain the Solidity revert reason (e.g., `"OracleUnavailable()"`, `"BelowUserMinimum()"`).

Alternatively, simulate the transaction on BscScan:
```
https://testnet.bscscan.com/address/0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431#writeContract
```
Call `buyWithNative` with a small `value` (e.g., 0.02 BNB = 20000000000000000 wei) and observe the revert reason.

### Root Cause

**Configuration issue on BSC Testnet:** The Chainlink BNB/USD feed at `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` is unlikely to be providing live data on testnet. Testnet Chainlink feeds are frequently deprecated, paused, or never seeded. When `_nativeToUsdt()` calls `latestRoundData()`, the call either reverts (caught by `try/catch`, producing `OracleUnavailable`) or returns stale data (`StaleOracleData`).

### Minimal Corrective Action

**Option A — Set the emergency override rate (immediate fix, no redeploy):**

The contract owner calls `setNativeToUsdtRate(rate)` on the PaymentManager, where `rate` is the current BNB/USD price in 18 decimals. Example for $600 BNB:

```
setNativeToUsdtRate(600000000000000000000)  // 600 * 10^18
```

This bypasses the Chainlink oracle entirely. This is the **intended emergency mechanism** and requires no code changes.

**Option B — Verify the oracle address (one-time check):**

Confirm that `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` is the correct, active BNB/USD feed on BSC Testnet (chainId 97). The Chainlink documentation lists the canonical testnet feed at a different address (`0x2514895c...` may be correct but should be verified against [docs.chain.link](https://docs.chain.link/data-feeds/price-feeds/addresses)).

**Option C — Deploy a MockAggregator (testnet only):**

Deploy `contracts/mocks/MockAggregator.sol` with a realistic BNB price, then call `setNativeToUsdtRate()` or update the `_nativeRateOverride` path. This provides deterministic oracle behavior for testing.

### For `buyWithToken()` (USDT path)

The USDT path does NOT use the oracle. The revert conditions are:
- `UnsupportedToken` (wrong token address)
- `InvalidAmount` (zero amount)
- `BelowUserMinimum` (< 10 USDT)
- `ExceedsUserLimit` (> 100,000 USDT cumulative)
- `ExceedsStageSupply` (supply exhausted)

If the USDT path works but BNB fails, the oracle is confirmed as the root cause.
