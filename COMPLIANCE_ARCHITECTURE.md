# Compliance Architecture — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `IDENTITY_AND_ACCESS_MODEL.md`, `DOMAIN_MODEL.md` (KYC entity 13), `DOCUMENT_MANAGEMENT_ARCHITECTURE.md`, `ANTI_FRAUD_MODEL.md`. Defines KYC/KYB/AML/PEP/sanctions/travel-rule + risk rating + escalation + audit.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

Inherits the locked KYC gate (`DOMAIN_MODEL` §13, §7) and the Anti-Fraud compliance touchpoints. The Compliance layer is **investigative and gating**, never value-moving.

---

## 1. Compliance scope & separation

- **Compliance Officer** (`PERMISSION_MODEL.md §7`) reviews/approves KYC, raises/resolves flags, but **cannot** move funds, publish property, or change roles. This separation is preserved.
- Compliance consumes signals from Risk Engine, Fraud Engine, and the AI Compliance engine (`AI_DOMAIN_MODEL.md` §7) — those engines are advisory; the human officer decides.

---

## 2. Identity verification stack

| Control | Scope | Outcome |
|---------|-------|---------|
| **KYC** | Individual investor/agent | Identity + eligibility; gates investing (`DOMAIN_MODEL` §13). |
| **KYB** | Institutional/corporate accounts | Legal-entity verification: registration, beneficial owners, authorizations. |
| **AML** | All funded actors | Ongoing monitoring for laundering patterns (`ANTI_FRAUD_MODEL.md` F9, Treasury Security). |
| **PEP** | Individuals/entities | Politically Exposed Person screening → enhanced due diligence. |
| **Sanctions** | Wallets/identities/entities | Watchlist (OFAC/UN/EU/etc.) matching; bars onboarding + receiving. |
| **Travel Rule** | Transfers ≥ threshold | Originator/beneficiary info captured + transmitted per FATF. |
| **Accredited Investor** | Jurisdiction-gated investing | Eligibility proof where required. |
| **Source of Wealth** | High-value/PEP | Provenance of accumulated wealth. |
| **Source of Funds** | Transactions | Provenance of specific funds being deployed. |

All verification artifacts live in Document Vault (`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`); PII segregated per `PRIVACY_MODEL.md`.

---

## 3. Risk rating (compliance)

- Each identity/entity receives a **compliance risk rating** (`low`/`medium`/`high`/`critical`) from KYC tier + PEP + sanctions + AML signals + geography.
- Rating feeds Authorization (higher risk → step-up, restricted limits) and the Risk Engine (`RISK_ENGINE.md` Investor/Wallet/Country risk).
- Rating changes emit `RiskScoreChanged` (security extension) + `AuditLog`.

---

## 4. Continuous monitoring

- **Sanctions re-screening:** periodic + on-list-update; hit → freeze + `AMLAlertRaised` + `ComplianceFlagRaised`.
- **AML pattern detection:** structuring/layering/velocity (shares Fraud Engine signals).
- **Travel Rule validation:** on inbound/outbound transfers; missing data → hold.
- **PEP refresh:** periodic re-screen; status change → re-rating.
- **Document re-verification:** on suspicion or expiry; assisted by AI Document Verification (`AI_DOMAIN_MODEL.md` §7) but decided by human.

---

## 5. Manual review & escalation

| Stage | Actor | Action |
|-------|-------|--------|
| Triage | Compliance Officer | Review alert; request info; `ComplianceFlagRaised`. |
| Enhanced DD | Compliance Officer + (if PEP/SOF) | Collect SoW/SoF; restrict until cleared. |
| Escalation | Compliance → Risk/Fraud/Legal | Cross-reference; possible law-enforcement/report obligation. |
| Decision | Compliance Officer (human) | `ComplianceApproved` / `ComplianceRejected`; never AI-authored. |
| Regulatory report | Compliance + Legal | SAR/STR filing where mandated; `AMLAlertRaised` + external reporting. |

AI outputs (`AIFraudDetected`, `AIRiskDetected`) are **inputs** to triage, not decisions (`AI_GOVERNANCE_MODEL.md`).

---

## 6. Compliance decision effects

- `ComplianceApproved` → unblocks the gated action (e.g., KYC → investing eligibility) through the normal path.
- `ComplianceRejected` → blocks; appeal path exists; re-review required.
- Freeze/sanctions → asset/account frozen; emitted as `ComplianceFlagRaised` (canonical) / `NFTFrozen` (NFT) / treasury hold (Treasury Security).
- Every decision → `AuditLog` (19) with actor, rule, evidence ref.

---

## 7. Audit trail (compliance)

- All KYC/KYB/AML/PEP/sanctions/travel-rule events immutable in `AuditLog` (19).
- Retention per jurisdiction (`PRIVACY_MODEL.md`); export via `AuditExported` (security event) for regulators.
- Corrections are offsetting entries, never edits (`ENTITY_RELATIONSHIP.md` rule 2).

---

## 8. Integration

| Domain | Touchpoint |
|--------|-----------|
| Identity/Auth | verification gates login/invest; step-up on risk. |
| Treasury | AML/fraud hold before movement; sanctions bar receivers. |
| Marketplace/NFT | compliance gating at trade; freeze/blacklist. |
| Network Engine | KYC gate on qualified sale (`ANTI_FRAUD_MODEL.md`). |
| AI Platform | Compliance AI advisory; human decides. |
| Admin | observability + dual-control overrides. |
| Risk Engine | rating feeds risk aggregation. |
| Fraud Engine | shared AML/synthetic-identity signals. |

Emits `IdentityVerified`, `ComplianceApproved`, `ComplianceRejected`, `AMLAlertRaised`, `RiskScoreChanged` (see `SECURITY_EVENT_EXTENSION.md`).
