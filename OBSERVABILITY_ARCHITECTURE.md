# Observability Architecture — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `RISK_ENGINE.md`, `FRAUD_ENGINE.md`, `COMPLIANCE_ARCHITECTURE.md`, `AUDIT_ARCHITECTURE.md`. Defines dashboards, alerting, and incident timeline.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

Observability is the **eyes** of the security layer: it consumes security events + audit + risk/fraud/compliance signals and presents them to the right roles, with alerting and an incident timeline. It never acts on its own.

---

## 1. Telemetry sources

- **Security events** (`SECURITY_EVENT_EXTENSION.md`): `IdentityVerified`, `RiskScoreChanged`, `FraudDetected`, `ComplianceApproved/Rejected`, `AMLAlertRaised`, `PermissionGranted/Revoked`, `SecretRotated`, `ThreatDetected`, `IncidentCreated/Resolved`, `AuditExported`, `EmergencyLockdown`.
- **Ecosystem events** (`EVENT_ARCHITECTURE.md`): `AlertRaised`, `ComplianceFlagRaised`, `SystemPaused`, `AdminActionLogged`, treasury/governance/marketplace events.
- **AI events** (`AI_EVENT_EXTENSION.md`): `AIFraudDetected`, `AIRiskDetected`, `AIModelUpdated`.
- **Audit** (entity 19): full immutable record for drill-down.
- **Infra metrics:** auth latency, rate-limit hits, secret-rotation status, key health.

---

## 2. Dashboards (role-scoped)

| Dashboard | Audience | Contents |
|-----------|----------|----------|
| **Security Dashboard** | Admin/Super | auth success/failure, MFA coverage, session health, policy changes, secret status. |
| **Threat Dashboard** | Security/Compliance | active threats, `ThreatDetected`, `FraudDetected`, attack vectors, geo. |
| **Compliance Dashboard** | Compliance Officer | KYC/KYB backlog, AML alerts, sanctions hits, PEP, travel-rule gaps, audit exports. |
| **Risk Dashboard** | Risk/Exec/Compliance | risk scores per domain (12), trends, critical flags. |
| **Treasury Monitoring** | Treasury/Exec | reserves, liquidity, movement anomalies, limits, lockdown state. |
| **AI Monitoring** | AI Gov Board/Compliance | model drift, confidence calibration, abuse, override rates, `AIModelUpdated`. |
| **Marketplace Monitoring** | Property/Marketplace Mgr | fake-listing signals, liquidity, price manipulation, supply integrity. |
| **Governance Monitoring** | Governance Mgr/Exec | proposal risk, participation, execution health. |

All dashboards read from projections; no dashboard authorizes an action.

---

## 3. Alerting

- **Severity:** info / low / medium / high / critical.
- **Routing:** by severity + domain to role (Compliance, Treasury, Security, Admin).
- **Channels:** in-app, email, on-chain alert, pager for critical.
- **Deduplication/correlation:** related signals grouped into one incident (`IncidentCreated`).
- **Throttling:** rate-limited to avoid alert fatigue; burst protection.

Examples: `Critical` treasury anomaly → Treasury + Exec + `EmergencyLockdown` review; `High` fraud flag → Compliance; `Medium` risk step-up → silent (adaptive auth).

---

## 4. Incident timeline

- A unified, time-ordered view per incident: detection → signals → actions → resolution.
- Built from security events + audit entries sharing an `incidentId`.
- Supports postmortem + regulatory reporting (`IncidentResolved` closes; evidence preserved).
- Read scopes: incident participants + Compliance/Admin/Super; PII minimized.

---

## 5. Continuous verification feedback

- Observability feeds the Risk Engine (behavior trends) and Fraud Engine (pattern confirmation).
- Dashboard anomalies (e.g., auth spike, config churn) can raise `ThreatDetected` for review.

---

## 6. Integration

| Domain | Touchpoint |
|--------|-----------|
| Risk/Fraud/Compliance | primary signal sources. |
| Audit | drill-down + incident timeline source of truth. |
| Identity/Auth | auth metrics + session health. |
| Secrets/Infra | rotation + key health. |
| AI Platform | AI monitoring dashboard. |
| Incident Response | alerting → `IncidentCreated`. |

Inherits scalability: projections pre-aggregated; per-event lightweight ingest; regional replicas for low-latency global views.
