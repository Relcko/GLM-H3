# AI Event Extension — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `EVENT_ARCHITECTURE.md` (locked), `AI_PLATFORM_ARCHITECTURE.md`. Extends the canonical event catalog with AI events.
**Status:** Architecture only. Framework-agnostic. No implementation.

**Rule:** Cross-module effects happen ONLY through events. The AI Platform emits **advisory** events only; it never emits value-moving events (`TreasuryWithdrawal`, `OwnershipUpdated`, `ProposalExecuted`, …). When a human accepts an AI suggestion, the *authorized module* emits its normal event through its gated path.

---

## 1. Transport & guarantees (inherits `EVENT_ARCHITECTURE.md §1`)

- Same durable, append-only bus; same schema:
  `{ eventId, type, aggregateId, occurredAt, actorId, version, payload }`.
- At-least-once delivery → consumers idempotent (keyed by `eventId` + aggregateId).
- Every AI event mirrors to `AuditLog` (entity 19).
- Payload is the only AI-specific part and always embeds the explainability envelope (`AI_EXPLAINABILITY_MODEL.md`).

---

## 2. AI event catalog (additive to `EVENT_ARCHITECTURE.md §2`)

### Recommendation & decision
- `AIRecommendationGenerated` (engine) → consumers surface the advisory artifact (Marketplace, Portfolio, Treasury UI, Copilot, Compliance queue). Payload = artifact + full explainability envelope.
- `AIRecommendationAccepted` (human reviewer) → closes loop; feeds model evaluation + historical review. References `artifactId`.
- `AIRecommendationRejected` (human reviewer) → closes loop; references `artifactId` + reason.

### Detection & risk
- `AIFraudDetected` (Compliance AI / Treasury AI) → Compliance Officer triage; advisory only. References entities + evidence.
- `AIRiskDetected` (any engine) → relevant role alert; carries `riskLevel`.
- `AIAlertRaised` (any engine / security) → Notification service + Admin observability.

### Forecasting & knowledge
- `AIForecastGenerated` (engine) → stores/projects a forecast (cashflow, price, voting, revenue). Payload = forecast + envelope.
- `KnowledgeIndexed` (Knowledge Layer) → announces an indexing batch; subscribers may refresh. Payload = domain + fact range + provenance.
- `MemoryUpdated` (Memory Layer) → announces context/long-term memory change (capture/consolidate/forget). Payload = actor/entity + class + action.

### Model lifecycle
- `AIModelUpdated` (Model Registry / Governance) → announces model version change/promotion/rollback. Payload = modelId + version + scope + changelog.

> Note: `CopilotQueryReceived`, `CopilotAnswerIssued`, `CopilotPolicyViolation` already exist in `EVENT_ARCHITECTURE.md §2` (AI Copilot module). They remain valid; the Copilot is a consumer surface of this platform. `CopilotAnswerIssued` payload should embed the explainability envelope where the answer is a recommendation.

---

## 3. New events → subscriber responsibilities

| Subscriber | Listens for | Effect (idempotent) |
|------------|-------------|---------------------|
| **Marketplace / Portfolio UI** | `AIRecommendationGenerated`, `AIForecastGenerated` | Surface insight (read-only) to authorized actor. |
| **Compliance** | `AIFraudDetected`, `AIRiskDetected` | Open/triage case; human decides `ComplianceFlagRaised`. |
| **Treasury** | `AIRiskDetected` (treasury), `AIAlertRaised` | Review; human may initiate gated `TreasuryMovement`. |
| **Governance** | `AIForecastGenerated` (voting), `AIRecommendationGenerated` | Surface summaries; human executes via `ProposalExecuted`. |
| **Notification** | `AIAlertRaised`, `AIRiskDetected` | Deliver to role-scoped recipients. |
| **Admin / Audit** | ALL AI events | Mirror to `AuditLog`; observability + historical review. |
| **Model Registry / Governance** | `AIModelUpdated` | Track version; allow pin/observe. |
| **Knowledge Layer** | ecosystem events | Re-index (emits `KnowledgeIndexed`). |
| **Memory Layer** | interaction/feedback events | Update memory (emits `MemoryUpdated`). |

---

## 4. Key flows (AI extended)

### Flow G — AI recommendation → human decision (the master AI chain)
```
AIRecommendationGenerated
   ├─▶ surface to authorized actor (scope-enforced)
   └─ (human) ─▶ AIRecommendationAccepted  → authorized module's gated path
                 AIRecommendationRejected   → closed (reason logged)
```
Acceptance triggers the *module's* normal event (e.g., `TreasuryMovementApproved`, `ProposalExecuted`), never an AI-authored value move.

### Flow H — Fraud/risk signal
```
AIFraudDetected / AIRiskDetected
   ├─▶ Compliance/role triage (human)
   └─ (if confirmed) authorized module emits its event (e.g., ComplianceFlagRaised, TreasuryMovementApproved)
```

### Flow I — Knowledge/Memory sync
```
Ecosystem event (e.g., InvestmentConfirmed)
   └─▶ Knowledge Layer re-index → KnowledgeIndexed
   └─▶ (on interaction/feedback) Memory Layer update → MemoryUpdated
```

### Flow J — Model change
```
AIModelUpdated
   └─▶ subscribers observe/pin; drift monitor recalibrates; AuditLog mirror
```

---

## 5. Versioning & evolution (inherits `EVENT_ARCHITECTURE.md §6`)

- `version` field on every AI event enables safe schema evolution.
- Additive payload fields only; consumers ignore unknown fields.
- Breaking changes → new `type` (e.g., `AIRecommendationGeneratedV2`), old retired after dual-write window.
- AI event schema registry stored alongside the ecosystem registry (interface seam).

---

## 6. Failure handling (inherits `EVENT_ARCHITECTURE.md §7`)

- **Poison AI event:** dead-letter; engine paused; `AIAlertRaised`.
- **Out-of-order:** projection applies if causal deps (e.g., `KnowledgeIndexed` before dependent forecast) present, else buffers.
- **Duplicate:** idempotency key (`eventId`) drops replay.
- **Downstream outage:** events retained; replay on recovery (at-least-once).
- **Malformed envelope:** rejected at the Explainability boundary before emission (`AI_EXPLAINABILITY_MODEL.md §3`); logged with reason.
