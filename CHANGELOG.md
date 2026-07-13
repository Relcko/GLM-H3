# Changelog

## v1.0.0-beta.1 (2026-07-12)

**Release:** Closed Testnet Beta — RC10

### Added

- **Dashboard**: Full presale dashboard with buy panel, portfolio, staking center, investor stats, transaction history, and admin monitor
- **Staking**: 7 lock periods (30d to 4yr), approve-and-stake flow, claim rewards, emergency withdrawal with penalty warning
- **Analytics**: Anonymous operational event tracking (purchases, stakes, claims, withdrawals, network switches, RPC errors) — no PII collected
- **Admin Monitor**: Read-only operational dashboard with on-chain metrics (stage progress, remaining RLKO, total raised) and local analytics (investors, volume, failure rate, avg confirmation time)
- **Bug Reporting**: In-app markdown report dialog with auto-detected browser/wallet/chain — opens pre-filled GitHub issue
- **Beta Configuration**: Testnet banner with dismiss, network status indicator (live block number), faucet links, explorer links, version badge
- **Wallet Health**: Connection status, balances, network/gas checks
- **Transaction History**: SessionStorage-based recent transaction log with chain explorer links
- **Portfolio KPIs**: Wallet balance, staked amount, claimable rewards, portfolio value
- **Rewards Calculator**: Projection tool for all staking plans
- **Investor Activity Feed**: Recent on-chain purchase events
- **Investor Statistics**: Per-investor KPI cards

### Cinematic Landing Page

- 8-chapter scroll-driven brand experience with canvas-rendered cityscape
- Phase-aware Director orchestrating Hero intro sequence (curtain → canvas → particles → lighting → headline → CTA)
- CinematicCanvas, CinematicAtmosphere, DynamicGradient, VolumetricLight, Particles layers
- Lenis smooth-scroll, custom cursor with magnetic glow, chapter navigation rail
- ScrollStore rAF-driven scroll/motion publishing
- Animated Counter, SplitWords, Reveal scroll-triggered entry animations

### Smart Contracts

- `PaymentManager.sol` — Multi-stage presale with USDT and native BNB purchase paths
- Chainlink BNB/USD oracle integration with 2-hour staleness threshold
- OpenZeppelin Ownable2Step, ReentrancyGuard, Pausable, SafeERC20
- CEI (Checks-Effects-Interactions) pattern on all purchase functions
- Comprehensive NatSpec documentation
- Stage-based bonding curve pricing with per-user min/max limits

### Deployment & Tooling

- Foundry deployment scripts: DeployAll, DeployRLKO, DeployPaymentManager, ConfigureStage1, VerifyContracts
- Node.js post-deployment env sync tool (`tools/update-testnet-env.mjs`)
- Automated address propagation to frontend configs (presale + staking)
- BSC Testnet artifact (`deployments/testnet.json`)

### Documentation

- ARCHITECTURE.md — Contract architecture and design decisions
- DEPLOYMENT.md — Deployment guide for testnet and mainnet
- SECURITY.md — Threat model and security checklist
- OPERATIONS.md — Owner functions and monitoring guide
- AUDIT_SCOPE.md — Smart contract audit scope
- BETA_TESTING_GUIDE.md — Step-by-step tester onboarding
- BETA_OPERATIONS.md — Daily operations and incident response
- TESTER_WELCOME.md — Welcome package for beta testers
- BUG_TRIAGE.md — Bug priority classification system
- MAINNET_PREPARATION.md — Production readiness checklist
- STAKING_TESTNET_REPORT.md — Staking deployment and test results
- RC8_BETA_REPORT.md — RC8 beta completion report
- RC9_CLOSED_BETA_REPORT.md — RC9 closed beta readiness report
- RC10_FINAL_REPORT.md — Final architecture and readiness summary

### Changed

- `docs/CHANGELOG.md` moved to root `CHANGELOG.md` (replaces v1.0.0 audit-preparation changelog)
- Staking config now supports both BSC Testnet and Mainnet
- Analytics tracker covers wallet disconnections and RPC errors
- Admin dashboard displays formatted USDT values (was raw BigInt)
- Network sidebar replaced static indicator with live block number status

### Fixed

- Directory hydration mismatch in Director initialization
- BNB test precision in PaymentManager test suite
- Test cleanup for `testWithdrawSaleTokens_AfterSale` and `testStageCompletion_OversellingPrevention`

### Security

- Contracts audited (see `docs/AUDIT_SCOPE.md`)
- ReentrancyGuard on all purchase functions with CEI pattern enforced
- Oracle staleness threshold (7200s) with emergency owner override
- Zero address validation on all constructor parameters
- Stage supply caps prevent overselling per stage

---

## v1.0.0 (Audit Preparation)

*See `docs/CHANGELOG.md` for earlier changelog.*
