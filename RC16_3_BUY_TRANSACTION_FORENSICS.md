# RC16.3 — Presale Buy Transaction Forensics

**Investigator:** opencode  
**Date:** 2026-07-13  
**Context:** User reports BNB (native) purchases on BSC Testnet presale fail with MetaMask "review alert" + abnormally high gas estimate. USDT purchases work fine.

---

## 1. Trace: Frontend → Contract

### 1.1 User Input → Raw Amount
```
Input: "0.02" (BNB, decimals=18)
toRawAmount("0.02", 18):
  parts = ["0", "02"]
  whole = "0"
  frac  = "02".padEnd(18, "0").slice(0,18) = "020000000000000000"
  BigInt("0020000000000000000") = 20000000000000000n
  × 10n ** BigInt(max(0, 18-18)) = × 10n ** 0n = × 1n
  = 20000000000000000n   ✅  (0.02 BNB)
```

### 1.2 ABI Dispatch
In `PresalePurchasePanel.tsx:286`:
```ts
writeContract({
  address: 0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106,
  abi: PRESALE_ABI,
  functionName: "buyWithNative",
  value: 20000000000000000n,   // msg.value
});
```

ABI from `abi.ts:93-99`:
```json
{
  "type": "function",
  "name": "buyWithNative",
  "stateMutability": "payable",
  "inputs": [],
  "outputs": []
}
```
✅ ABI matches: payable, no inputs, msg.value carries the BNB amount.

---

## 2. On-chain Contract State (BSC Testnet)

| Property | Value | Verdict |
|---|---|---|
| `paused()` | `false` | ✅ Not paused |
| `currentStageIndex()` | `0` | ✅ Stage 0 |
| `nativeRateOverride()` | `0` | ✅ Using Chainlink |
| Stage[0].price | `1.15e18` (1.15 USDT/RLKO) | |
| Stage[0].supply | `1e22` (10,000 RLKO) | |
| Stage[0].sold | `~2.007e20` (~200.7 RLKO) | |
| Stage[0].minPerUser | `1e19` (10 USDT) | |
| Stage[0].maxPerUser | `1e23` (100,000 USDT) | |
| Stage[0].active | `true` | ✅ Active |
| RLKO balance (PM) | `~9.799e21` (~9,799 RLKO) | ✅ Sufficient |

### 2.1 Contribution Check (fresh user)
```
userContributions[0x7099...][0] = 0

New contribution = 0 + 11.27 USDT = 11.27 USDT
minPerUser (10) <= 11.27 ✅
maxPerUser (100k) >= 11.27 ✅
```

### 2.2 Supply Check
```
sold = ~200.7 RLKO
tokenAmount = 9.80 RLKO (for 0.02 BNB at 1.15 USDT/RLKO)
sold + tokenAmount = 210.5 RLKO
supply = 10,000 RLKO
210.5 <= 10,000 ✅
```

### 2.3 RLKO Balance Check
```
Contract holds: ~9,799 RLKO
Need: 9.80 RLKO
9,799 >= 9.80 ✅
```

---

## 3. Chainlink Oracle Status

**Feed:** `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`  
**Price:** `56367031599` (563.67 USDT/BNB, 8 decimals)  
**Last updated:** `1783964244` (recent)  
**Round complete:** ✅ (answeredInRound == roundId)  
**Staleness:** ✅ (block.timestamp - updatedAt < 7200)

Both `publicnode.com` and `data-seed-prebsc-1.s.binance.org:8545` RPCs return identical oracle data.

---

## 4. Simulation Results

### 4.1 `previewPurchase(20000000000000000, true)`
```
usdtAmount:     11273406319800000000  →  11.27 USDT  ✅
tokenAmount:    9802962017217391304   →   9.80 RLKO  ✅
stage:          0                    ✅
remainingSupply: 9799262460897153318038 → ~9,799 RLKO ✅
```

### 4.2 `buyWithNative()` — full simulation
```
cast estimate →  152,762 gas  ✅  (normal)
No revert detected.
```

### 4.3 Rapid-fire test (10 calls × 2 functions)
```
previewPurchase:  10/10 OK
oracle:           10/10 OK
```
No rate-limiting observed at time of testing.

---

## 5. Revert Path Analysis

Every `revert` path in `buyWithNative()` → `_buyWithNative()` was tested:

| Revert | Trigger | Status |
|---|---|---|
| `EnforcedPause()` | `paused() == true` | ❌ `paused()` = false |
| `NoStagesConfigured()` | `currentStageIndex >= stages.length` | ❌ stage 0 exists |
| `StageInactive()` | `!stages[0].active` | ❌ active = true |
| `InvalidAmount()` | `nativeAmount == 0` | ❌ 0.02 BNB sent |
| `OracleUnavailable()` | oracle call reverts | ❌ oracle healthy |
| `InvalidOraclePrice()` | price ≤ 0 | ❌ price = 563.67 |
| `StaleOracleData()` | staleness check fails | ❌ data fresh |
| `BelowUserMinimum()` | contribution < minPerUser | ❌ 11.27 ≥ 10 |
| `ExceedsUserLimit()` | contribution > maxPerUser | ❌ 11.27 ≤ 100k |
| `ExceedsStageSupply()` | sold + token > supply | ❌ 210.5 < 10k |
| `safeTransfer` fails | contract lacks RLKO | ❌ 9,799 RLKO available |

**None of the revert conditions are met.** The contract should accept the transaction.

---

## 6. Root Cause Analysis

Two pieces of contradictory evidence:

1. **wagmi reads work** → `previewPurchase` returns valid data (oracle accessible via wagmi's default RPC `http()`)
2. **MetaMask shows review alert** → MetaMask's tx simulation reverts (oracle NOT accessible via MetaMask's own RPC)

### Hypothesis: RPC Mismatch

wagmi is configured in `lib/blockchain/client.ts:39`:
```ts
[bscTestnet.id]: http(),   // Uses default publicnode.com RPC
```

This RPC connects to publicnode.com where the Chainlink feed is live.

However, MetaMask uses **its own configured RPC** for the BSC Testnet chain. If the user manually added BSC Testnet to MetaMask with a **different RPC** (e.g., a personal node or alternative provider that cannot reach the Chainlink feed), then:

- **wagmi reads** (previewPurchase) → publicnode.com → oracle works ✅
- **MetaMask writes** (buyWithNative simulation) → custom RPC → oracle fails → MetaMask shows "review alert" + high gas estimate

This would explain why USDT purchases work (no oracle dependency) but BNB purchases don't.

### Alternative Hypotheses

| Hypothesis | Evidence against |
|---|---|
| Rate-limiting | 10/10 rapid calls succeeded at test time |
| Contract paused | `paused()` returned false |
| No active stage | Stage 0 active with all params valid |
| Insufficient RLKO | Contract holds 9,799 RLKO |
| Below minimum | 11.27 USDT > 10 USDT min |
| Code/ABI error | All function signatures verified, `toRawAmount` correct |

---

## 7. Recommended Actions

1. **Verify MetaMask RPC configuration** — Ask the user to check their MetaMask wallet's BSC Testnet RPC URL. If it differs from `https://bsc-testnet-rpc.publicnode.com` or `https://data-seed-prebsc-1-s1.binance.org:8545`, switch to one of these.

2. **Set native rate override** — As a fallback, the contract owner can call `setNativeToUsdtRate(600_000000000000000000)` to set a fixed 600 USDT/BNB rate, bypassing the Chainlink oracle entirely. This eliminates the oracle dependency.

3. **Verify tBNB balance** — Ensure the user has ≥ 0.022 BNB (0.02 for purchase + ~0.002 for gas).

4. **Test with different wallet** — Import the same account into Rabby Wallet or directly use `cast send` to isolate the issue to MetaMask-specific behavior.

5. **Deploy with explicit RPC** — Set `NEXT_PUBLIC_BSC_TESTNET_RPC` env var to force wagmi to use a specific RPC that matches what MetaMask uses, eliminating any discrepancy.
