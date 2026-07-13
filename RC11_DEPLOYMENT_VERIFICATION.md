# RC11 Deployment Verification

## 1. Frontend Address vs Deployment Address

| Source | Address |
|--------|---------|
| `.env` → `PAYMENT_MANAGER` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| `deployments/testnet.json` → `paymentManager` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| `lib/beta.ts` → `BETA_CONTRACT_ADDRESSES.paymentManager` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| `lib/presale/config.ts` → `PRESALE_CONTRACTS[bscTestnet]` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| `scripts/settlement-audit.mjs` → `PAYMENT_MGR` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| Broadcast `DeployAll.s.sol/97/run-latest.json` → `contractAddress` | `0x6b2fa30f5a9aab5ce78558f3c4ea9217ec21d431` (same, case-insensitive) |

**Verdict:** All frontend config files point to the **same** address as the latest broadcast deployment.

---

## 2. Deployment Timestamp

| Source | Value |
|--------|-------|
| Broadcast `timestamp` (milliseconds) | `1783847461749` |
| Unix timestamp (seconds) | `1783847461` |
| Human-readable (UTC) | `2026-07-12 14:41:01 UTC` |
| Block timestamp (`0x6a535a28`) | `1783847464` (2026-07-12 14:41:04 UTC) |
| Block number | `0x712cbcd` (118,748,109) |
| Git commit | `c96eb37` — `Release Candidate v1.0.0` |
| Commit timestamp | `1783707689` (2026-07-11 00:21:29 UTC) |

---

## 3. Deployed Bytecode Hash

The deployed contract was compiled from **commit `c96eb37`** — the original Release Candidate v1.0.0.

**Creation transaction:** `0xda030f2db054897f694c6e34e7157c3bba54f21caa8ec07063dba3e4ca341b49`
**Deployer:** `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc`

There is **no subsequent deployment** recorded. The only deployment broadcast is at commit `c96eb37`.

---

## 4. Does the Deployed PaymentManager Contain the RC11 Fix?

**NO — the deployed contract does NOT contain the fix.**

### Evidence: Comparison of Committed vs Working-Tree Source

#### `buyWithToken()` — committed (deployed)
```solidity
// c96eb37 (deployed) — NO SALE_TOKEN.safeTransfer()
USDT.safeTransferFrom(msg.sender, address(this), paymentAmount);
userContributions[msg.sender][currentStageIndex] = contribution;
unchecked {
    s.sold += tokenAmount;
    totalRaised += paymentAmount;
    totalTokensSold += tokenAmount;
}
emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex);
```

#### `buyWithToken()` — working tree (uncommitted RC11 fix)
```solidity
// Working tree — HAS the fix
// ── Effects ──
userContributions[msg.sender][currentStageIndex] = contribution;
unchecked {
    s.sold += tokenAmount;
    totalRaised += paymentAmount;
    totalTokensSold += tokenAmount;
}
// ── Interactions ──
USDT.safeTransferFrom(msg.sender, address(this), paymentAmount);
SALE_TOKEN.safeTransfer(msg.sender, tokenAmount);       // ★ RC11 FIX
emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex);
```

#### `buyWithNative()` — committed (deployed)
```solidity
// c96eb37 (deployed) — NO SALE_TOKEN.safeTransfer()
function buyWithNative() external payable nonReentrant whenNotPaused stageActive {
    if (msg.value == 0) revert InvalidAmount();
    // ... calculations ...
    userContributions[msg.sender][currentStageIndex] = contribution;
    unchecked { s.sold += tokenAmount; totalRaised += usdtAmount; totalTokensSold += tokenAmount; }
    emit TokensPurchased(msg.sender, address(0), usdtAmount, tokenAmount, currentStageIndex);
    // ★ NO SALE_TOKEN.safeTransfer() anywhere
}
```

#### `receive()` — committed (deployed)
```solidity
// c96eb37 (deployed) — broken: external call loses msg.sender
receive() external payable {
    this.buyWithNative();   // msg.sender becomes the contract itself
}
```

#### `receive()` — working tree (uncommitted RC11 fix)
```solidity
// Working tree — correct internal path
receive() external payable nonReentrant whenNotPaused stageActive {
    _buyWithNative(msg.sender, msg.value);   // preserves msg.sender
}
```

### Summary of Differences

| Check | Committed `c96eb37` (deployed) | Working tree (uncommitted) |
|-------|-------------------------------|---------------------------|
| `SALE_TOKEN.safeTransfer()` in `buyWithToken()` | ❌ Missing | ✅ Line 444 |
| `SALE_TOKEN.safeTransfer()` in `_buyWithNative()` | N/A (no such function) | ✅ Line 480 |
| `_buyWithNative()` internal helper | ❌ Not present | ✅ Present |
| `receive()` preserves `msg.sender` | ❌ Uses `this.buyWithNative()` | ✅ Uses `_buyWithNative(msg.sender, msg.value)` |
| `addStage()` validates `price` / `supply` | ❌ No validation | ✅ Validates |
| `updateStage()` validates `price` / `supply` | ❌ No validation | ✅ Validates |
| `withdrawSaleTokens()` checks balance | ❌ No balance check | ✅ Checks `InsufficientBalance` |
| Checks-Effects-Interactions pattern | ❌ State writes mixed with calls | ✅ Properly separated |

---

## 5. Root Cause

The **frontend address matches the deployment address** — the problem is not a config mismatch. The problem is that **the deployed contract IS the old version** (commit `c96eb37`), and the RC11 fix **exists only in the local working tree as uncommitted changes**.

The `git diff` shows 568 lines changed in `PaymentManager.sol`, 291 lines changed in `test/PaymentManager.t.sol`, and other modifications — none of which have been deployed on-chain.

---

## Config Files Requiring Update After Redeployment

After a new PaymentManager is deployed (which will receive a **different address** since it's a `CREATE` from the same deployer), these files need their `paymentManager` address updated:

| File | Key to Update |
|------|---------------|
| `.env` | `PAYMENT_MANAGER=` (line 70) |
| `deployments/testnet.json` | `"paymentManager"` (line 6) |
| `lib/beta.ts` | `BETA_CONTRACT_ADDRESSES.paymentManager` (line 15) |
| `lib/presale/config.ts` | `PRESALE_CONTRACTS[bscTestnet]` (line 18) |
| `scripts/settlement-audit.mjs` | `PAYMENT_MGR` (line 7) |

**Automatic updater exists:** `tools/update-testnet-env.mjs` reads `deployments/testnet.json` and propagates to `.env`, `lib/beta.ts`, `lib/presale/config.ts`, and `lib/staking/config.ts`. Run after redeployment:

```
npm run postdeploy:testnet
```

---

## Conclusion

| Question | Answer |
|----------|--------|
| Is the frontend pointing to the latest deployment? | **Yes** — same address |
| Does the deployed contract contain `SALE_TOKEN.safeTransfer()`? | **No** — it's the old contract from `c96eb37` |
| Is the RC11 fix deployed? | **No** — only in the local working tree (uncommitted) |
| Why do purchases increase Total Invested but not deliver RLKO? | The deployed `buyWithToken()` and `buyWithNative()` never call `SALE_TOKEN.safeTransfer()` |
| Does a new deployment need a new address? | **Yes** — must update all 5 config files listed above |
