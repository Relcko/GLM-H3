# Welcome to the Relcko Closed Beta

Thank you for participating in the Relcko protocol testnet beta. Your feedback is critical to ensuring a secure and smooth mainnet launch.

---

## What You'll Be Testing

- **Token Purchase**: Buy RLKO tokens using tBNB or MockUSDT
- **Staking**: Lock RLKO tokens to earn fixed returns (7 lock periods)
- **Claiming**: Collect rewards when stakes mature
- **Emergency Withdraw**: Early exit from stakes (with penalty)
- **Portfolio**: View balances, staked positions, and rewards
- **Reporting**: Submit bug reports via the in-app dialog

## What's NOT Testable

- Mainnet transactions (testnet only)
- Real RLKO token value (testnet tokens have no value)
- Withdrawal to real bank accounts
- Staking contract source (external, consumed via ABI only)

---

## Supported Wallets

| Wallet | Instructions |
|---|---|
| **MetaMask** | Add BSC Testnet manually or let the app prompt you. [Install MetaMask](https://metamask.io/) |
| **WalletConnect** | Scan QR code with mobile wallet (Trust Wallet, etc.) |
| **Coinbase Wallet** | Install [Coinbase Wallet](https://www.coinbase.com/wallet) browser extension |

---

## Network Details

| Parameter | Value |
|---|---|
| **Network Name** | BNB Smart Chain Testnet |
| **Chain ID** | 97 |
| **Currency Symbol** | tBNB |
| **RPC URL** | `https://bsc-testnet-rpc.publicnode.com` |
| **Explorer** | https://testnet.bscscan.com |

### Add to MetaMask (Manual)

1. Open MetaMask → Settings → Networks → Add Network
2. Fill in:
   - **Network Name:** BNB Smart Chain Testnet
   - **RPC URL:** `https://bsc-testnet-rpc.publicnode.com`
   - **Chain ID:** `97`
   - **Currency Symbol:** `tBNB`
   - **Explorer:** `https://testnet.bscscan.com`

---

## Getting Tokens

### tBNB (Gas)

You need tBNB to pay transaction fees. Get it from any faucet:

| Faucet | URL |
|---|---|
| BNB Chain Faucet | https://testnet.bnbchain.org/faucet-smart |
| Chainlink Faucet | https://faucets.chain.link/ |
| BSC Testnet Faucet | https://testnet.binance.org/faucet-smart |

1. Enter your wallet address
2. Complete CAPTCHA
3. tBNB arrives in 1-2 minutes

### MockUSDT (Payment)

You need MockUSDT to purchase RLKO tokens.

1. Open [MockUSDT on BSCScan](https://testnet.bscscan.com/address/0x701B81ea7F71a3c403cb53A6d465c37D96187E7f#writeContract)
2. Connect your wallet to BSCScan (top-right corner)
3. Go to **Contract → Write Contract**
4. Find the `mint` function
5. Enter your wallet address and amount (e.g., `10000000000000000000000` = 10,000 USDT)
6. Click **Write** and confirm in your wallet

### RLKO (Purchase)

Buy RLKO through the dashboard after you have tBNB and MockUSDT.

---

## Dashboard URL

**https://relcko.io/presale**

---

## How to Report Bugs

### Recommended: In-App Dialog

1. Click **Report Bug** in the left sidebar
2. Fill in:
   - **What happened?** — Describe the issue
   - **Transaction hash** (optional) — Include if a transaction failed
   - **Include console log** (optional) — Check for debugging
3. Click **Submit** to open a pre-filled GitHub issue

The dialog automatically includes your browser, wallet type, network, and wallet address.

### Alternative: GitHub Issues

Open an issue directly at:
https://github.com/anomalyco/relcko/issues/new

Please include:
- Browser and version
- Wallet type
- Steps to reproduce
- Expected vs actual behavior
- Any error messages or transaction hashes

---

## Testing Duration

**Expected:** 1-2 weeks

The beta will remain open until the team has validated:
- All staking operations (stake, claim, emergency withdraw)
- Purchase flow (USDT and BNB)
- Wallet connectivity (MetaMask, WalletConnect, Coinbase)
- Bug reporting pipeline
- Analytics accuracy

You will be notified when the beta concludes.

---

## What Happens After Beta

1. All feedback is reviewed and prioritized
2. Critical bugs are fixed
3. Mainnet preparation begins
4. Testers may receive early mainnet access

---

## Contact

| Channel | Details |
|---|---|
| **GitHub Issues** | https://github.com/anomalyco/relcko/issues |
| **Telegram** | https://t.me/relckoofficial/ |
| **Email** | TBD |

---

## Thank You

Your participation helps make Relcko a secure and reliable protocol. Every bug report, piece of feedback, and test transaction improves the platform for everyone.
