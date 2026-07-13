# Relcko Investor Portal — Operations Runbook

**Version:** RC6 (Public Testnet)
**Updated:** 2026-07-12

---

## 1. Deployment

### 1.1 Prerequisites
- Node.js 18+, Foundry (forge, cast)
- Deployer wallet funded with tBNB on BSC Testnet
- `.env` file with `BSC_TESTNET_RPC` and `DEPLOYER_PK`
- All contract addresses in `.env` or `lib/presale/config.ts`

### 1.2 Deploy Contracts
```bash
# One-command deployment
node tools/deploy-testnet.mjs
```

### 1.3 Update Frontend Config
After deployment, the tool updates:
- `lib/presale/config.ts` — `PaymentManager` address, RLKO address, chain config
- `.env` — `NEXT_PUBLIC_PAYMENT_MANAGER`, `NEXT_PUBLIC_RLKO_TOKEN`

### 1.4 Rebuild & Deploy Frontend
```bash
npm run build
# Deploy the .next/ output to your hosting provider
```

### 1.5 Verify
1. Visit the portal URL
2. Connect wallet (MetaMask, WalletConnect, Coinbase Wallet, OKX)
3. Confirm BSC Testnet (Chain ID 97) is detected
4. Run the test scenarios (Section 4)

---

## 2. Monitoring

### 2.1 Metrics to Watch
| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| User txn failure rate | > 5% in 1h | Check RPC health, contract state |
| RPC error rate | > 10% | Rotate RPC URL, check provider status |
| Wallet connection errors | > 50 in 1h | Check RainbowKit/wagmi config |
| Build errors | Any | Rollback to last known good build |

### 2.2 Logs
- **Frontend:** Browser console, Vercel/Netlify deploy logs (if applicable)
- **Contracts:** BscScan tx history for PaymentManager contract
- **Errors:** Check `window.onerror` and any error tracking integration

### 2.3 Health Check
```bash
# Verify RPC endpoint is responsive
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $BSC_TESTNET_RPC
```

---

## 3. Incident Response

### 3.1 Contract Pause (Emergency)
If a contract issue is detected:
1. **Owner pauses sales:** Call `pause()` on PaymentManager via BscScan or cast
   ```bash
   cast send --rpc-url $BSC_TESTNET_RPC --private-key $OWNER_PK \
     $PAYMENT_MANAGER "pause()"
   ```
2. **Frontend notice:** Post a banner message via the dApp's announcement mechanism (if available) or update the UI at the hosting level
3. **Investigate** — check contract state, recent transactions, oracles

### 3.2 RPC Failure
If the configured RPC goes down:
1. Update `NEXT_PUBLIC_BSC_TESTNET_RPC` in `.env`
2. Rebuild and redeploy the frontend
3. Alternatively, users can switch their wallet RPC manually

### 3.3 Wallet Connection Issues
If RainbowKit/wagmi fails:
1. Check for config changes in `app/providers.tsx`
2. Verify RainbowKit version compatibility: wagmi v2.x, RainbowKit v2.x
3. Check browser console for CORS or extension errors
4. Common fix: clear site data and reconnect

### 3.4 Wrong Contract Address
If the frontend points to wrong contract addresses:
1. Update `lib/presale/config.ts` with correct addresses
2. Rebuild and redeploy
3. The `reconnectOnMount: true` flag will re-fetch state on next load

### 3.5 Stale Transaction History
If user tx history is missing:
1. History is stored in `sessionStorage` — cleared on tab close
2. No fix needed; new transactions will be saved on next successful operation
3. If persistence across sessions is required, migrate to `localStorage`

---

## 4. Test Scenarios (Manual E2E)

### 4.1 Presale — Buy with USDT
1. Connect wallet with USDT balance
2. Approve USDT spend (if not already approved)
3. Enter amount, click Buy
4. Confirm MetaMask tx → wait for receipt
5. Verify: RLKO balance increases, tx appears in history, stage supply decreases

### 4.2 Presale — Buy with BNB
1. Connect wallet with tBNB balance
2. Switch to BNB mode, enter amount → Buy
3. Confirm tx → verify receipt and balance update

### 4.3 Staking
1. Navigate to Staking page
2. Choose 30/90/180 day plan → Enter amount → Stake
3. Verify: active stake appears, RLKO balance decreases, staked amount increases
4. Wait for maturity (or use fast-forward if deployed on test fork)
5. Claim rewards → verify reward balance updates
6. Unstake → verify RLKO balance returns

### 4.4 State Recovery
1. Perform a buy or stake
2. Disconnect wallet → reconnect
3. Verify: portfolio balance, staking data, and tx history reload correctly
4. Switch to wrong network → verify prompt appears and switch is smooth

### 4.5 Error Handling
1. Reject a MetaMask tx mid-flow → verify step is reset, no stale loading state
2. Attempt buy with insufficient balance → verify clear error message
3. Attempt stake in exhausted stage → verify "sold out" state displayed

### 4.6 Performance
1. Open Chrome DevTools → Performance tab
2. Record interactions: navigate pages, switch tabs, connect wallet
3. Verify no jank, no console errors, frame rate > 30fps on animations

---

## 5. Configuration Reference

### 5.1 Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BSC_TESTNET_RPC` | Yes | — | BSC Testnet RPC URL |
| `DEPLOYER_PK` | Yes (deploy) | — | Deployer wallet private key |
| `SALE_TOKEN` | Yes (deploy) | — | RLKO token address |
| `USDT_TOKEN` | Yes (deploy) | `0x7a7B1e43...` | USDT (BSC Testnet) |
| `BNB_USD_FEED` | Yes (deploy) | `0x2514895c...` | Chainlink feed |
| `STAGE1_*` | No | set in script | Stage config |
| `TREASURY` | No | deployer | Treasury address |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | Yes | — | WalletConnect Project ID |

### 5.2 Frontend Config (`lib/presale/config.ts`)
| Field | Type | Description |
|-------|------|-------------|
| `paymentToken` | Address | USDT address on target chain |
| `paymentManagerAddress` | Address | Deployed PaymentManager |
| `chain` | Chain config | Chain ID, RPC, block explorer |
| `chainId` | Number | 97 (testnet) |

### 5.3 QueryClient Config (`app/providers.tsx`)
| Option | Value | Rationale |
|--------|-------|-----------|
| `staleTime` | 5000ms | Balance/tx data refreshes quickly |
| `refetchOnWindowFocus` | true | State sync on tab switch |
| `refetchInterval` | 30000ms (global), 15000ms (presale) | Real-time-ish updates |
| `reconnectOnMount` | true | Recovery after wallet reconnect |

---

## 6. Non-Critical Items (Future)

Items identified during RC6 audit that do not block the testnet release:

1. **4 pairs of duplicate utility functions** exist in the codebase (`findPlanByDuration`/`getPlanByDuration`, `calcTokensForAmount`/`calculateTokens`, `truncateAddress`/`shortenAddress`, `CHAIN_IDS` const in two files). Consolidate in a future refactor.
2. **Build artifacts** — `.next/`, `cache/`, generated frame images (`public/frames/`), zip files, and log files are present in the repo. Add to `.gitignore` and clean up before mainnet.
3. **DashboardErrorBoundary** is implemented but not yet wired to any component. Wire it in when adding new feature pages.
4. **Hardcoded BSC Testnet RPC** in `lib/presale/config.ts`. Consider fallback RPC rotation for reliability.

---

## 7. Rollback

### 7.1 Smart Contract Rollback
Smart contracts are immutable once deployed. To fix a deployed contract:
1. Deploy a new PaymentManager instance with corrected parameters
2. Transfer RLKO supply to the new contract
3. Update frontend config to point to the new address
4. Old contract funds can be withdrawn by owner via `withdrawToken()` / `withdrawNative()`

### 7.2 Frontend Rollback
1. Revert to the previous commit
2. Rebuild (`npm run build`)
3. Redeploy
4. Clear CDN cache if applicable

---

## 8. Contact & Escalation

| Role | Contact |
|------|---------|
| Lead Developer | — |
| Contract Auditor | — |
| Infrastructure | — |
