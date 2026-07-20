# Disaster Recovery Plan — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `AUDIT_ARCHITECTURE.md`, `PRIVACY_MODEL.md`, `TREASURY_SECURITY_MODEL.md`. Defines RPO/RTO, backups, failover, key/treasury recovery, continuity.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

The DR plan protects the **durable state** of the ecosystem — ledger (`Transaction` 9), audit (`AuditLog` 19), ownership, treasury custody, identities, and cryptographic keys — across regions and clouds. It preserves the locked invariants: money/ownership sacred, two-stage gating, immutable audit.

---

## 1. Objectives

| Metric | Target (aspirational; tune per SLA) |
|--------|--------------------------------------|
| **RPO** (Recovery Point Objective) | Near-zero for ledger/audit (durable replicate); small window for derived projections (rebuildable). |
| **RTO** (Recovery Time Objective) | Hot paths (auth, read) minutes; treasury movement gated resume within defined window; full regional failover per plan. |

Derived read models (Portfolio, Leaderboard, VotingPower, Risk/Fraud projections) are **rebuildable** from the event log — they have RPO = replay-able, no separate backup needed.

---

## 2. Backup tiers

| Tier | What | Cadence | Use |
|------|------|---------|-----|
| **Hot Backup** | Live replicated ledger + audit + ownership across regions (synchronous/near-sync). | continuous | instant regional failover; zero data loss. |
| **Warm Backup** | Secondary region standby services + recent snapshots. | periodic | fast RTO for region loss; partial compute resume. |
| **Cold Backup** | Immutable, encrypted archival of ledger + audit + keys (air-gapped/object). | scheduled | long-term + catastrophic recovery; legal retention. |

All backups encrypted; PII backups respect residency (`PRIVACY_MODEL.md` §7); audit backups hash-chained for integrity.

---

## 3. Regional failover

- **Active-active / active-standby** across global regions for auth + read paths (stateless, horizontally scalable).
- Failover is **automatic for stateless paths**; **human-declared for value-moving paths** (treasury/governance) to preserve two-stage gating + multi-sig.
- Traffic routing respects data residency — PII not silently replicated cross-border.
- Health probes + `ThreatDetected`/`AlertRaised` can trigger failover review; `EmergencyLockdown` can halt value paths globally.

---

## 4. Key recovery (Infrastructure Security)

- **HSM/Vault** per region; signing/recovery keys in quorum (m-of-n custodians).
- **Key rotation** scheduled + on suspected compromise (`SecretRotated` event).
- **Recovery keys** split (Shamir) across independent custodians; no single custodian can reconstruct.
- Lost-key/compromise → dual-control re-assignment; new custodian still bound by limits (`TREASURY_SECURITY_MODEL.md` §4).
- Never bypasses two-stage gating; recovery actions audited.

---

## 5. Treasury recovery

- **Custody redundancy:** multi-sig across regions/custodians; cold storage offline.
- **Reconciliation:** on recovery, on-chain balances reconciled vs `Transaction` ledger; mismatch → `AlertRaised` + investigation, offsetting entries only.
- **Reserve evidence:** yield/balance proofs reconstructable from ledger + `YieldRecord`.
- Treasury resume requires Governance/Treasury multi-sig re-authorization post-failover (never auto-executes movement).

---

## 6. Business continuity

- **Tiered operations:** critical (auth, ledger, compliance, treasury gating) resume first; non-critical (analytics, some dashboards) later.
- **Break-glass:** Super Admin / Emergency multi-sig for `EmergencyLockdown`, pause, controlled resume; cooldown + alert (`PERMISSION_MODEL.md` §6).
- **Communication plan:** internal + (if required) user/regulator notification during incident.
- **Runbooks:** per failure mode (region loss, key compromise, ledger corruption, PII breach).

---

## 7. Testing & validation

- **Backup restore drills:** periodic; verify hash-chain integrity + rebuild of projections.
- **Failover game-days:** simulate region loss; confirm RTO/RPO + two-stage gating intact.
- **Key recovery drill:** Shamir reconstruction under dual-control.
- **Audit reconciliation:** post-recovery ledger↔audit agreement check.

---

## 8. Integration

| Domain | Touchpoint |
|--------|-----------|
| Audit | durable, replicated, hash-chained; backbone of DR. |
| Secrets/Infra | key custody + rotation + recovery. |
| Treasury Security | custody redundancy + post-failover re-auth. |
| Privacy | residency-preserving backup; sealed regulatory retention. |
| Observability | DR state + runbook execution visible. |
| Security events | `SecretRotated`, `EmergencyLockdown`, `IncidentCreated/Resolved` mark DR states. |

This plan, combined with `SECURITY_EVENT_EXTENSION.md` and `OBSERVABILITY_ARCHITECTURE.md`, closes the protect → detect → recover loop for the Relcko ecosystem.
