# Changelog

All notable changes to the Relcko web application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to Semantic Versioning.

## [1.0.0-rc20] - 2026-07-14

### Added
- **RC18 — Presale polish (0.1 / 0.2 / 0.3):** finalized presale purchase flow, connected-state grid, error/loading states, and typography/whitespace pass.
- **RC19.0 — Dashboard alignment:** Investor Portal dashboard aligned to Presale token model (RLKO, stages, raised/remaining).
- **RC19.1 — Dashboard density:** reduced visual noise and density in the dashboard.
- **RC20.0 — Production Readiness Audit:** full audit; removed 18 stray debug `console.*` calls from the purchase (`PresalePurchasePanel.tsx`) and staking (`StakePanel/index.tsx`) flows.
- **RC20.1 — Global error boundaries:** added `app/error.tsx` (segment boundary) and `app/global-error.tsx` (root boundary) with calm, on-brand dark glass UI, `reset()` recovery, and `Return to Dashboard` (`/presale`) / `Return to Home` (`/`) navigation.
- **Accessibility:** `role="alert"` error surfaces, semantic headings/buttons/links, visible focus outlines, reduced-motion handling (CSS `@media` + `matchMedia` guards across motion components).
- **Performance:** static prerendering of all routes; no new runtime dependencies added for error handling.

### Changed
- **Motion system:** locked and verified (frozen for release — no further motion changes).
- **Typography system:** locked and verified (frozen for release).
- **Responsive QA:** verified across breakpoints; reveal-on-scroll and density patterns retained.

### Fixed
- Eliminated debug-instrumentation `console.log` leakage from the two core money flows (presale purchase + staking), including an entire debug block (`_debug`/`_renderCount` refs and `useRef` import) in `StakePanel`.

### Removed
- 18 stray debug `console.*` calls (10 in `PresalePurchasePanel.tsx`, 8 in `StakePanel/index.tsx`).

### Known Limitations / Non-Blocking
- 14 ESLint issues remain in source (`react-hooks/set-state-in-effect` ×11, `react-hooks/exhaustive-deps` ×2, `react-hooks/refs` ×1). All are benign React-hook hygiene warnings with no functional or release impact.
- `bscTestnet` is intentionally supported (beta/testnet path) — its default public RPC and testnet contract addresses are deliberate, not accidental leftovers.
- `AdminDashboard` displays a `MockUSDT` token label (internal/admin view) — cosmetic, not a production data mock.

## [1.0.0-rc19] - 2026-07 (prior)
- Dashboard alignment to Presale tokens (RC19.0) and density/noise reduction (RC19.1).

## [1.0.0-rc18] - 2026-07 (prior)
- Presale polish across RC18.0–RC18.3 (flow, states, typography, motion micro-interactions).

[1.0.0-rc20]: https://github.com/relcko/relcko/releases/tag/v1.0.0-rc20
[1.0.0-rc19]: https://github.com/relcko/relcko/releases/tag/v1.0.0-rc19
[1.0.0-rc18]: https://github.com/relcko/relcko/releases/tag/v1.0.0-rc18
