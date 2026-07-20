# Security Event Extension — Relcko Enterprise Security (V1.8.0)

**Companion to:** `EVENT_ARCHITECTURE.md` (locked), `SECURITY_ARCHITECTURE.md`. Extends the canonical event catalog with security, compliance, risk, fraud, and incident events.
**Status:** Architecture only. Framework-agnostic. No implementation.

**Rule:** Cross-module effects happen ONLY through events (`EVENT_ARCHITECTURE.md`). This extension adds the security-layer events. The security layer emits **advisory + state** events; it never emits value-moving events itself (`TreasuryWithdrawal`, `OwnershipUpdated`, `ProposalExecuted` remain owned by their modules through the gated path).

---

## 1. Transport & guarantees (inherits `EVENT_ARCHITECTURE.md §1`)

- Same durable, append-only bus; same schema:
  `{ eventId, type, aggregateId, occurredAt, actorId, version, payload }`.
- At-least-once → consumers idempotent (keyed by `eventId` + aggregateId).
- Every security event mirrors to `AuditLog` (19).
- Payload is the only security-specific part.

---

## 2. Security event catalog (additive to `EVENT_ARCHITECTURE.md §2`)

### Identity & access
- `IdentityVerified` (Identity/Compliance) → unblocks gated actions; carries method + level.
- `PermissionGranted` (Authorization/Admin) → role/scope/temporary grant applied.
- `PermissionRevoked` (Authorization/Admin) → grant removed/expired.

### Risk & fraud
- `RiskScoreChanged` (Risk Engine) → score update for an entity/domain; drives step-up.
- `FraudDetected` (Fraud Engine) → abuse signal; references vector + evidence; routes to Compliance.
- `ThreatDetected` (Risk/Fraud/Infra/Security) → active threat; severity + domain.

### Compliance
- `ComplianceApproved` (Compliance Officer, human) → KYC/KYB/AML/flag cleared.
- `ComplianceRejected` (Compliance Officer, human) → blocked; appeal path.
- `AMLAlertRaised` (Compliance) → AML/sanctions/PEP hit; may require regulatory report.

### Secrets & infra
- `SecretRotated` (Infrastructure Security) → key/secret/cert/signing-key rotation completed.

### Incident & emergency
- `IncidentCreated` (Incident Response) → detection + correlation into an incident.
- `IncidentResolved` (Incident Response) → containment/recovery complete; evidence preserved.
- `AuditExported` (Compliance/Legal) → regulated export of audit subset (scoped).
- `EmergencyLockdown` (Super Admin / Emergency multi-sig) → halts value paths; emits `SystemPaused` (canonical) + freezes affected domains.

> Note: canonical events already in `EVENT_ARCHITECTURE.md` — `AlertRaised`, `ComplianceFlagRaised`, `SystemPaused`, `AdminActionLogged`, `RoleChanged` — remain valid and are reused by the security layer. AI events (`AIFraudDetected`, `AIRiskDetected`, `AIModelUpdated`) from `AI_EVENT_EXTENSION.md` feed Observability/Security dashboards.

---

## 3. New events → subscriber responsibilities

| Subscriber | Listens for | Effect (idempotent) |
|------------|-------------|---------------------|
| **Authorization** | `RiskScoreChanged`, `IdentityVerified`, `PermissionGranted/Revoked` | Step-up / scope update / revoke. |
| **Compliance** | `FraudDetected`, `AMLAlertRaised`, `ThreatDetected` | Triage; human decides flag/freeze. |
| **Risk Engine** | `FraudDetected`, `ThreatDetected` | Cross-validate; update scores. |
| **Treasury Security** | `EmergencyLockdown`, `ThreatDetected` (treasury) | Enforce halt; review. |
| **Observability** | ALL security events | Dashboards + alerting + incident timeline. |
| **Incident Response** | `ThreatDetected`, `FraudDetected`, `AMLAlertRaised` | Correlate → `IncidentCreated`. |
| **Audit** | ALL | Mirror to `AuditLog` (19). |
| **Privacy/DR** | `AuditExported`, `SecretRotated`, `EmergencyLockdown` | Export control / key state / continuity. |
| **AI Platform** | `FraudDetected`, `RiskScoreChanged`, `AMLAlertRaised` | Advisory context for Compliance AI (human decides). |

---

## 4. Key flows (security extended)

### Flow K — Risk-driven step-up
```
Event/telemetry → Risk Engine → RiskScoreChanged
   ├─▶ Authorization: step-up auth if threshold crossed
   ├─▶ Observability: risk dashboard + alert if critical
   └─▶ AuditLog mirror
```

### Flow L — Fraud → incident
```
FraudDetected / ThreatDetected / AMLAlertRaised
   ├─▶ Observability correlate → IncidentCreated
   ├─▶ Compliance triage (human) → ComplianceFlagRaised / freeze
   └─▶ AuditLog mirror
```

### Flow M — Emergency
```
EmergencyLockdown (Super/ multi-sig)
   ├─▶ SystemPaused (canonical) + value-path halt
   ├─▶ Treasury Security enforce; Observability alert
   └─▶ AuditLog mirror; later IncidentResolved on recovery
```

### Flow N — Secret/key
```
SecretRotated → DR key state update; AuditLog mirror; alert on failure
```

---

## 5. Versioning & evolution (inherits `EVENT_ARCHITECTURE.md §6`)

- `version` field on every security event enables safe schema evolution.
- Additive payload fields only; consumers ignore unknown fields.
- Breaking changes → new `type` (e.g., `FraudDetectedV2`), old retired after dual-write window.
- Security event schema registry stored alongside the ecosystem registry (interface seam).

---

## 6. Failure handling (inherits `EVENT_ARCHITECTURE.md §7`)

- **Poison event:** dead-letter; source paused; `AlertRaised`.
- **Out-of-order:** projection applies if causal deps present, else buffers.
- **Duplicate:** idempotency key (`eventId`) drops replay.
- **Downstream outage:** events retained; replay on recovery (at-least-once).
- **Security-event loss:** audit is the durable backstop; security events are reconstructable from `AuditLog` where needed.
