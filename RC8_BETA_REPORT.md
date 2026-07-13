# Relcko RC8 — Beta Readiness Report

**Date:** July 2026
**Version:** RC8
**Network:** BNB Smart Chain Testnet (Chain ID: 97)
**Status:** Ready for Closed Testnet Beta

---

## Beta Readiness

### ✅ Configuration
- Testnet banner with dismiss capability
- Network status indicator with live block number
- Faucet links (BNB Chain, Chainlink, BSC Testnet)
- Explorer links (BSCScan for all contracts)
- Version badge (RC8) in sidebar and admin dashboard
- Beta notice banner across all pages

### ✅ Analytics
- Anonymous operational event tracking (localStorage)
- Events tracked: wallet connections/disconnections, purchases, stakes, claims, network switches, RPC errors
- No personal information collected
- Maximum 10,000 stored events with auto-rotation
- Unique wallet tracking without PII

### ✅ Admin Monitoring
- Read-only operational dashboard
- Metrics: total investors, purchases, volume, active wallets, failed transactions, stake/claim breakdown
- On-chain data: stage progress, remaining RLKO, total raised
- Average confirmation time estimate
- Refresh and clear controls

### ✅ Bug Reporting
- In-app bug report dialog
- Auto-detected: browser, wallet type, chain ID, wallet address
- Optional: description, transaction hash, console log capture
- Markdown report generation with copy or submit to GitHub
- Pre-filled GitHub issue template

### ✅ Documentation
- BETA_TESTING_GUIDE.md with step-by-step instructions
- Contract addresses and explorer links

---

## Known Issues

| Issue | Severity | Status |
|---|---|---|
| **Withdrawal UI missing** — Emergency withdraw from staking is not implemented in the frontend | Low | Not implemented |
| **Staking contract on testnet** — Staking operations use mainnet contract address; testnet staking may not work | High | Requires testnet staking deployment |
| **Analytics reset** — Clearing localStorage removes all analytics history | Low | By design (no server-side storage) |
| **SessionStorage tx history** — Transaction history lost on tab close | Low | By design (privacy-first) |
| **BSC Testnet RPC instability** — Testnet RPC may experience downtime or rate limiting | Medium | External dependency |
| **Stage display** — Admin shows "Stage N / 3" hardcoded; actual stages may differ | Low | Cosmetic — update when stage data is available |
| **Mobile UX** — Dashboard layout not fully tested on mobile viewports | Medium | Known limitation |

---

## Operational Metrics (as of report)

| Metric | Value |
|---|---|
| Total Investors (unique wallets) | — (no users yet) |
| Total Purchases | — |
| Total Volume | — |
| Total Stakes | — |
| Failed Transactions | — |
| Network Switches | — |
| RPC Errors | — |

*Metrics will populate once beta testing begins. All data is anonymous and stored locally.*

---

## Remaining Risks

### Smart Contract Risk: Low
- Contracts are Ownable2Step + ReentrancyGuard + Pausable
- Chainlink oracle with 2-hour staleness threshold
- Emergency oracle override (`setNativeToUsdtRate`)
- Pausable by owner
- Known supply constraint: presale supply is 10,000 RLKO (of 1B total)

### Infrastructure Risk: Medium
- RPC reliability depends on BSC Testnet public endpoints
- No fallback RPC configuration
- localStorage-based analytics may be cleared by browser settings
- No server-side aggregation of analytics

### User Experience Risk: Low
- Wallet connection flow relies on RainbowKit which supports MetaMask, WalletConnect, Coinbase
- Network switching is prompted when wrong chain detected
- Transaction status feedback is provided via animated stages
- Error messages are user-friendly where possible

### Security Risk: Low
- No personal information collected
- No private keys stored
- All transactions go through user's wallet
- No server-side components (fully client-side)

---

## Recommendation for Public Testnet

**Status: BLOCKED — Not ready for public testnet.**

The core functionality (purchase, staking, claiming) is operational. However, the following must be resolved before public testnet:

### Required
1. **Deploy staking contract to BSC Testnet** — Current staking operations point to mainnet addresses
2. **Add emergency withdrawal UI** — Users have no way to withdraw staked tokens early
3. **Verify MockUSDT faucet** — Ensure users can obtain testnet USDT for purchases

### Nice to Have
4. **Multiple RPC endpoints** — Add fallback RPC for BSC Testnet to improve reliability
5. **Mobile responsive pass** — Test and fix layout issues on mobile
6. **Analytics export** — Allow testers to export their analytics for debugging

### Recommendation
Proceed with **closed beta** (invite-only) to validate the core flow before opening to public. Target **1-2 weeks** of closed beta with 5-10 testers to identify remaining issues.

---

## Appendix

### Deployed Contracts (Testnet)

| Contract | Address |
|---|---|
| RLKO Token | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` |
| PaymentManager | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| Chainlink Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |

### Presale Parameters
- Start: June 14, 2026
- Duration: 95 days (95 stages)
- Stage 1 Price: 1.15 USDT
- Stage 1 Supply: 10,000 RLKO
- Min Investment: 10 USDT
- Max Investment: 100,000 USDT
