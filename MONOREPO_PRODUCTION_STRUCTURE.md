# Monorepo Production Structure — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `IMPLEMENTATION_DEPENDENCY_GRAPH.md`. Final production repository layout for long-term enterprise scaling. Planning only; no code, no framework lock-in.

The structure follows the locked module folder contract (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §4`): every module = `domain/ types/ mock/ hooks/ utils/ components/`. The monorepo extends this to a platform scale with shared, contracts, services, workers, infrastructure.

---

## 1. Top-level layout

```
relcko/
├── apps/                 # deployable applications (frontends + app servers)
├── packages/             # reusable libraries (domain, types, ui, utils)
├── contracts/            # smart contracts (Solidity source + artifacts, locked by spec)
├── services/             # backend services (per domain / bounded context)
├── workers/              # async workers (event consumers, projections, indexing)
├── shared/               # cross-cutting shared code (event bus, permission, audit)
├── tooling/              # build, lint, codegen, scaffolding
├── docs/                 # locked architecture specs + this blueprint
├── tests/                # cross-cutting + e2e + load + chaos suites
├── infrastructure/       # IaC, k8s, secrets, DR, observability config
└── scripts/              # release, migration, one-off ops
```

---

## 2. `apps/` — deployable surfaces

| Path | Purpose | Depends on |
|------|---------|------------|
| `apps/web` | Primary Next-style web app (Marketplace, Portfolio, NFT, Governance, Treasury, Agent, Admin, AI Copilot). | `packages/ui`, `packages/domain-*`, `services/*` |
| `apps/mobile` (future) | React-Native/equivalent app; reuses API + `IDENTITY_AND_ACCESS_MODEL.md` device binding. | same as web (via public API) |
| `apps/admin` | Admin Portal (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.12`). | all services + `packages/permission` |
| `apps/developer` (future) | Developer Portal; reads specs + observability. | services + `packages/observability` |
| `apps/docs` | Architecture doc site (the locked specs + blueprint). | `docs/` |

---

## 3. `packages/` — reusable libraries

| Package | Responsibility | Public interfaces | Depends on |
|---------|----------------|-------------------|------------|
| `packages/domain-core` | Core entities from `DOMAIN_MODEL.md` (Investor, Property, Ownership, Transaction, AuditLog…). | entity types, invariants. | `shared/events` |
| `packages/domain-nft` | `NFT_DOMAIN_MODEL.md`, `NFT_TYPES.md`. | NFT entity types. | domain-core |
| `packages/domain-treasury` | `TREASURY_DOMAIN_MODEL.md` if present; else Treasury types. | Treasury types. | domain-core |
| `packages/types` | Shared TypeScript/equivalent types for events, permissions, API DTOs. | typed event schemas. | `shared/events` |
| `packages/ui` | Design system (RC18–RC20 glass/card/typography/motion primitives). | components. | none |
| `packages/permission` | `PERMISSION_MODEL.md` + `IDENTITY_AND_ACCESS_MODEL.md` engine. | `authorize()`, scopes. | domain-core, shared/events |
| `packages/audit` | `AUDIT_ARCHITECTURE.md` client (append + read scoped). | `writeAudit()`, `readAudit()`. | shared/events, domain-core |
| `packages/compliance` | `COMPLIANCE_ARCHITECTURE.md` client. | verification gates. | domain-core |
| `packages/ai-sdk` | AI Platform client (engines, knowledge, memory, explainability envelope). | `requestEngine()`, envelope types. | shared/events, types |
| `packages/security` | `SECURITY_ARCHITECTURE.md` client (auth, crypto, secrets refs). | auth/enc helpers. | shared, permission |
| `packages/utils` | date/money/format/id helpers (single implementations, no dup). | pure functions. | none |

**Ownership:** each package owned by the squad for its domain; `packages/utils` + `packages/types` owned by Core Platform squad.
**Versioning:** independent semver per package; lockstep release via monorepo versioning tool for coordinated cuts.

---

## 4. `contracts/` — smart contracts

| Path | Contents | Locked spec |
|------|----------|-------------|
| `contracts/tokens` | RLKO token, fraction NFT, property NFT. | `NFT_DOMAIN_MODEL.md`, token specs |
| `contracts/marketplace` | primary + secondary marketplace. | `MARKETPLACE_INVESTMENT_ENGINE.md` |
| `contracts/treasury` | treasury + multi-sig + yield. | `TREASURY_ARCHITECTURE.md` |
| `contracts/dividend` | dividend distribution. | `DIVIDEND_ENGINE.md` |
| `contracts/governance` | governor + voting + timelock. | `GOVERNANCE_ARCHITECTURE.md` |
| `contracts/network` | commission/referral/agent. | `NETWORK_ENGINE_ARCHITECTURE.md`, `COMMISSION_ENGINE.md` |
| `contracts/security` | security modules, upgradeability, emergency controls. | `SECURITY_ARCHITECTURE.md`, `TREASURY_SECURITY_MODEL.md` |
| `contracts/lib` | shared libraries (upgrade proxy, access control). | — |
| `artifacts/`, `deployments/` | compiled + verified deployment records. | — |

**Ownership:** Smart Contract squad; changes require governance-approved revision (architecture frozen).

---

## 5. `services/` — backend services (bounded contexts)

One service per module (or cohesive group), each exposing only via the API gateway + event bus.

| Service | Module | Locked spec |
|---------|--------|-------------|
| `services/identity` | Identity/Wallet/Auth. | `IDENTITY_AND_ACCESS_MODEL.md` |
| `services/marketplace` | Marketplace + Investment. | `MARKETPLACE_INVESTMENT_ENGINE.md` |
| `services/ownership` | Ownership. | `OWNERSHIP_MODEL.md` |
| `services/nft` | NFT Marketplace. | `NFT_MARKETPLACE_ARCHITECTURE.md` |
| `services/network` | Network Engine + Commission. | `NETWORK_ENGINE_ARCHITECTURE.md` |
| `services/portfolio` | Portfolio projection. | `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.6` |
| `services/treasury` | Treasury. | `TREASURY_ARCHITECTURE.md` |
| `services/dividend` | Dividend Center. | `DIVIDEND_ENGINE.md` |
| `services/governance` | Governance. | `GOVERNANCE_ARCHITECTURE.md` |
| `services/documents` | Document Vault. | `DOCUMENT_MANAGEMENT_ARCHITECTURE.md` |
| `services/notifications` | Notification Engine. | `RELCKO_ECOSYSTEM_ARCHITECTURE.md §1` |
| `services/geo` | Global Property Intelligence. | `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.10` |
| `services/ai` | AI Platform (engines + knowledge + memory). | `AI_PLATFORM_ARCHITECTURE.md` |
| `services/security` | Security/Compliance/Risk/Fraud cross-cutting. | `SECURITY_ARCHITECTURE.md` |
| `services/admin` | Admin orchestration. | `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.12` |
| `services/public-api` (future) | External API gateway. | `SECURITY_ARCHITECTURE.md §2.6` |

**Public interfaces:** each service exposes typed DTOs (from `packages/types`) + subscribes/publishes events (`shared/events`). No service calls another directly.
**Ownership:** module squad. **Versioning:** service version aligned to package version set.

---

## 6. `workers/` — async processors

| Worker | Consumes | Purpose | Spec |
|--------|----------|---------|------|
| `workers/projection` | domain events | rebuild read models (Portfolio, Leaderboard, VotingPower). | `EVENT_ARCHITECTURE.md §5` |
| `workers/notification` | `NotificationSent`, `AlertRaised` | deliver alerts. | ecosystem §1 |
| `workers/ai-index` | ecosystem events | build Knowledge Layer (`KnowledgeIndexed`). | `AI_KNOWLEDGE_MODEL.md` |
| `workers/ai-memory` | interaction/feedback | update Memory Layer (`MemoryUpdated`). | `AI_MEMORY_MODEL.md` |
| `workers/risk` | telemetry/events | compute risk scores (`RiskScoreChanged`). | `RISK_ENGINE.md` |
| `workers/fraud` | telemetry/events | fraud detection (`FraudDetected`). | `FRAUD_ENGINE.md` |
| `workers/compliance` | KYC/AML events | screening + monitoring. | `COMPLIANCE_ARCHITECTURE.md` |
| `workers/settlement` | sale/investment events | async treasury settlement. | `PAYMENT_SETTLEMENT_ARCHITECTURE.md` |

Idempotent (keyed by `eventId` + aggregateId), at-least-once (`EVENT_ARCHITECTURE.md §1`).

---

## 7. `shared/` — cross-cutting

| Path | Responsibility | Spec |
|------|----------------|------|
| `shared/events` | Event bus client + schema registry + envelope. | `EVENT_ARCHITECTURE.md` + extensions |
| `shared/permission` | Permission service integration. | `PERMISSION_MODEL.md` |
| `shared/audit` | Audit write/read helpers (entity 19). | `AUDIT_ARCHITECTURE.md` |
| `shared/crypto` | HSM/vault client refs, signing. | `SECURITY_ARCHITECTURE.md §2.12` |
| `shared/observability` | logging/metrics/tracing clients. | `OBSERVABILITY_ARCHITECTURE.md` |
| `shared/config` | feature-flag + config loading. | `CI_CD_RELEASE_STRATEGY.md` |

---

## 8. `tooling/`, `docs/`, `tests/`, `infrastructure/`, `scripts/`

| Dir | Responsibility |
|-----|----------------|
| `tooling/` | monorepo build, lint, typegen from event/entity specs, scaffolding, contract deploy tooling. |
| `docs/` | all locked architecture specs (V1.1–V1.8) + this blueprint (V1.9). Single source of truth. |
| `tests/` | cross-cutting e2e, load, chaos, DR, compliance suites (see `TESTING_AND_QA_STRATEGY.md`). |
| `infrastructure/` | IaC (k8s/terraform), secrets/HSM, multi-region, DR, observability dashboards/alerts. |
| `scripts/` | release automation, data migration (`MIGRATION_STRATEGY.md`), key rotation, one-off ops. |

---

## 9. Scaling & governance notes

- Each `services/*` and `packages/*` is independently deployable/testable → supports 100M users / multi-cloud.
- No circular build deps: modules link via `shared/events` + `packages/types` only.
- Architecture docs are frozen in `docs/`; implementation may not fork them. Ambiguity → governance clarification, not new doc.
