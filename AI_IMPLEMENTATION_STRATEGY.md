# AI Implementation Strategy — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `IMPLEMENTATION_ROADMAP.md` (locked). Phasing, milestones, integration, and vendor-independence plan.
**Status:** Architecture only. Framework-agnostic. No implementation, no code, no timelines committed to dates.

This document sequences the build-out of the 10 AI specs. It does **not** replace `IMPLEMENTATION_ROADMAP.md`; it is the AI workstream layered on top of the locked roadmap. No phase may violate the ecosystem's invariants (money/ownership sacred, two-stage gating, server-side permissions).

---

## 0. Guiding constraints

1. **Advisory-first, always.** No phase grants AI execution rights.
2. **Explainability non-negotiable.** The envelope (`AI_EXPLAINABILITY_MODEL.md`) is required from Phase 1; no "silent" AI ships.
3. **Event-only integration.** All AI I/O through `EVENT_ARCHITECTURE.md` + `AI_EVENT_EXTENSION.md`.
4. **Vendor independence.** Models behind the Inference Adapter seam from day one; no engine hard-codes a vendor.
5. **Knowledge before engines.** The Knowledge Layer is the foundation; engines are thin once knowledge exists.

---

## 1. Phase map (capability increments)

### Phase 1 — Foundation (Knowledge + Memory + Explainability + Security skeleton)
- Stand up the **Knowledge Layer** ingestion from the event log (`AI_KNOWLEDGE_MODEL.md`): start with Property, Marketplace, Portfolio, Historical domains.
- Stand up **Memory Layer** minimal (conversation + investor context, `OWN`).
- Implement the **Explainability boundary** as a hard gate (reject malformed).
- Implement **Scope Gate** (permission enforcement) + basic redaction + audit mirroring.
- Ship **Investor AI** + **Marketplace AI** as the first engines (highest user value, lowest risk).
- Emit `AIRecommendationGenerated`, `AIForecastGenerated`, `KnowledgeIndexed`, `MemoryUpdated`.
- *Exit criteria:* advisory recs with full envelope; no PII leakage; events mirrored to `AuditLog`.

### Phase 2 — Core engines + detection
- Add **Portfolio AI**, **Property AI**, **Agent AI**.
- Stand up **Compliance AI** (fraud/risk) + **Treasury AI** (health/forecasting) in *advisory-only* mode.
- Add `AIFraudDetected`, `AIRiskDetected`, `AIAlertRaised`.
- Extend Knowledge to Compliance, Treasury, Network, Governance domains.
- Wire human override events (`AIRecommendationAccepted/Rejected`) + Historical review.
- *Exit criteria:* detection events route to correct human roles; zero auto-execution.

### Phase 3 — Governance, executive & assistive surfaces
- Add **Governance AI**, **Executive AI**, **Support AI**, **Administrator AI**, **Developer AI**.
- Complete Knowledge domains (Domain, Document, full Historical).
- Full **Memory** (all context classes + privacy controls + erasure).
- Model Registry + shadow mode + drift monitoring (`AIModelUpdated`).
- *Exit criteria:* all 12 engines live; full memory privacy; model lifecycle governed.

### Phase 4 — Scale, agentic, resilience
- Multi-model orchestration tuning (Router, cost/latency).
- Bounded **agentic workflows** (human-in-the-loop checkpoints) for multi-step analysis.
- Stress/scale validation (millions of investors + recommendations, streaming).
- Advanced security: prompt-injection hardening, abuse detection, fairness review.
- AI Governance Board operational; periodic oversight cadence.
- *Exit criteria:* platform scales; agentic plans safe; oversight active.

---

## 2. Engine rollout order (risk-aware)

| Order | Engine | Why this order |
|-------|--------|----------------|
| 1 | Investor AI | High value, `OWN`-scoped, low blast radius. |
| 2 | Marketplace AI | Public-safe aggregates; feeds discovery. |
| 3 | Portfolio AI | Builds on Portfolio read model. |
| 4 | Property AI | Asset intelligence; feeds Marketplace AI. |
| 5 | Agent AI | `OWN`/`TEAM`; network value. |
| 6 | Compliance AI | High sensitivity → needs full security + human gate first. |
| 7 | Treasury AI | Financial → strictly advisory + two-stage routing. |
| 8 | Governance AI | Summaries only; never alters payloads. |
| 9 | Support AI | Assistive; human sends. |
| 10 | Administrator AI | `GLOBAL` ops; needs mature audit. |
| 11 | Developer AI | Platform health; internal. |
| 12 | Executive AI | Aggregated/anonymized; built last on mature knowledge. |

---

## 3. Integration with the locked ecosystem

- **No new money-moving entities.** AI adds only advisory/learning stores (recommendations, knowledge index, memory), each append-only + audited.
- **Event bus:** AI subscribes to existing catalog; emits only `AI_EVENT_EXTENSION.md` events.
- **Permission service:** reused unchanged; Scope Gate calls it.
- **AuditLog / Transaction:** AI mirrors to `AuditLog`; never authors `Transaction`.
- **AI Copilot module (§3.9):** upgraded to be a consumer of this platform (engines + knowledge + memory), not a standalone model.
- **MODULE_DEPENDENCY_MAP:** AI Platform is a new shared capability surface; modules depend on it for insights, it depends on shared layer only.

---

## 4. Vendor independence & future LLM replacement

- **Inference Adapter seam:** swap vendor = swap adapter; engines/events/consumers unchanged.
- **Capability contract:** engines depend on input→output schema, not model identity.
- **No baked prompts:** prompts (if any) are versioned config reviewed under `AI_GOVERNANCE_MODEL.md`.
- **Evaluation harness:** every model (incl. future LLM) passes accuracy/calibration/fairness before promotion.
- **AIModelUpdated** announces changes; consumers may pin.

---

## 5. Testing & acceptance (architecture-level)

- **Explainability gate test:** malformed envelope rejected 100%.
- **Scope test:** out-of-scope request denied; no cross-actor PII in output.
- **No-execution test:** confirm AI never emits value-moving events; acceptance routes through human gate.
- **Idempotency test:** duplicate AI events produce no double effect.
- **Drift test:** simulated regime change triggers drift alert + safe route.
- **Rebuild test:** drop + replay knowledge from ledger → identical facts.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Over-trust in AI → users skip review | Forced `humanReviewRequirement` for sensitive; no nudge to accept. |
| PII leakage via memory/knowledge | Segregation + redaction + scope gate + erasure. |
| Model/vendor lock-in | Adapter seam + capability contract. |
| Hallucinated figures | Grounding + citation + confidence gating. |
| Cost/abuse blowup | Rate limits + quotas + circuit breakers. |
| Drift degrades advice | Monitoring + shadow + auto-rollback. |
| Audit gap | Mandatory `AuditLog` mirror on every AI write/event. |

---

## 7. Definition of done (platform)

- All 12 engines live, advisory-only, explainability-enveloped.
- Knowledge + Memory layers complete with privacy controls.
- Security model operational (scope, redaction, rate limit, drift, audit).
- Governance model operational (override lifecycle + board + model lifecycle).
- Event extension integrated; every AI action auditable.
- Vendor-independent; future LLM drop-in verified by test.
- Scales to target (millions of investors + recommendations) under load.

This set of 10 documents (`AI_PLATFORM_ARCHITECTURE.md` + 9 companions) constitutes the official AI Intelligence Platform specification for the Relcko ecosystem.
