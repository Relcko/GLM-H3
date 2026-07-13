# Relcko Protocol

**Version:** v1.0.0-beta.1 — Closed Testnet Beta (RC10)

Real estate tokenization platform on BNB Smart Chain. Presale dashboard with staking, rewards, and portfolio management.

## Status

| Component | Status |
|---|---|
| Smart Contracts | Deployed & verified on BSC Testnet |
| Frontend | Live at [relcko.io/presale](https://relcko.io/presale) |
| Staking | Fully operational (stake, claim, emergency withdraw) |
| Analytics | Anonymous operational tracking — no PII |
| Bug Reports | In-app markdown → GitHub issues |
| Closed Beta | Ready — invite-only |

## Quick Start

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # Production build
```

## Documentation

| Document | Purpose |
|---|---|
| `BETA_TESTING_GUIDE.md` | Step-by-step tester onboarding |
| `BETA_OPERATIONS.md` | Daily operations, monitoring, incident response |
| `BUG_TRIAGE.md` | Priority classification for reported issues |
| `MAINNET_PREPARATION.md` | Production readiness checklist |
| `RC10_FINAL_REPORT.md` | Full architecture, readiness, and recommendation |
| `CHANGELOG.md` | Release history |
| `docs/ARCHITECTURE.md` | Smart contract architecture |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `docs/SECURITY.md` | Threat model and security analysis |
| `docs/OPERATIONS.md` | Owner functions and monitoring |

## Testnet

**Network:** BNB Smart Chain Testnet (Chain ID: 97)

| Contract | Address |
|---|---|
| RLKO Token | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` |
| PaymentManager | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` |
| Staking Contract | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` |

**Explorer:** https://testnet.bscscan.com

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Web3:** Wagmi 2.x, RainbowKit, Viem, TanStack Query
- **Animation:** Framer Motion, GSAP, Lenis
- **Contracts:** Solidity 0.8.28, Foundry, OpenZeppelin
- **Oracles:** Chainlink BNB/USD

## License

Private — All rights reserved.
