# AI Engine Architecture — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_DOMAIN_MODEL.md`. Defines how the 12 engines are built, orchestrated, evaluated, and operated.
**Status:** Architecture only. Framework-agnostic. No implementation, no model weights, no LLM prompts, no code.

---

## 1. Engine anatomy

Every engine is assembled from the **same internal pipeline**. Differences are in configuration (inputs, knowledge domains, capability set), not in structure. This uniformity keeps tooling, evaluation, and security uniform across all 12 engines.

```
        ┌─────────────────────────────────────────────────────────┐
        │                      AI ENGINE (N)                        │
        │                                                           │
        │  Request (actor, scope, intent)                          │
        │     │                                                     │
        │     ▼                                                     │
        │  ┌────────────┐   ┌────────────┐   ┌──────────────────┐  │
        │  │ SCOPE GATE │▶▶│ RETRIEVAL   │▶▶│ REASONING / MODEL │  │
        │  │ (Security) │   │ (Knowledge) │   │ (Model Router)   │  │
        │  └────────────┘   └────────────┘   └────────┬─────────┘  │
        │                                             ▼            │
        │  ┌────────────┐   ┌────────────┐   ┌──────────────────┐  │
        │  │ EXPLAIN    │◀──│ VALIDATE   │◀──│ SYNTHESIZE OUTPUT │  │
        │  │ (Contract) │   │ (Bounds)   │   │ (advisory only)  │  │
        │  └─────┬──────┘   └────────────┘   └──────────────────┘  │
        │        ▼                                                    │
        │  Emit advisory artifact + AI Event  ──▶ Event Bus          │
        └─────────────────────────────────────────────────────────┘
```

### 1.1 Scope Gate (Security Layer entry)
Validates `actorId`, `role`, and `scope` (`OWN`/`TEAM`/`DISCIPLINE`/`GLOBAL`/`GRANT`) against `PERMISSION_MODEL.md` before any computation. Rejects requests that would expose out-of-scope data. (See `AI_SECURITY_MODEL.md`.)

### 1.2 Retrieval (Knowledge Layer)
Pulls only the knowledge slices the engine is permitted to see (per `AI_KNOWLEDGE_MODEL.md`). No engine queries raw stores directly.

### 1.3 Reasoning / Model (Model Router)
Selects and invokes the appropriate model(s) for the task. Outputs are always **advisory** — never a mutation command.

### 1.4 Validate (Bounds)
Checks the output against domain invariants (e.g., a recommended allocation cannot exceed 100%; a price prediction cannot be negative). Violations are rejected or clamped and flagged.

### 1.5 Explain (Contract)
Wraps the output in the mandatory explainability envelope (`AI_EXPLAINABILITY_MODEL.md`). Missing fields → malformed → rejected.

### 1.6 Emit
Publishes the advisory artifact as an AI event (`AI_EVENT_EXTENSION.md`) and mirrors to `AuditLog`.

---

## 2. Inference modes

| Mode | Trigger | Characteristics |
|------|---------|-----------------|
| **On-demand (request/response)** | User asks Copilot, dashboard loads insight | Low-latency, stateless, per-actor rate-limited. |
| **Streaming (event-driven)** | Ecosystem event arrives (e.g., `InvestmentConfirmed`) | Incremental recompute of affected recommendations/forecasts. |
| **Batch (scheduled)** | Nightly/hourly horizon (forecasts, risk scans) | Heavy compute, fan-out across aggregates, idempotent. |
| **Agentic (bounded workflow)** | Multi-step analysis plan accepted by human | Tool-limited plan; read + propose only; human-in-the-loop checkpoints. |

All modes share the same pipeline and the same output contract.

---

## 3. Model abstraction & multi-model orchestration

### 3.1 Model Router
A stable internal interface (`selectModel(task)`) maps a task profile to a model:
- **Classifier/regressor** tasks (scoring, forecasting numeric) → lightweight statistical/ML models.
- **Reasoning/summarization** tasks (proposal digest, explanation, chat) → LLM-grade models.
- **Retrieval/embedding** tasks → vector + graph models.

The Router chooses by cost, latency, and capability fit. Engines never reference a model by vendor identity.

### 3.2 Vendor independence
- Models live behind the Router + an **Inference Adapter** seam. Replacing a vendor = swapping an adapter; no engine, event, or consumer changes.
- No LLM-specific prompt is baked into engine logic. Prompts (if any) are configuration, versioned, and reviewed under `AI_GOVERNANCE_MODEL.md`.
- A **capability contract** (input schema → output schema) is the only thing engines depend on.

### 3.3 Multi-model composition
Complex outputs may chain models (e.g., Property AI: regressor for valuation → LLM for plain-language explanation). Composition is declarative per engine config; each step is independently explainable and auditable.

### 3.4 Future LLM replacement
Because engines depend on the capability contract, not the model, a future LLM is dropped in via a new adapter with zero engine rewrite. `AIModelUpdated` event announces version changes (`AI_EVENT_EXTENSION.md`).

---

## 4. Feature & signal foundation

- **Features** are derived from ecosystem projections + knowledge, never stored as a competing source of truth.
- A **Feature Catalog** (logical, not column-level) defines reusable signals: ownership concentration, liquidity depth, lead warmth, walletvelocity, yield trend, etc. Reused across engines to avoid drift.
- **Feature integrity:** every feature traces to a ledger/event source; recomputed, not hand-edited.

---

## 5. Model registry & lifecycle

- Every model (classifier, forecaster, LLM adapter) is registered with: id, version, owner, training/eval basis, allowed engines, expiry.
- **Evaluation harness:** models are scored on accuracy, calibration (confidence vs. correctness), fairness (across roles/segments), and drift before promotion.
- **Shadow mode:** new models run in parallel, outputs compared, no publication, until validated.
- **Promotion/rollback:** versioned; `AIModelUpdated` emitted on change; rollback is a config switch.
- Lifecycle governed in `AI_GOVERNANCE_MODEL.md`.

---

## 6. Agentic workflow design

Bounded, auditable multi-step plans for tasks like "build an exit strategy" or "investigate this anomaly."

- **Plan:** model proposes a step list (read + analyze + propose). Each step declares tools (read-only) it may use.
- **Checkpoints:** human approval between significant steps; no autonomous execution of sensitive actions.
- **Guardrails:** tool allow-list per engine; any step that would *suggest* a sensitive action is flagged `humanReviewRequired` and routed, never executed.
- **Trace:** full plan + intermediate outputs recorded in memory + `AuditLog` for review.
- **Termination:** plans time-boxed; stale plans expire and alert.

---

## 7. Scalability & operations

- **Stateless workers:** inference is stateless; context comes from Knowledge + Memory layers, enabling horizontal scale to millions of investors and recommendations.
- **Idempotency:** AI event emission keyed by `(engineId, aggregateId, intentHash, version)`; at-least-once delivery tolerated.
- **Streaming:** subscribes to the durable event log; recomputes affected artifacts incrementally.
- **Rate limiting:** per-actor and per-engine quotas (see `AI_SECURITY_MODEL.md`).
- **Isolation:** a noisy/abusive engine cannot starve others (per-engine pools).
- **Observability:** latency, cost, confidence calibration, drift, rejection rate per engine + model.

---

## 8. Integration points (with ecosystem)

| Layer | Provided by | Used by engines for |
|-------|-------------|---------------------|
| Identity & Wallet | shared | scope resolution, actor verification |
| Ledger & Audit | shared | feature sources, audit mirroring |
| Event bus | shared | input stream + AI event output |
| Permission service | shared | scope gate |
| Knowledge Layer | `AI_KNOWLEDGE_MODEL.md` | retrieval |
| Memory Layer | `AI_MEMORY_MODEL.md` | context |
| Explainability | `AI_EXPLAINABILITY_MODEL.md` | output envelope |
| Security | `AI_SECURITY_MODEL.md` | gate, redaction, rate limit |

No engine depends on another engine. Cross-engine value flows only through knowledge + events.
