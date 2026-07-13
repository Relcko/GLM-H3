# Relcko RC8 — Beta Testing Guide

**Network:** BNB Smart Chain Testnet (Chain ID: 97)
**Version:** RC8
**Status:** Closed Testnet Beta

---

## How to Connect

1. Open [https://relcko.io/presale](https://relcko.io/presale)
2. Click **Connect Wallet** in the top-right corner or the Buy panel
3. Supported wallets: MetaMask, WalletConnect, Coinbase Wallet
4. Approve the connection request in your wallet
5. Ensure your wallet is set to **BNB Smart Chain Testnet** (Chain ID: 97)

If you're on the wrong network, the app will prompt you to switch automatically.

---

## How to Obtain tBNB

tBNB is the testnet native currency required for gas fees. You can obtain it from any of these faucets:

| Faucet | URL |
|---|---|
| BNB Chain Faucet | https://testnet.bnbchain.org/faucet-smart |
| Chainlink Faucet | https://faucets.chain.link/ |
| BSC Testnet Faucet | https://testnet.binance.org/faucet-smart |

1. Visit one of the faucets above
2. Enter your wallet address
3. Complete any CAPTCHA required
4. tBNB will be sent to your wallet within a few minutes
5. You need tBNB for gas fees on all transactions

---

## How to Mint MockUSDT

MockUSDT is a testnet token used to purchase RLKO tokens.

1. Open [MockUSDT on BSCScan](https://testnet.bscscan.com/address/0x701B81ea7F71a3c403cb53A6d465c37D96187E7f#writeContract)
2. Connect your wallet to BSCScan (top-right "Connect to Web3")
3. Navigate to the **Contract > Write Contract** tab
4. Find the `faucet` or `mint` function (if available)
5. Enter your wallet address and an amount in USDT (e.g., 1000 = 1000 USDT with 18 decimals)
6. Click **Write** and confirm the transaction in your wallet
7. Your MockUSDT balance will update in the dashboard

Alternatively, the project may provide a mint function directly in the dashboard.

---

## How to Buy RLKO

1. Connect your wallet and switch to BSC Testnet
2. Navigate to the **Buy RLKO** section or click **Buy RLKO** in the sidebar
3. Select your payment token:
   - **USDT** — Pay with MockUSDT
   - **BNB** — Pay with tBNB
4. Enter the amount you want to spend
5. If paying with USDT and you haven't approved the contract, click **Approve USDT** (one-time per session)
6. Click **Buy RLKO**
7. Confirm the transaction in your wallet
8. Wait for confirmation — your RLKO tokens will appear in the Portfolio

### Purchase Limits

- **Minimum:** 10 USDT equivalent
- **Maximum:** 100,000 USDT equivalent
- **Presale supply:** 10,000 RLKO (Stage 1)
- **Price:** Starting at 1.15 USDT per RLKO (bonding curve — price increases each stage)

---

## How to Stake

1. Purchase RLKO tokens (see above)
2. Navigate to the **Staking Center**
3. Enter the amount of RLKO to stake (minimum 50 RLKO)
4. Select a lock period:

| Plan | Duration | Return |
|---|---|---|
| 30 Days | 30 days | 5.04% |
| 3 Months | 90 days | 5.50% |
| 6 Months | 180 days | 6.88% |
| 1 Year | 365 days | 9.17% |
| 2 Years | 730 days | 13.75% |
| 3 Years | 1095 days | 18.34% |
| 4 Years | 1460 days | 36.68% |

5. Click **Approve RLKO** (first time only), then **Stake RLKO**
6. Confirm the transaction in your wallet

---

## How to Claim

1. Navigate to **Portfolio > Active Stakes**
2. Stakes that have matured will show a **Claim Rewards** button
3. Click **Claim Rewards**
4. Confirm the transaction in your wallet
5. Your principal + rewards will be returned to your wallet

---

## Known Limitations

1. **Testnet only.** All tokens have no real value. Mainnet launch TBD.
2. **Withdrawals.** Emergency withdrawal from staking is not available in the UI.
3. **RPC reliability.** BSC Testnet RPC may experience intermittent downtime.
4. **Browser refresh.** Transaction history is stored in sessionStorage and will be lost on tab close.
5. **Analytics reset.** Analytics metrics are stored in localStorage and may reset if cleared.
6. **Mobile.** The dashboard is optimized for desktop. Mobile experience may have layout issues.
7. **One approval per session.** USDT and RLKO approvals persist only for the current session.
8. **Stage progression.** Stage advancement depends on time rather than sold-out conditions.

---

## How to Report Bugs

1. Click **Report Bug** in the sidebar
2. Fill in the dialog:
   - **What happened?** — Describe the issue in detail
   - **Transaction hash** (optional) — Include if a transaction was involved
   - **Include console log** (optional) — Helps with debugging
3. Click **Submit** to open a pre-filled GitHub issue
4. Alternatively, email the generated markdown report to the development team

The report automatically includes:
- Browser type
- Wallet type
- Network (Chain ID)
- Wallet address (truncated)
- Contract addresses
- Timestamp

---

## Contract Addresses (Testnet)

| Contract | Address |
|---|---|
| RLKO Token | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` |
| PaymentManager | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| Chainlink Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |

**Explorer:** https://testnet.bscscan.com

---

## Resources

- **GitHub:** https://github.com/anomalyco/relcko
- **Report Bug:** https://github.com/anomalyco/relcko/issues/new
- **Documentation:** See `/docs` in the repository
