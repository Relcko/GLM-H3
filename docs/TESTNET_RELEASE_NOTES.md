# Relcko Investor Portal — Public Testnet Release v0.6.0 (RC6)

**Release Date:** TBD — pending testnet deployment
**Network:** BNB Smart Chain Testnet (Chain ID 97)
**Portal URL:** TBD — pending deployment
**Contracts:** TBD — pending deployment

## Overview

Public testnet release of the Relcko Investor Portal — a Next.js dApp for participating in the RLKO token presale and staking program on BNB Smart Chain Testnet.

## What's Included

### Presale
- Buy RLKO tokens with USDT or BNB (native)
- Multi-stage pricing with automatic stage transitions
- Real-time supply tracking with sale status indicators
- Countdown timer to sale end or stage transitions
- Transaction history with sessionStorage persistence
- Wallet disconnect / wrong-network / supply-exhausted states

### Staking
- Three staking tiers — 30, 90, 180 days
- APY display with projected rewards calculation
- Stake, claim rewards, and unstake flows
- Active stakes list with maturity status and claimable rewards
- Full error recovery with receipt tracking and step-level reset

### Dashboard
- Portfolio KPIs — RLKO balance, total staked, active stakes, total rewards
- Transaction timeline with BscScan links
- Wallet and network status indicators

### Infrastructure
- Error boundary with retry capability (unused components can be wired)
- Accessibility — skip-to-content, aria attributes, focus-visible outlines
- Performance — React.memo on 9 high-churn components, 5s query staleTime, 15s refetch
- State sync — staleTime: 5000ms, refetchOnWindowFocus: true, refetchInterval: 15000ms (presale), 30000ms (global)

## Deployment

### Prerequisites
- Node.js 18+, Foundry
- Deployer wallet funded with tBNB (faucet: https://testnet.bnbchain.org/faucet-smart)
- `.env` configured with `BSC_TESTNET_RPC` and `DEPLOYER_PK`

### Command
```bash
node tools/deploy-testnet.mjs
```
This runs the full deployment pipeline: RLKO token → PaymentManager → fund → configure stage. After deployment, update addresses in `lib/presale/config.ts` and verify the frontend RPC configuration.

### Contract Deployment Order
1. `script/DeployRLKO.s.sol` — Deploy test RLKO token
2. `script/DeployPaymentManager.s.sol` — Deploy PaymentManager with constructor args
3. Fund PaymentManager with RLKO presale supply
4. `script/ConfigureStage1.s.sol` — Add + activate Stage 1 (idempotent)

### Smart Contract Addresses (Placeholder)

| Contract | Address |
|----------|---------|
| RLKO Token | `0x_After_Deployment` |
| PaymentManager | `0x_After_Deployment` |
| USDT (BSC Testnet) | `0x7a7B1e43765a5BaC58e73f3c67CcB5548AC08408` |
| BNB/USD Feed (BSC Testnet) | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |

## Changelog (RC1 → RC6)

### RC3 — Production Readiness
- React.memo on 9 high-churn components
- useMemo on PortfolioKPI derivations
- Accessibility: skip-to-content, htmlFor/id, aria-controls, aria-label, role, focus-visible
- DashboardErrorBoundary with retry
- Enhanced error/confirmation banners with icons + animations
- Spinning loader in active buy button
- Fixed pre-existing type errors in TransactionHistory.tsx

### RC4 — E2E Testnet Validation
- Comprehensive audit scoring 72% readiness
- 3 critical issues identified

### RC5 — State Synchronization
- reconnectOnMount: true in providers.tsx
- Shared txHistory module (sessionStorage persistence)
- queryClient.invalidateQueries after every tx
- useWaitForTransactionReceipt in StakePanel + ActiveStakes
- Empty / disconnected / wrong-network states across all panels
- Supply-exhausted check in PresalePurchasePanel
- Deleted duplicate contracts/scripts/ directory
- ConfigureStage1.s.sol: idempotent (checks stageCount > 0 before adding)
- staleTime: 5000ms, refetchInterval: 15000ms (presale), refetchOnWindowFocus: true
- Consolidated duplicate CHAIN_EXPLORERS into shared module
- Build: zero errors across all routes

### RC6 — Release Freeze & Final Audit
- Gated 3 console.warn calls behind `process.env.NODE_ENV !== "production"`
- Replaced inline CHAIN_EXPLORERS with shared txHistory module (TransactionHistory.tsx)
- Fixed 8 stale doc references from deleted `contracts/scripts/` to `script/`
- Removed empty `components/staking/Dis/` directory
- Generated RC6_RELEASE_REPORT.md, OPERATIONS_RUNBOOK.md

## Known Issues

None critical. See Operations Runbook for non-critical items and workarounds.

## Test Scenarios

See `TESTNET_DEPLOYMENT.md` for the full post-deployment checklist. Key flows to verify:
1. Presale purchase with USDT
2. Presale purchase with BNB
3. Stake in each tier (30/90/180 days)
4. Claim rewards on matured stakes
5. Unstake and verify portfolio balance updates
6. Transaction history persistence across page navigations
7. Wallet disconnect → reconnect → state recovery
8. Wrong network prompt + switch
9. Error handling: reject tx, insufficient balance, supply exhausted
