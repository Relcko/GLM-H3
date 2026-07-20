# AI Governance Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_EXPLAINABILITY_MODEL.md`, `AI_SECURITY_MODEL.md`. Defines human override, accountability, and model governance.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

**Core principle (binding):** The AI Platform never decides money or control. It analyzes, predicts, recommends, monitors, explains, and assists. Every binding action remains with the human authorized by `PERMISSION_MODEL.md`.

---

## 1. Human override primitives

Every AI recommendation supports the full override lifecycle. These are emitted as events (`AI_EVENT_EXTENSION.md`) and mirrored to `AuditLog`.

| Action | Meaning | Who may act | Effect |
|--------|---------|-------------|--------|
| **Accept** | Adopt the recommendation. | The authorized role for the affected action. | Authorized module proceeds via its normal (gated) path. |
| **Reject** | Decline the recommendation. | Same / any authorized reviewer. | Artifact closed; no downstream action. |
| **Modify** | Change parameters before acting. | Authorized role. | Modified intent goes through normal validation + gating. |
| **Escalate** | Raise to a higher/other authority. | Any reviewer. | Routed (e.g., Treasury AI → Treasury Manager → Governance multi-sig). |
| **Delegate** | Assign review to another authorized role. | Role with delegation rights. | Re-routed; original recommender notified. |
| **Audit** | Inspect full envelope + provenance. | Compliance/Admin/Super (per scope). | Read-only review of artifact + decision history. |
| **Historical review** | Replay past AI decisions + outcomes. | Compliance/Admin/Super. | Trend/fairness/drift analysis over time. |

Override is the **only** bridge from advisory AI to binding ecosystem action. There is no other execution path.

---

## 2. Acceptance routing (two-stage gating preserved)

Sensitive recommendations map to the same approvers as `PERMISSION_MODEL.md §6`:

| AI suggestion | Route | Gate |
|---------------|-------|------|
| Treasury buyback/burn/reserve realloc | Treasury Manager → Governance (multi-sig) | two-stage |
| Governance proposal execution | Governance Manager → timelock + multi-sig | two-stage |
| Property publish/delist | Property Manager / Admin → second Admin or Compliance | second approver |
| KYC approve / freeze / flag | Compliance Officer (human only) | single, DISCIPLINE |
| Role change to Admin/Super | Super Administrator | logs + alert + cooldown |
| Emergency pause | Super Administrator | `SystemPaused` + alert |

The AI's `humanReviewRequirement.routingTarget` is derived directly from this table. If the routing target is absent/conflicting, the artifact is held (`AIAlertRaised`) until a human assigns one.

---

## 3. Accountability & ownership

- **No autonomous blame-shifting:** a human acceptor is the accountable actor for the resulting `Transaction`/`TreasuryMovement`/`ProposalExecuted`. The AI is a decision-support tool, recorded as the *source* of the suggestion in `AuditLog`.
- **Dual record:** when accepted, the execution event references the `artifactId` + explainability envelope, so the reasoning travels with the action.
- **Refusal is free:** rejecting/modifying an AI suggestion carries no penalty; the platform must not nudge users toward acceptance.
- **Explainability is the acceptance basis:** a human may not be forced to accept an output they cannot understand; low-confidence/high-risk outputs require explicit acknowledgment.

---

## 4. Model governance (lifecycle)

Models are governed like any other sensitive platform component.

### 4.1 Ownership
- Each engine + model has a named owner (a role, not an individual) accountable for behavior and review.
- Model changes require owner sign-off + evaluation evidence.

### 4.2 Promotion
- Shadow mode → evaluation (accuracy, calibration, fairness, drift) → promotion.
- Promotion emits `AIModelUpdated`; rollback is a config switch.

### 4.3 Fairness & bias
- Periodic fairness review across roles/segments (investor vs agent, geography, asset type).
- Biased/discriminatory behavior → demote to shadow + remediation.

### 4.4 Update transparency
- `AIModelUpdated` announces version, scope, and changelog to subscribers; consumers can pin/observe.
- Prompt/policy configuration changes are versioned and reviewed (no silent edits).

### 4.5 Kill switch
- Any engine/model can be disabled by Admin/Super without code change; affected artifacts held; `AIAlertRaised` + `SystemPaused`-style notification where appropriate.

---

## 5. Oversight body (AI Governance Board)

A cross-functional review function (Compliance + Treasury + Governance + Admin representatives) with:
- Periodic review of high-risk engine behavior and override rates.
- Authority to mandate shadow mode / rollback / scope reduction.
- Ownership of this model and its updates.
- Audit trail of its own decisions in `AuditLog`.

This board does **not** execute financial/governance actions; it governs the AI only.

---

## 6. Integration with the event model

- `AIRecommendationAccepted` / `AIRecommendationRejected` close the loop and feed historical review + model evaluation (did accepted recs outperform?).
- Acceptance does not grant the AI execution rights; it triggers the *human's* normal gated path.
- All override events are mirrored to `AuditLog` for compliance.

See `AI_EVENT_EXTENSION.md` for the full event catalog and `AI_SECURITY_MODEL.md §4` for incident response.
