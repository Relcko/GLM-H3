# NFT Security Model — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_TRANSFER_MODEL.md`,
`NFT_TYPES.md`, `ANTI_FRAUD_MODEL.md`, `DOCUMENT_MANAGEMENT_ARCHITECTURE.md`.
Architecture only.

Enumerates fraud/counterfeit/abuse vectors specific to the NFT layer and the
preventive + detective + recovery controls. Inherits platform KYC/AML gates and
the Network Engine anti-fraud model; adds NFT-specific guarantees.

---

## 1. Threat vectors

| # | Vector | Description |
|---|--------|-------------|
| S1 | **Counterfeit collection** | fake collection impersonating a verified one. |
| S2 | **Counterfeit asset** | unauthorized mint claiming a real property/brand. |
| S3 | **Duplicate mint** | same `sourceRef` (Property/SPV) minted twice. |
| S4 | **Ownership spoof** | off-chain record disagrees with on-chain owner. |
| S5 | **Unauthorized transfer** | transfer bypassing compliance/freeze. |
| S6 | **Blacklist evasion** | sanctioned address receiving via proxy. |
| S7 | **Royalty evasion** | peer-to-peer transfer to dodge marketplace fee. |
| S8 | **Metadata tampering** | unauthorized dynamic-metadata edit. |
| S9 | **Phishing / fake listing** | scam listing mimicking real asset. |
| S10 | **Key compromise** | owner wallet stolen → NFT drained. |

---

## 2. Preventive controls

| Vector | Control |
|--------|---------|
| S1/S2 | Collection **verification** requires Document Verification NFT + creator KYC (13); verified badge + signature check. Unverified collections flagged. |
| S3 | Mint is atomic with `Ownership` (7) allocation; `sourceRef` uniqueness enforced (one NFT set per property/fraction). |
| S4 | On-chain owner is source of truth; mismatch → freeze + `ComplianceFlagRaised` (`NFT_OWNERSHIP_MODEL.md` §7). |
| S5 | Transfer-validation predicate (`NFT_TRANSFER_MODEL.md` §2) rejects frozen/soulbound/non-compliant moves. |
| S6 | Blacklist evaluated on `to` address + linked identities (Identity NFT); proxy clustering detected. |
| S7 | Royalty enforced at transfer layer for sale-type transfers; marketplace is the canonical venue; off-market transfers still trigger royalty hook where supported. |
| S8 | Metadata edits only via authorized issuer + new version + hash re-anchor; tamper detected by hash mismatch. |
| S9 | Listing verification against `NFTAsset.tokenId` + collection; scam listings rejected pre-publish. |
| S10 | Recovery flow (`NFT_TRANSFER_MODEL.md` §5): verified owner re-assigns to new wallet via dual-control; compromised wallet frozen. |

---

## 3. Detective controls (monitoring)

- **Collection similarity scan:** detect near-duplicate names/logos vs verified.
- **Mint anomaly:** burst mints from one creator → review.
- **Ownership reconciliation job:** periodic on-chain vs off-chain diff → flag.
- **Royalty gap:** transfers without expected royalty → review.
- **Proxy graph:** addresses sharing Identity/device/IP → potential evasion.
- Any flag → `ComplianceFlagRaised` → manual review → freeze/blacklist/recovery.

---

## 4. Compliance & freeze

- **Compliance gating:** KYC (13) / Accredited Investor / whitelist / geo per
  `NFTCompliance` (NFT-9), evaluated at transfer.
- **Freeze:** per-asset / per-collection / per-owner; set by Compliance/Emergency;
  emits `NFTFrozen`. Cleared by `NFTUnfrozen`.
- **Blacklist:** sanctions/fraud addresses barred from receiving.

---

## 5. Recovery & emergency

- **Recovery:** dual-control owner re-assignment (verified via Identity/KYC NFT +
  Document Vault). Append-only `AuditLog` (19).
- **Emergency controls:** global pause (circuit breaker) + collection pause; set by
  Super Admin / Treasury multi-sig; emit `SystemPaused` + `NFTFrozen`. All
  emergency actions observable in Admin Portal and mirrored to `AuditLog` (19).

---

## 6. Audit & immutability

- Every mint/transfer/burn/upgrade/freeze/recovery appends `AuditLog` (19) with
  actor, rule, evidence ref.
- Corrections are offsetting entries (never edits) — `ENTITY_RELATIONSHIP.md`
  rule 2.
- Compliance Officer + Auditor roles (`PERMISSION_MODEL.md`) have full visibility.

---

## 7. Integration

| Domain | Security touchpoint |
|--------|---------------------|
| Document Vault | verification + KYC attestations. |
| Compliance | blacklist/freeze/KYC gating + flags. |
| Network Engine | anti-fraud shared signals (dup wallets/identity). |
| Treasury | emergency pause authority (multi-sig). |
| Admin Portal | observability + dual-control actions. |
| AI Copilot | read-only security summaries (scoped to Compliance). |

---

## 8. Scalability

- Verification + blacklist are indexed sets; predicate is O(1).
- Reconciliation + similarity scans run in batch over indexes.
- At 100K assets, the security layer is read-heavy; write-path controls are
  per-transfer and append-only audited.
