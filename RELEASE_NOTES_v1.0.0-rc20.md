# Release Notes — Relcko v1.0.0-rc20

**Release date:** 2026-07-14
**Type:** Release Candidate (production-ready)
**Status:** ✅ Approved for tagging

---

## New Features

- **Investor Portal Dashboard** — aligned to the Presale token model (RLKO, stages, raised/remaining, wallet health, transaction history).
- **Presale Purchase Flow** — multi-chain (BSC, Polygon; BSC Testnet for beta), native + ERC-20 purchase, approve/buy states, friendly error handling.
- **Staking Module** — stake/approve flow with on-chain event tracking and transaction history.
- **Global Error Handling** — `app/error.tsx` and `app/global-error.tsx` provide a calm, on-brand recovery experience on any unexpected runtime error.
- **Bug Report Dialog** — in-app issue capture (logs/warnings/errors) for user-submitted reports.

## Improvements

- **Dashboard density & noise reduction (RC19.1)** — cleaner information hierarchy.
- **Presale polish (RC18)** — connected-state grid, loading/error states, typography & whitespace, motion micro-interactions.
- **Production Readiness (RC20.0)** — removed debug `console.*` leakage from purchase and staking flows; verified SSR safety, secrets hygiene, reduced-motion, and build artifacts.
- **Accessibility** — semantic HTML, visible focus, `role="alert"` error surfaces, reduced-motion support.
- **Performance** — static prerendering of all routes; zero new runtime dependencies.

## Bug Fixes

- Removed 18 stray debug `console.log` calls that leaked into production logs from the presale purchase and staking flows.
- Verified and documented the benign set of 14 remaining ESLint warnings (no functional defects).

## Breaking Changes

- **None.** UI, UX, components, spacing, typography, motion, blockchain, wagmi/viem, hooks, APIs, routing, business logic, and contracts are frozen and unchanged from RC19.

## Known Limitations

- **Testnet support is intentional.** `bscTestnet` (default public RPC + testnet contract addresses, `tBNB`/`USDT` testnet pair, faucet links in `lib/beta.ts`) is a deliberate beta path — not an accidental leftover.
- **14 non-blocking ESLint warnings** remain (`react-hooks/set-state-in-effect` ×11, `exhaustive-deps` ×2, `refs` ×1). These are expected patterns (scroll reveal, mount/fetch, ref-sync) with no runtime impact.
- **`AdminDashboard` `MockUSDT` label** is an internal/admin view token label — cosmetic only.
- **No automated test suite** is present; QA was performed manually against build, typecheck, and scoped lint gates.

## Deployment Notes

### Build & Start
```bash
npm ci
npm run build      # Next.js 16 (Turbopack) — static prerender of /, /presale, /robots.txt, /sitemap.xml
npm run start      # requires a Node.js runtime; SSR enabled (wagmi ssr: true)
```

### Required Environment Variables (set BEFORE build — inlined at build time)
| Variable | Purpose | Default if unset |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 Project ID (required for WC wallet) | `""` → WalletConnect wallet disabled |
| `NEXT_PUBLIC_BSC_RPC` | BSC mainnet RPC endpoint | `https://bsc-dataseed.binance.org/` |
| `NEXT_PUBLIC_POLYGON_RPC` | Polygon mainnet RPC endpoint | `https://polygon-bor.publicnode.com` |
| `NEXT_PUBLIC_COINBASE_WALLET_ENABLED` | Enable Coinbase Wallet (`"true"` or any WC Project ID) | derived from WC Project ID |

> Note: the repository's `.env.example` documents the **contract-deploy tooling** variables (deployer key, treasury, tokenomics). The four `NEXT_PUBLIC_*` variables above are the **application runtime** variables consumed by `lib/blockchain/client.ts` and `lib/presale/config.ts`.

### Post-Deploy Verification
- [ ] WalletConnect Project ID set (WC option appears in wallet list).
- [ ] Mainnet RPC endpoints reachable; override via `NEXT_PUBLIC_BSC_RPC` / `NEXT_PUBLIC_POLYGON_RPC` if needed.
- [ ] `/robots.txt` and `/sitemap.xml` serve correctly.
- [ ] Meta tags / OG render in shared previews.
- [ ] Trigger a test error (temporarily) to confirm the error boundary + `Try Again` recovery, then revert.
