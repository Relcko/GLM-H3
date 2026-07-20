# CI/CD & Release Strategy — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `MONOREPO_PRODUCTION_STRUCTURE.md` (`infrastructure/`, `tooling/`). Branch/release/flags/gates/rollback/versioning. Planning only; no code.

CI/CD enforces the frozen-architecture rule: builds may not alter spec-defined behavior; conflicts fail the pipeline and route to governance.

---

## 1. Branch strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | releasable, always green. | required reviews + all gates. |
| `release/vX.Y` | stabilization for a milestone. | hard freeze of features; fixes only. |
| `feature/*` | one spec-bound change. | PR → `main`; requires gate suite. |
| `fix/*` | bug/regression. | PR → `main`. |
| `docs/*` | doc-only (incl. spec clarifications). | review by Architecture board if touching locked specs. |

No direct pushes to `main`/`release/*`. Architecture docs in `docs/` are changed only via governance-approved revision.

---

## 2. Release strategy

- **Milestone releases** aligned to `IMPLEMENTATION_ROADMAP_V2.md` (V2.0–V3.0).
- **Independent package versions** (semver) with a coordinated monorepo version set for cutover.
- **Progressive delivery:** canary → staged regions → global; contracts via timelock/multi-sig.
- **Mainnet launch (V3.0)** gated by full DR + compliance + security sign-off + `MIGRATION_STRATEGY.md` cutover.

---

## 3. Feature flags

- Flags in `shared/config`; default-off for risky; server-side evaluated (never client trust).
- Flag changes are privileged (`AdminActionLogged`); audit-trailed.
- Flags allow safe rollback of behavior without redeploy.
- AI model/prompt config behind flags, reviewed under `AI_GOVERNANCE_MODEL.md`.

---

## 4. Preview environments

- Per-PR ephemeral preview (apps + dependent services) for E2E/visual.
- Contract preview forks (testnet) for contract PRs.
- Tear-down after merge; isolated data; no PII from prod.

---

## 5. Gates (pipeline stages)

| Gate | Checks | Fail behavior |
|------|--------|---------------|
| **Testing** | unit+integration+contract; E2E for milestone; a11y. | block merge. |
| **Security** | SAST/DAST, dependency + secret scan, adversarial AI scan, authz tests. | block; alert Security. |
| **Deployment** | infra plan review, quota, DR drill (for value paths), contract verify. | block promotion. |
| **Compliance** | KYC/AML/audit/PII tests where in scope. | block if regulated path touched. |
| **Performance** | within `PERFORMANCE_TARGETS.md`. | block if regression beyond budget. |

All gates run on `main` and `release/*`; preview runs testing+security subset.

---

## 6. Rollback

- **App/Service:** last-good immutable artifact; flag flip or redeploy; idempotent.
- **Contracts:** upgrade proxy to previous verified implementation (upgradeability plan §13); timelock respected.
- **Data:** no destructive migrations; corrections offsetting (`ENTITY_RELATIONSHIP.md` rule 2); rollback never edits ledger/audit.
- **DR-tested:** rollback verified in staging each milestone (gate).

---

## 7. Versioning

- **Packages/services:** semver; lockstep set for coordinated releases.
- **Contracts:** semver + verified artifact hash + deployment record in `contracts/deployments`.
- **Events:** `version` field per `EVENT_ARCHITECTURE.md §6`; additive only; breaking → new `type` + dual-write.
- **Specs:** frozen at V1.9.0; revisions get a formal revision number approved by governance.

---

## 8. Observability in CI/CD

- Deploy emits health/metric checks; alert on regression (`OBSERVABILITY_ARCHITECTURE.md`).
- Post-deploy smoke + canary metrics gate full rollout.
- Audit of deploy actions themselves (`AuditExported` where regulated).
