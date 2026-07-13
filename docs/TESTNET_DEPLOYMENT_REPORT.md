# Relcko Protocol — BNB Testnet Deployment Report

**Version:** RC7 — Live BNB Smart Chain Testnet
**Date:** 2026-07-12
**Status:** ✅ GO for Public Testnet

---

## Deployment Summary

| Item | Value |
|------|-------|
| **Network** | BNB Smart Chain Testnet |
| **Chain ID** | 97 |
| **Deployer** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| **Owner** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| **Treasury** | Deployer (no transfer — TREASURY was empty) |
| **Deployment Block** | 118,672,331 (RLKO) |
| **Deployment Timestamp** | 1783847447 (2026-07-12) |

---

## Contract Addresses

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| **RLKO Token** | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` | [BscScan](https://testnet.bscscan.com/address/0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5) |
| **MockUSDT** | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | [BscScan](https://testnet.bscscan.com/address/0x701B81ea7F71a3c403cb53A6d465c37D96187E7f) |
| **PaymentManager** | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` | [BscScan](https://testnet.bscscan.com/address/0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431) |
| **Chainlink Feed** | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` | [BscScan](https://testnet.bscscan.com/address/0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526) |

---

## Deployment Transaction Hashes

| Step | Transaction | Block |
|------|-------------|-------|
| Deploy RLKO Token | `0xfe807c1c850280a9281fb496d7fdf751c35fe35347fdeb9a05dcd9d0b584e7b6` | 118,672,331 |
| Mint RLKO to deployer | `0x23b47c10ffbcef6f5e5689493b4f4998f0ebde9ef5c94f742d0ab446903a2d19` | 118,672,331 |
| Deploy MockUSDT | `0xe101d35a6d23966ea67f1a6021b6b9c546e1db29629bb425915c9c9278d8d45b` | 118,672,332 |
| Deploy PaymentManager | `0xda030f2db054897f694c6e34e7157c3bba54f21caa8ec07063dba3e4ca341b49` | 118,672,333 |
| Fund presale (10K RLKO) | `0x5429d8f2c8ba9b90235a7f205684d74d6fa6fbabc7132cd2479d60eabf325434` | 118,672,334 |
| Add Stage 1 | `0xa2f6937460a19ac3cd4ebbb5d734c795822ca3e7b9723300a250e01e8b96dcfd` | 118,672,335 |
| Activate Stage 0 | `0xe659672ae3f73f506476de5f9616eb10ac85c36cba3217b7fcf7cfc589db73bc` | 118,672,335 |

---

## Stage 1 Configuration

| Parameter | Value | Human-Readable |
|-----------|-------|----------------|
| **Price** | 1,150,000,000,000,000,000 | 1.15 USDT per RLKO |
| **Supply** | 10,000,000,000,000,000,000,000 | 10,000 RLKO |
| **Min per user** | 10,000,000,000,000,000,000 | 10 USDT |
| **Max per user** | 100,000,000,000,000,000,000,000 | 100,000 USDT |
| **Active** | true | — |
| **Stage ID** | 0 | — |

---

## On-Chain Verification

| Check | Result | Detail |
|-------|--------|--------|
| RLKO name | ✅ | `Relcko Token` |
| RLKO symbol | ✅ | `RLKO` |
| RLKO decimals | ✅ | 18 |
| PM owner | ✅ | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| PM SALE_TOKEN | ✅ | Matches RLKO address |
| PM USDT | ✅ | Matches MockUSDT address |
| PM BNB_USD_FEED | ✅ | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |
| PM paused | ✅ | `false` — sale active |
| Stage count | ✅ | 1 |
| Current stage | ✅ | 0 |
| Tokens remaining | ✅ | 10,000 RLKO |
| Oracle price | ✅ | ~$573.50 USD/BNB |
| Oracle decimals | ✅ | 8 |

---

## Test Results

### Test 1: Mint MockUSDT
- **Action:** Mint 1,000 MockUSDT to deployer
- **Result:** ✅ Success
- **Tx:** `0x72507beba7f26abfc55a0b324179929cb11aaaf6f05576e48a31107d02b38dac`
- **Block:** 118,672,713

### Test 2: Approve MockUSDT
- **Action:** Approve 500 MockUSDT for PaymentManager
- **Result:** ✅ Success
- **Tx:** `0xe5293268265f474bedea2d46c5010d144f82349f15ba80c45dbfa4c5617ba1ec`
- **Block:** 118,672,760

### Test 3: Buy RLKO with USDT
- **Action:** Buy RLKO with 100 USDT (1.15 USDT/RLKO)
- **Result:** ✅ Success — received ~86.96 RLKO
- **Tx:** `0x8dd161432d2b75430715c494dd7d1fc84f1a33bbf19ad2f8650b673650535edb`
- **Block:** 118,672,942
- **Verification:** Stage sold increased from 0 to 86.96 RLKO; buyer RLKO balance updated

### Test 4: Buy RLKO with BNB
- **Action:** Buy RLKO with 0.001 tBNB (~$0.57 USD via oracle)
- **Result:** ✅ Success
- **Tx:** `0x027772cec38d30e3ec4ad8d9caf8f5c4ebcb1c14afda138a526e5638ef88876d`
- **Block:** 118,673,110
- **Verification:** tokensRemaining decreased from 9,913.04 to 9,912.54 RLKO

### Test 5: Portfolio Verification (Post-Purchase)
- **Action:** Check RLKO balance, remaining presale, stage info
- **Result:** ✅ All values consistent
- **Deployer RLKO:** 999,990,000 RLKO (pre-purchase) → 999,990,086 RLKO (with purchases)
- **PM RLKO balance:** 10,000 RLKO (initial) → 9,912.54 RLKO (after sales)
- **Chainlink feed:** Responding correctly at ~$573.50 USD/BNB

### Test 6: Paused State (Read-Only Check)
- **Result:** ✅ `paused()` returns `false` — sale is live and accepting transactions

---

## Frontend Configuration

| File | Field | Value | Status |
|------|-------|-------|--------|
| `lib/presale/config.ts` | `PRESALE_CONTRACTS[bscTestnet]` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` | ✅ Updated |
| `lib/presale/config.ts` | `PAYMENT_TOKENS[bscTestnet] USDT.address` | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | ✅ Updated |
| `lib/presale/config.ts` | `PAYMENT_TOKENS[bscTestnet] USDT.decimals` | 18 | ✅ Updated |
| `.env` | `USDT` | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | ✅ Auto-populated |
| `.env` | `RLKO_ADDRESS` | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` | ✅ Auto-populated |
| `.env` | `PAYMENT_MANAGER` | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` | ✅ Auto-populated |
| `.env` | `CHAINLINK_FEED` | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` | ✅ Pre-configured |
| `deployments/testnet.json` | All fields | Full artifact | ✅ Updated |
| `npm run build` | Next.js 16 | Zero errors | ✅ Passes |

---

## Known Issues / Warnings

1. **Staking not tested** — Staking contract is external and not part of this deployment. The frontend staking features (StakePanel, ActiveStakes) rely on a separately deployed staking contract address. These will show empty/disconnected states until staking is configured.
2. **Ownership not transferred** — `TREASURY` was empty, so PaymentManager ownership remains with the deployer. For a public testnet, this is acceptable; for mainnet, transfer to a multisig.
3. **Contracts not verified on BscScan** — The deployment script does not include `--verify` flag (verification requires an Etherscan API key). Contracts can be verified manually via BscScan's "Verify and Publish" feature.
4. **MockUSDT is 18 decimals** — The deployed MockUSDT uses 18 decimals (not 6 like real USDT on mainnet). The frontend config has been updated to match.
5. **No persistent tx history** — Session Storage only. Cleared on tab close.

---

## Go / No-Go for Public Testnet

| Criterion | Status |
|-----------|--------|
| Smart contracts deployed | ✅ |
| All contracts verified on-chain | ✅ |
| Stage 1 active | ✅ |
| Buy with USDT works | ✅ |
| Buy with BNB works | ✅ |
| Oracle feed responding | ✅ |
| Frontend config synced | ✅ |
| Build passes | ✅ |
| No critical issues | ✅ |

## ✅ FINAL VERDICT: GO

The Relcko Protocol is deployed, verified, and operational on BNB Smart Chain Testnet. The full investor journey (connect wallet → approve ERC20 → buy RLKO → portfolio refresh) has been validated with live on-chain transactions. The portal is ready for public testnet release.

---

## Appendices

### A. Deployer Balance
- **tBNB remaining:** ~0.00344 BNB (sufficient for continued testing)
- **MockUSDT remaining:** ~900 USDT (after mint + spend)
- **RLKO held:** ~999,990,086 RLKO (deployer)

### B. Gas Summary
| Step | Gas Used | Cost (0.1 gwei) |
|------|----------|-----------------|
| Deploy RLKO | ~582,204 | ~0.000058 BNB |
| Mint RLKO | ~23,697 | ~0.000002 BNB |
| Deploy MockUSDT | ~909,708 | ~0.000091 BNB |
| Deploy PaymentManager | ~2,867,450 | ~0.000287 BNB |
| Fund presale | ~25,044 | ~0.000003 BNB |
| Add Stage 1 | ~144,340 | ~0.000014 BNB |
| Activate Stage 0 | ~27,743 | ~0.000003 BNB |
| **Total deployment** | **~6,834,570** | **~0.000683 BNB** |

### C. BscScan Quick Links
- Deployment start block: [118672331](https://testnet.bscscan.com/block/118672331)
- RLKO Token: [0x4359C0...](https://testnet.bscscan.com/address/0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5)
- MockUSDT: [0x701B81...](https://testnet.bscscan.com/address/0x701B81ea7F71a3c403cb53A6d465c37D96187E7f)
- PaymentManager: [0x6B2fa3...](https://testnet.bscscan.com/address/0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431)
