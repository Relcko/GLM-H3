# Testing & QA Strategy — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `MONOREPO_PRODUCTION_STRUCTURE.md` (`tests/`). Eleven test disciplines + gates. Planning only; no code.

Every test asserts behavior against the **locked specs**, not re-implemented rules. Tests are the enforcement of "no duplicate/conflicting rules": a single canonical rule is tested once in its owning module and reused via contracts/events.

---

## 1. Disciplines

| # | Discipline | Scope | Locked-spec anchors |
|---|-----------|-------|---------------------|
| 1 | **Unit** | per-function/entity invariants, money math, permission predicates. | `DOMAIN_MODEL.md`, `OWNERSHIP_MODEL.md`, `COMMISSION_ENGINE.md` |
| 2 | **Integration** | service + event-bus + ledger/audit flows (Flows A–F, `EVENT_ARCHITECTURE.md §3`). | `EVENT_ARCHITECTURE.md`, module specs |
| 3 | **Contract** | on-chain behavior: mint/transfer/settle/vote/upgrade; invariants + edge cases. | `SMART_CONTRACT_IMPLEMENTATION_PLAN.md`, `NFT_*`/`TREASURY_*` specs |
| 4 | **End-to-End** | full user journeys (invest, sell, dividend, propose, agent convert) across apps+services+contracts. | ecosystem §3, `MIGRATION_STRATEGY.md` |
| 5 | **Performance** | latency/throughput vs `PERFORMANCE_TARGETS.md`. | this milestone |
| 6 | **Load** | 100M-user / millions-recommendations scale; event-bus saturation. | `AI_PLATFORM_ARCHITECTURE.md §6`, `SECURITY_ARCHITECTURE.md §5` |
| 7 | **Security** | auth bypass, injection, IDOR, PII leakage, two-stage-gating bypass, prompt injection. | `SECURITY_ARCHITECTURE.md`, `AI_SECURITY_MODEL.md` |
| 8 | **Compliance** | KYC/AML/sanctions/travel-rule, audit completeness, retention/erasure. | `COMPLIANCE_ARCHITECTURE.md`, `AUDIT_ARCHITECTURE.md`, `PRIVACY_MODEL.md` |
| 9 | **Accessibility** | WCAG on all surfaces; design-system a11y baseline. | `FRONTEND_IMPLEMENTATION_PLAN.md §3` |
| 10 | **Chaos** | kill services/regions, poison events, latency injection; verify recovery + idempotency. | `EVENT_ARCHITECTURE.md §7`, `DISASTER_RECOVERY_PLAN.md` |
| 11 | **Disaster Recovery** | backup restore, regional failover, key recovery, ledger↔audit reconciliation. | `DISASTER_RECOVERY_PLAN.md` |

---

## 2. What each discipline must prove (excerpts)

- **Unit:** avg-cost-basis single implementation; supply invariant (no oversell); commission = base×rate; amount = tokens×price.
- **Integration:** InvestmentConfirmed → OwnershipUpdated → PortfolioRecomputed + CommissionCalculated → TreasuryMovementApproved (Flow A). At-least-once idempotency.
- **Contract:** ERC1155 settlement matches DB; timelock enforced; upgrade requires governance; `EmergencyLockdown` halts value paths.
- **E2E:** a referred investor invests → agent commission + leaderboard update; dividend snapshot immutable.
- **Security:** out-of-scope request denied; AI never emits value-moving event; malformed explainability envelope rejected.
- **Compliance:** PII segregated; erasure propagates to memory+knowledge; audit hash-chain intact; travel-rule hold.
- **Chaos/DR:** duplicate events no double effect; failover preserves two-stage gating + data residency; key Shamir recovery under dual-control.

---

## 3. Test layers & ownership

| Layer | Location | Owner |
|-------|----------|-------|
| Unit/Integration | per `services/*`, `packages/*` | module squad |
| Contract | `contracts/` + `tests/contract` | Smart Contract squad |
| E2E/Load/Chaos/DR | `tests/` (cross-cutting) | Platform/QA squad |
| Security/Compliance | `tests/security`, `tests/compliance` | Security/Compliance squad |

---

## 4. Quality gates (gates reference these)

Each milestone (`IMPLEMENTATION_ROADMAP_V2.md`) requires:
- **Build:** green typecheck/lint, no duplicate rule implementations (lint rule / code review).
- **Testing:** unit+integration+contract pass; E2E for the milestone's journeys; security gate green.
- **Performance:** within `PERFORMANCE_TARGETS.md` for touched surfaces.
- **Compliance:** KYC/AML/audit/PII tests green where in scope.
- **Security:** SAST/DAST/dependency/secret-scan + adversarial AI scan green.
- **Release:** docs/runbooks updated; rollback verified in staging.
- **Rollback:** last-good artifact validated; DR drill pass for value paths.

---

## 5. No-conflict enforcement in tests

- A canonical rule has exactly **one** authoritative test (in owning module). Other modules test *consumption* of the rule via event/API, not re-implementation.
- Shared fixtures from `DOMAIN_MODEL.md` entities + `EVENT_ARCHITECTURE.md` schema registry prevent divergent mocks.
- Any test revealing a rule conflict → blocks release + routes to governance clarification (architecture frozen).
