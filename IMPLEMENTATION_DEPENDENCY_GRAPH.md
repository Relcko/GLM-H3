# Implementation Dependency Graph — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`. Defines the build dependency graph for all platform modules. Planning only; no implementation.
**Rule:** Modules depend only on the shared platform layer + the event bus, never on each other directly (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §1, §4`). Cross-module effects are event-driven.

---

## 1. Dependency principles

- **Foundation first.** Core Platform (shared layer) must exist before any module.
- **No cycles.** Event bus decouples producers/consumers; a module may *consume* another's events without a build dependency.
- **Read models last-ish.** Portfolio/Global Property Intelligence/Dashboards are projections that subscribe to events; they build after their source modules emit those events.
- **Cross-cutting layers wrap, not block.** Security/Compliance/Risk/Fraud are integrated throughout but have no hard build-order dependency on business modules beyond the shared layer + the events they observe.

---

## 2. The graph

```
                                  ┌──────────────────────────────┐
                                  │   CORE PLATFORM (shared)     │
                                  │ Identity/Wallet · Ledger/    │
                                  │ Audit · Event Bus · Permission│
                                  │ · Design System · Feature    │
                                  │ Shell · Notification Service │
                                  └───────────────┬──────────────┘
                                                  │ (everyone depends on this)
       ┌──────────────┬──────────────┬───────────┴────┬──────────────┬──────────────┐
       ▼              ▼              ▼                ▼              ▼              ▼
 DOCUMENT VAULT   MARKETPLACE    NFT MARKETPLACE   NETWORK ENGINE  GOVERNANCE    GLOBAL PROPERTY
 (Identity,                         (Property core,                   (Identity,    INTELLIGENCE
  Compliance)    (Property core,    Identity, Ledger)                  Ledger)        (Property core,
                Identity, Ledger)                                                  Documents)
       │              │              │                │              │              │
       │              ▼              ▼                ▼              │              │
       │        INVESTMENT ENGINE   │          COMMISSION ENGINE    │              │
       │        (Marketplace ext.)  │          (Network ext.)        │              │
       │              │              │                │              │              │
       │              ▼              ▼                ▼              │              │
       │        OWNERSHIP ENGINE  NFT OWNERSHIP     AGENT/REFERRAL   │              │
       │        (Investment+Sale)  (Fraction NFT)   STATE            │              │
       │              │              │                │              │              │
       └──────┬───────┴──────┬───────┴───────┬────────┘              │              │
              ▼              ▼               ▼                       ▼              ▼
         PORTFOLIO      TREASURY ◀─────── DIVIDEND CENTER ──────────┘              │
         (read model     (Ledger,          (Rewards, Ownership,                     │
          over Ownership/ Payment,         Ledger)                                 │
          Transaction)   Governance)                                                      
              │              │               │                                      │
              └──────┬───────┴───────┬───────┘                                      │
                     ▼               ▼                                              │
                 AI PLATFORM      SECURITY LAYER (Identity/Auth/Compliance/         │
                 (engines,         Risk/Fraud/Audit/Privacy/Observability/DR) ──────┤
                  knowledge,       wraps all modules; observes events              │
                  memory)                                                         │
                     │                                                            │
                     ▼                                                            │
                 ADMIN PORTAL ◀── operates on all modules (orchestration only) ───┘
                     │
                     ▼
                 DEVELOPER PORTAL (build surface; reads specs + observability)
                     │
       ┌─────────────┴───────────────┐
       ▼                             ▼
  FUTURE MOBILE (reuses     FUTURE PUBLIC APIs (reuses
  backends + API Security)  backends + API Security gateway)
```

---

## 3. Dependency edges + justification

| From → To | Why (locked-spec basis) |
|-----------|--------------------------|
| Core Platform → all modules | `RELCKO_ECOSYSTEM_ARCHITECTURE.md §1`: all modules use shared Identity/Ledger/Event/Permission/Notification. |
| Core Platform → Document Vault | KYC docs gate onboarding (`DOMAIN_MODEL.md §13`, `DOCUMENT_MANAGEMENT_ARCHITECTURE.md`). |
| Document Vault → Compliance | Verification feeds compliance decisions (`COMPLIANCE_ARCHITECTURE.md`). |
| Core Platform → Marketplace | Property core + Identity + Ledger are prerequisites (`MARKETPLACE_INVESTMENT_ENGINE.md`). |
| Marketplace → Investment Engine | Investments are primary-market purchases on Marketplace properties (`MARKETPLACE_INVESTMENT_ENGINE.md`). |
| Marketplace/Investment → Ownership Engine | Confirmation/sale update `Ownership` (7) (`OWNERSHIP_MODEL.md`). |
| Core Platform → NFT Marketplace | Property core + Identity + Ledger (`NFT_MARKETPLACE_ARCHITECTURE.md`). |
| NFT Marketplace → NFT Ownership | Mint/transfer allocate `Ownership`-equivalent (`NFT_OWNERSHIP_MODEL.md`). |
| Core Platform → Network Engine | Identity, `Agent`, `Referral`, `Commission` (`NETWORK_ENGINE_ARCHITECTURE.md`). |
| Network Engine → Commission Engine | Attribution computes `Commission` (11) (`COMMISSION_ENGINE.md`). |
| Core Platform → Governance | Identity + Ledger (`GOVERNANCE_ARCHITECTURE.md`). |
| Ownership Engine → Portfolio | Portfolio is a read model over `Ownership`/`Transaction` (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.6`). |
| Marketplace/Investment/NFT → Treasury | Settlement + yield flow to Treasury (`TREASURY_ARCHITECTURE.md`, `PAYMENT_SETTLEMENT_ARCHITECTURE.md`). |
| Governance → Treasury | Gated spends require `ProposalExecuted` (`PERMISSION_MODEL.md §6`). |
| Ownership → Dividend Center | Snapshot `Ownership` at schedule (`DIVIDEND_ENGINE.md`). |
| Treasury/Dividend → Portfolio | Payouts reflected in Portfolio projection. |
| Property core/Documents → Global Property Intelligence | Geocode + region aggregation (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.10`). |
| All modules → AI Platform | AI consumes read models + events (`AI_PLATFORM_ARCHITECTURE.md`); AI never depends on module code. |
| All modules → Security Layer | AuthZ/audit/compliance/risk/fraud wrap every module (`SECURITY_ARCHITECTURE.md`). |
| All modules → Admin Portal | Admin orchestrates all via services + permission (`RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.12`). |
| Backends → Future Mobile / Public APIs | Reuse backend services behind API Security (`SECURITY_ARCHITECTURE.md §2.6`). |

---

## 4. Event-driven decoupling (no build cycles)

Modules that would otherwise create cycles are linked only by events:

- Treasury listens to `CommissionPaid`, `DividendDistributed`, `ProposalExecuted`, `MarketplaceSaleCompleted` (`EVENT_ARCHITECTURE.md §4`) — no Treasury→Marketplace build dependency.
- Portfolio subscribes to `OwnershipUpdated`, `DividendDistributed`, `NFTTransferred`, `VotingPowerUpdated`, `CommissionPaid` — no Portfolio→source build dependency.
- AI subscribes to all events + reads projections; engines never call modules.
- Security/Compliance/Risk/Fraud observe events (`SECURITY_EVENT_EXTENSION.md`, `AI_EVENT_EXTENSION.md`) — integrated, not blocking.

---

## 5. Build sequence (topological)

1. Core Platform (shared layer + monorepo + CI)
2. Document Vault
3. Marketplace → Investment Engine → Ownership Engine
4. NFT Marketplace → NFT Ownership
5. Network Engine → Commission Engine
6. Governance
7. Treasury (+ Dividend Center)
8. Portfolio (projection)
9. Global Property Intelligence
10. AI Platform (knowledge/memory first, then engines)
11. Security Layer (wired across all above)
12. Admin Portal + Developer Portal
13. Future Mobile + Future Public APIs (consume backends)

> Security/Compliance/Risk/Fraud are integrated at every step (cross-cutting), not deferred to a single phase. The phase labels in `IMPLEMENTATION_ROADMAP_V2.md` reflect this: security hardening completes in V2.8 but its foundations (auth, audit, permission) ship with Core Platform.
