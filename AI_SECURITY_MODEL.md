# AI Security Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_ENGINE_ARCHITECTURE.md`, `AI_MEMORY_MODEL.md`. Defines the threat model and protective controls.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

The AI Platform inherits the ecosystem's security contract (`PERMISSION_MODEL.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §1`): server-side enforcement, least privilege, two-stage gating, full audit. This document adds the AI-specific threat surface.

---

## 1. Threat model

| # | Threat | Description | Primary control |
|---|--------|-------------|-----------------|
| T1 | **Prompt injection** | Malicious text in user input, documents, or knowledge poisons model behavior/instructions. | Input sanitization, instruction/data separation, allow-list tools, output validation. |
| T2 | **Data leakage** | AI returns another actor's PII or internal data out of scope. | Scope Gate, redaction, PII segregation, output filters. |
| T3 | **Model abuse** | Excessive/crafted queries to manipulate, probe, or exhaust resources. | Rate limiting, quotas, anomaly detection, cost guards. |
| T4 | **Unauthorized access** | Actor without role/scope invokes an engine or reads artifacts. | Permission service at Scope Gate + event handlers. |
| T5 | **Sensitive data exposure** | Secrets, KYC, wallet↔identity revealed in outputs/memory/logs. | Secret isolation, PII tiering, log scrubbing, memory redaction. |
| T6 | **Model drift** | Model degrades/becomes miscalibrated over time or regime change. | Monitoring, recalibration, shadow mode, auto-rollback. |
| T7 | **Hallucination** | Confident but false output (nonexistent property, wrong figure). | Grounding to knowledge, citation requirement, confidence gating, human review. |
| T8 | **Audit logging** | AI actions not recorded, breaking compliance. | Mandatory `AuditLog` mirror for every AI write/event. |
| T9 | **Rate limiting** | Denial-of-service / cost blowup via flood. | Per-actor + per-engine limits, backpressure, circuit breakers. |
| T10 | **Supply-chain / vendor** | Compromised or changing model vendor behaves unexpectedly. | Adapter seam, vendor isolation, output contract enforcement. |

---

## 2. Control layers

### 2.1 Scope Gate (entry)
- Enforces `PERMISSION_MODEL.md`: `role ∈ requiredRoles` AND `scope ⊆ actorScope` AND `not blocked by compliance flag`.
- Rejects any request whose intended output would cross scopes (e.g., Investor asking for another investor's portfolio).
- Implemented at the engine boundary (`AI_ENGINE_ARCHITECTURE.md §1.1`); defense-in-depth re-check inside the engine.

### 2.2 Input controls (T1)
- **Separation of instructions and data:** user/doc content is never treated as instructions (no "ignore previous rules" effect).
- **Sanitization:** strip executable/control payloads from ingested documents, support transcripts, external feeds.
- **Allow-list tools:** agentic workflows may only use declared read-only tools; no arbitrary tool creation.

### 2.3 Output controls (T2, T5, T7)
- **Redaction filter:** removes out-of-scope PII before return; inherited from `CopilotPolicy` redaction rules.
- **Grounding check:** outputs must cite `dataSources`; ungrounded claims are flagged or rejected.
- **Hallucination guard:** factual claims (figures, entities) validated against knowledge; mismatch → low confidence / reject.
- **Log scrubbing:** `AuditLog`/`MemoryUpdated` never contain raw secrets or full KYC docs.

### 2.4 Rate limiting & abuse (T3, T9)
- Per-actor quotas (requests/time), per-engine quotas (compute/cost), global circuit breakers.
- Abuse pattern detection (probe sequences, prompt-injection dictionaries) → throttle + `AIAlertRaised` + `AuditLog`.
- Cost guards: cap spend per engine/period; alert on anomaly.

### 2.5 Access control (T4)
- Same enforcement points as `PERMISSION_MODEL.md §5`: route/API, engine service, event handlers, UI (UX only).
- AI events are consumed only by authorized subscribers; projection writes verify `actorId` scope.

### 2.6 Drift & quality (T6)
- Continuous monitoring of confidence calibration, accuracy vs. labeled outcomes, fairness across roles/segments.
- Drift beyond threshold → flag model, optionally auto-route to shadow/older version, emit `AIModelUpdated` + `AIAlertRaised`.
- Recalibration + re-evaluation before promotion (`AI_ENGINE_ARCHITECTURE.md §5`).

### 2.7 Vendor independence (T10)
- Models behind Inference Adapter seam; a vendor change cannot alter engine logic or events.
- Output contract enforced regardless of vendor; non-conforming output rejected at boundary.
- Vendor-specific behavior is configuration, reviewed under `AI_GOVERNANCE_MODEL.md`.

### 2.8 Audit logging (T8)
- Every AI write (recommendation stored, knowledge indexed, memory updated) and every AI event mirrors to `AuditLog` (entity 19) with `actorId`, action, before/after.
- Sensitive AI acts also emit `AdminActionLogged` where applicable (`PERMISSION_MODEL.md §7`).

---

## 3. Secrets & PII handling

- Model API keys, signing material isolated from the app/data plane; never present in prompts, logs, or memory.
- PII (KYC, wallet↔identity, individual earnings) stored in segregated partitions (`AI_MEMORY_MODEL.md §4.5`, `AI_KNOWLEDGE_MODEL.md §6`); only `DISCIPLINE`/authorized roles retrieve.
- Executive AI built only on anonymized aggregates — raw PII never enters it.
- Right-to-erasure propagates to memory + knowledge references; `MemoryUpdated`/`KnowledgeIndexed` reflect deletion.

---

## 4. Incident response (AI-specific)

1. Detection: drift alert, abuse throttle, `AIFraudDetected`, `AIRiskDetected`, or `AIAlertRaised`.
2. Containment: quarantine engine/model (route to safe/older version), revoke quota, freeze affected artifacts.
3. Triage: Compliance/Admin review with full envelope + provenance.
4. Remediation: rollback model (`AIModelUpdated`), patch prompt/policy, re-evaluate.
5. Audit: all steps recorded in `AuditLog`; post-incident review updates this model.

---

## 5. Consistency with ecosystem security

- AI never weakens the two-stage gating (`PERMISSION_MODEL.md §6`): it suggests, humans execute.
- AI never appends value-moving `Transaction`/`AuditLog` outside its own advisory stores.
- All AI security controls are additive to, never replacements for, the locked ecosystem security model.
