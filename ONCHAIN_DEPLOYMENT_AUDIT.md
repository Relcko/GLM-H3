# On-Chain Deployment Audit — RC11

**Date:** 2026-07-13  
**Network:** BNB Smart Chain Testnet (Chain ID 97)  
**RPC:** `https://bsc-testnet-rpc.publicnode.com`  

---

## PaymentManager

| # | Check | Result |
|---|-------|--------|
| 1 | Bytecode exists | ✅ **EXISTS** (14,055 bytes) |
| 2 | BSCScan verified | ❌ **NOT VERIFIED** |
| 3 | Constructor arguments | `_saleToken`: `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5`, `_usdt`: `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f`, `_bnbUsdFeed`: `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |
| 4 | Owner | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` (deployer) |
| 5 | — | — |
| 6 | PM RLKO balance | **10,000 RLKO** (`10000000000000000000000`) |
| 7 | Buyer RLKO balance | **999,990,000 RLKO** (`999990000000000000000000000`) |
| 8 | `SALE_TOKEN` stored | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| 9 | `SALE_TOKEN` == deployed RLKO? | ✅ **YES** (matches) |
| 10 | PM funded with RLKO? | ✅ **YES** (10,000 RLKO) |

### PM State Variables

| Variable | Value |
|----------|-------|
| `totalRaised` | `135.07428271503` USDT |
| `totalTokensSold` | `117.455898013069565214` RLKO |
| `currentStage` | `0` |
| `stageCount` | `1` |
| `tokensRemaining` | `9,882.544101986930434786` RLKO |
| `tokenPrice` | `1.15` USDT |
| `totalAllocation` | `10,000` RLKO |

---

## RLKO Token (`0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5`)

| # | Check | Result |
|---|-------|--------|
| 1 | Bytecode exists | ✅ **EXISTS** (2,561 bytes) |
| 2 | BSCScan verified | ❌ **NOT VERIFIED** |
| 3 | Constructor arguments | `"Relcko Token"`, `"RLKO"`, `18` |
| 4 | Owner | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` (deployer — MockERC20 is Ownable) |
| 5 | Total supply | ✅ **1,000,000,000 RLKO** (deployer holds 999,990,000; PM holds 10,000) |

### ERC20 Metadata

| Call | Result |
|------|--------|
| `name()` | `"Relcko Token"` |
| `symbol()` | `"RLKO"` |
| `decimals()` | `18` |
| `totalSupply()` | ✅ `1,000,000,000,000,000,000,000,000,000` (1B RLKO) |
| `balanceOf(PaymentManager)` | `10,000` RLKO |
| `balanceOf(buyer)` | `999,990,000` RLKO |

---

## USDT Token (`0x701B81ea7F71a3c403cb53A6d465c37D96187E7f`)

| # | Check | Result |
|---|-------|--------|
| 1 | Bytecode exists | ✅ **EXISTS** (4,187 bytes) |
| 2 | BSCScan verified | ❌ **NOT VERIFIED** |
| 3 | Constructor arguments | `None` (no-arg constructor) — MockUSDT |
| 4 | Owner | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` (deployer) |
| 5 | Total supply | `1,000` USDT |

### ERC20 Metadata

| Call | Result |
|------|--------|
| `name()` | `"Tether USD Test"` |
| `symbol()` | `"USDT"` |
| `decimals()` | `18` |
| `totalSupply()` | `1,000` USDT |

---

## PaymentManager SALE_TOKEN Integrity

| Check | Result |
|-------|--------|
| `SALE_TOKEN` address on-chain | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| Deployed RLKO address | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| **Match?** | ✅ **YES** |

---

## PaymentManager RLKO Funding

| Check | Result |
|-------|--------|
| PM RLKO balance | `10,000` RLKO (wei: `10000000000000000000000`) |
| Presale supply (stage 1) | `10,000` RLKO |
| `tokensRemaining()` | `9,882.54` RLKO |
| **Adequately funded?** | ✅ **YES** (10,000 RLKO = full stage 1 supply) |

---

## Root Cause of the RLKO Settlement Bug (RC11)

The deployed PaymentManager is from **commit `c96eb37`** (pre-RC11 fix). Purchases work but never deliver RLKO tokens:

```
buyWithToken():
  ✅ USDT.safeTransferFrom(buyer, PM, amount)
  ❌ SALE_TOKEN.safeTransfer(buyer, tokenAmount)    ← MISSING

buyWithNative():
  ✅ State updated (totalRaised, userContributions, etc.)
  ❌ SALE_TOKEN.safeTransfer(buyer, tokenAmount)    ← MISSING
```

**On-chain evidence of the bug:**
- `totalRaised` = 135.07 USDT (purchases have been made)
- `totalTokensSold` = 117.45 RLKO (state says tokens were sold)
- PM RLKO balance = 10,000 RLKO (never decreased — no tokens were ever transferred out)
- Buyer RLKO balance = 999,990,000 RLKO (only the initial mint — no purchase deliveries)

If `SALE_TOKEN.safeTransfer()` had been working, the PM RLKO balance would be `10,000 - 117.45 = 9,882.55` RLKO, matching `tokensRemaining()` — but the actual balance is still the full 10,000.

---

## Summary

| Category | Status |
|----------|--------|
| All 3 contracts deployed | ✅ |
| Constructor args correct | ✅ |
| SALE_TOKEN points to RLKO | ✅ |
| PM funded with 10,000 RLKO | ✅ |
| Stage 1 active at 1.15 USDT | ✅ |
| BSCScan verified | ❌ None verified |
| RC11 fix deployed | ❌ **NOT DEPLOYED** (old contract) |
| RLKO settlement working | ❌ **BROKEN** (no transfers) |
