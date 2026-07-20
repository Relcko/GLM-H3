# Implementation Roadmap V2 — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md` + all V1.9 blueprint docs. Phased milestones V2.0 → V3.0 with quality gates. Planning only; no code.

Each milestone lists **Required Deliverables, Acceptance Criteria, Build/Testing/Performance/Security/Release/Rollback Criteria** (quality gates defined in `TESTING_AND_QA_STRATEGY.md`, `CI_CD_RELEASE_STRATEGY.md`, `PERFORMANCE_TARGETS.md`).

Architecture is **frozen**; milestones implement locked specs only.

---

## V2.0 — Foundation
**Deliverables:** Monorepo (`MONOREPO_PRODUCTION_STRUCTURE.md`); Core Platform shared layer (Identity/Wallet, Ledger/Audit, Event Bus, Permission, Design System, Feature Shell, Notification); CI/CD (`CI_CD_RELEASE_STRATEGY.md`); contract foundations (upgradeability/security modules scaffolding).
**Acceptance:** shared layer usable by all modules; event schema registry live; permission + audit enforced server-side; pipeline green with all gates.
**Build:** typecheck/lint green; no duplicate rule implementations.
**Testing:** unit+integration on shared; event-bus idempotency; auth/permission tests.
**Performance:** backend read p95 ≤ 150ms; event lag ≤ 1s.
**Security:** SAST/DAST/secret scan green; auth bypass tests pass; PII segregation in shared.
**Release:** preview envs + feature flags live; docs/runbooks initial.
**Rollback:** last-good artifact; DR drill (ledger/audit) pass.

## V2.1 — Marketplace
**Deliverables:** Marketplace + Investment + Ownership services; contracts (Property Registry, Fraction NFT, Marketplace); frontend Marketplace + Property Details + Auth UI.
**Acceptance:** invest confirm updates Ownership + Transaction + Commission; supply/price invariants hold; legacy browse preserved.
**Build:** event Flows A/B (`EVENT_ARCHITECTURE.md §3`) implemented.
**Testing:** E2E invest/sell; commission on both webhook+admin paths (legacy gap fixed).
**Performance:** marketplace targets (`PERFORMANCE_TARGETS.md §8`).
**Security:** KYC/supply invariant tests; IDOR denied.
**Release:** staged; rollback verified.
**Rollback:** offsetting corrections only.

## V2.2 — NFT Marketplace
**Deliverables:** NFT service + contracts (Property NFT, royalties); frontend NFT Marketplace; security freeze/blacklist wired.
**Acceptance:** mint/list/buy/sell; `sourceRef` uniqueness; counterfeit/ownership/freeze controls (`NFT_SECURITY_MODEL.md`).
**Build:** transfer predicate rejects frozen/non-compliant.
**Testing:** contract + E2E; reconciliation job.
**Performance:** NFT targets (§9).
**Security:** blacklist evasion tests; metadata tamper detected.
**Release/Rollback:** per standard gates.

## V2.3 — Network Engine
**Deliverables:** Network service + Commission contract; Agent Portal; anti-fraud preventive controls.
**Acceptance:** referral attribution; acyclic team graph; no self-referral/cycle; commission single rate; clawback.
**Build:** `NETWORK_TREE_MODEL.md` invariants at write.
**Testing:** fraud preventive suite (`ANTI_FRAUD_MODEL.md`); E2E agent convert→commission→leaderboard.
**Performance:** referral/commission paths within targets.
**Security:** fraud vectors F1–F10 prevented.
**Release/Rollback:** standard.

## V2.4 — Portfolio
**Deliverables:** Portfolio projection worker + frontend; Global Property Intelligence service + map.
**Acceptance:** Portfolio reconciles with ledger; `OWN` scoping; geo aggregation.
**Build:** derived read model; incremental recompute.
**Testing:** rebuild-from-log test; scoping tests.
**Performance:** read-model recompute ≤ 500ms.
**Security:** no cross-user PII; map privacy blur.
**Release/Rollback:** standard.

## V2.5 — Governance
**Deliverables:** Governance service + contracts (Governor, Voting, Timelock); frontend Governance.
**Acceptance:** proposal lifecycle; one-vote-per-weight; timelock; execution gated.
**Build:** snapshot at creation; tamper-evident payload.
**Testing:** contract + E2E vote/execute; Flow D.
**Performance:** governance targets (§11).
**Security:** double-count prevented; multi-sig/timelock enforced.
**Release/Rollback:** standard.

## V2.6 — Treasury + Dividend
**Deliverables:** Treasury + Dividend services + contracts; frontend Treasury; settlement worker.
**Acceptance:** multi-sig + thresholds + whitelist; dividend snapshot immutable; payouts.
**Build:** two-stage gating (`PERMISSION_MODEL.md §6`); `EmergencyLockdown` → `SystemPaused`.
**Testing:** Flow C; treasury anomaly; DR reconciliation.
**Performance:** treasury targets (§10).
**Security:** unauthorized movement/limit bypass/diversion prevented (`TREASURY_SECURITY_MODEL.md`).
**Release/Rollback:** dual-control re-auth on recovery.

## V2.7 — AI Platform
**Deliverables:** AI services (Knowledge + Memory + engines + explainability boundary + model registry); AI Copilot frontend; agentic + model lifecycle.
**Acceptance:** advisory-only; explainability envelope mandatory; `AIModelUpdated`; no value-moving events.
**Build:** engines consume read models/events; vendor-independent adapter.
**Testing:** explainability-boundary reject; scope/PII; drift; no-execution.
**Performance:** AI targets (§12 cross-cutting).
**Security:** prompt-injection/hallucination/leakage tests (`AI_SECURITY_MODEL.md`).
**Release/Rollback:** model rollback via flag; shadow mode.

## V2.8 — Enterprise Security
**Deliverables:** Security/Compliance/Risk/Fraud/Audit/Privacy/Observability/DR wired across all modules; identity methods (passkeys/hardware/guardian); security event extension live; dashboards; DR drills.
**Acceptance:** Zero Trust enforced; KYC/KYB/AML/PEP/sanctions/travel-rule; risk step-up; fraud→incident; audit immutable; erasure/export; regional failover.
**Build:** cross-cutting integration; `SECURITY_EVENT_EXTENSION.md` events emitted.
**Testing:** security + compliance + chaos + DR disciplines.
**Performance:** security/observability targets (§12).
**Security:** full adversarial suite + AI adversarial scan green.
**Release/Rollback:** break-glass cooldown; DR drill pass.

## V2.9 — Admin & Developer Portals + Hardening
**Deliverables:** Admin Portal (orchestration); Developer Portal (spec/observability); full cross-cutting QA; load/chaos at 100M-user scale; institutional APIs + mobile prep.
**Acceptance:** admin least-privilege + full audit; mobile/API reuse backends behind API Security; load/chaos green.
**Build:** all modules integrated; no conflicting rules.
**Testing:** load + chaos + a11y + compliance full suite.
**Performance:** all `PERFORMANCE_TARGETS.md` met at scale.
**Security:** final security gate + pen test.
**Release/Rollback:** release candidate; rollback verified.

## V3.0 — Mainnet Launch
**Deliverables:** Cutover from v1.0.1 via `MIGRATION_STRATEGY.md`; legacy data/investors/properties/NFTs/agents/documents/treasury migrated; dual-write + reconcile; global rollout.
**Acceptance:** ledger↔audit agreement; ownership/financial rules intact; no data loss; permissions/scopes preserved; all gates green.
**Build:** migration scripts idempotent; no in-place edits.
**Testing:** full E2E on migrated data; DR; compliance; security.
**Performance:** production SLOs met.
**Security:** final sign-off; regulatory reporting ready.
**Release:** progressive (canary→regions→global) with timelock/multi-sig for contracts.
**Rollback:** revert to v1.0.1 path validated; dual-write window; no ledger/audit edits.

---

## Migration strategy (legacy → V2/V3)

Per `MIGRATION_STRATEGY.md` + requested legacy dimensions:
- **Legacy Marketplace / Data / Investors / Properties / NFTs / Agents / Documents / Treasury:** migrated via dual-write to new services/contracts; reconciled against ledger; offsetting corrections only; PII preserved per `PRIVACY_MODEL.md` (residency/erasure).
- No re-definition of business rules; migration maps legacy state → locked entities (`DOMAIN_MODEL.md` + extensions).

---

## Governance closure

This milestone (V1.9.0) **permanently freezes architecture**. All ten blueprint docs are the build contract for V2.0 → V3.0. Future work is V2.x implementation only; new architecture requires a governance-approved formal revision.
