# Treasury Security Model — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_DOMAIN_MODEL.md`,
`PERMISSION_MODEL.md`, `EVENT_ARCHITECTURE.md`, `ANTI_FRAUD_MODEL.md`,
`NFT_SECURITY_MODEL.md`. Architecture only.

Defines the controls that protect value movement: approvals, wallet custody,
limits, emergency lockdown, recovery, and fraud detection. All controls are
deterministic and auditable; none require code here.

---

## 1. Approval model

| Control | Rule |
|--------|------|
| **Multi Approval** | outbound value requires ≥ 2 approvers (Treasury Manager + approver). |
| **Threshold Approval** | above a domain/amount threshold → additional approvers or Governance. |
| **Governance-gated** | buyback/burn/grant/emergency spend require `ProposalExecuted`. |

Mapped to `PERMISSION_MODEL.md`: Treasury Manager proposes; cannot unilaterally
execute; `TreasuryMovementApproved` only after required approvals. Two-stage
gating for value & control is mandated (`PERMISSION_MODEL.md` §3).

---

## 2. Wallet custody

| Type | Use | Control |
|------|-----|---------|
| **Hot Wallet** | operational/settlement flows. | low balance cap; monitored. |
| **Cold Storage** | bulk reserves. | multi-sig; offline; threshold-gated moves only. |

- Crypto accounts (TR-2) reference hot/cold addresses; cold moves require higher
  threshold + time-lock.
- Address whitelisting for outbound transfers (anti-diversion).

---

## 3. Limits & policies

| Limit | Scope |
|-------|-------|
| **Treasury Limits** | per-domain max balance / min reserve. |
| **Withdrawal Policies** | max per-transaction, per-period, whitelisted destinations. |
| **Risk Limits** | exposure caps (asset concentration, liquidity). |

Violations → reject movement + `AlertRaised` (canonical) → Compliance/Treasury.

---

## 4. Emergency controls

- **Emergency Lockdown:** halts all outbound treasury movement (circuit breaker);
  set by Super Admin / Emergency Treasury multi-sig. Emits `SystemPaused`
  (canonical) + freezes affected domains.
- **Recovery:** dual-control re-assignment of custody (lost-key/compromise);
  append-only `AuditLog` (19); never bypasses limits for the new custodian.
- **Fraud Detection:** anomaly monitoring on movements (velocity, destination,
  amount, pattern) → `AlertRaised` / `ComplianceFlagRaised`.

---

## 5. Fraud detection vectors

| Vector | Control |
|--------|---------|
| Unauthorized movement | multi-sig + threshold + whitelist. |
| Limit bypass | policy enforced at movement validation. |
| Diverter address | destination whitelist + anomaly detection. |
| Insider abuse | dual-control + AuditLedger surveillance + role separation. |
| Fake reconciliation | on-chain reconcile + `FinancialAuditCompleted`. |

Inherits Network Engine anti-fraud (duplicate wallet/identity) and NFT security
(counterfeit/blacklist) signals where treasury touches those domains.

---

## 6. Audit & immutability

- Every approved/rejected movement mirrors to `AuditLog` (19) with actor, rule,
  evidence ref.
- Corrections are offsetting entries (never edits) — `ENTITY_RELATIONSHIP.md`
  rule 2.
- Compliance Officer + Auditor + Super Admin have full visibility
  (`PERMISSION_MODEL.md`).

---

## 7. Integration

| Domain | Security touchpoint |
|--------|---------------------|
| Governance | `ProposalExecuted` for gated spends. |
| Network Engine | commission settlement gated by approvals. |
| NFT | `NFTFrozen`/blacklist signals. |
| Anti-fraud | shared anomaly signals. |
| Admin Portal | observability + dual-control actions. |
| AI Copilot | read-only risk summaries (scoped to Compliance). |

---

## 8. Scalability

- Approval/limit checks are O(1) per movement (indexed limits/whitelists).
- Anomaly detection runs on pre-aggregated movement rollups in batch.
- At scale: custody partitioned by domain; emergency flags are broadcast controls
  consumed by all movement validators; audit trail append-only.
