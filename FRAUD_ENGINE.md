# Fraud Engine — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `ANTI_FRAUD_MODEL.md` (Network Engine, LOCKED), `RISK_ENGINE.md`, `COMPLIANCE_ARCHITECTURE.md`. Extends the locked anti-fraud model to the whole ecosystem.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

The Fraud Engine is the **detective + preventive** control plane for abuse across all modules. It **supersets** `ANTI_FRAUD_MODEL.md` (network/commission vectors) and adds marketplace, treasury, identity, and account-takeover coverage. All controls are deterministic + auditable; none move value.

---

## 1. Threat vectors (superset)

### 1.1 Network / commission (inherits `ANTI_FRAUD_MODEL.md` F1–F10)
Self-referral, circular sponsorship, wallet duplication, identity duplication, wash trading, split purchases, commission abuse, artificial volume, fake KYC, manual manipulation.

### 1.2 Identity & account
| # | Vector | Description |
|---|--------|-------------|
| W1 | **Wallet Linking abuse** | linking wallets to dodge identity/limits; shared-control detection. |
| W2 | **Duplicate Identity** | one person, multiple KYC identities (inherits F4). |
| W3 | **Synthetic Identity** | fabricated persona (fake docs + generated PII) to pass KYC. |
| W4 | **Account Takeover** | credential/session/key compromise → hostile control. |
| W5 | **Device Fingerprinting** | shared device/IP graph linking supposedly distinct actors. |

### 1.3 Marketplace / NFT
| # | Vector | Description |
|---|--------|-------------|
| M1 | **Fake Listings** | scam/non-existent listings; price-cap/spoofing. |
| M2 | **Fake Documents** | forged title/KYC/valuation docs. |
| M3 | **Wash Trading** (market) | self/tempo trades to fake liquidity/price. |
| M4 | **Counterfeit/ownership spoof** | inherits `NFT_SECURITY_MODEL.md` S2/S4. |

### 1.4 Treasury / movement
| # | Vector | Description |
|---|--------|-------------|
| T1 | **Transaction Anomalies** | velocity/amount/destination deviation (`TREASURY_SECURITY_MODEL.md` §5). |
| T2 | **Commission Abuse** | inherits F7; clawback settlement. |
| T3 | **Referral Abuse** | self/fake referrals to farm commission (inherits F1). |
| T4 | **Diversion** | funds to non-whitelisted destination. |

---

## 2. Preventive controls

| Vector | Control |
|--------|---------|
| W1/W2/W5 | Wallet↔Identity 1:1 binding; device/IP graph; duplicate detection at onboarding + periodically. |
| W3 | Document Vault verification + liveness + PII consistency; AI doc-assist but human decision (`COMPLIANCE_ARCHITECTURE.md`). |
| W4 | Adaptive auth, session rotation, hardware keys for privileged; impossible-travel + device change → step-up/freeze. |
| M1 | Listing verification vs `Property`/`PropertyFraction`; price ≤ current_value invariant; supply ≤ available. |
| M2 | Document hash-anchor + verification; fake doc → `ComplianceFlagRaised` + disqualify. |
| M3 | Distinct buyer/seller wallets + identity; cooling + settlement checks (inherits F5). |
| T1/T4 | Multi-sig + threshold + destination whitelist + anomaly detection (`TREASURY_SECURITY_MODEL.md`). |
| T3 | Referral code↔agent↔investor integrity; self/fake referral rejected (inherits F1/F3). |
| All | Two-stage gating for value; corrections offsetting; `AdminActionLogged` for overrides. |

---

## 3. Detective controls (monitoring)

- **Velocity checks:** per-actor transaction/referral/investment rate beyond cohort z-score → flag.
- **Behavior analysis:** deviation from established pattern (amount, geo, device, time).
- **Device fingerprinting:** cluster shared device/IP to surface sock-puppets/synthetics.
- **Graph analysis:** cycles, dupes, proxy clusters (privacy-aware, compliant).
- **Wash/volume:** self-trade + split + artificial-volume detection (inherits F5/F6/F8).
- **Document forensics:** duplicate/doctored document detection.
- **Anomaly rollups:** batch over pre-aggregated data; lightweight per-event checks.

Any flag → `FraudDetected` (security event) + `ComplianceFlagRaised` (canonical) → manual review → possible hold/freeze/recovery.

---

## 4. Response & disposition

| Outcome | Action |
|---------|--------|
| Hold | Suspend the specific action (e.g., commission, listing, movement) pending review. |
| Flag | `ComplianceFlagRaised`; queue to Compliance Officer (human decides). |
| Clawback | Offsetting entry (never edit) for paid commission (`ANTI_FRAUD_MODEL.md` §4). |
| Freeze | Account/wallet/asset frozen by authorized human; `NFTFrozen` for NFT; treasury hold. |
| Recover | Dual-control re-assignment (guardian/key recovery) for compromised identity. |

The **Fraud Engine never auto-executes** holds/freezes/clawbacks on its own for value; it raises `FraudDetected` and the authorized human/module applies the control through the gated path.

---

## 5. Integration

| Domain | Touchpoint |
|--------|-----------|
| Identity/Auth | takeover detection → step-up/freeze. |
| Network Engine | inherits + extends anti-fraud. |
| Marketplace/NFT | fake listing/counterfeit gating (inherits NFT Security). |
| Treasury | anomaly + diversion detection (inherits Treasury Security). |
| Compliance | shared AML/synthetic signals; human decides. |
| Risk Engine | cross-validates; shares signals. |
| AI Platform | Fraud AI advisory (`AIFraudDetected`); human decides. |
| Audit | every control decision → `AuditLog` (19). |

Emits `FraudDetected`, `ThreatDetected`, `RiskScoreChanged` (see `SECURITY_EVENT_EXTENSION.md`).
