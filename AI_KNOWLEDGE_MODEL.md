# AI Knowledge Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`, `AI_ENGINE_ARCHITECTURE.md`. Defines the unified knowledge architecture that all 12 engines read from.
**Status:** Architecture only. Framework-agnostic. No implementation, no database schema, no vector-DB code.

The Knowledge Layer is the **single normalized representation of ecosystem truth** that engines retrieve from. Engines never crawl raw module stores. Knowledge is *derived* from the append-only `Transaction` + `AuditLog` ledger and ecosystem projections, exactly like read models.

---

## 1. Principles

1. **Derived, not authoritative.** Knowledge is rebuilt from ledger/events; it can be fully reconstructed by replay.
2. **Scoped by permission.** Each knowledge slice carries a minimum role/scope; retrieval enforces `PERMISSION_MODEL.md`.
3. **Indexed, not ad-hoc.** Structuring + semantic indexing make retrieval consistent and auditable.
4. **Versioned & traceable.** Every knowledge fact links to its source event/ledger entry (`provenance`).
5. **PII-aware.** Sensitive personal data is segregated and access-controlled; anonymized slices exist for Executive/aggregate use.

---

## 2. Knowledge domains

The platform defines ten knowledge domains. Each is a logically partitioned, independently indexable body of knowledge.

| # | Domain | Source entities / events | Primary consumers |
|---|--------|--------------------------|-------------------|
| 1 | **Domain Knowledge** | `DOMAIN_MODEL` invariants, `MODULE_DEPENDENCY_MAP`, `GovParameter` | all engines (rules/contracts) |
| 2 | **Marketplace Knowledge** | `Property`, `PropertyFraction`, `MarketplaceListing`, `MarketplaceSale`, `Investment` | Marketplace AI, Investor AI, Agent AI, Property AI |
| 3 | **Property Knowledge** | `Property`, `SPV`, `Documents`, `GeoRegion`, `PropertyCoordinate`, `Rewards` | Property AI, Marketplace AI, Portfolio AI |
| 4 | **Governance Knowledge** | `Proposal`, `Vote`, `VotingPower`, `GovParameter` | Governance AI, Executive AI |
| 5 | **Treasury Knowledge** | `TreasuryAccount`, `TreasuryMovement`, `YieldRecord`, `Payment`, `Commission` | Treasury AI, Executive AI, Governance AI |
| 6 | **Compliance Knowledge** | `KYC`, `Wallet`, `Transaction`, `AuditLog`, watchlists, sanctions refs | Compliance AI, Treasury AI, Administrator AI |
| 7 | **Portfolio Knowledge** | `Portfolio` (read model), `Ownership`, `Transaction`, `Rewards` | Investor AI, Portfolio AI, Agent AI, Executive AI |
| 8 | **Network Knowledge** | `Agent`, `Referral`, `Commission`, `AgentTeam`, `CampaignAttribution`, `Leaderboard` | Agent AI, Marketplace AI, Compliance AI, Executive AI |
| 9 | **Document Knowledge** | `Documents`, vault records, verified facts, help/content corpus | Support AI, Developer AI, Compliance AI, Property AI |
| 10 | **Historical Knowledge** | time-series of all above + `AuditLog` + market/external feeds | all engines (trends, baselines, drift) |

---

## 3. Knowledge representation

Each domain is represented in **three complementary structures** (interface seams; backing store pluggable):

### 3.1 Structured facts
Typed, queryable records (e.g., `property_123.current_value`, `agent_45.conversion_rate`). Used by classifiers/regressors and dashboards.

### 3.2 Semantic index
Embedded representations for natural-language retrieval (proposal text, property descriptions, support articles, explanations). Used by reasoning/LLM models and the Copilot.

### 3.3 Graph relations
Entity relationships for multi-hop reasoning (Investor → Ownership → Property → SPV → Jurisdiction; Agent → Referral → Investor → Investment). Used by network/impact/compliance analysis.

A single knowledge **fact** carries metadata:
`{ factId, domain, entityRef, value, provenance (eventId/ledgerRef), indexedAt, sensitivity (PUBLIC/INTERNAL/PII), scope (min role) }`.

---

## 4. Indexing pipeline

```
Ecosystem event / ledger change
        │
        ▼
┌──────────────────────────────┐
│ INGEST → NORMALIZE → ENRICH   │
│  (map to domains + sensitivity)│
└──────────┬───────────────────┘
           ▼
┌──────────────────────────────┐
│ INDEX → structured + semantic │
│        + graph                │
└──────────┬───────────────────┘
           ▼
   KnowledgeIndexed event ──▶ Event Bus
```

- Ingestion is event-driven (subscribes to `EVENT_ARCHITECTURE.md` catalog) + scheduled reconciliation (repair drift).
- Normalization applies sensitivity tagging + scope assignment per fact.
- `KnowledgeIndexed` event announces indexing batches (`AI_EVENT_EXTENSION.md`).

---

## 5. Provenance & lineage

- Every fact records its `provenance` → the event or ledger entry it derived from.
- Explainability ("data sources", "evidence") resolves directly to these provenance links (`AI_EXPLAINABILITY_MODEL.md`).
- Rebuild: drop a domain's index and replay its source events → identical facts. No manual edits.

---

## 6. Privacy & sensitivity tiers

| Tier | Examples | Min scope to retrieve |
|------|----------|-----------------------|
| `PUBLIC` | property descriptions, market aggregates | Anonymous |
| `INTERNAL` | treasury totals (mgr), proposal payloads | DISCIPLINE / GLOBAL |
| `PII` | KYC docs, wallet↔identity, individual earnings | DISCIPLINE (Compliance) / OWN (self) |

- PII facts are never indexed into the public semantic store.
- Anonymized projections (e.g., Executive indices) are derived *from* PII but stored separately as `PUBLIC`/`INTERNAL` aggregates with no individual link.
- Retrieval enforces the tier at the Scope Gate (`AI_ENGINE_ARCHITECTURE.md §1.1`).

---

## 7. Cross-domain composition

Engines compose domains without coupling:
- **Investor AI** reads Portfolio + Property + Marketplace + Historical for one investor (all `OWN`).
- **Executive AI** reads *anonymized* slices of every domain (`GLOBAL`, PII stripped).
- **Compliance AI** reads Compliance + Network + Historical across the population (`DISCIPLINE`).

Composition is a retrieval-plan, not an engine call. The Knowledge Layer is the only shared "memory" between engines.

---

## 8. Consistency with ecosystem

- Knowledge respects the same invariant that read models do: **it never diverges from the ledger**. Any discrepancy → rebuild from source events.
- External market/external feeds (for Property AI macro, Marketplace AI trends) enter only as `Historical Knowledge` enrichment, clearly tagged as external + dated, and never override ledger truth.
- Indexing is idempotent (keyed by `factId`); at-least-once delivery tolerated.
