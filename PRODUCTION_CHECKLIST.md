# Production Checklist — Relcko v1.0.0-rc20

**Use this before tagging and before each production deploy.**
Legend: ✅ verified in code · ⚠️ action / verify before launch · ❌ not configured

---

## 1. Environment Variables ⚠️
Set the following **before `npm run build`** (they are inlined at build time by Next.js):

| Variable | Required? | Notes |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ Yes | WalletConnect v2. If empty, WC wallet is disabled. |
| `NEXT_PUBLIC_BSC_RPC` | Optional | Defaults to `https://bsc-dataseed.binance.org/`. |
| `NEXT_PUBLIC_POLYGON_RPC` | Optional | Defaults to `https://polygon-bor.publicnode.com`. |
| `NEXT_PUBLIC_COINBASE_WALLET_ENABLED` | Optional | `"true"` or auto-derived from WC Project ID. |

> The repo `.env.example` covers **contract-deploy tooling** (deployer key, treasury, tokenomics). The four `NEXT_PUBLIC_*` above are the **app runtime** vars (consumed by `lib/blockchain/client.ts`, `lib/presale/config.ts`).
> Secrets (`DEPLOYER_PK`, etc.) belong only in the deploy environment and are gitignored.

## 2. RPC Endpoints ✅
- Production mainnet defaults are correct (BSC mainnet, Polygon mainnet).
- Override per environment via `NEXT_PUBLIC_BSC_RPC` / `NEXT_PUBLIC_POLYGON_RPC`.
- `bscTestnet` ships intentionally for the beta path (default public testnet RPC) — not an accidental leftover.

## 3. WalletConnect Project ID ⚠️
- Must be set in production or the WalletConnect option will not appear.
- Verify in a live wallet connect test post-deploy.

## 4. Analytics ⚠️
- `lib/analytics.ts` defines an event taxonomy (incl. `rpc_error`, `stake_success`, `stake_failed`, etc.).
- Confirm the analytics sink/provider is wired (or intentionally disabled) before launch.

## 5. Robots ✅
- `/robots.txt` route is statically generated and served.

## 6. Sitemap ✅
- `/sitemap.xml` route is statically generated and served.

## 7. Favicons ✅
- `app/favicon.svg` present (auto-served by Next.js App Router).
- Verify Apple touch icon / additional sizes if required by brand guidelines.

## 8. Meta Tags ✅
- `app/layout.tsx` defines `metadata` (title template, etc.).
- Verify Open Graph / Twitter card tags and social preview render correctly.

## 9. Security Headers ⚠️
- `next.config.ts`: `reactStrictMode`, `poweredByHeader: false`, `compress: true`, `productionBrowserSourceMaps: false` are set.
- **No CSP / HSTS / X-Frame-Options are configured in `next.config`.** Add them via the hosting layer (Vercel/edge) or `next.config` `headers()` before public launch.

## 10. Caching ✅
- All routes statically prerendered (`/`, `/presale`, `/robots.txt`, `/sitemap.xml`).
- Image cache TTL: 30 days (`next.config.ts`).

## 11. Image Optimization ✅
- `next/image` configured with `avif` + `webp` and 30-day minimum cache.
- Ensure all `<img>` usages are migrated to `next/image` (none identified as blockers).

## 12. Monitoring ⚠️
- Error boundaries call `console.error(error)` — visible in server/stdout logs.
- Recommend external error monitoring (e.g., Sentry) post-launch; out of scope for this RC.

## 13. Backups ⚠️ (operational)
- Contract ownership/treasury is multisig-gated (`Ownable2Step`). Ensure treasury multisig signers and deployer keys are backed up and access-controlled.

## 14. DNS ⚠️
- Ensure `relcko.com` and `www.relcko.com` resolve (A/AAAA or CNAME) to the hosting target.

## 15. HTTPS ⚠️
- Terminate TLS at the host with a valid certificate (HSTS recommended — see #9).

---

## Pre-Tag Sign-off
- [x] `npm run build` passes
- [x] `tsc --noEmit` passes
- [x] `eslint components app lib` → 14 benign warnings (non-blocking)
- [x] No `console.log(` calls in source
- [x] No `TODO`/`FIXME`/`HACK` in source
- [x] No mock/placeholder *assets*; `placeholder=` attrs are legitimate inputs; `MockUSDT` is an internal admin label
- [x] No accidental test RPC URLs in production paths
- [x] Error boundaries compile and `reset()` wired
- [x] No UI / UX / blockchain / wagmi / routing regressions
