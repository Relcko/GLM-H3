# RC11 Deployment Success Report

## Deployment Summary

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Network | BNB Smart Chain Testnet (Chain ID 97) |
| RPC | `https://bsc-testnet-rpc.publicnode.com` |
| Gas price (maxFeePerGas) | 1 gwei |
| Gas price (maxPriorityFeePerGas) | 0.1 gwei |
| Deployer | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| Deployer balance before | 0.103 tBNB |
| Total cost | 0.00042 tBNB |

---

## New Contract Addresses

| Contract | Address | BSCScan Link |
|----------|---------|--------------|
| **PaymentManager** | `0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106` | [View](https://testnet.bscscan.com/address/0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106) |
| **RLKO** | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | [View](https://testnet.bscscan.com/address/0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674) |

---

## Transactions

| # | Type | Contract | Tx Hash | Block | Gas Used | Status |
|---|------|----------|---------|-------|----------|--------|
| 0 | CREATE | RLKO (MockERC20) | `0x91c530bd...` | 118840968 | 695,886 | ✅ SUCCESS |
| 1 | CALL | RLKO mint → deployer | `0xca3158c4...` | 118840968 | 45,365 | ✅ SUCCESS |
| 2 | CREATE | **PaymentManager** | `0xea2eab07...` | 118840969 | 3,186,006 | ✅ SUCCESS |
| 3 | CALL | RLKO transfer → PM | `0x303e8afa...` | 118840969 | 51,500 | ✅ SUCCESS |
| 4 | CALL | PM addStage | `0xc5f5c846...` | 118840969 | 170,252 | ✅ SUCCESS |
| 5 | CALL | PM activateStage | `0xb32d162e...` | 118840969 | 54,935 | ✅ SUCCESS |

**All 6 transactions mined and confirmed.**

---

## On-Chain Verification

| Check | Result |
|-------|--------|
| PaymentManager bytecode exists | ✅ **14,143 bytes** |
| RLKO bytecode exists | ✅ **2,561 bytes** |
| `SALE_TOKEN` stored in PM | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` |
| `SALE_TOKEN` == deployed RLKO | ✅ **YES** |
| `totalRaised` | `0` (fresh deployment) |
| `totalTokensSold` | `0` |
| `tokensRemaining` | `10,000` RLKO |
| PM RLKO balance | **10,000 RLKO** (full stage supply funded) |
| Stage 1 active | ✅ **YES** (1.15 USDT) |

---

## RC11 Fix Verification

The deployed PaymentManager is compiled from the **locally fixed source** (commit `c96eb37` + uncommitted RC11 changes), confirmed by:

1. **Bytecode size increased**: old PM = 14,055 bytes, new PM = **14,143 bytes** (+88 bytes from `SALE_TOKEN.safeTransfer()` calls)
2. **Source diff**: `buyWithToken()` now includes `SALE_TOKEN.safeTransfer(msg.sender, tokenAmount)` at line 444; `_buyWithNative()` includes `SALE_TOKEN.safeTransfer(buyer, tokenAmount)` at line 480
3. **Clean state**: `totalRaised` = `0`, `totalTokensSold` = `0` — no purchases have occurred yet, but the fix is in place

---

## Config Files Updated

| File | Updated | Key Changed |
|------|---------|-------------|
| `.env` | ✅ | `RLKO_ADDRESS` and `PAYMENT_MANAGER` |
| `deployments/testnet.json` | ✅ | All addresses |
| `lib/presale/config.ts` | ✅ | `PRESALE_CONTRACTS[bscTestnet]` |
| `lib/beta.ts` | ✅ | `BETA_CONTRACT_ADDRESSES` |
| `scripts/settlement-audit.mjs` | ✅ | `RLKO` and `PAYMENT_MGR` constants |

**Order of updates:** Configs were updated **only after** on-chain confirmation of all 6 transactions.

---

## Deployment Process Improvements

| Issue | Fix Applied |
|-------|-------------|
| Gas price defaulted to 1 wei | `--with-gas-price 1000000000` (1 gwei) and `--priority-gas-price 100000000` (0.1 gwei) passed explicitly |
| No pre-flight checks | Script now checks RPC, chain ID, balance (≥0.01 tBNB), pending nonces before deployment |
| No confirmation wait | Forge's `--broadcast` now waits for receipts (transactions were already at proper gas price) |
| Configs updated before confirmation | Post-deploy sync runs only after forge exits with status 0 AND bytecode is verified on-chain |
| Stuck nonces blocked deployment | Cancelled by sending 0-value replacement transactions at 2 gwei from nonces 11–16 |
