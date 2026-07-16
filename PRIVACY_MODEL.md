# Privacy Model — Relcko Enterprise Security (V1.8.0)

**Companion to:** `SECURITY_ARCHITECTURE.md`, `IDENTITY_AND_ACCESS_MODEL.md`, `COMPLIANCE_ARCHITECTURE.md`, `AUDIT_ARCHITECTURE.md`. Defines consent, classification, segregation, encryption, retention, erasure, export, jurisdiction.
**Status:** Architecture only. Framework-agnostic. No implementation, no code.

Privacy is a **first-class control**, not an afterthought. It underpins Zero Trust data handling and the PII handling already specified for the AI Platform (`AI_MEMORY_MODEL.md`, `AI_KNOWLEDGE_MODEL.md`).

---

## 1. Data classification

| Tier | Examples | Default handling |
|------|----------|------------------|
| **PUBLIC** | property descriptions, market aggregates, proposal text. | Broad read; no restriction. |
| **INTERNAL** | treasury totals (mgr), config, internal metrics. | Role-scoped (`DISCIPLINE`/`GLOBAL`). |
| **CONFIDENTIAL** | investment amounts, commissions, votes. | `OWN`/`TEAM`/`DISCIPLINE`; access-controlled. |
| **PII** | KYC docs, wallet↔identity, email, name, earnings. | Segregated; minimal exposure; access-controlled + audited. |
| **SENSITIVE/REGULATED** | SoW/SoF, PEP status, sanctions hits. | Strict `DISCIPLINE`; legal/regulatory scoped. |

Classification is tagged on every record + knowledge fact + memory entry; it drives access, encryption, retention, and cross-border rules.

---

## 2. Consent management

- Explicit, granular consent at onboarding + on new purpose (marketing, analytics, AI memory).
- Consent recorded immutably (audit) with version + scope; withdrawable.
- Withdrawal honored via retention/erasure pipeline; future processing stops for withdrawn purpose.
- AI memory consent: users informed what the AI remembers; can review/delete (`AI_MEMORY_MODEL.md` §4.3).

---

## 3. PII segregation

- PII stored in a **segregated partition** with stricter access than non-PII; only `DISCIPLINE`/authorized roles + the data subject (`OWN`) retrieve.
- No PII in logs, AI prompts, or shared knowledge semantic store in raw form; references + consented attributes only.
- Executive AI / aggregate dashboards built only on anonymized data; raw PII never enters them.
- Pseudonymization where full identity not needed for processing.

---

## 4. Encryption

| State | Control |
|-------|---------|
| **At rest** | Envelope encryption; keys in HSM/vault (`SECURITY_ARCHITECTURE.md` §2.12); PII encrypted with stricter key policy. |
| **In transit** | TLS/mTLS everywhere; signed internal calls. |
| **Field-level** | Sensitive fields (KYC, wallet mappings) encrypted at field level. |
| **Key management** | Rotation via Secrets service; recovery keys split (Shamir). |

---

## 5. Retention

- Retention period per data class + jurisdiction (e.g., KYC/AML records retained for regulatory minimum).
- Automated purge of expired non-PII; PII purged only after lawful basis ends + any legal hold cleared.
- Retention policy versioned + audited on change.

---

## 6. Rights of the data subject

| Right | Mechanism |
|-------|-----------|
| **Right to Erasure** | Delete by identity across stores (ledger offsetting where value involved); propagate to memory + knowledge references; emit `MemoryUpdated`/`KnowledgeIndexed`; audit. Cannot erase immutable regulatory records — those are sealed/anonymized per law. |
| **Right to Export** | Subject-export of their own data (scoped, access-controlled); emits `AuditExported`. |
| **Access/Rectification** | view + correct own data via verified session. |

Erasure is a first-class, audited operation; it never breaks value integrity (corrections are offsetting).

---

## 7. Jurisdiction controls & cross-border processing

- **Data residency:** PII stored in-region per user jurisdiction; region tag on record.
- **Cross-border transfer:** allowed only with lawful basis (adequacy/contractual clauses); logged.
- **Country risk** (`RISK_ENGINE.md` §2.9) can restrict processing for high-risk jurisdictions (sanctions/AML).
- Regional failover preserves residency (no silent cross-border replication of PII) — see `DISASTER_RECOVERY_PLAN.md`.

---

## 8. Data minimization

- Collect only what each purpose requires; default-deny extra fields.
- AI/analytics use aggregates + references, not raw copies.
- Derived facts cite source; no duplicated PII stores.

---

## 9. Integration

| Domain | Touchpoint |
|--------|-----------|
| Identity/Auth | consent + classification on identity attributes. |
| Compliance | PII for KYC/AML; sealed regulatory retention. |
| AI Platform | PII segregation in knowledge/memory (`AI_KNOWLEDGE_MODEL.md` §6). |
| Audit | PII in audit minimized; export scoped. |
| Secrets | encryption key policy. |
| DR | residency-preserving backup/recovery. |

Inherits immutability: erasure/export are audited; corrections offsetting (`ENTITY_RELATIONSHIP.md` rule 2).
