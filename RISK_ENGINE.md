# Risk Engine — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `IDENTITY_AND_ACCESS_MODEL.md`, `COMPLIANCE_ARCHITECTURE.md`, `FRAUD_ENGINE.md`. Defines the 12 risk domains + scoring + aggregation.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

The Risk Engine is the **continuous-verification signal** for Zero Trust (`SECURITY_ARCHITECTURE.md §1`). It produces risk scores that drive adaptive authentication, authorization decisions, and monitoring — but it never blocks value movement by itself; it raises signals for humans/controls.

---

## 1. Risk model fundamentals

- Each score ∈ `[0..1]` with a band (`low`/`medium`/`high`/`critical`). Calibrated, monitored for drift.
- Scores are **derived projections** over ledger/events + external feeds; recomputed, never authoritative stores.
- Every score change emits `RiskScoreChanged` (security extension) + mirrors to `AuditLog`.
- Inputs are scoped: an investor's risk is `OWN`; population risk is `DISCIPLINE` (Compliance/Risk).

---

## 2. Risk domains (12)

| # | Domain | Inputs | Drives |
|---|--------|--------|--------|
| 1 | **Investor Risk** | KYC tier, behavior, concentration, compliance rating, history. | Investment limits, step-up. |
| 2 | **Property Risk** | Location, SPV jurisdiction, climate, occupancy, construction, valuation volatility. | Eligibility, disclosure. |
| 3 | **Agent Risk** | Network patterns, clawbacks, rank velocity, fraud flags. | Commission holds, review. |
| 4 | **Treasury Risk** | Reserve adequacy, liquidity, concentration, movement anomalies. | Limits, lockdown review. |
| 5 | **Governance Risk** | Proposal risk, participation apathy, outcome concentration. | Summary flags (advisory). |
| 6 | **Marketplace Risk** | Fake-listing signals, liquidity, price manipulation, supply integrity. | Listing gating. |
| 7 | **NFT Risk** | Counterfeit/ownership/blacklist signals (`NFT_SECURITY_MODEL.md`). | Transfer gating, freeze. |
| 8 | **Wallet Risk** | SIWE posture, device, proxy clustering, sanctions, behavior. | Auth step-up, freeze. |
| 9 | **Country Risk** | Jurisdiction risk (sanctions, AML, stability). | Geo restrictions, SoW/SoF. |
| 10 | **Liquidity Risk** | Secondary-market depth, redemption pressure, treasury runway. | Reserve recs (advisory). |
| 11 | **Operational Risk** | System health, drift, incident history, config changes. | Monitoring, review. |
| 12 | **Reputation Risk** | Sentiment, public flags, media, complaint volume. | Executive dashboard (advisory). |

---

## 3. Scoring & aggregation

- **Per-domain score:** weighted combination of signals (transparent weights, versioned).
- **Entity risk:** aggregate of relevant domains (e.g., Investor risk = f(investor, wallet, country, property-held)).
- **Platform risk:** rollup for Executive/risk dashboard.
- **Confidence:** each score carries calibration; low confidence → treat as `medium` + flag for human.
- **Explainability:** every score explains top drivers (mirrors AI explainability contract where AI-assisted).

---

## 4. Continuous verification loop

```
Event/telemetry → Risk Engine → score update
   ├─▶ RiskScoreChanged + AuditLog
   ├─▶ Authorization: step-up auth if score crosses threshold
   ├─▶ Fraud Engine: share signal for cross-check
   ├─▶ Compliance: re-rate if compliance-relevant
   └─▶ Observability: risk dashboard + alert if critical
```

- A rising Wallet/Investor risk can force re-auth mid-session (adaptive auth, `IDENTITY_AND_ACCESS_MODEL.md` §4.4).
- Critical Treasury/Platform risk can prompt review but **not** auto-lockdown; `EmergencyLockdown` remains human/Super multi-sig (`TREASURY_SECURITY_MODEL.md` §4).

---

## 5. Thresholds & actions (examples)

| Band | Typical automatic action |
|------|--------------------------|
| low | standard flow. |
| medium | enhanced logging; optional step-up. |
| high | step-up auth; restricted limits; compliance review queue. |
| critical | hold + `ThreatDetected`/`AlertRaised`; human triage; possible freeze (human). |

Thresholds are policy (config), versioned, and audited on change.

---

## 6. Integration

| Domain | Touchpoint |
|--------|-----------|
| Authorization | score → step-up / deny / restrict. |
| Fraud Engine | shared signals; cross-validation. |
| Compliance | rating feeds compliance risk rating. |
| Treasury Security | treasury risk → limits/lockdown review. |
| AI Platform | Treasury AI / Compliance AI consume risk; human decides. |
| Observability | risk dashboard + alerts. |
| NFT/Marketplace Security | domain risk → gating. |

Inherits scalability posture: batch rollups + lightweight per-event checks (`ANTI_FRAUD_MODEL.md` §7).
