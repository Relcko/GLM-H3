# Module Dependency Map — Relcko Ecosystem

**Companion to:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `EVENT_ARCHITECTURE.md`.
**Rule:** Modules depend ONLY on the shared platform layer + the event bus. They
never import each other directly. Arrows below mean "consumes events / reads
shared entities from".

---

## 1. Layered view

```
                         ┌─────────────────────────────────────────────┐
                         │            SHARED PLATFORM LAYER             │
                         │  Identity/Wallet · Ledger(Transaction,      │
                         │  AuditLog) · Property core · Money(Payment,  │
                         │  Commission, Referral) · Design system ·     │
                         │  Event Bus · Permission Service · Notify     │
                         └─────────────────────────────────────────────┘
                                          ▲  (all modules depend upward)
                                          │
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │Marketplace│ │NFT Market│ │Network    │ │Governance│ │Treasury  │ │Portfolio │
   └──────────┘ └──────────┘ │Engine    │ └──────────┘ └──────────┘ └──────────┘
               ┌──────────────┤(Agents)  ├──────────────┬────────────┘
               │Document Vault│ └──────────┘             │
               └──────────────┘ ┌──────────┐ ┌──────────┐ │
                                │Dividend  │ │AI Copilot│ │
                                │Center    │ └──────────┘ │
                                └──────────┘ ┌──────────┐ │
                                            │Global Map│ │
                                            └──────────┘ │
                              ┌──────────────────────────┐│
                              │Referral Campaign Manager ││
                              └──────────────────────────┘│
                                          ┌───────────────┴──────────┐
                                          │      ADMIN PORTAL        │
                                          │ (orchestrates all; no    │
                                          │  new entities)          │
                                          └──────────────────────────┘
```

---

## 2. Per-module dependencies

| Module | Reads (shared) | Emits (events) | Consumes (events) |
|--------|---------------|----------------|-------------------|
| **1 Marketplace** | Property, Fraction, SPV, Investor, Wallet, KYC, Payment, Commission, Referral | InvestmentConfirmed, MarketplaceSaleCompleted, OwnershipUpdated, CommissionCalculated, PropertyPublished | KYCApproved, CommissionPaid |
| **2 NFT Marketplace** | Property, Investor, Wallet, Payment, Transaction | NFTMinted, NFTListed, NFTSold, NFTTransferred, RoyaltiesPaid | — |
| **3 Network Engine** | Investor, Agent, Referral, Commission | AgentOnboarded, AgentStatusChanged, ReferralCreated, ReferralConverted, AgentTaskCompleted, CommissionCalculated | ReferralConverted (from Marketplace) |
| **4 Governance** | Investor, Ownership, Transaction | GovernanceProposalCreated, VoteCast, ProposalExecuted, VotingPowerUpdated, GovernanceParameterChanged | OwnershipUpdated (recompute power) |
| **5 Treasury** | Payment, Commission, Transaction, SPV | TreasuryDeposit, TreasuryWithdrawal, TreasuryRebalanced, TreasuryYieldRealized, TreasuryMovementApproved | CommissionPaid, DividendDistributed, ProposalExecuted |
| **6 Portfolio** | Ownership, Transaction, Rewards, NFTHolding, Vote | PortfolioRecomputed, PortfolioRebalanced | OwnershipUpdated, DividendDistributed, NFTTransferred, VotingPowerUpdated |
| **7 Document Vault** | Documents, Investor, Property, SPV | DocumentUploaded, DocumentVerified, DocumentAccessed, AccessGranted, KYCSubmitted/Approved/Rejected | — |
| **8 Dividend Center** | Rewards, Ownership, Transaction, Investor | DividendScheduled, DividendDistributed, DividendClaimed, TaxDocumentIssued | OwnershipUpdated (snapshot) |
| **9 AI Copilot** | (read-only across all) | CopilotQueryReceived, CopilotAnswerIssued, CopilotPolicyViolation | (none emitted to bus) |
| **10 Global Property Map** | Property, SPV, Documents | PropertyGeocoded, GeoRegionComputed, MapLayerUpdated | PropertyPublished, PropertyDelisted |
| **11 Referral Campaign Mgr** | Referral, Commission, CampaignAttribution | ReferralCampaignLaunched, CampaignRewardIssued, LeaderboardUpdated | ReferralConverted |
| **12 Admin Portal** | ALL (read) + Permission | AdminActionLogged, ComplianceFlagRaised, SystemPaused, RoleChanged | ALL (observes) |

---

## 3. Shared service dependencies (no module owns these)

- **Event Bus** ← emitted by every module, consumed by Portfolio, Treasury,
  Notification, Admin, Network Engine.
- **Permission Service** ← consulted by every module before any mutation.
- **Notification Service** ← consumes `NotificationSent`/`AlertRaised` (emitted by
  handlers of the events above) → in-app/email/on-chain alerts.
- **Ledger (Transaction + AuditLog)** ← appended by Marketplace, Treasury, Dividend,
  Network Engine, Admin.

---

## 4. Critical dependency chains (why order matters)

1. **Invest → everything:**
   `InvestmentConfirmed` → `OwnershipUpdated` → `PortfolioRecomputed` +
   `VotingPowerUpdated` → `CommissionCalculated` → `TreasuryMovementApproved`
   (settlement) → `NotificationSent`.
   → Marketplace MUST land before Portfolio/Treasury/Governance projections are
     meaningful.

2. **Sale → payout:**
   `MarketplaceSaleCompleted` → `OwnershipUpdated` + `CommissionCalculated`
   (secondary) → Treasury settlement.

3. **Dividend:**
   `DividendScheduled` → snapshot `OwnershipUpdated` (point-in-time) →
   `DividendDistributed` → Treasury + `PortfolioRecomputed`.

4. **Governance:**
   `VoteCast` → `VotingPowerUpdated` (from Ownership) → `ProposalExecuted` →
   Treasury/Marketplace parameter change.

5. **Network/Referral:**
   `ReferralConverted` (on invest) → Network Engine attribution →
   `CommissionCalculated` → Campaign reward → Treasury payout.

---

## 5. Anti-dependencies (explicitly forbidden)

- Module A must **not** import Module B's `components/` or `hooks/`.
- UI composition happens only in the consuming module's own `components/` (e.g.,
  Portfolio embeds a `MarketplacePropertyCard` *copy/adapted* via the shared
  design system, not by importing Marketplace internals).
- Cross-module data access goes through shared read-models / event projections,
  never through another module's write services.
- Blockchain + API are interface seams per module; a module may not call another
  module's chain contract directly.

---

## 6. Maturity / sequencing summary

| Phase | Modules | Rationale |
|-------|---------|-----------|
| P1 (done) | Marketplace (browse) | Foundation + design-system proof. |
| P2 | Marketplace (invest) · Portfolio · Document Vault · KYC/Compliance | Closes the primary loop. |
| P3 | Treasury · Dividend Center · Network Engine | Money movement + income. |
| P4 | Governance · Referral Campaign · NFT Marketplace | Decentralization + growth. |
| P5 | AI Copilot · Global Property Map · Admin Portal | Experience + ops maturity. |

Full sequencing in `IMPLEMENTATION_ROADMAP.md`.
