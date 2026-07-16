# AI Explainability Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_ENGINE_ARCHITECTURE.md`. Defines the mandatory envelope on every AI output.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

**Rule:** Every recommendation, forecast, alert, and explanation emitted by any engine MUST carry the full explainability contract. An output missing any required field is **malformed and rejected at the platform boundary** (no publish, no event).

This is the operationalization of the mandate: *"Every recommendation must remain explainable and auditable."*

---

## 1. The Explainability Envelope

Every advisory artifact wraps its payload with:

| Field | Required | Definition |
|-------|----------|------------|
| **confidence** | ✅ | Calibrated score `[0..1]` + label (`low`/`medium`/`high`) reflecting model certainty *and* calibration. |
| **evidence** | ✅ | The specific facts/signals that drove the output (factIds, metric values, deltas). |
| **dataSources** | ✅ | Provenance: knowledge domains + source events/ledger refs used (`AI_KNOWLEDGE_MODEL.md §5`). |
| **reasoningSummary** | ✅ | Plain-language explanation of how inputs → output, free of jargon where possible. |
| **affectedEntities** | ✅ | The ecosystem entities impacted/referenced (`Property`, `Investor`, `Proposal`, `TreasuryAccount`, …). |
| **riskLevel** | ✅ | Classification (`none`/`low`/`medium`/`high`/`critical`) of acting on this output. |
| **alternativeOutcomes** | ✅ | At least the next-best options + their trade-offs (what if you don't follow this rec). |
| **humanReviewRequirement** | ✅ | Boolean + routing target + rationale. `true` for any sensitive/financial/governance suggestion. |

### 1.1 Envelope schema (logical)
```
{
  artifactId, engineId, version, generatedAt, actorId, scope,
  payload,                         // the actual recommendation/forecast/alert
  explainability: {
    confidence: { score, label },
    evidence: [ ... ],
    dataSources: [ ... ],
    reasoningSummary,
    affectedEntities: [ ... ],
    riskLevel,
    alternativeOutcomes: [ ... ],
    humanReviewRequirement: { required, routingTarget, rationale }
  }
}
```

---

## 2. Field semantics & rules

### 2.1 Confidence
- Must be **calibrated**, not just a model softmax. Tracked over time in the Model Registry (`AI_ENGINE_ARCHITECTURE.md §5`); miscalibration lowers trust and triggers review.
- `low` confidence forces `humanReviewRequirement = true`.
- Confidence must never be omitted to look authoritative.

### 2.2 Evidence
- Concrete, inspectable: e.g., `"ownership concentration = 38% of portfolio in property X"`, `"lead converted within 7d in 3/5 similar cases"`.
- Each evidence item links to a knowledge `factId` where possible.

### 2.3 Data Sources
- Lists the knowledge domains + source events/ledger entries. This is what makes the output auditable and replayable.
- External (non-ledger) sources are explicitly tagged `external` + dated.

### 2.4 Reasoning Summary
- Human-readable chain of thought, bounded in length, jargon-light.
- For LLM outputs, this is a generated explanation, not the raw internal trace (which stays in audit).

### 2.5 Affected Entities
- Enables impact analysis + permission scoping. Drives which roles see the artifact.

### 2.6 Risk Level
- Assigned by the engine from a rule table (e.g., financial suggestion → ≥ `medium`; compliance flag → `high`; trivial info → `none`).
- `high`/`critical` ⇒ `humanReviewRequirement = true`.

### 2.7 Alternative Outcomes
- Prevents false certainty. Example: "Buy property X (recommended)" vs "Hold cash (alt 1: preserves liquidity)" vs "Diversify into Y (alt 2)".
- At least one alternative is mandatory, even for low-risk outputs (the "do nothing" path counts).

### 2.8 Human Review Requirement
- `required = true` when:
  - the output suggests a sensitive action (treasury movement, governance execution, role change, property publish/delist, KYC decision, freeze),
  - `riskLevel ∈ {high, critical}`,
  - `confidence = low`,
  - policy mandates review for the engine/action.
- `routingTarget` names the authorized human role per `PERMISSION_MODEL.md` (e.g., Treasury Manager → Governance multi-sig; Compliance Officer; Property Manager; Super Admin).
- The AI never executes; review is the hand-off point (`AI_GOVERNANCE_MODEL.md`).

---

## 3. Validation at the boundary

The Explainability Layer (`AI_ENGINE_ARCHITECTURE.md §1.5`) rejects an artifact if:
- any required field is missing/null,
- `confidence` is out of range or uncalibrated-flagged,
- `riskLevel`/`humanReviewRequirement` are inconsistent (e.g., `critical` risk but `required = false`),
- `affectedEntities` empty for a recommendation,
- `dataSources` empty (no provenance).

Rejected artifacts are logged (`AuditLog`) with reason; they never reach the event bus.

---

## 4. Explainability in practice (per engine examples)

| Engine | Typical riskLevel | humanReviewRequired |
|--------|-------------------|---------------------|
| Investor AI (watchlist) | low | false |
| Investor AI (exit rec) | medium | false (advisory) / true if large position |
| Agent AI (lead score) | low | false |
| Marketplace AI (price pred) | low/medium | false (advisory to PM) |
| Portfolio AI (rebalance) | medium | false (advisory) |
| Treasury AI (buyback rec) | high | **true → Treasury+Governance** |
| Governance AI (summary) | none | false (does not alter payload) |
| Compliance AI (fraud flag) | high | **true → Compliance Officer** |
| Property AI (valuation) | low/medium | false |
| Executive AI (strategic) | medium | false (advisory) |
| Support AI (reply draft) | low | false (human sends) |
| Developer/Admin AI (alert) | medium | false (triage) |

---

## 5. Auditability linkage

- The envelope is part of every `AIRecommendationGenerated` / `AIForecastGenerated` / `AIAlertRaised` event payload (`AI_EVENT_EXTENSION.md`).
- When a human accepts/rejects/modifies, the decision event references `artifactId` + the original envelope, preserving the full reasoning for future audit (`AI_GOVERNANCE_MODEL.md`).
- This satisfies: explainable (envelope) + auditable (events + `AuditLog`).
