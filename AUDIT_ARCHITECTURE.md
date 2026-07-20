# Audit Architecture — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `DOMAIN_MODEL.md` (AuditLog entity 19), `EVENT_ARCHITECTURE.md`, `ENTITY_RELATIONSHIP.md`. Defines the immutable audit record across all subsystems.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

Inherits the locked `AuditLog` (entity 19) contract: append-only, never edited; corrections are offsetting entries (`ENTITY_RELATIONSHIP.md` rule 2). This document extends coverage to every security/compliance/trust subsystem and defines the audit as the **system of record for accountability**.

---

## 1. Audit record (entity 19, extended)

Every auditable action writes one immutable record:
`{ id, actorId, delegateId?, action, entityType, entityId, before, after, ip, userAgent, deviceId?, riskScore?, ruleRef, evidenceRef, timestamp }`.

- `actorId` is the human/role accountable; `delegateId` present when acting under delegated access (`IDENTITY_AND_ACCESS_MODEL.md` §5).
- `ruleRef` cites the policy/control that fired (authorization, limit, compliance).
- `evidenceRef` links to source event / ledger entry / document.
- `before`/`after` captured atomically with the mutation.

---

## 2. Immutable audit coverage

| Area | What is audited |
|------|-----------------|
| **Authentication** | login success/failure, MFA/step-up, passkey/hardware use, session issuance/revocation, recovery. |
| **Permissions** | grant/revoke, policy change, temporary permission, delegation; `PermissionGranted`/`PermissionRevoked`. |
| **Investments** | invest/confirm/refund, ownership delta; mirrors `Transaction` (9). |
| **NFTs** | mint/transfer/burn/freeze/recovery; `NFTFrozen` etc. |
| **Governance** | proposal create/vote/execute, parameter change; `ProposalExecuted`. |
| **Treasury** | deposit/withdraw/rebalance/yield, movement approval; `TreasuryMovementApproved`. |
| **AI** | recommendation generate/accept/reject, model update, knowledge/memory change (`AI_EVENT_EXTENSION.md`). |
| **Documents** | upload/verify/access/grant; KYC submit/approve/reject. |
| **Compliance** | KYC/KYB/AML/PEP/sanctions/travel-rule decisions; `ComplianceApproved`/`ComplianceRejected`. |
| **Admin Actions** | every privileged mutation wrapped in `AdminActionLogged`. |
| **Configuration Changes** | policy/limit/parameter changes; version + actor. |
| **Emergency Actions** | lockdown, pause, break-glass; `EmergencyLockdown`, `SystemPaused`. |

---

## 3. Immutability & integrity

- **Append-only:** no update/delete paths; corrections are offsetting entries.
- **Tamper-evidence:** records hash-chained (each record references prior hash) so reordering/editing is detectable.
- **Reconciliation:** audit and `Transaction` ledger must agree on value moves; discrepancy → `AlertRaised` + investigation.
- **Retention:** per jurisdiction (`PRIVACY_MODEL.md`); archived, never deleted within retention.

---

## 4. Access & export

- **Read scopes:** Compliance Officer, Auditor, Administrator, Super Administrator per `PERMISSION_MODEL.md` (full AuditLog read). Others see only their own `OWN` records.
- **Export:** regulated export via `AuditExported` (security event); access-controlled, logged, and scoped (no bulk PII leak).
- **Legal hold:** compliance/legal can place a hold preventing archival/purge of a subset.

---

## 5. Audit as continuous verification

- Audit feeds the Risk Engine (behavior history) and Fraud Engine (pattern detection).
- Anomalous audit patterns (e.g., off-hours admin mass changes) → `ThreatDetected` + review.
- AI audit entries carry the explainability envelope so AI decisions are reconstructable (`AI_EXPLAINABILITY_MODEL.md`).

---

## 6. Integration

| Domain | Touchpoint |
|--------|-----------|
| All modules | every mutation writes `AuditLog` (19). |
| Event bus | security events mirror to audit. |
| Privacy | PII in audit is segregated/minimized; export respects jurisdiction. |
| Observability | audit underpins compliance/security dashboards + incident timeline. |
| DR | audit is part of the durable, replicated store (see `DISASTER_RECOVERY_PLAN.md`). |

Emits `AuditExported`; inherits `AdminActionLogged`, `ComplianceFlagRaised`, `SystemPaused` from `EVENT_ARCHITECTURE.md`.
