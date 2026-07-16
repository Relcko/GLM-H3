# Frontend Implementation Plan — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `MONOREPO_PRODUCTION_STRUCTURE.md` (`apps/`, `packages/ui`). Frontend build order. Planning only; no React/Next.js code, no UI implementation.

The frontend is a **thin projection of domain** (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §0`): it renders read models + sends intents; all rules enforced server-side. Design system (RC18–RC20 primitives) is the foundation.

---

## 1. Build order

```
1.  Shared Design System
2.  Shared Components
3.  Authentication
4.  Marketplace
5.  Property Details
6.  Portfolio
7.  NFT Marketplace
8.  Governance
9.  Treasury
10. Agent Portal
11. AI Copilot
12. Admin Portal
```

(Future Mobile + Public API consumers reuse the same backend/design tokens; not separate frontend builds here.)

---

## 2. Per-area plan

### 2.1 Shared Design System (`packages/ui`)
- **Build:** glass/card/typography/motion primitives, layout shell, theming, accessibility (a11y) baseline.
- **Rule:** single implementation of each primitive; no per-module copies (no duplicate UI rules).
- **Depends on:** nothing (foundation).

### 2.2 Shared Components (`packages/ui` + module components)
- **Build:** `PropertyCard`, `PropertyBadge`, `PropertyStats`, `PropertyProgress`, `BookmarkButton`, `MarketplaceFilters`, `MarketplaceGrid`, `MarketplaceLayout`, `PortfolioKPI`, `RewardsCard`, `TransactionTimeline`, `ProposalCard`, `VotePanel`, `TreasuryCard`, `MovementTable`, `AgentCard`, `TeamTree`, `VaultComponent`, `CampaignCard`, `LeaderboardTable`, map shell, chat dock.
- **Rule:** reuse across modules; derive from read models.

### 2.3 Authentication
- **Spec:** `IDENTITY_AND_ACCESS_MODEL.md`.
- **Build:** wallet (SIWE) + email + MFA + passkeys + hardware keys login; institutional/corporate; delegated access; guardian recovery; session UI.
- **Rule:** UI buttons rendered by capability (UX only); real auth server-side (`PERMISSION_MODEL.md §5`).

### 2.4 Marketplace
- **Spec:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.1`.
- **Build:** browse/grid/filters, property cards, invest flow, secondary listing/sale, commission display.
- **Rule:** enforce KYC/min-investment in UI affordances; authoritative checks server-side.

### 2.5 Property Details
- **Spec:** `DOMAIN_MODEL.md` (Property 1), `PROPERTY_STATE_MACHINE.md`, `VALUATION_ENGINE.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.10` (map popovers).
- **Build:** detail page, state machine badges, valuation/cashflow widgets, geo popover, documents access (authorized).

### 2.6 Portfolio
- **Spec:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.6`, `DOMAIN_MODEL.md` (Portfolio 8).
- **Build:** holdings, performance, P&L, diversification, dividends history, voting power, rewards.
- **Rule:** `OWN` scoping; server-enforced; no client trust.

### 2.7 NFT Marketplace
- **Spec:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`.
- **Build:** `NFTCard` variant, mint/list/buy/sell, royalties, ownership verification, freeze/blacklist states.
- **Rule:** verified collections flagged; counterfeit warnings from backend.

### 2.8 Governance
- **Spec:** `GOVERNANCE_ARCHITECTURE.md`.
- **Build:** proposal list/detail, `ProposalCard`, `VotePanel`, timelock status, parameter registry, delegation UI.
- **Rule:** voting power from read model; execution UI triggers gated flow.

### 2.9 Treasury
- **Spec:** `TREASURY_ARCHITECTURE.md`, `TREASURY_SECURITY_MODEL.md`.
- **Build:** accounts, movements table, yield, reserve status, multi-sig initiation/approval UI, emergency controls (Super only).
- **Rule:** two-stage gating reflected in UI; no unilateral execute.

### 2.10 Agent Portal
- **Spec:** `NETWORK_ENGINE_ARCHITECTURE.md`, `AGENT_RANK_SYSTEM.md`, `COMMISSION_ENGINE.md`.
- **Build:** referrals, team tree, commission ledger, leaderboard, rank progress, campaign participation.
- **Rule:** `TEAM` scope for Senior Agent; `OWN` for Agent.

### 2.11 AI Copilot
- **Spec:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_DOMAIN_MODEL.md`, `AI_EXPLAINABILITY_MODEL.md`, `AI_MEMORY_MODEL.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.9`.
- **Build:** chat dock over engines; surface recommendations/forecasts/alerts; render explainability envelope (confidence, evidence, risk, alternatives, human-review); accept/reject/modify UI.
- **Rule:** advisory only; human-review required for sensitive; never auto-executes (`AI_GOVERNANCE_MODEL.md`).

### 2.12 Admin Portal
- **Spec:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.12`, `PERMISSION_MODEL.md §7`.
- **Build:** orchestration console, user/role mgmt (bounded), content/property ops, compliance queue, treasury/governance initiation (multi-sig), observability, config, emergency.
- **Rule:** least-privilege; full audit; break-glass alert; no single-actor fund movement.

---

## 3. Cross-cutting frontend rules

- **Capability-driven UI:** buttons rendered by role/scope; never source of truth (`PERMISSION_MODEL.md §5`).
- **Read-model rendering:** dashboards read projections; no local state of record.
- **Explainability visible:** AI outputs always show envelope; sensitive → review prompt.
- **Privacy:** no raw PII in client logs; respect consent.
- **Accessibility:** WCAG baseline from design system; tested in `TESTING_AND_QA_STRATEGY.md`.
- **No duplicate rules:** invariants enforced server-side only; UI never re-implements financial/permission logic.
