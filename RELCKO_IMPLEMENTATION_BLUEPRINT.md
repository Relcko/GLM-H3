# RELCKO Implementation Blueprint v1.0

**Status:** Engineering Blueprint — Architecture Authority
**Companion documents:** Financial Core v1.0, Commission Constitution v1.0, Event Constitution v1.0, RNE Architecture v1.1, Domain Event Catalog v1.0, RELCKO Ecosystem Architecture v1.2.1

**Authority:** This blueprint governs the implementation sequence, module boundaries, aggregate design, repository contracts, service layering, and deployment strategy for the RELCKO platform. Every engineer, team lead, and reviewer must conform to the structures and decisions herein.

---

## 1. Executive Overview

### 1.1 Implementation Philosophy

RELCKO is a platform of record for fractional real-world asset ownership. The implementation philosophy is grounded in five commitments:

1. **Domain-driven first.** Every line of code is organized around the 30 bounded contexts defined in the Domain Event Catalog. Infrastructure follows domain boundaries, not the reverse.
2. **Event-driven by constitution.** Cross-module communication occurs exclusively through the event bus. No module calls another module's services directly. This is not a style preference; it is a constitutional requirement.
3. **Immutability as foundation.** The event log is the single source of truth. All state is derived from events. Corrections are compensating events, never mutations.
4. **Read models are projections.** Every read model, cache, and materialized view is a derived artifact rebuildable from the event log. No read model is authoritative.
5. **Two-stage gating for value.** Every financial movement requires multi-sig or second-approver authorization. No single actor — human or system — may unilaterally move value.

### 1.2 Guiding Principles

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each bounded context owns its aggregates, events, and services. No overlap. |
| **Explicit Dependencies** | All inter-module dependencies are declared. No hidden coupling. |
| **Idempotency Everywhere** | Every consumer is idempotent by construction. At-least-once delivery is assumed. |
| **Deterministic Replay** | All event handlers are pure functions of (state, event) → new state. No wall clock, no randomness, no external calls during replay. |
| **Fail Closed** | On any uncertainty (schema mismatch, auth failure, timeout), the operation fails safe. |
| **Observability by Default** | Every service exports metrics, structured logs, and distributed traces. No silent failures. |

### 1.3 Definition of Done

A bounded context is "done" when:

- All aggregates defined in this blueprint are implemented with their invariants enforced.
- All owned events from the Domain Event Catalog are produced on the correct triggers.
- All consumed events are processed idempotently with projection state maintained.
- Repository layer is implemented with persistence and query responsibilities separated.
- All domain services are implemented and unit-tested.
- All read models are implemented and rebuildable from event replay.
- Integration tests verify event flow with upstream and downstream contexts.
- The module passes contract tests against its event schema.
- Documentation is updated to reflect the implementation.

---

## 2. Monorepo Structure

The monorepo follows a package-based structure. Every bounded context is a separate package. Shared infrastructure and libraries are distinct packages.

```
relcoko/
├── apps/
│   ├── web/                          # Next.js application (marketplace + portals)
│   │   ├── app/                      # App Router pages
│   │   ├── components/               # Shared UI components
│   │   └── lib/                      # Client-side utilities
│   └── admin/                        # Admin portal (separate Next.js app)
│
├── packages/
│   ├── domain-event-catalog/         # Event type definitions and schemas
│   ├── event-bus/                    # Event bus abstractions and implementation
│   ├── event-store/                  # Event storage and retrieval
│   ├── permission/                   # Permission model and enforcement
│   ├── notification/                 # Notification dispatch
│   ├── audit-log/                    # Audit log projection
│   │
│   ├── bc-agent/                     # S1 Agent bounded context
│   ├── bc-network/                   # S2 Network bounded context
│   ├── bc-commission/                # S3 Commission bounded context
│   ├── bc-qualification/             # S4 Qualification bounded context
│   ├── bc-campaign/                  # S5 Campaign bounded context
│   ├── bc-property/                  # S6 Property bounded context
│   ├── bc-investment/                # S7 Primary Investment bounded context
│   ├── bc-secondary-market/          # S8 Secondary Market bounded context
│   ├── bc-payment/                   # S9 Payment and Settlement bounded context
│   ├── bc-ownership/                 # S10 Ownership bounded context
│   ├── bc-portfolio/                 # S11 Portfolio bounded context
│   ├── bc-nft/                       # S12 NFT bounded context
│   ├── bc-dividend/                  # S13 Dividend bounded context
│   ├── bc-reward/                    # S14 Reward bounded context
│   ├── bc-treasury/                  # S15 Treasury bounded context
│   ├── bc-reserve/                   # S16 Reserve bounded context
│   ├── bc-buyback/                   # S17 Buyback and Burn bounded context
│   ├── bc-governance/                # S18 Governance bounded context
│   ├── bc-identity/                  # S19 Identity and Wallet bounded context
│   ├── bc-compliance/                # S20 Compliance bounded context
│   ├── bc-security/                  # S21 Security bounded context
│   ├── bc-risk/                      # S22 Risk bounded context
│   ├── bc-ai/                        # S23 AI bounded context
│   ├── bc-document/                  # S24 Document bounded context
│   ├── bc-admin/                     # S25 Administration bounded context
│   ├── bc-audit/                     # S26 Audit bounded context
│   ├── bc-map/                       # S27 Map bounded context
│   ├── bc-valuation/                 # S28 Valuation bounded context
│   ├── bc-notification/              # S29 Notification bounded context
│   └── bc-system/                    # S30 System bounded context
│
├── workers/
│   ├── commission-worker/            # Commission calculation and payout
│   ├── settlement-worker/            # Payment settlement processing
│   ├── notification-worker/          # Notification dispatch
│   ├── buyback-worker/               # Buyback execution
│   ├── treasury-worker/              # Treasury allocation and movement
│   ├── risk-worker/                  # Risk score computation
│   ├── ai-worker/                    # AI inference and recommendation
│   ├── replay-worker/                # Event replay and projection rebuild
│   ├── dividend-worker/              # Dividend calculation and distribution
│   ├── reconciliation-worker/        # Ledger reconciliation
│   └── cleanup-worker/               # Data retention and archival
│
├── infra/
│   ├── database/                     # Database migrations and schemas
│   ├── event-store/                  # Event store infrastructure
│   ├── message-queue/                # Message queue configuration
│   ├── monitoring/                   # Monitoring and alerting config
│   └── deployment/                   # Deployment manifests
│
├── tools/
│   ├── event-simulator/              # Event simulation for testing
│   ├── replay-orchestrator/          # Replay coordination
│   └── schema-validator/             # Schema validation tooling
│
├── testing/
│   ├── contract-tests/               # Cross-module contract tests
│   ├── replay-tests/                 # Replay determinism tests
│   └── performance-tests/            # Performance and stress tests
│
├── package.json                      # Root package configuration
├── turbo.json                        # Turborepo configuration
└── tsconfig.json                     # Root TypeScript configuration
```

### 2.1 Internal Package Convention

Every bounded context package follows this structure:

```
packages/bc-{name}/
├── src/
│   ├── domain/                       # Domain layer
│   │   ├── aggregates/               # Aggregate roots and entities
│   │   ├── events/                   # Event definitions (re-exported from catalog)
│   │   ├── invariants/               # Invariant enforcement
│   │   └── value-objects/            # Value objects
│   ├── application/                  # Application layer
│   │   ├── commands/                 # Command handlers
│   │   ├── queries/                  # Query handlers
│   │   └── use-cases/               # Use case orchestration
│   ├── infrastructure/               # Infrastructure layer
│   │   ├── persistence/              # Repository implementations
│   │   ├── event-publishing/         # Event publisher implementations
│   │   └── projections/             # Read model projections
│   ├── interfaces/                   # Interface layer
│   │   ├── controllers/              # API controllers (if applicable)
│   │   ├── event-subscribers/        # Event subscribers
│   │   └── graphql/                  # GraphQL resolvers (if applicable)
│   └── index.ts                      # Public API
├── __tests__/                        # Tests
├── package.json
└── tsconfig.json
```

---

## 3. Bounded Context Mapping

### 3.1 S1 — Agent

**Purpose:** Onboard and manage agent identity, status, lifecycle, and rank progression.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S19 Identity and Wallet, Shared (Event Bus, Permission) |
| **Upstream** | S19 (identity verification), S2 (referral attribution) |
| **Downstream** | S2 Network, S3 Commission, S4 Qualification, S12 NFT |
| **Owned Aggregates** | Agent, AgentStatus |
| **Owned Events** | AgentRegistered, AgentActivated, AgentDeactivated, AgentStatusChanged, AgentEnteredGracePeriod, AgentTaskCompleted, RankAchieved, RankDemoted, QualificationAchieved |
| **External Interfaces** | None (internal module) |

### 3.2 S2 — Network

**Purpose:** Manage the agent network graph, referrals, and team structure.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S1 Agent, Shared (Event Bus) |
| **Upstream** | S1 (agent lifecycle) |
| **Downstream** | S3 Commission, S4 Qualification, S5 Campaign |
| **Owned Aggregates** | Referral, AgentTeam, AgentPerformance |
| **Owned Events** | ReferralCreated, ReferralConverted, ReferralExpired, LeaderboardUpdated, AgentPerformanceSnapshot |
| **External Interfaces** | None |

### 3.3 S3 — Commission

**Purpose:** Calculate, approve, and disburse all commission types.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S2 Network, S4 Qualification, S15 Treasury, Shared (Event Bus, Ledger) |
| **Upstream** | S2 (referral conversions), S4 (qualification status) |
| **Downstream** | S1 Agent, S15 Treasury, S14 Reward |
| **Owned Aggregates** | Commission, CommissionBatch, CommissionRate, OverrideRoute |
| **Owned Events** | CommissionCalculated, CommissionApproved, CommissionRejected, CommissionPaid, CommissionHeld, CommissionReleased, CommissionReversed, CommissionAdjusted, CommissionRefundAdjusted, CommissionRateChanged, OverrideRouteChanged, BonusCalculated, BonusPaid, CommissionRunStarted, CommissionRunCompleted, CommissionRunFailed |
| **External Interfaces** | None |

### 3.4 S4 — Qualification

**Purpose:** Determine whether a sale qualifies for commission attribution.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S9 Payment, S20 Compliance, S3 Commission, Shared (Event Bus) |
| **Upstream** | S9 (settlement), S20 (KYC approval) |
| **Downstream** | S3 Commission |
| **Owned Aggregates** | QualifyingSale, QualifyingCriteria |
| **Owned Events** | QualifyingSaleVerified, QualifyingCriteriaUpdated, CoolingPeriodEnded, CoolingPeriodExtended |
| **External Interfaces** | None |

### 3.5 S5 — Campaign

**Purpose:** Manage referral campaigns with rules, rewards, and leaderboards.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S2 Network, S3 Commission, Shared (Event Bus) |
| **Upstream** | S2 (referrals), S3 (commission data) |
| **Downstream** | S1 Agent, S14 Reward |
| **Owned Aggregates** | Campaign, CampaignReward, Leaderboard |
| **Owned Events** | ReferralCampaignLaunched, CampaignEnded, CampaignRewardIssued, LeaderboardUpdated |
| **External Interfaces** | None |

### 3.6 S6 — Property

**Purpose:** Manage property lifecycle from creation through approval to archival.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S19 Identity, S24 Document, Shared (Event Bus) |
| **Upstream** | S19 (property manager identity), S24 (legal documents) |
| **Downstream** | S7 Investment, S28 Valuation, S27 Map |
| **Owned Aggregates** | Property, PropertyFraction, SPV |
| **Owned Events** | PropertyCreated, PropertyApproved, PropertyPublished, PropertyUpdated, PropertyPaused, PropertyResumed, PropertyDelisted, PropertyArchived, PropertyFundingStarted, PropertyOperational, DividendActivated |
| **External Interfaces** | Property Manager portal |

### 3.7 S7 — Primary Investment

**Purpose:** Manage the primary investment flow from start through allocation.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S6 Property, S9 Payment, S10 Ownership, S20 Compliance, Shared (Event Bus) |
| **Upstream** | S6 (property open for funding), S9 (settlement confirmation) |
| **Downstream** | S10 Ownership, S3 Commission, S11 Portfolio |
| **Owned Aggregates** | Investment, Reservation, Round |
| **Owned Events** | InvestmentStarted, InvestmentAllocated, ReservationCreated, ReservationExpired, WaitingListPromoted, RoundOpened, RoundClosed, InvestmentRejected, InvestmentCancelled |
| **External Interfaces** | Investment portal |

### 3.8 S8 — Secondary Market

**Purpose:** Enable resale of fractional tokens between investors.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S10 Ownership, S9 Payment, S3 Commission, Shared (Event Bus) |
| **Upstream** | S10 (ownership verification) |
| **Downstream** | S10 Ownership, S3 Commission, S11 Portfolio |
| **Owned Aggregates** | MarketplaceListing, Offer, Escrow, MarketplaceSale |
| **Owned Events** | MarketplaceListingCreated, MarketplaceListingUpdated, MarketplaceListingCancelled, OfferCreated, OfferAccepted, OfferWithdrawn, OfferRejected, EscrowHeld, EscrowReleased, MarketplaceSaleCompleted, MarketplaceSaleCancelled, SecondaryPriceUpdated |
| **External Interfaces** | Marketplace UI |

### 3.9 S9 — Payment and Settlement

**Purpose:** Manage payment lifecycle and settlement across all payment methods.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus, Ledger) |
| **Upstream** | S7 (investment payment), S8 (trade settlement) |
| **Downstream** | S10 Ownership, S3 Commission, S15 Treasury |
| **Owned Aggregates** | Payment, Refund, SettlementLedger |
| **Owned Events** | PaymentInitiated, PaymentPending, PaymentSettling, SettlementCompleted, PaymentFailed, PaymentExpired, RefundInitiated, RefundCompleted, SettlementReconciled |
| **External Interfaces** | Blockchain adapters (BNB/USDT/USDC/RLKO), PSP adapters (bank transfer) |

### 3.10 S10 — Ownership

**Purpose:** Maintain the authoritative record of fraction and token ownership.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S7 Investment, S8 Secondary Market, Shared (Event Bus) |
| **Upstream** | S7 (allocation), S8 (transfer) |
| **Downstream** | S11 Portfolio, S13 Dividend, S18 Governance, S12 NFT |
| **Owned Aggregates** | OwnershipEvent, OwnershipSnapshot |
| **Owned Events** | OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned, OwnershipSnapshotTaken |
| **External Interfaces** | None |

### 3.11 S11 — Portfolio

**Purpose:** Provide consolidated investor views of holdings and performance.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S10 Ownership, S28 Valuation, S13 Dividend, Shared (Event Bus) |
| **Upstream** | S10, S28, S13, S12 (event consumers) |
| **Downstream** | None (read-model only) |
| **Owned Aggregates** | PortfolioHolding, PortfolioAlert |
| **Owned Events** | PortfolioHoldingChanged, PortfolioValueUpdated, PortfolioRebalanced, PortfolioAlertTriggered, PortfolioPerformanceUpdated |
| **External Interfaces** | Portfolio UI |

### 3.12 S12 — NFT

**Purpose:** Manage non-fungible token lifecycle.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S10 Ownership, S19 Identity, Shared (Event Bus) |
| **Upstream** | S10 (ownership data) |
| **Downstream** | S11 Portfolio, S18 Governance, S13 Dividend |
| **Owned Aggregates** | NFTCollection, NFTAsset, NFTListing, NFTOffer, NFTAuction, NFTSale, RoyaltyPayment, NFTBlacklist |
| **Owned Events** | NFTCreated, NFTMinted, NFTListed, NFTDelisted, NFTOfferCreated, NFTOfferAccepted, NFTOfferWithdrawn, NFTAuctionStarted, NFTAuctionBid, NFTAuctionEnded, NFTSold, NFTTransferred, RoyaltiesPaid, NFTFrozen, NFTUnfrozen, NFTBurned, NFTRedeemed, NFTUpgraded, NFTFused, NFTEvolved, NFTAccessGranted, NFTMetadataUpdated, NFTBlacklisted |
| **External Interfaces** | NFT Marketplace UI, Blockchain (ERC721) |

### 3.13 S13 — Dividend

**Purpose:** Calculate and distribute property income to token holders.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S10 Ownership, S15 Treasury, S20 Compliance, Shared (Event Bus) |
| **Upstream** | S10 (snapshot), S15 (funding) |
| **Downstream** | S11 Portfolio, S14 Reward, S24 Document |
| **Owned Aggregates** | Dividend, DividendPayment, TaxDocument |
| **Owned Events** | DividendCalculated, DividendApproved, DividendScheduled, DividendDistributed, DividendClaimed, DividendRejected, DividendRecovered, TaxDocumentIssued |
| **External Interfaces** | Tax reporting integration |

### 3.14 S14 — Reward

**Purpose:** Manage non-commission incentives and leadership pools.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S15 Treasury, S1 Agent, Shared (Event Bus) |
| **Upstream** | S15 (funding), S1 (agent eligibility) |
| **Downstream** | S1 Agent, S11 Portfolio |
| **Owned Aggregates** | Reward, IncentiveProgram, LeadershipPool |
| **Owned Events** | IncentiveCredited, RewardPaid, IncentiveProgramActivated, IncentiveProgramDeactivated, LeadershipPoolDistributed |
| **External Interfaces** | None |

### 3.15 S15 — Treasury

**Purpose:** Custody, allocation, and movement of all platform funds.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S18 Governance, Shared (Event Bus, Ledger) |
| **Upstream** | S18 (governance approval), S3 (commission settlement) |
| **Downstream** | S13 Dividend, S14 Reward, S16 Reserve, S17 Buyback, S3 Commission |
| **Owned Aggregates** | TreasuryAccount, TreasuryMovement, TreasuryAllocation, TreasuryYield, TreasuryBalance |
| **Owned Events** | TreasuryDeposit, TreasuryWithdrawal, TreasuryAllocated, TreasuryFunded, TreasuryMovementApproved, TreasuryRebalanced, TreasuryYieldRealized, TreasuryBalanced |
| **External Interfaces** | Multi-sig wallet (blockchain), Governance |

### 3.16 S16 — Reserve

**Purpose:** Manage reserve sub-funds for risk backstop.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S15 Treasury, Shared (Event Bus) |
| **Upstream** | S15 (funding allocation) |
| **Downstream** | S15 (drawdown effects) |
| **Owned Aggregates** | ReserveFund |
| **Owned Events** | ReserveUpdated, EmergencyReserveUsed, InsuranceTriggered |
| **External Interfaces** | None |

### 3.17 S17 — Buyback and Burn

**Purpose:** Acquire and permanently remove tokens from supply.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S15 Treasury, S18 Governance, Shared (Event Bus) |
| **Upstream** | S15 (funding), S18 (governance approval) |
| **Downstream** | S15 (treasury balance) |
| **Owned Aggregates** | BuybackProgram, BuybackExecution, BurnExecution, TokenSupply |
| **Owned Events** | BuybackProgramCreated, BuybackProgramPaused, BuybackProgramResumed, BuybackExecuted, BuybackCancelled, BurnExecuted, BurnCancelled, SupplyReductionUpdated |
| **External Interfaces** | DEX/AMM integration |

### 3.18 S18 — Governance

**Purpose:** Decentralized decision-making for the platform.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S10 Ownership, S12 NFT, Shared (Event Bus, Permission) |
| **Upstream** | S10 (voting power), S12 (NFT voting multipliers) |
| **Downstream** | S15 Treasury, S6 Property |
| **Owned Aggregates** | Proposal, Vote, VotingPower, GovParameter |
| **Owned Events** | GovernanceProposalCreated, VoteCast, VotingPowerUpdated, ProposalExecuted, ProposalDefeated, GovernanceParameterChanged |
| **External Interfaces** | Governance UI, On-chain governor contract (future) |

### 3.19 S19 — Identity and Wallet

**Purpose:** Manage user identity, authentication, wallet binding, and authorization.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus, Permission) |
| **Upstream** | S20 (KYC approval) |
| **Downstream** | All contexts (identity verification) |
| **Owned Aggregates** | Identity, Wallet, Permission, Role |
| **Owned Events** | IdentityVerified, WalletLinked, WalletVerified, PermissionGranted, PermissionRevoked, RoleChanged |
| **External Interfaces** | SIWE authentication, Wallet adapters |

### 3.20 S20 — Compliance

**Purpose:** KYC/KYB/AML/sanctions screening and compliance case management.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S24 Document, Shared (Event Bus) |
| **Upstream** | S24 (document submission) |
| **Downstream** | S19 Identity, S7 Investment, S8 Secondary Market |
| **Owned Aggregates** | KYC, ComplianceCase, ComplianceFlag, AMLAlert |
| **Owned Events** | KYCSubmitted, KYCApproved, KYCRejected, ComplianceApproved, ComplianceRejected, ComplianceFlagRaised, AMLAlertRaised |
| **External Interfaces** | KYC provider, AML screening provider, Sanctions screening |

### 3.21 S21 — Security

**Purpose:** Incident response, threat detection, emergency lockdown.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus, Permission) |
| **Upstream** | S22 (risk signals), S20 (compliance flags) |
| **Downstream** | S25 Administration (system pause) |
| **Owned Aggregates** | Incident, EmergencyState, Threat, Secret |
| **Owned Events** | IncidentCreated, IncidentResolved, EmergencyLockdown, EmergencyLockdownLifted, FraudDetected, ThreatDetected, SecretRotated |
| **External Interfaces** | Security monitoring tools |

### 3.22 S22 — Risk

**Purpose:** Continuous risk scoring across 12 domains.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus) |
| **Upstream** | All contexts (risk signals) |
| **Downstream** | S21 Security, S20 Compliance |
| **Owned Aggregates** | RiskScore |
| **Owned Events** | RiskScoreChanged |
| **External Interfaces** | None (internal scoring engine) |

### 3.23 S23 — AI

**Purpose:** AI recommendations, detection, forecasting, and knowledge management.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | All read models, Shared (Event Bus) |
| **Upstream** | All contexts (advisory input) |
| **Downstream** | All contexts (advisory output) |
| **Owned Aggregates** | AIRecommendation, AIDetection, AIForecast, AIModel, KnowledgeIndex, AIMemory |
| **Owned Events** | AIRecommendationGenerated, AIRecommendationAccepted, AIRecommendationRejected, AIFraudDetected, AIRiskDetected, AIForecastGenerated, AIModelUpdated, KnowledgeIndexed, MemoryUpdated |
| **External Interfaces** | LLM/ML model APIs |

### 3.24 S24 — Document

**Purpose:** Secure document storage, verification, and access control.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S19 Identity, Shared (Event Bus) |
| **Upstream** | S19 (identity) |
| **Downstream** | S20 Compliance, S6 Property |
| **Owned Aggregates** | Document, AccessGrant |
| **Owned Events** | DocumentUploaded, DocumentVerified, DocumentAccessed, AccessGranted |
| **External Interfaces** | Object storage (S3/IPFS) |

### 3.25 S25 — Administration

**Purpose:** Platform administration and system state management.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | All contexts (read), Shared (Event Bus, Permission) |
| **Upstream** | All contexts |
| **Downstream** | All contexts (constrained write) |
| **Owned Aggregates** | AdminLog, SystemState |
| **Owned Events** | AdminActionLogged, SystemPaused, SystemResumed |
| **External Interfaces** | Admin Portal |

### 3.26 S26 — Audit

**Purpose:** Immutable audit log mirroring all platform events.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus, Event Store) |
| **Upstream** | All contexts (event mirror) |
| **Downstream** | S20 Compliance, S21 Security |
| **Owned Aggregates** | AuditLog, AuditReport, AuditExport |
| **Owned Events** | AuditTrailRecorded, FinancialAuditCompleted, AuditExported |
| **External Interfaces** | Regulatory reporting |

### 3.27 S27 — Map

**Purpose:** Global property map with geographic layers.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S6 Property, Shared (Event Bus) |
| **Upstream** | S6 (property lifecycle) |
| **Downstream** | None |
| **Owned Aggregates** | GeoProperty, GeoRegion, MapLayer |
| **Owned Events** | PropertyGeocoded, GeoRegionComputed, MapLayerUpdated |
| **External Interfaces** | Map tile service (Mapbox/Google Maps) |

### 3.28 S28 — Valuation

**Purpose:** Property valuation records and NAV computation.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | S6 Property, Shared (Event Bus) |
| **Upstream** | S6 (property data) |
| **Downstream** | S11 Portfolio, S13 Dividend, S18 Governance |
| **Owned Aggregates** | ValuationRecord, PropertyValuation |
| **Owned Events** | ValuationRecorded, ValuationUpdated |
| **External Interfaces** | Valuation model API (independent appraiser) |

### 3.29 S29 — Notification

**Purpose:** Multi-channel notification dispatch.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus) |
| **Upstream** | All contexts (notification triggers) |
| **Downstream** | None (terminal) |
| **Owned Aggregates** | Notification, Alert |
| **Owned Events** | NotificationSent, AlertRaised, AlertResolved |
| **External Interfaces** | Email provider, SMS provider, Push notification provider |

### 3.30 S30 — System

**Purpose:** Platform-level operational events.

| Attribute | Value |
|-----------|-------|
| **Dependencies** | Shared (Event Bus, Schema Registry) |
| **Upstream** | All contexts (schema changes) |
| **Downstream** | All contexts (schema notifications) |
| **Owned Aggregates** | SchemaRegistry, EventBus |
| **Owned Events** | SchemaVersionUpdated, EventBusHealthChecked |
| **External Interfaces** | Schema registry UI |

---

## 4. Aggregate Design

### 4.1 Aggregate Inventory

Every aggregate is listed with its owning bounded context, its invariant responsibilities, and its lifecycle states.

> **Synchronization Note:** The table below lists 49 aggregate entries. For the complete list of 96 aggregates defined in §3 Bounded Context Mapping, consult the owning context sections above. Aggregates defined in §3 but not listed below (e.g., AgentStatus, QualifyingCriteria, CampaignReward, MarketplaceSale, SettlementLedger, PortfolioAlert, PropertyFraction, SPV, TaxDocument, NFTListing, NFTOffer, NFTAuction, NFTSale, RoyaltyPayment, NFTBlacklist, LeadershipPool, TreasuryAllocation, TreasuryYield, TreasuryBalance, BuybackExecution, TokenSupply, GovParameter, Role, ComplianceFlag, AMLAlert, EmergencyState, Threat, Secret, AIDetection, AIForecast, AIModel, KnowledgeIndex, AIMemory, AccessGrant, AuditReport, AuditExport, PropertyValuation, Alert, EventBus) are canonical per §3 and should be implemented to the same standard as the aggregates listed below.

| Aggregate | Bounded Context | Invariants | Lifecycle |
|-----------|-----------------|------------|-----------|
| Agent | S1 Agent | Single sponsor per investor; commission_rate is authoritative; status is ACTIVE/INACTIVE only | Registered → Activated → Deactivated → Reactivated |
| AgentTeam | S2 Network | Acyclic graph; one parent per node; max depth enforced | Created → Updated → Restructured |
| Referral | S2 Network | One active referral per investor; single sponsor for life | Created → Converted → Expired |
| Commission | S3 Commission | Amount = f(saleValue, rate, multiplier); override routes to nearest ACTIVE upline | Calculated → Approved → Paid / Held / Reversed |
| CommissionBatch | S3 Commission | Sum of commissions = calculated total; batch is all-or-nothing | Created → Calculated → Approved → Settled |
| OverrideRoute | S3 Commission | Routes to ACTIVE upline only; Treasury fallback on exhaustion | Created → Updated → Compressed |
| QualifyingSale | S4 Qualification | Cooling period enforced; KYC must be approved; minimum value met | Submitted → Verified → Cooled → Confirmed / Rejected |
| Campaign | S5 Campaign | Start before end; budget not exceeded; rules immutable once active | Draft → Active → Ended → Archived |
| Property | S6 Property | Total supply fixed at approval; fractions sum to 100%; SPV 1:1 | Created → Approved → Published → Funded → Operational → Archived |
| Investment | S7 Investment | Available supply not exceeded; min investment respected; one round at a time | Started → Reserved → Paid → Allocated / Rejected |
| Reservation | S7 Investment | TTL enforced; quantity ≤ available | Created → Expired → Promoted / Cancelled |
| Round | S7 Investment | Hard cap respected; end date enforced | Opened → Active → Closed |
| MarketplaceListing | S8 Secondary Market | Quantity ≤ seller balance; price within allowed bounds | Created → Active → Updated → Cancelled / Sold |
| Offer | S8 Secondary Market | Price ≥ 0; on active listing only; expires at TTL | Created → Accepted / Withdrawn / Rejected |
| Escrow | S8 Secondary Market | Amount equals offer price; released only on settlement or cancellation | Held → Released / Returned |
| Payment | S9 Payment | FX rate frozen at initiation; amount invariant maintained | Initiated → Pending → Settling → Settled / Failed / Expired |
| Refund | S9 Payment | Refund amount ≤ original payment; routes to original method | Initiated → Completed |
| OwnershipEvent | S10 Ownership | Total supply invariant: sum(balances) = total supply - burned | Minted / Transferred / Reclaimed / Burned |
| OwnershipSnapshot | S10 Ownership | Immutable once taken; reproducible from event log | Requested → Taken |
| PortfolioHolding | S11 Portfolio | Quantity = sum of ownership events; cost basis computed from weighted average | Updated (no terminal state) |
| NFTCollection | S12 NFT | Max supply enforced (if set); metadata schema defined | Created → Active → Archived |
| NFTAsset | S12 NFT | 1:1 with token ID; metadata immutable after mint; freeze blocks transfers | Created → Minted → Frozen / Active → Burned / Redeemed |
| Dividend | S13 Dividend | Pool = net income × policy %; per-unit amount × units = total approved | Calculated → Approved → Funded → Scheduled → Distributed / Rejected → Recovered |
| DividendPayment | S13 Dividend | Amount = entitlement × per-unit; claimed at most once | Pending → Claimed → Recovered |
| Reward | S14 Reward | Budget not exceeded; eligibility rules enforced at credit time | Credited → Paid |
| IncentiveProgram | S14 Reward | Budget capped; end date after start date | Draft → Active → Deactivated |
| TreasuryAccount | S15 Treasury | Balance = sum(deposits) - sum(withdrawals); multi-sig required for movement | Active → Frozen → Closed |
| TreasuryMovement | S15 Treasury | Requires N-of-M approvals; amount ≤ available balance | Requested → Approved → Executed / Rejected |
| ReserveFund | S16 Reserve | Balance ≥ 0; drawdown requires authority per reserve type | Funded → Available → Drawn → Replenished |
| BuybackProgram | S17 Buyback | Funding source validated; budget not exceeded; governance approved if required | Created → Active → Paused → Ended |
| BurnExecution | S17 Buyback | Burn amount ≤ custody balance; supply reduction recorded | Pending → Executed / Cancelled |
| Proposal | S18 Governance | Quorum and majority required; timelock before execution; one vote per voter per proposal | Created → Active → Passed / Defeated → Executed |
| Vote | S18 Governance | Voter eligible at snapshot; weight = voting power at snapshot; irrevocable | Cast |
| VotingPower | S18 Governance | Power = f(ownership, NFT multiplier, delegation); recomputed on relevant events | Updated (no terminal state) |
| Identity | S19 Identity | 1:1 with verified person; wallet 1:1 with identity; KYC required for investing | Unverified → KYC Pending → Verified → Suspended / Banned |
| Wallet | S19 Identity | SIWE signature required; one wallet per identity | Unlinked → Linked → Verified → Frozen |
| Permission | S19 Identity | Grant authority validated; temporary grants auto-expire | Granted → Revoked / Expired |
| KYC | S20 Compliance | Documents required; human decision mandatory; AI advisory only | Pending → Approved / Rejected |
| ComplianceCase | S20 Compliance | Source action gated until resolution; human decision mandatory | Open → Approved / Rejected |
| Incident | S21 Security | Severity classified; response timeline tracked | Open → Investigating → Resolved |
| RiskScore | S22 Risk | Score in [0,1]; band mapping per policy; recomputed on signal | Updated (no terminal state) |
| AIRecommendation | S23 AI | Explainability envelope required; human decision loop closed | Generated → Accepted / Rejected |
| Document | S24 Document | Content hash immutable; access controlled by AccessGrant | Uploaded → Verified / Rejected → Archived |
| AdminLog | S25 Administration | Immutable; wraps all privileged actions | Logged |
| SystemState | S25 Administration | Safe to resume only if pause reason resolved | Active → Paused → Active |
| AuditLog | S26 Audit | Append-only hash chain; tamper-evident | Recorded → Archived → Exported |
| ValuationRecord | S28 Valuation | Immutable once appended; independent valuations require document verification | Recorded |
| Notification | S29 Notification | At-least-once delivery; retry on failure | Queued → Sent → Failed |
| SchemaRegistry | S30 System | Compatibility verified before registration; breaking changes require new type | Registered → Deprecated → Archived |

### 4.2 State Machine Diagrams

The following aggregates have multi-state lifecycles that must be implemented as state machines:

**Agent:** `REGISTERED → PENDING → ACTIVE → INACTIVE → ACTIVE (loop) → SUSPENDED → TERMINATED`

**Commission:** `CALCULATED → APPROVED → PAID | HELD | REVERSED`

**Payment:** `INITIATED → PENDING → SETTLING → SETTLED | FAILED | EXPIRED`

**Dividend:** `CALCULATED → APPROVED → FUNDED → SCHEDULED → DISTRIBUTED → RECOVERED | REJECTED`

**Proposal:** `PENDING → ACTIVE → PASSED | DEFEATED → EXECUTED | VETOED`

**NFTAsset:** `MINTED → ACTIVE → FROZEN → ACTIVE | BURNED | REDEEMED`

**Incident:** `OPEN → INVESTIGATING → RESOLVED`

---

## 5. Repository Layer

### 5.1 Repository Principles

1. **Repositories are aggregate-scoped.** Each aggregate root has exactly one repository interface.
2. **Persistence responsibility.** Repositories handle storage and retrieval of aggregate state.
3. **Query responsibility is separate.** Read-model queries use dedicated query interfaces or direct projection reads.
4. **Read models are never stored by aggregate repositories.** They are maintained by projection subscribers.
5. **Event sourcing is the default.** Where event sourcing is used, the repository appends events and reconstructs state by replaying the aggregate stream.

### 5.2 Repository Interfaces

Every bounded context defines the following repository contracts in its domain layer:

```
interface I{aggregate}Repository {
    save(aggregate: {Aggregate}): Promise<void>;
    saveMany(aggregates: {Aggregate}[]): Promise<void>;
    load(aggregateId: string): Promise<{Aggregate} | null>;
    loadByFilter(filter: {Filter}): Promise<{Aggregate}[]>;
    delete(aggregateId: string): Promise<void>;
}
```

### 5.3 Repository Implementations by Bounded Context

| Bounded Context | Repository Interfaces | Storage Model | Notes |
|----------------|----------------------|---------------|-------|
| S1 Agent | IAgentRepository | Event-sourced | State reconstructed from Agent events |
| S2 Network | IReferralRepository, ITeamRepository | Graph DB | Team graph stored in graph structure |
| S3 Commission | ICommissionRepository, IRateRepository, IRouteRepository | Event-sourced | Commissions event-sourced for audit |
| S4 Qualification | IQualifyingSaleRepository | Relational | Current state stored; events for audit |
| S5 Campaign | ICampaignRepository, IRewardRepository | Relational | Campaign state with event log |
| S6 Property | IPropertyRepository, IFractionRepository, ISPVRepository | Event-sourced | Property state from events |
| S7 Investment | IInvestmentRepository, IReservationRepository, IRoundRepository | Event-sourced | Investment state machine from events |
| S8 Secondary | IListingRepository, IOfferRepository, IEscrowRepository, ISaleRepository | Event-sourced | Trade state from events |
| S9 Payment | IPaymentRepository, IRefundRepository, ILedgerRepository | Event-sourced | Payment lifecycle from events |
| S10 Ownership | IOwnershipEventRepository, ISnapshotRepository | Event-sourced | Append-only event stream |
| S11 Portfolio | IPortfolioRepository (read-only) | Projection | Read-model only; rebuilt from events |
| S12 NFT | ICollectionRepository, IAssetRepository, IListingRepository, IOfferRepository, IAuctionRepository, ISaleRepository | Hybrid | NFT state event-sourced; metadata indexed relationally |
| S13 Dividend | IDividendRepository, IPaymentRepository, ITaxDocumentRepository | Event-sourced | Dividend lifecycle from events |
| S14 Reward | IRewardRepository, IProgramRepository, IPoolRepository | Relational | Reward state with event log |
| S15 Treasury | IAccountRepository, IMovementRepository, IAllocationRepository, IYieldRepository | Event-sourced | Treasury movement event-sourced |
| S16 Reserve | IReserveFundRepository | Relational | Current balance with event audit |
| S17 Buyback | IProgramRepository, IBuybackExecutionRepository, IBurnExecutionRepository, ISupplyRepository | Event-sourced | Buyback/burn state from events |
| S18 Governance | IProposalRepository, IVoteRepository, IVotingPowerRepository, IParameterRepository | Event-sourced | Proposal state from events |
| S19 Identity | IIdentityRepository, IWalletRepository, IPermissionRepository | Relational | Identity state in relational store |
| S20 Compliance | IKYCRepository, ICaseRepository, IFlagRepository, IAMLAlertRepository | Relational | Compliance data with event audit |
| S21 Security | IIncidentRepository, IEmergencyRepository, IThreatRepository | Relational | Incident data with event audit |
| S22 Risk | IRiskScoreRepository | Projection | Read-model; recomputed from signals |
| S23 AI | IRecommendationRepository, IDetectionRepository, IForecastRepository, IModelRepository | Relational | AI artifact storage |
| S24 Document | IDocumentRepository, IAccessGrantRepository | Object Store + Relational | Content in object store; metadata in relational |
| S25 Admin | IAdminLogRepository, ISystemStateRepository | Relational | Append-only admin log |
| S26 Audit | IAuditLogRepository, IReportRepository, IExportRepository | Append-only Log | Immutable hash chain storage |
| S27 Map | IGeoPropertyRepository, IRegionRepository, ILayerRepository | Spatial DB | Spatial indexed storage |
| S28 Valuation | IValuationRecordRepository | Time-series | Append-only valuation time series |
| S29 Notification | INotificationRepository, IAlertRepository | Relational | Notification state with delivery tracking |
| S30 System | ISchemaRepository, IHealthRepository | Relational | Schema registry and health state |

### 5.4 Read Model Ownership

| Read Model | Owner | Producer Events | Rebuild Strategy |
|------------|-------|-----------------|------------------|
| Agent Dashboard | S1 Agent | Agent events | Replay all Agent events per agent |
| Agent Performance | S2 Network | Referral, Commission events | Replay referrals and commissions per agent |
| Commission Summary | S3 Commission | Commission events | Replay all commission events |
| Portfolio Overview | S11 Portfolio | Ownership, Dividend, Valuation events | Replay from ownership event stream |
| Voting Power | S18 Governance | Ownership, NFT events | Replay from ownership snapshots |
| Treasury Balance | S15 Treasury | Treasury movement events | Replay all treasury movements |
| Property NAV | S28 Valuation | Valuation records | Replay valuation time series |
| Leaderboard | S2 Network | Referral conversion, commission events | Replay from campaign events |
| NFT Score | S12 NFT | NFT mint/transfer events | Replay from NFT event stream |
| Risk Summary | S22 Risk | Risk score events | Recompute from risk factor events |
| Audit Query | S26 Audit | All events | Replay entire event log (scoped) |

---

## 6. Domain Services

### 6.1 Service Inventory

| Service | Bounded Context | Input | Output | Dependencies |
|---------|----------------|-------|--------|--------------|
| AgentService | S1 | Registration data, Status change commands | Agent aggregate | IAgentRepository, EventBus |
| AttributionService | S2 | Referral event, Conversion event | Attribution record | IReferralRepository, ITeamRepository |
| TeamGraphService | S2 | Team structure commands | Graph operations | ITeamRepository |
| PerformanceService | S2 | Agent performance query | Performance metrics | IReferralRepository, ICommissionRepository |
| CommissionCalculationService | S3 | Sale event, Agent state | Commission amounts | IAgentRepository, IRateRepository, ITeamRepository |
| OverrideRoutingService | S3 | Commission calculation, Team graph | Override routes | ITeamRepository, IAgentRepository |
| BonusCalculationService | S3 | Rank/Leadership/Period trigger | Bonus amounts | IAgentRepository, IRankRepository |
| QualifyingService | S4 | Sale event, Compliance state | Qualification decision | IPaymentRepository, IKYCRepository |
| CoolingPeriodService | S4 | Sale event, Timer | Cooling completion | IQualifyingSaleRepository |
| CampaignService | S5 | Campaign CRUD, Reward attribution | Campaign aggregate | ICampaignRepository |
| RewardRuleService | S5 | Campaign rules, Referral event | Reward amount | ICampaignRepository |
| PropertyLifecycleService | S6 | Property commands | Property aggregate | IPropertyRepository |
| InvestmentService | S7 | Investment request, Payment | Investment aggregate | IInvestmentRepository, IPaymentRepository |
| ReservationService | S7 | Reservation commands Timers | Reservation aggregate | IReservationRepository |
| ListingService | S8 | Listing CRUD | Listing aggregate | IListingRepository, IOwnershipRepository |
| OfferService | S8 | Offer commands | Offer aggregate | IOfferRepository, IListingRepository |
| EscrowService | S8 | Escrow hold/release | Escrow aggregate | IEscrowRepository, IPaymentRepository |
| PaymentService | S9 | Payment lifecycle commands | Payment aggregate | IPaymentRepository, IPaymentAdapter |
| SettlementService | S9 | Settlement commands | Settlement aggregate | IPaymentRepository, IEscrowRepository |
| RefundService | S9 | Refund commands | Refund aggregate | IRefundRepository, IPaymentRepository |
| OwnershipService | S10 | Ownership mutation commands | Ownership events | IOwnershipEventRepository |
| SnapshotService | S10 | Snapshot request | Snapshot aggregate | IOwnershipEventRepository, ISnapshotRepository |
| PortfolioProjectionService | S11 | Ownership/valuation events | Portfolio projection | IPortfolioRepository |
| NFTMintService | S12 | Mint request, Eligibility | NFT minted | IAssetRepository, ICollectionRepository |
| NFTMarketplaceService | S12 | Listing/Sale commands | Trade settlement | IListingRepository, ISaleRepository |
| RoyaltyService | S12 | Sale event | Royalty distribution | ISaleRepository, ICollectionRepository |
| DividendCalculationService | S13 | Income period, Policy | Dividend aggregate | IDividendRepository, IPropertyRepository |
| DistributionService | S13 | Dividend approval, Treasury funding | Distribution execution | IDividendRepository, IOwnershipRepository |
| TaxService | S13 | Distribution event | Tax documents | ITaxDocumentRepository |
| RewardsService | S14 | Incentive trigger | Reward aggregate | IRewardRepository |
| IncentiveProgramService | S14 | Program lifecycle | Program aggregate | IProgramRepository |
| TreasuryService | S15 | Deposit/Withdrawal commands | Treasury movements | IAccountRepository, IMovementRepository |
| MultiSigService | S15 | Approval commands | Movement approval | IMovementRepository |
| YieldService | S15 | Yield events | Yield records | IYieldRepository |
| ReserveManagementService | S16 | Funding/Drawdown commands | Reserve state | IReserveFundRepository |
| BuybackService | S17 | Program/Execution commands | Buyback aggregate | IProgramRepository, IBuybackExecutionRepository |
| BurnService | S17 | Burn commands | Burn aggregate | IBurnExecutionRepository |
| TokenSupplyService | S17 | Supply events | Supply metrics | ISupplyRepository |
| ProposalService | S18 | Proposal lifecycle | Proposal aggregate | IProposalRepository |
| VotingService | S18 | Vote commands | Vote aggregate | IVoteRepository, IProposalRepository |
| ExecutionService | S18 | Proposal execution | Execution outcome | IProposalRepository, ITreasuryRepository |
| VotingPowerService | S18 | Ownership/nft events | Voting power projection | IVotingPowerRepository |
| IdentityService | S19 | Identity lifecycle | Identity aggregate | IIdentityRepository |
| WalletService | S19 | Wallet link/verify | Wallet aggregate | IWalletRepository |
| AuthorizationService | S19 | Access request | Decision | IPermissionRepository, IIdentityRepository |
| ComplianceOfficerService | S20 | KYC/Case review | Decision | IKYCRepository, ICaseRepository |
| ScreeningService | S20 | Identity/Transaction | Screening result | IAMLAlertRepository |
| IncidentResponseService | S21 | Incident lifecycle | Incident aggregate | IIncidentRepository |
| EmergencyService | S21 | Emergency commands | Emergency state | IEmergencyRepository |
| RiskEngineService | S22 | Risk signals | Score updates | IRiskScoreRepository |
| RecommendationService | S23 | AI inference | Recommendation artifacts | IRecommendationRepository |
| DetectionService | S23 | Model output | Detection events | IDetectionRepository |
| ForecastService | S23 | Data + model | Forecast artifacts | IForecastRepository |
| VaultService | S24 | Document commands | Document aggregate | IDocumentRepository |
| AccessControlService | S24 | Access grant/revoke | Access state | IAccessGrantRepository |
| VerificationService | S24 | Document verification | Verification result | IDocumentRepository |
| AdminOrchestrationService | S25 | Admin action | Audit record | IAdminLogRepository |
| ConfigService | S25 | Configuration commands | Configuration state | IConfigRepository |
| AuditService | S26 | Event mirror | Audit records | IAuditLogRepository |
| GeoService | S27 | Geocoding commands | Coordinates | IGeoPropertyRepository |
| RegionAggregationService | S27 | Region computation | Region aggregates | IRegionRepository |
| ValuationService | S28 | Valuation commands | Valuation records | IValuationRecordRepository |
| NotificationDeliveryService | S29 | Notification events | Delivery | INotificationRepository |
| AlertService | S29 | Alert lifecycle | Alert state | IAlertRepository |
| SchemaRegistryService | S30 | Schema registration | Schema records | ISchemaRepository |
| HealthCheckService | S30 | Health probe | Health status | IHealthRepository |

---

## 7. Application Services

### 7.1 Command Handlers

Command handlers process incoming commands, invoke domain services, and publish resulting events. Every command handler follows the same pattern:

```
Command → Validate → Authorize → Invoke Domain Service → Publish Events → Return Result
```

### 7.2 Use Case Inventory

| Use Case | Command | Handler Location | Produces Events |
|----------|---------|-----------------|-----------------|
| Register Agent | RegisterAgent | S1 Agent | AgentRegistered |
| Activate Agent | ActivateAgent | S1 Agent | AgentActivated |
| Deactivate Agent | DeactivateAgent | S1 Agent | AgentDeactivated |
| Create Referral | CreateReferral | S2 Network | ReferralCreated |
| Convert Referral | ConvertReferral | S2 Network | ReferralConverted |
| Calculate Commission | CalculateCommission | S3 Commission | CommissionCalculated |
| Approve Commission | ApproveCommission | S3 Commission | CommissionApproved |
| Pay Commission | PayCommission | S3 Commission | CommissionPaid |
| Verify Qualifying Sale | VerifySale | S4 Qualification | QualifyingSaleVerified |
| Create Campaign | CreateCampaign | S5 Campaign | CampaignCreated |
| Issue Reward | IssueReward | S5 Campaign | CampaignRewardIssued |
| Create Property | CreateProperty | S6 Property | PropertyCreated |
| Approve Property | ApproveProperty | S6 Property | PropertyApproved |
| Publish Property | PublishProperty | S6 Property | PropertyPublished |
| Start Investment | StartInvestment | S7 Investment | InvestmentStarted |
| Allocate Investment | AllocateInvestment | S7 Investment | InvestmentAllocated |
| Open Round | OpenRound | S7 Investment | RoundOpened |
| Close Round | CloseRound | S7 Investment | RoundClosed |
| Create Listing | CreateListing | S8 Secondary | MarketplaceListingCreated |
| Accept Offer | AcceptOffer | S8 Secondary | OfferAccepted |
| Complete Sale | CompleteSale | S8 Secondary | MarketplaceSaleCompleted |
| Hold Escrow | HoldEscrow | S8 Secondary | EscrowHeld |
| Release Escrow | ReleaseEscrow | S8 Secondary | EscrowReleased |
| Initiate Payment | InitiatePayment | S9 Payment | PaymentInitiated |
| Complete Settlement | CompleteSettlement | S9 Payment | SettlementCompleted |
| Initiate Refund | InitiateRefund | S9 Payment | RefundInitiated |
| Complete Refund | CompleteRefund | S9 Payment | RefundCompleted |
| Mint Ownership | MintOwnership | S10 Ownership | OwnershipMinted |
| Transfer Ownership | TransferOwnership | S10 Ownership | OwnershipTransferred |
| Take Snapshot | TakeSnapshot | S10 Ownership | OwnershipSnapshotTaken |
| Create NFT | CreateNFT | S12 NFT | NFTCreated |
| Mint NFT | MintNFT | S12 NFT | NFTMinted |
| Sell NFT | SellNFT | S12 NFT | NFTSold |
| Transfer NFT | TransferNFT | S12 NFT | NFTTransferred |
| Calculate Dividend | CalculateDividend | S13 Dividend | DividendCalculated |
| Approve Dividend | ApproveDividend | S13 Dividend | DividendApproved |
| Distribute Dividend | DistributeDividend | S13 Dividend | DividendDistributed |
| Claim Dividend | ClaimDividend | S13 Dividend | DividendClaimed |
| Credit Incentive | CreditIncentive | S14 Reward | IncentiveCredited |
| Activate Program | ActivateProgram | S14 Reward | IncentiveProgramActivated |
| Deposit Treasury | DepositTreasury | S15 Treasury | TreasuryDeposit |
| Withdraw Treasury | WithdrawTreasury | S15 Treasury | TreasuryWithdrawal |
| Approve Movement | ApproveMovement | S15 Treasury | TreasuryMovementApproved |
| Allocate Treasury | AllocateTreasury | S15 Treasury | TreasuryAllocated |
| Execute Buyback | ExecuteBuyback | S17 Buyback | BuybackExecuted |
| Execute Burn | ExecuteBurn | S17 Buyback | BurnExecuted |
| Create Proposal | CreateProposal | S18 Governance | GovernanceProposalCreated |
| Cast Vote | CastVote | S18 Governance | VoteCast |
| Execute Proposal | ExecuteProposal | S18 Governance | ProposalExecuted |
| Link Wallet | LinkWallet | S19 Identity | WalletLinked |
| Verify Wallet | VerifyWallet | S19 Identity | WalletVerified |
| Grant Permission | GrantPermission | S19 Identity | PermissionGranted |
| Revoke Permission | RevokePermission | S19 Identity | PermissionRevoked |
| Submit KYC | SubmitKYC | S20 Compliance | KYCSubmitted |
| Approve KYC | ApproveKYC | S20 Compliance | KYCApproved |
| Reject KYC | RejectKYC | S20 Compliance | KYCRejected |
| Raise Flag | RaiseFlag | S20 Compliance | ComplianceFlagRaised |
| Create Incident | CreateIncident | S21 Security | IncidentCreated |
| Resolve Incident | ResolveIncident | S21 Security | IncidentResolved |
| Lockdown Emergency | LockdownEmergency | S21 Security | EmergencyLockdown |
| Lift Lockdown | LiftLockdown | S21 Security | EmergencyLockdownLifted |
| Detect Fraud | DetectFraud | S21 Security | FraudDetected |
| Update Score | UpdateRiskScore | S22 Risk | RiskScoreChanged |
| Generate Recommendation | GenerateRecommendation | S23 AI | AIRecommendationGenerated |
| Accept Recommendation | AcceptRecommendation | S23 AI | AIRecommendationAccepted |
| Reject Recommendation | RejectRecommendation | S23 AI | AIRecommendationRejected |
| Upload Document | UploadDocument | S24 Document | DocumentUploaded |
| Verify Document | VerifyDocument | S24 Document | DocumentVerified |
| Grant Access | GrantAccess | S24 Document | AccessGranted |
| Log Admin Action | LogAdminAction | S25 Admin | AdminActionLogged |
| Pause System | PauseSystem | S25 Admin | SystemPaused |
| Resume System | ResumeSystem | S25 Admin | SystemResumed |
| Record Valuation | RecordValuation | S28 Valuation | ValuationRecorded |
| Send Notification | SendNotification | S29 Notification | NotificationSent |
| Raise Alert | RaiseAlert | S29 Notification | AlertRaised |
| Resolve Alert | ResolveAlert | S29 Notification | AlertResolved |
| Register Schema | RegisterSchema | S30 System | SchemaVersionUpdated |

---

## 8. Read Models / Projections

### 8.1 Projection Principles

1. **Every projection is rebuildable.** Any projection can be cleared and rebuilt from the event log.
2. **Projections are keyed by aggregateId.** Each projection subscriber tracks the last processed event version per aggregate.
3. **Snapshots accelerate rebuild.** Periodic snapshots store state at a given version; rebuild starts from the latest snapshot.
4. **Projections are eventually consistent.** Cross-projection consistency is achieved through causal dependencies (causationId), not synchronous writes.
5. **No projection is authoritative.** The event log is always the source of truth.

### 8.2 Projection Inventory

| Projection | Owner | Subscribes To | Key | Rebuild Source |
|------------|-------|---------------|-----|----------------|
| AgentStatusProjection | S1 Agent | AgentRegistered, AgentActivated, AgentDeactivated, AgentStatusChanged | agentId | Agent event stream |
| AgentTeamProjection | S2 Network | TeamChanged, AgentRegistered | agentId | Network event stream |
| AgentPerformanceProjection | S2 Network | AgentPerformanceSnapshot | agentId | Performance events |
| ReferralProjection | S2 Network | ReferralCreated, ReferralConverted, ReferralExpired | referralId | Referral event stream |
| CommissionProjection | S3 Commission | CommissionCalculated, CommissionApproved, CommissionPaid, CommissionReversed | commissionId | Commission event stream |
| CommissionBatchProjection | S3 Commission | CommissionBatch events | batchId | Batch event stream |
| OverrideRouteProjection | S3 Commission | OverrideRouteChanged | routeId | Route event stream |
| PropertyProjection | S6 Property | All Property events | propertyId | Property event stream |
| PropertyListProjection | S6 Property | PropertyPublished, PropertyPaused, PropertyResumed, PropertyDelisted, PropertyArchived | — | Property lifecycle events |
| InvestmentProjection | S7 Investment | All Investment events | investmentId | Investment event stream |
| RoundProjection | S7 Investment | RoundOpened, RoundClosed | roundId | Round event stream |
| ListingBookProjection | S8 Secondary | MarketplaceListingCreated, MarketplaceListingUpdated, MarketplaceListingCancelled | propertyId | Listing event stream |
| OfferBookProjection | S8 Secondary | OfferCreated, OfferAccepted, OfferWithdrawn, OfferRejected | listingId | Offer event stream |
| EscrowProjection | S8 Secondary | EscrowHeld, EscrowReleased | escrowId | Escrow event stream |
| PaymentProjection | S9 Payment | All Payment events | paymentId | Payment event stream |
| SettlementLedgerProjection | S9 Payment | SettlementCompleted, RefundCompleted | — | Payment event stream |
| OwnershipBalanceProjection | S10 Ownership | OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned | investorId + propertyId | Ownership event stream |
| OwnershipHistoryProjection | S10 Ownership | All Ownership events | investorId + propertyId | Ownership event stream |
| PortfolioHoldingProjection | S11 Portfolio | Ownership events, NFT events | investorId | Ownership + NFT event streams |
| PortfolioValueProjection | S11 Portfolio | ValuationUpdated, SecondaryPriceUpdated, DividendDistributed | investorId | Valuation + Secondary + Dividend events |
| PortfolioPerformanceProjection | S11 Portfolio | PortfolioValueUpdated, DividendDistributed | investorId | Own event stream |
| NFTCollectionProjection | S12 NFT | NFTCreated, NFTMinted, NFTBurned | collectionId | NFT event stream |
| NFTBalanceProjection | S12 NFT | NFTMinted, NFTTransferred, NFTBurned, NFTRedeemed | ownerId | NFT event stream |
| NFTListingProjection | S12 NFT | NFTListed, NFTDelisted, NFTSold | — | NFT marketplace events |
| DividendProjection | S13 Dividend | All Dividend events | dividendId | Dividend event stream |
| DividendEligibilityProjection | S13 Dividend | OwnershipSnapshotTaken | propertyId | Ownership snapshot |
| RewardProjection | S14 Reward | IncentiveCredited, RewardPaid | recipientId | Reward event stream |
| TreasuryBalanceProjection | S15 Treasury | TreasuryDeposit, TreasuryWithdrawal, TreasuryAllocated, TreasuryFunded | accountId | Treasury event stream |
| TreasuryHealthProjection | S15 Treasury | TreasuryBalanced, TreasuryRebalanced, ReserveUpdated | — | Treasury + Reserve events |
| ReserveHealthProjection | S16 Reserve | ReserveUpdated, EmergencyReserveUsed, InsuranceTriggered | reserveId | Reserve event stream |
| SupplyProjection | S17 Buyback | BuybackExecuted, BurnExecuted, SupplyReductionUpdated | — | Buyback + Burn event stream |
| ProposalTallyProjection | S18 Governance | VoteCast | proposalId | Vote event stream |
| VotingPowerProjection | S18 Governance | OwnershipMinted, OwnershipTransferred, NFTTransferred | identityId | Ownership + NFT event streams |
| GovernanceParameterProjection | S18 Governance | GovernanceParameterChanged | parameterKey | Governance event stream |
| ComplianceCaseProjection | S20 Compliance | ComplianceFlagRaised, ComplianceApproved, ComplianceRejected | caseId | Compliance event stream |
| KYCStatusProjection | S20 Compliance | KYCSubmitted, KYCApproved, KYCRejected | identityId | KYC event stream |
| RiskScoreProjection | S22 Risk | RiskScoreChanged | entityId | Risk event stream |
| AIRecommendationProjection | S23 AI | AIRecommendationGenerated, AIRecommendationAccepted, AIRecommendationRejected | recommendationId | AI event stream |
| DocumentIndexProjection | S24 Document | DocumentUploaded, DocumentVerified, DocumentAccessed | documentId | Document event stream |
| AuditLogProjection | S26 Audit | All events (mirror) | eventId | Global event stream |
| GeoRegionProjection | S27 Map | PropertyGeocoded, GeoRegionComputed | regionId | Map event stream |
| ValuationTimeSeriesProjection | S28 Valuation | ValuationRecorded | propertyId + date | Valuation event stream |
| PropertyNAVProjection | S28 Valuation | ValuationRecorded | propertyId | Valuation event stream |
| AlertProjection | S29 Notification | AlertRaised, AlertResolved | alertId | Alert event stream |
| SchemaRegistryProjection | S30 System | SchemaVersionUpdated | schemaId | System event stream |

---

## 9. Background Workers

### 9.1 Worker Architecture

All workers are stateless, horizontally scalable processes that subscribe to event streams and perform asynchronous processing. Workers share the same event bus infrastructure. Each worker tracks its consumer offset and is idempotent.

### 9.2 Worker Inventory

| Worker | Trigger | Function | Idempotency Key | Scalability |
|--------|---------|----------|-----------------|-------------|
| CommissionCalculationWorker | SettlementCompleted, MarketplaceSaleCompleted | Calculates personal and override commissions, publishes CommissionCalculated | saleId | Partitioned by property |
| CommissionPaymentWorker | CommissionApproved | Initiates treasury movement for commission payout, publishes CommissionPaid | commissionId | Partitioned by agent |
| SettlementWorker | PaymentInitiated | Monitors payment confirmation, advances state through PENDING → SETTLING → SETTLED | paymentId | Partitioned by paymentId |
| EscrowWorker | OfferAccepted | Initiates escrow hold, monitors settlement, releases escrow | offerId | Partitioned by offerId |
| RefundWorker | RefundInitiated | Executes refund routing, confirms delivery, publishes RefundCompleted | refundId | Partitioned by refundId |
| NotificationDispatchWorker | Any notification event | Routes notification to configured channels, tracks delivery status | notificationId | Partitioned by recipient |
| BuybackExecutionWorker | BuybackProgram trigger | Monitors market conditions, executes buyback on DEX/OTC, publishes BuybackExecuted | buybackId | Single (coordination) |
| BurnExecutionWorker | BuybackExecuted, governance trigger | Executes token burn, updates supply, publishes BurnExecuted | burnId | Single (coordination) |
| TreasuryAllocationWorker | TreasuryDeposit | Evaluates allocation rules, distributes funds to domains, publishes TreasuryAllocated | depositId | Single (coordination) |
| TreasuryRebalanceWorker | Schedule, BuybackExecuted, Deposit | Computes current vs target weights, executes rebalancing, publishes TreasuryRebalanced | rebalanceId | Single (coordination) |
| DividendCalculationWorker | Schedule, DividendCalculated | Computes dividend pool, publishes DividendCalculated → triggers approval flow | dividendId | Partitioned by property |
| DividendDistributionWorker | DividendScheduled | Distributes payouts to holders, publishes DividendDistributed | dividendId | Partitioned by property |
| DividendRecoveryWorker | Schedule (post-claim-window) | Identifies unclaimed amounts, recovers to treasury, publishes DividendRecovered | dividendId | Partitioned by property |
| RiskScoreWorker | Any risk signal | Evaluates risk factors, updates scores, publishes RiskScoreChanged | entityId + domain | Partitioned by domain |
| AIRecommendationWorker | AI trigger, schedule | Runs AI inference, publishes AIRecommendationGenerated | recommendationId | Partitioned by workload |
| AIFraudDetectionWorker | Transaction/investment events | Runs fraud detection model, publishes AIFraudDetected | eventId | Partitioned by event |
| AIForecastWorker | Schedule | Runs forecasting models, publishes AIForecastGenerated | forecastId | Partitioned by domain |
| ReplayWorker | Admin request | Replays event stream for a specified aggregate or projection, recomputes state | replayId | Per-request |
| ReconciliationWorker | Schedule | Verifies ledger invariants, identifies discrepancies, publishes SettlementReconciled | runId | Single (coordination) |
| CleanupWorker | Schedule | Archives events per retention policy, deletes expired events, publishes archival events | runId | Partitioned by event type |
| CoolingPeriodWorker | QualifyingSaleVerified | Monitors cooling period TTL, publishes CoolingPeriodEnded or CoolingPeriodExtended | saleId | Partitioned by saleId |
| ReservationExpiryWorker | ReservationCreated | Monitors reservation TTL, publishes ReservationExpired | reservationId | Partitioned by property |
| AuctionWorker | NFTAuctionStarted | Monitors auction end time, determines winner, publishes NFTAuctionEnded | auctionId | Partitioned by auctionId |
| LeaderboardWorker | Schedule, campaign events | Recomputes leaderboard rankings, publishes LeaderboardUpdated | campaignId | Partitioned by campaign |
| OwnershipReconciliationWorker | Schedule | Compares ledger ownership balances with on-chain balances, alerts on divergence | runId | Partitioned by property |
| SnapshotWorker | Snapshot request | Takes point-in-time ownership snapshot, publishes OwnershipSnapshotTaken | snapshotId | Per-request |
| RetryWorker | DLQ events | Monitors dead-letter queue, retries eligible events with backoff | eventId | Partitioned by eventId |
| SchemaValidationWorker | SchemaVersionUpdated | Validates all producers use registered schemas, alerts on violations | schemaId | Single |

### 9.3 Worker Retry and Error Handling

All workers implement the same retry contract:

1. **Transient failure:** Retry with exponential backoff (base 100ms, multiplier 2, max 30s, jitter 10%).
2. **Max retries exhausted (5):** Route event to dead-letter queue.
3. **Poison event (deterministic failure):** Route directly to DLQ, no retry.
4. **DLQ review:** Human operator inspects, decides skip/retry/compensate.
5. **Aggregate pause:** If an aggregate produces >10 poison events in 1 hour, auto-pause the aggregate.

---

## 10. Integration Layer

### 10.1 Integration Principles

1. **All integrations use the event bus.** No integration bypasses the canonical event flow.
2. **Adapters are stateless.** Integration adapters translate between RELCKO events and external system protocols.
3. **Failures are isolated.** An external integration failure never blocks RELCKO event processing.
4. **Idempotency at integration boundaries.** External system calls are retry-safe with idempotency keys.

### 10.2 Integration Points

| Integration | Direction | Protocol | Adapter | Error Handling |
|-------------|-----------|----------|---------|----------------|
| **Financial Core** | Bidirectional | Event bus | FinancialCoreAdapter | Retry on timeout; DLQ on schema mismatch |
| **Marketplace (external)** | Inbound (listener) | Event bus | MarketplaceExtAdapter | Validate schema; reject on unknown event |
| **Wallet Provider** | Outbound | JSON-RPC / REST | WalletAdapter | On-chain verify before confirming; retry on gas failure |
| **KYC Provider** | Bidirectional | REST webhook | KYCAdapter | Map provider status to KYC events; webhook retry |
| **AML/Sanctions Screening** | Outbound | REST | ScreeningAdapter | Batch submissions; handle rate limits |
| **Email Provider** | Outbound | SMTP / REST API | EmailAdapter | Queue on failure; retry with backoff |
| **SMS Provider** | Outbound | REST API | SMSAdapter | Handle rate limits; retry on failure |
| **Push Notification** | Outbound | FCM / APNs | PushAdapter | Silent failure on invalid token |
| **Map Tile Service** | Outbound | REST / SDK | MapAdapter | Cache tiles; handle rate limits |
| **AI/LLM Provider** | Outbound | REST | AIAdapter | Circuit breaker on rate limit; fallback model |
| **Blockchain (BNB/USDT/USDC/RLKO)** | Outbound | JSON-RPC | BlockchainAdapter | On-chain verify; handle reorgs; confirm depth |
| **Object Storage** | Outbound | S3 API | StorageAdapter | Retry on failure; content-addressed |
| **PSP (Bank Transfer)** | Bidirectional | REST webhook | PSPAdapter | Idempotency key on webhook; signature verify |
| **Independent Appraiser API** | Outbound | REST | ValuationAdapter | Validate report authenticity; handle delay |

### 10.3 Blockchain Integration Detail

Blockchain integration follows a layered adapter pattern:

```
RELCKO Event → BlockchainService → ChainAdapter → Provider RPC
```

- **ChainAdapter** abstracts chain-specific logic (BNB, Ethereum L2s, future chains).
- **BlockchainService** manages confirmations, reorg handling, and gas estimation.
- **On-chain verification** is mandatory for all settlement events (fixes legacy blind-trust gap).
- **Minimum confirmations:** BNB = 15, Ethereum L2 = 200 (or until finality).
- **Reorg handling:** On reorg beyond confirmation depth, emit compensating event.

### 10.4 Payment Method Adapters

Each payment method implements a common `PaymentAdapter` interface:

```
interface PaymentAdapter {
  initiatePayment(payment: Payment): Promise<PaymentReference>;
  checkStatus(reference: PaymentReference): Promise<PaymentStatus>;
  confirmPayment(reference: PaymentReference): Promise<ConfirmationResult>;
  refundPayment(reference: PaymentReference, amount: BigNumber): Promise<RefundResult>;
  getRequiredConfirmations(): number;
}
```

Adapter registry: BNBAdapter, USDTAdapter, USDCAdapter, RLKOAdapter, BankTransferAdapter.
New methods added by registering new adapter — no state machine changes.

---

## 11. Module Dependency Graph

### 11.1 Dependency Direction Map

The following diagram shows the dependency flow between all 30 bounded contexts. Arrows point from consumer to producer (consumer depends on producer's events).

```
  Upstream (producers)                                  Downstream (consumers)
  ─────────────────────                                  ───────────────────────

  S19 Identity ──────► S20 Compliance ──► S7 Investment
       │                      │               │
       │                      ▼               ▼
       │               S21 Security      S9 Payment
       │                                    │
       ▼                                    ▼
  S24 Document                         S10 Ownership
       │                      ┌────────────┼────────────┐
       ▼                      ▼            ▼            ▼
  S20 Compliance          S11 Portfolio  S13 Dividend  S18 Governance
                                     │         │
                                     ▼         ▼
                                S28 Valuation  S14 Reward
  
  S1 Agent ────► S2 Network ──► S3 Commission
       │              │              │
       │              ▼              ▼
       │         S4 Qualification  S15 Treasury
       │              │              │
       │              ▼              ▼
       │         S5 Campaign    S16 Reserve
       │                         S17 Buyback
       │                         S18 Governance
  
  S6 Property ──► S7 Investment ──► S10 Ownership ──► S12 NFT
       │              │                                   │
       │              ▼                                   ▼
       │         S9 Payment                         S11 Portfolio
       │                                                S18 Governance
       ▼
  S27 Map
  S28 Valuation
  
  S22 Risk ◄── All contexts (risk signals)
       │
       ▼
  S21 Security
  S20 Compliance
  
  S23 AI ◄──── All contexts (advisory input)
       │
       ▼
  All contexts (advisory output)
  
  S25 Admin ◄── All contexts (read)
       │
       ▼
  All contexts (constrained write)
  
  S26 Audit ◄── All contexts (event mirror)
  
  S29 Notification ◄── All contexts (notification triggers)
  
  S30 System ◄── All contexts (schema registration)
       │
       ▼
  All contexts (schema notifications)
```

### 11.2 Dependency Matrix

| Context | Depends On | Depended On By | Layer |
|---------|-----------|----------------|-------|
| S1 Agent | S19 | S2, S3, S4, S5, S14 | Core Agent |
| S2 Network | S1 | S3, S4, S5 | Core Agent |
| S3 Commission | S2, S4, S15, S1 | S1, S14, S15 | Financial |
| S4 Qualification | S9, S20 | S3 | Financial |
| S5 Campaign | S2, S3 | S1, S14 | Core Agent |
| S6 Property | S19, S24 | S7, S27, S28 | Asset |
| S7 Investment | S6, S9, S10, S20 | S10, S3, S11 | Asset |
| S8 Secondary | S10, S9, S3 | S10, S3, S11 | Asset |
| S9 Payment | Shared | S10, S3, S15, S4, S7, S8 | Financial |
| S10 Ownership | S7, S8 | S11, S13, S18, S12 | Asset |
| S11 Portfolio | S10, S28, S13, S12 | S23 | Read Model |
| S12 NFT | S10, S19 | S11, S18, S13 | Asset |
| S13 Dividend | S10, S15, S20 | S11, S14, S24 | Financial |
| S14 Reward | S15, S1 | S1, S11 | Financial |
| S15 Treasury | S18 | S13, S14, S16, S17, S3 | Financial |
| S16 Reserve | S15 | S15 | Financial |
| S17 Buyback | S15, S18 | S15 | Financial |
| S18 Governance | S10, S12 | S15, S6 | Governance |
| S19 Identity | S20 | All contexts | Foundation |
| S20 Compliance | S24 | S19, S7, S8 | Foundation |
| S21 Security | S22, S20 | S25 | Foundation |
| S22 Risk | All contexts | S21, S20 | Foundation |
| S23 AI | All read models | All contexts | Intelligence |
| S24 Document | S19 | S20, S6 | Foundation |
| S25 Admin | All contexts (read) | All contexts (write) | Operations |
| S26 Audit | All contexts (event store) | S20, S21 | Foundation |
| S27 Map | S6 | — (terminal) | Read Model |
| S28 Valuation | S6 | S11, S13, S18 | Read Model |
| S29 Notification | All contexts | — (terminal) | Infrastructure |
| S30 System | All contexts (schema) | All contexts (schema changes) | Infrastructure |

### 11.3 Layered Architecture

```
     ┌─────────────────────────────────────────────────────────────┐
     │                    Presentation Layer                        │
     │    Web App, Admin Portal, Portfolio UI, Marketplace UI,      │
     │    Governance UI, NFT Marketplace, Property Manager Portal   │
     └────────────────────────┬────────────────────────────────────┘
                              │ GraphQL / REST
     ┌────────────────────────▼────────────────────────────────────┐
     │                    Application Layer                         │
     │     Command Handlers, Query Handlers, Use Case Orchestration │
     └────────────────────────┬────────────────────────────────────┘
                              │ Domain Events
     ┌────────────────────────▼────────────────────────────────────┐
     │                     Domain Layer                             │
     │  Aggregates, Domain Services, Value Objects, Invariants      │
     └────────────────────────┬────────────────────────────────────┘
                              │ Repository Interface
     ┌────────────────────────▼────────────────────────────────────┐
     │                  Infrastructure Layer                        │
     │  Repository Implementations, Event Publishing, Projections   │
     └────────────────────────┬────────────────────────────────────┘
                              │
     ┌────────────────────────▼────────────────────────────────────┐
     │                    Shared Infrastructure                     │
     │  Event Bus, Event Store, Message Queue, Schema Registry,     │
     │  Permission, Notification, Audit Log                         │
     └──────────────────────────────────────────────────────────────┘
```

### 11.4 Dependency Rules

1. **No circular dependencies.** The dependency graph is acyclic. Any proposed change that creates a cycle is rejected.
2. **No skip-layer dependencies.** A consumer may only depend on the bounded context that owns the event, not on transitive producers.
3. **Foundation contexts (S19–S22, S24, S26) never depend on domain contexts.** They may depend on shared infrastructure only.
4. **Read-model contexts (S11, S27, S28) never produce domain events.** They consume and project only.
5. **Infrastructure contexts (S29, S30) never depend on domain contexts.** They are terminal consumers.
6. **Shared infrastructure packages (event-bus, event-store, permission, notification, audit-log, domain-event-catalog) have zero dependencies on any bounded context.**

---

## 12. Sprint Plan

### 12.1 Release Phases

The implementation is organized into six phases across 12 sprints (2-week sprints). Each phase produces a potentially shippable increment.

| Phase | Sprints | Focus | Deliverable |
|-------|---------|-------|-------------|
| **Foundation** | Sprints 1–2 | Shared infrastructure, identity, compliance, security | Auth, KYC, document storage operational |
| **Core Agent** | Sprints 3–4 | Agent, Network, Commission, Qualification, Campaign | Sales commission engine live |
| **Asset Core** | Sprints 5–7 | Property, Investment, Payment, Ownership | Primary investment flow live |
| **Financial** | Sprints 8–9 | Treasury, Dividend, Reward, Reserve, Buyback | Value distribution operational |
| **Marketplace** | Sprint 10 | Secondary Market, NFT, Portfolio | Secondary trading + NFT live |
| **Intelligence & Operations** | Sprints 11–12 | AI, Risk, Governance, Admin, Map, Valuation, Notification, System, Audit | Platform complete |

### 12.2 Sprint-by-Sprint Breakdown

#### Phase 1: Foundation (Sprints 1–2)

**Sprint 1: Shared Infrastructure + Identity**
| Package | Tasks |
|---------|-------|
| domain-event-catalog | Define all event type schemas; implement schema registry client |
| event-bus | Implement event bus abstractions; in-memory + message queue implementations; DLQ support |
| event-store | Implement event storage; append, read, replay; snapshot support |
| permission | Implement permission model; RBAC + attribute-based enforcement |
| S19 Identity | Agent aggregate + repository; Wallet aggregate; Identity aggregate; SIWE integration |
| S24 Document | Document aggregate; object storage adapter; access control |

**Sprint 2: Compliance + Security + Audit + Notification**
| Package | Tasks |
|---------|-------|
| S20 Compliance | KYC aggregate + repository; ComplianceCase aggregate; AML screening adapter; KYC provider integration |
| S21 Security | Incident aggregate; EmergencyState aggregate; threat detection framework |
| S26 Audit | Audit log append-only store; event mirror subscriber; hash chain verification |
| S29 Notification | Notification aggregate; email/SMS/push adapters; delivery tracking |
| S30 System | Schema registry; health check service; event bus monitoring |
| audit-log | Audit log projection package |

#### Phase 2: Core Agent (Sprints 3–4)

**Sprint 3: Agent + Network + Qualification**
| Package | Tasks |
|---------|-------|
| S1 Agent | Agent aggregate (event-sourced); AgentStatus state machine; AgentService |
| S2 Network | Referral aggregate; AgentTeam aggregate (graph); TeamGraphService; PerformanceService |
| S4 Qualification | QualifyingSale aggregate; CoolingPeriodService; qualifying criteria engine |
| cooling-period-worker | Implement cooling period timer worker |

**Sprint 4: Commission + Campaign**
| Package | Tasks |
|---------|-------|
| S3 Commission | Commission aggregate (event-sourced); CommissionBatch aggregate; OverrideRoute aggregate; CommissionCalculationService; OverrideRoutingService; BonusCalculationService |
| S5 Campaign | Campaign aggregate; CampaignReward aggregate; RewardRuleService |
| commission-calculation-worker | Implement commission calculation and payment workers |
| commission-payment-worker | Commission payout processing |

#### Phase 3: Asset Core (Sprints 5–7)

**Sprint 5: Property + Investment**
| Package | Tasks |
|---------|-------|
| S6 Property | Property aggregate (event-sourced); PropertyFraction aggregate; SPV aggregate; state machine for property lifecycle |
| S7 Investment | Investment aggregate (event-sourced); Reservation aggregate; Round aggregate; InvestmentService |
| S27 Map | GeoProperty aggregate; MapLayer aggregate; map tile integration |
| reservation-expiry-worker | Reservation TTL monitoring |

**Sprint 6: Payment + Ownership**
| Package | Tasks |
|---------|-------|
| S9 Payment | Payment aggregate (event-sourced); Refund aggregate; SettlementLedger; PaymentService; SettlementService; blockchain adapter integration (BNB/USDT/USDC/RLKO); PSP adapter |
| S10 Ownership | OwnershipEvent aggregate (event-sourced); OwnershipSnapshot aggregate; OwnershipService; SnapshotService |
| settlement-worker | Payment lifecycle processing |
| escrow-worker | Escrow hold/release |

**Sprint 7: Portfolio + Valuation**
| Package | Tasks |
|---------|-------|
| S11 Portfolio | PortfolioHolding projection; PortfolioAlert; PortfolioProjectionService |
| S28 Valuation | ValuationRecord aggregate; PropertyValuation aggregate; ValuationService; independent appraiser integration |
| portfolio-projection-services | All portfolio projection subscribers |
| ownership-reconciliation-worker | Ledger vs on-chain reconciliation |

#### Phase 4: Financial (Sprints 8–9)

**Sprint 8: Treasury + Reserve**
| Package | Tasks |
|---------|-------|
| S15 Treasury | TreasuryAccount aggregate (event-sourced); TreasuryMovement aggregate; TreasuryAllocation; MultiSigService; YieldService |
| S16 Reserve | ReserveFund aggregate; ReserveManagementService |
| S17 Buyback | BuybackProgram aggregate; BuybackExecution aggregate; BurnExecution aggregate; TokenSupply aggregate; BuybackService |
| treasury-allocation-worker | Treasury allocation processing |
| treasury-rebalance-worker | Rebalancing execution |
| buyback-execution-worker | Buyback market execution |
| burn-execution-worker | Burn processing |

**Sprint 9: Dividend + Reward**
| Package | Tasks |
|---------|-------|
| S13 Dividend | Dividend aggregate (event-sourced); DividendPayment aggregate; TaxDocument aggregate; DividendCalculationService; DistributionService; TaxService |
| S14 Reward | Reward aggregate; IncentiveProgram aggregate; LeadershipPool aggregate; RewardsService; IncentiveProgramService |
| dividend-calculation-worker | Dividend computation and distribution |
| dividend-distribution-worker | Payout distribution |
| dividend-recovery-worker | Unclaimed recovery |

#### Phase 5: Marketplace (Sprint 10)

**Sprint 10: Secondary Market + NFT**
| Package | Tasks |
|---------|-------|
| S8 Secondary | MarketplaceListing aggregate; Offer aggregate; Escrow aggregate; MarketplaceSale aggregate; ListingService; OfferService; EscrowService |
| S12 NFT | NFTCollection aggregate; NFTAsset aggregate; NFTListing aggregate; NFTOffer aggregate; NFTAuction aggregate; NFTSale aggregate; RoyaltyPayment aggregate; NFTBlacklist aggregate; NFTMintService; NFTMarketplaceService; RoyaltyService |
| auction-worker | Auction end monitoring |

#### Phase 6: Intelligence & Operations (Sprints 11–12)

**Sprint 11: AI + Risk + Governance**
| Package | Tasks |
|---------|-------|
| S22 Risk | RiskScore aggregate; RiskEngineService; multi-domain risk scoring |
| S23 AI | AIRecommendation aggregate; AIDetection aggregate; AIForecast aggregate; AIModel aggregate; KnowledgeIndex aggregate; AIMemory aggregate; LLM provider integration |
| S18 Governance | Proposal aggregate; Vote aggregate; VotingPower aggregate; GovParameter aggregate; ProposalService; VotingService; ExecutionService; VotingPowerService |
| risk-score-worker | Risk computation |
| ai-recommendation-worker | AI inference |
| ai-fraud-detection-worker | Fraud detection |
| ai-forecast-worker | Forecasting |

**Sprint 12: Admin + Operations + Integration**
| Package | Tasks |
|---------|-------|
| S25 Admin | AdminLog aggregate; SystemState aggregate; AdminOrchestrationService; ConfigService |
| S3 Commission (bonus) | Bonus calculation and payout completion |
| Integration testing | Contract tests between all pairs; replay determinism tests; performance benchmarks |
| Infrastructure | Deployment manifests; monitoring dashboards; alert rules; runbooks |
| replay-worker | Event replay and projection rebuild worker |
| reconciliation-worker | Full-system reconciliation |
| cleanup-worker | Data retention and archival |

### 12.3 Dependency-Driven Sequencing

The sprint plan respects the dependency graph. No context is implemented before its upstream producers:

| Context | Must Precede |
|---------|-------------|
| S19 Identity | Before S20 Compliance, S24 Document |
| S24 Document | Before S20 Compliance |
| S20 Compliance | Before S7 Investment, S8 Secondary |
| S1 Agent | Before S2 Network |
| S2 Network | Before S3 Commission, S4 Qualification, S5 Campaign |
| S6 Property | Before S7 Investment, S27 Map, S28 Valuation |
| S9 Payment | Before S7 Investment, S8 Secondary, S4 Qualification |
| S7 Investment | Before S10 Ownership, S3 Commission |
| S10 Ownership | Before S11 Portfolio, S13 Dividend, S18 Governance, S12 NFT |
| S15 Treasury | Before S13 Dividend, S14 Reward, S16 Reserve, S17 Buyback, S3 Commission |
| S18 Governance | Before S15 Treasury (budget approval) |
| S21 Security | After S22 Risk, S20 Compliance |
| S25 Admin | After all domain contexts (depends on all) |

---

## 13. Testing Strategy

### 13.1 Testing Pyramid

```
                    ┌──────────────┐
                    │   E2E Tests  │  ← 5% of test effort
                    │   (5 tests)  │    Full platform flows
                   ┌┴──────────────┴┐
                   │ Contract Tests  │  ← 15% of test effort
                   │  (30 contexts)  │    Cross-module schema conformance
                  ┌┴────────────────┴┐
                  │ Integration Tests │  ← 30% of test effort
                  │ (180+ scenarios)  │    Aggregate → Event → Projection flow
                 ┌┴──────────────────┴┐
                 │   Domain Unit Tests │  ← 50% of test effort
                 │  (500+ per context) │    Aggregate invariants, services
                 └────────────────────┘
```

### 13.2 Domain Unit Tests

**Scope:** Every domain service, aggregate invariant, value object, and state machine transition.

| Layer | What to Test | Example |
|-------|-------------|---------|
| Aggregate invariants | Every invariant is enforced; invalid states are rejected | Commission amount must equal f(saleValue, rate, multiplier) |
| State machine transitions | Only valid transitions succeed; invalid transitions throw | Payment cannot go from SETTLING → INITIATED |
| Domain services | Business logic correctness with mocked repositories | CommissionCalculationService computes correct overrides |
| Value objects | Equality, validation, formatting | Address, Money, Percentage invariants |
| Event schemas | Events are produced with correct fields | CommissionCalculated contains saleId, agentId, amount |

**Tooling:** Vitest / Jest with faker-js for test data.

**Coverage target:** 95%+ branch coverage on domain layer.

### 13.3 Integration Tests

**Scope:** Event-driven flow through the full stack within one bounded context.

| Test Type | What to Verify |
|-----------|---------------|
| Aggregate → Event → Projection | Given command, event is published, projection updates |
| Repository round-trip | Save and load aggregate, verify state reconstruction |
| Idempotent event handling | Processing same event twice produces same state |
| Event ordering | Events applied in correct order produce correct state |
| Concurrent command handling | Optimistic concurrency prevents conflicting writes |

**Test pattern:**
```
given(aggregateState)
  .when(command)
  .then(eventPublished)
  .and(projectionState(expectedState))
```

**Coverage target:** Every aggregate has at least one integration test per state transition.

### 13.4 Contract Tests

**Scope:** Cross-bounded-context event schema conformance.

| Test | What to Verify |
|------|---------------|
| Producer contract | Each context produces events matching its schema in the Domain Event Catalog |
| Consumer contract | Each consumer can process all events it subscribes to |
| Schema evolution | New fields are optional; removed fields are deprecated not deleted |
| Event versioning | All events carry a version field; consumers handle both old and new |

**Implementation:** Pact or similar contract testing framework. Each bounded context publishes its contract (OpenAPI-like for events). CI runs contract verification suites.

**Coverage target:** Every event produced by any context has at least one consumer contract test.

### 13.5 E2E Tests

**Scope:** Full-platform business flows spanning multiple bounded contexts.

| Flow | Contexts Involved |
|------|------------------|
| Investor registration → KYC → investment → ownership → portfolio view | S19, S20, S24, S7, S9, S10, S11 |
| Agent registration → referral → sale → commission calculation → payout | S1, S2, S4, S9, S3, S15 |
| Property creation → approval → funding → dividend → distribution | S6, S7, S10, S13, S15 |
| Secondary trade listing → offer → escrow → settlement → ownership transfer | S8, S9, S10, S3 |
| Governance proposal → vote → execution → treasury movement | S18, S15 |
| NFT mint → list → sell → royalty → transfer | S12, S10, S19 |

**Tooling:** Playwright or Cypress for UI flows; direct event bus injection for API-level E2E.

**Coverage target:** All critical business flows covered. Run nightly in CI.

### 13.6 Replay Tests

| Test | What to Verify |
|------|---------------|
| Deterministic replay | Replaying all events for an aggregate produces identical state |
| Projection rebuild | Clearing and rebuilding any projection from event log produces identical data |
| Snapshot correctness | Loading from snapshot + remaining events === full replay |
| Event ordering resilience | Events processed out of order (within same aggregate) must fail |

### 13.7 Performance Tests

| Test | Target | Measured |
|------|--------|----------|
| Event ingestion throughput | 10,000 events/second | Events/second sustained |
| Projection catch-up | 100,000 events/minute | Time to rebuild largest projection |
| Command processing latency | P99 < 500ms | Time from command receipt to event published |
| API response time | P99 < 200ms for reads, < 1s for writes | HTTP response times |
| Concurrent users | 10,000 simultaneous | Active sessions without degradation |
| Blockchain confirmation monitoring | < 30s average | Time from settlement to on-chain confirmation |

### 13.8 Test Infrastructure

| Component | Tooling |
|-----------|---------|
| Test runner | Vitest (unit + integration), Playwright (E2E) |
| Contract testing | Pact |
| Performance testing | k6 |
| Test data generation | faker-js |
| Event simulation | event-simulator (custom tool) |
| Replay testing | replay-orchestrator (custom tool) |
| Coverage reporting | c8 / Istanbul |
| CI integration | GitHub Actions |

---

## 14. Deployment Strategy

### 14.1 Environment Architecture

```
                     ┌──────────────────────┐
                     │     Production        │
                     │  Multi-region (3)     │
                     │  H/A, auto-scale      │
                     └──────────┬───────────┘
                                │ promote (tag)
                     ┌──────────▼───────────┐
                     │     Staging           │
                     │  Production-like      │
                     │  Full integration     │
                     └──────────┬───────────┘
                                │ promote
                     ┌──────────▼───────────┐
                     │     Development       │
                     │  Shared, unstable     │
                     └──────────┬───────────┘
                                │ deploy
                     ┌──────────▼───────────┐
                     │     Local / CI        │
                     │  Per-developer, ephem │
                     └──────────────────────┘
```

### 14.2 CI/CD Pipeline

**Stage 1 — Commit (per PR)**
- Lint (ESLint, Prettier)
- Type check (tsc —noEmit)
- Unit tests (affected packages)
- Build (turbo build --filter=[affected])
- Run integration tests for affected contexts

**Stage 2 — Branch Merge (main branch)**
- Full monorepo build
- All unit tests
- All integration tests
- Contract tests (all pairs)
- Build Docker images
- Push images to registry

**Stage 3 — Deploy to Development**
- Deploy all services to dev environment
- Run E2E smoke tests
- Run replay tests
- Notify team on completion

**Stage 4 — Deploy to Staging**
- Manual approval gate
- Deploy all services to staging
- Full E2E suite
- Performance benchmarks
- Security scan
- Load test (scheduled, not blocking)

**Stage 5 — Deploy to Production**
- Manual approval gate (multi-sig deploy approval)
- Canary deploy (10% traffic → 25% → 50% → 100%)
- Health check monitoring during rollout
- Auto-rollback on error rate > 1%
- Post-deploy smoke tests

### 14.3 Service Deployment Model

| Component | Deploy Unit | Scaling Strategy | Replicas (Prod) |
|-----------|------------|-----------------|-----------------|
| Web App | Docker container | Horizontal (CPU) | Min 3, Max 20 |
| Admin Portal | Docker container | Horizontal (CPU) | Min 2, Max 10 |
| Bounded Context services | Docker container per context | Horizontal per context | Min 2, Max 10 each |
| Workers | Docker container per worker type | Horizontal per worker | Min 2, Max 20 |
| Event Bus | Managed message queue | Partition-based | HA cluster |
| Event Store | Managed database cluster | Read replicas, sharding | Multi-AZ |
| Projection databases | Managed database per context | Read replicas | Multi-AZ |

### 14.4 Database Deployment

| Data Store | Technology | Deployment | Backup Strategy |
|------------|-----------|------------|-----------------|
| Event Store | PostgreSQL (event-sourcing schema) | Multi-AZ RDS | Continuous WAL archiving, PITR |
| Relational projections | PostgreSQL per context | Multi-AZ RDS | Daily snapshots + WAL |
| Graph (Network) | Neo4j / RedisGraph | Clustered | Daily backup |
| Time-series (Valuation) | TimescaleDB | Multi-AZ | Continuous backup |
| Object storage | S3-compatible | Multi-region | Cross-region replication |
| Cache | Redis | Multi-AZ ElastiCache | Persistence enabled |
| Message queue | RabbitMQ / Kafka | Clustered | Disk persistence |

### 14.5 Rollout Strategy

**Feature flags:** All new bounded contexts are feature-flagged. A context is activated only after its integration tests pass in production-like staging.

**Blue-green deployment:** Each service deploys with blue-green zero-downtime strategy. Traffic switches after health check passes.

**Backward compatibility:** Events carry version numbers. Producers publish old + new format during transition. Consumers handle both until old format is retired.

**Data migrations:** Schema changes are additive only (new columns, new tables). Destructive changes (drop column, rename) are multi-step: add → migrate → deprecate → remove.

---

## 15. Observability

### 15.1 Three Pillars

| Pillar | Standard | Tooling |
|--------|----------|---------|
| **Logging** | Structured JSON, correlation IDs | Winston / Pino → ELK / Loki |
| **Metrics** | Prometheus format, RED metrics | Prometheus + Grafana |
| **Tracing** | OpenTelemetry, W3C trace context | Jaeger / Tempo |

### 15.2 Logging Standards

Every log entry includes:
- `correlationId` — Unique request/event trace identifier
- `causationId` — ID of the event that caused this operation
- `serviceName` — Bounded context name
- `aggregateId` — Aggregate being operated on
- `eventType` — Type of event being processed
- `timestamp` — ISO 8601 UTC
- `level` — error | warn | info | debug
- `message` — Human-readable description

**Log levels by environment:**

| Environment | Log Level |
|-------------|-----------|
| Production | INFO (ERROR + WARN for operational alerting) |
| Staging | DEBUG |
| Development | DEBUG |
| Local | DEBUG (console) |

**No sensitive data in logs:** PII, credentials, payment details, and personal identification numbers are excluded. Use structured metadata fields with redaction policies.

### 15.3 Metrics

**RED Metrics (Rate, Errors, Duration) for every service:**

| Metric | Name | Labels |
|--------|------|--------|
| Request rate | `relcko_requests_total` | service, method, status |
| Error rate | `relcko_errors_total` | service, method, error_type |
| Latency | `relcko_request_duration_ms` | service, method, quantile (p50, p95, p99) |

**Domain-specific metrics:**

| Metric | Context | Purpose |
|--------|---------|---------|
| `relcko_events_produced_total` | All | Event production rate per type |
| `relcko_events_consumed_total` | All | Event consumption rate per type |
| `relcko_aggregate_state` | All | Current state distribution (e.g. payment states) |
| `relcko_projection_lag` | Projections | Milliseconds behind event log head |
| `relcko_projection_rebuild_duration` | Projections | Time to rebuild projection from scratch |
| `relcko_worker_queue_depth` | Workers | Number of pending events per worker |
| `relcko_treasury_balance` | S15 | Current treasury balance by account |
| `relcko_commission_pending` | S3 | Unpaid commission amounts |
| `relcko_dividend_pending` | S13 | Undistributed dividend amounts |
| `relcko_kyc_pending_count` | S20 | KYC submissions awaiting review |

### 15.4 Distributed Tracing

- **Every event carry a trace context** (`traceId`, `spanId`, `parentSpanId`).
- **Every command handler** creates a root span.
- **Every event handler** creates a child span linked to the causation event.
- **Worker processing** creates spans for each event batch.
- **Integration adapters** create spans for external calls.
- **Sampling:** 100% in development/staging; adaptive sampling in production (100% for errors, 10% for normal).

### 15.5 Alerting Rules

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| Event bus consumer lag | lag > 1000 messages for 5 minutes | Warning | Investigate consumer health |
| Command failure rate | error rate > 5% for 5 minutes | Critical | Page on-call engineer |
| Projection rebuild failure | rebuild fails or takes > 30 minutes | Warning | Investigate projection logic |
| Worker DLQ growth | DLQ > 100 messages in 1 hour | Warning | Inspect poison events |
| Payment settlement failure | payment in FAILED state > 1% of volume | Critical | Page payment team |
| Treasury imbalance | Balance ≠ sum(sub-accounts) > threshold | Critical | Page treasury team |
| KYC queue growth | Pending > 100 for 24 hours | Warning | Review KYC capacity |
| Security incident | IncidentCreated with CRITICAL severity | Critical | Page security team |
| Secret not rotated | Any secret older than 90 days | Warning | Rotate secrets |
| Schema violation | Unknown schema version detected | Warning | Investigate producer |

---

## 16. Security Review Checklist

### 16.1 Authentication & Authorization

| # | Item | Verification Method |
|---|------|-------------------|
| 1 | SIWE (Sign-In with Ethereum) properly validates signature, nonce, domain, and message freshness | Unit test + integration test |
| 2 | All API endpoints require authentication except public endpoints (property listing, map) | Automated scan |
| 3 | JWT tokens expire within configured TTL (default: 15 minutes access, 7 days refresh) | Config review |
| 4 | Wallet verification confirms on-chain ownership via signed message | Integration test |
| 5 | Permission enforcement at aggregate boundary — every command handler checks authorization | Code review |
| 6 | Role-based access control covers all admin operations | Code review |
| 7 | Temporary permission grants auto-expire at TTL | Integration test |

### 16.2 Data Protection

| # | Item | Verification Method |
|---|------|-------------------|
| 8 | All PII is encrypted at rest (AES-256-GCM) | Infrastructure audit |
| 9 | All data in transit uses TLS 1.3 | Network policy verification |
| 10 | Payment credentials (card data, bank account numbers) never touch RELCKO services — handled by PSP | Architecture review |
| 11 | API keys and secrets stored in secrets manager, never in code or config files | Secret scanning in CI |
| 12 | Wallet private keys are multi-sig secured, never stored in application layer | Architecture review |
| 13 | Document content hashed (SHA-256) before storage; content-addressed retrieval | Unit test |
| 14 | Audit log entries are append-only with hash chain integrity verification | Integration test |
| 15 | Database backups are encrypted with customer-managed keys | Infrastructure audit |

### 16.3 Event Security

| # | Item | Verification Method |
|---|------|-------------------|
| 16 | Event schemas validated before publishing (schema registry enforces) | Contract test |
| 17 | Event payloads contain no sensitive data (PII, credentials, secrets) | Code review + automated scan |
| 18 | Event bus access controlled by producer/consumer role permissions | Integration test |
| 19 | DLQ events inspected before reprocessing — human-in-the-loop for sensitive events | Process review |
| 20 | Event replay can only be triggered by authorized admin users | Integration test |

### 16.4 Blockchain & Financial Security

| # | Item | Verification Method |
|---|------|-------------------|
| 21 | Multi-sig required for all treasury movements exceeding threshold | Integration test |
| 22 | Treasury movements require N-of-M approvals before execution | Integration test |
| 23 | Commission payout requires separate approval from calculation | Integration test |
| 24 | Blockchain transactions verified on-chain with minimum confirmations before settlement | Integration test |
| 25 | Reorg detection triggers compensating event, not mutation | Integration test |
| 26 | Payment refunds route to original payment method; amount never exceeds original | Integration test |
| 27 | Escrow funds released only on settlement confirmation or mutual cancellation | Integration test |
| 28 | Burn execution verifies token custody before burn transaction | Integration test |

### 16.5 Infrastructure Security

| # | Item | Verification Method |
|---|------|-------------------|
| 29 | All services run as non-root containers with read-only root filesystem | Infrastructure audit |
| 30 | Network policies restrict inter-service communication to authorized channels | Network policy audit |
| 31 | Database access is service-specific; no cross-context database access | Infrastructure audit |
| 32 | Secrets are rotated at minimum every 90 days | Automated compliance check |
| 33 | Vulnerability scanning runs on all container images before deployment | CI pipeline scan |
| 34 | Dependency scanning (npm audit / Snyk) runs on every PR | CI pipeline |
| 35 | Rate limiting enforced on all public API endpoints | Load test verification |
| 36 | DDoS protection at load balancer level | Infrastructure audit |

### 16.6 Incident Response

| # | Item | Verification Method |
|---|------|-------------------|
| 37 | Emergency lockdown can pause all financial operations within 60 seconds | Drill verification |
| 38 | Incident response runbook documented for every security event type | Documentation review |
| 39 | Security alerts route to on-call rotation with PagerDuty/Opsgenie | Integration test |
| 40 | Post-incident review process documented and tested | Process review |

---

## 17. Performance Checklist

### 17.1 Database Performance

| # | Item | Target |
|---|------|--------|
| 1 | All read-model queries use indexes matching query patterns | P99 < 50ms |
| 2 | Event store queries by aggregateId are indexed | P99 < 20ms |
| 3 | Projection queries filter by indexed keys (investorId, propertyId, etc.) | P99 < 30ms |
| 4 | No N+1 queries in projection rebuild paths | Verified by query analysis |
| 5 | Snapshot strategy defined for aggregates with > 1,000 events | Snapshot every 100 events |
| 6 | Partitioning strategy for event store by aggregate type + date range | Query scope limited |
| 7 | Connection pooling configured per service (max 20 connections per replica) | Verified by load test |
| 8 | Read replicas used for projection queries; write master for commands | Architecture verified |

### 17.2 Event Processing Performance

| # | Item | Target |
|---|------|--------|
| 9 | Event bus consumer group rebalancing completes within 30 seconds | Verified by chaos test |
| 10 | Event batch processing uses batching (batch size 100, max 1000) | Throughput verified |
| 11 | Idempotency checks use bloom filter for duplicate detection (optional optimization) | Optional, verified |
| 12 | Projection subscribers process events in parallel per partition | Throughput verified |
| 13 | DLQ processing has circuit breaker to prevent replay storms | Verified by load test |

### 17.3 API Performance

| # | Item | Target |
|---|------|--------|
| 14 | GraphQL resolvers use DataLoader for batching | N+1 elimination verified |
| 15 | API responses are cacheable where appropriate (property listing, map tiles) | Cache hit ratio > 70% |
| 16 | Pagination is mandatory for all list endpoints (cursor-based preferred) | Code review |
| 17 | File uploads use direct-to-S3 presigned URLs (no service buffering) | Architecture verified |
| 18 | Rate limiting headers return in all API responses | Load test verified |

### 17.4 Worker Performance

| # | Item | Target |
|---|------|--------|
| 19 | Workers process events in parallel within partition limits | Throughput target met |
| 20 | Worker concurrency limited to prevent database connection exhaustion | Max 10 concurrent per replica |
| 21 | Commission calculation batch size optimized per load test | Batch of 50 optimal |
| 22 | Dividend distribution batches grouped by property | Batch verified |
| 23 | Treasury rebalance computation completes within 5 minutes for full portfolio | Verified by load test |

### 17.5 Infrastructure Performance

| # | Item | Target |
|---|------|--------|
| 24 | Auto-scaling policy defined for every service (CPU > 70% triggers scale-up) | Verified by load test |
| 25 | CDN configured for static assets (web app, map tiles, document previews) | Latency verified |
| 26 | Database connection limits per service configured and enforced | Verified by load test |
| 27 | Event store write throughput tested at 2x expected peak | Verified by stress test |
| 28 | Projection rebuild completes within 1 hour for largest context | Verified by replay test |

---

## 18. Production Readiness Checklist

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| | **Observability** | | |
| 1 | All services emit structured logs with correlation IDs | Platform team | |
| 2 | All RED metrics configured in Prometheus and dashboards in Grafana | Platform team | |
| 3 | Distributed tracing configured for all event flows | Platform team | |
| 4 | Alert rules configured for all critical conditions | Platform team | |
| 5 | Runbooks documented for every alert type | SRE team | |
| 6 | Log retention policy defined and enforced (30 days hot, 1 year cold) | Platform team | |
| | **Deployment** | | |
| 7 | CI/CD pipeline passing for all services | Platform team | |
| 8 | Blue-green deployment configured and tested | SRE team | |
| 9 | Auto-rollback on health check failure tested | SRE team | |
| 10 | Feature flags operational for all bounded contexts | Platform team | |
| 11 | Database migration automation tested (additive only) | Platform team | |
| | **Security** | | |
| 12 | All secrets stored in secrets manager | Security team | |
| 13 | Container vulnerability scan passing | Security team | |
| 14 | Dependency vulnerability scan passing | Security team | |
| 15 | Penetration test completed | External auditor | |
| 16 | Data encryption verified at rest and in transit | Security team | |
| 17 | Access control review completed for all services | Security team | |
| | **Reliability** | | |
| 18 | Backup and restore tested for all databases | SRE team | |
| 19 | Disaster recovery plan documented and tested | SRE team | |
| 20 | Multi-region failover tested | SRE team | |
| 21 | Capacity planning complete for 6 months of projected growth | SRE team | |
| 22 | SLA definitions documented for each service | Product team | |
| | **Compliance** | | |
| 23 | KYC/AML procedures documented and audit-ready | Compliance team | |
| 24 | Data retention and deletion policies documented | Legal team | |
| 25 | GDPR/SEC/FINRA regulatory review completed | Legal team | |
| 26 | Audit log integrity verified (hash chain) | Audit team | |
| 27 | Tax reporting configuration verified | Finance team | |
| | **Performance** | | |
| 28 | Load test completed at 2x expected peak load | SRE team | |
| 29 | Performance benchmarks meet targets | Engineering team | |
| 30 | Slow query analysis completed for all database contexts | SRE team | |
| 31 | Cache strategy validated for read-heavy endpoints | Engineering team | |
| | **Documentation** | | |
| 32 | API documentation published | Engineering team | |
| 33 | On-call runbooks documented | SRE team | |
| 34 | Architecture documentation updated | Engineering team | |
| 35 | Incident response plan documented and shared | Security team | |

---

## 19. Risks

### 19.1 Risk Register

| # | Risk | Probability | Impact | Mitigation | Contingency |
|---|------|------------|--------|------------|-------------|
| 1 | Blockchain integration complexity underestimated (reorg handling, gas management, multi-chain) | High | Critical | Phased blockchain integration; start with BNB only; comprehensive reorg testing | Secondary market launch delayed; primary market uses PSP-only first |
| 2 | Event-sourcing performance at scale (event store write throughput, projection catch-up time) | Medium | High | Performance benchmarks in Sprint 1; partition by aggregate type; snapshot strategy; read replicas | Implement CQRS with separate write/read stores; add caching layer |
| 3 | Team unfamiliarity with event-driven architecture leads to coupling violations | Medium | High | Architecture reviews in every sprint; event flow documentation; contract tests enforce boundaries | Add architectural fitness functions in CI; pair domain experts with team |
| 4 | Third-party integration failures (KYC provider, PSP, blockchain RPC) | Medium | High | Circuit breakers on all adapters; fallback provider strategy; idempotency keys | Manual processing procedures documented; SLA monitoring |
| 5 | Regulatory changes (SEC/FINRA real estate tokenization rules) | Medium | High | Legal team monitors regulatory landscape; modular compliance context; feature flags for jurisdictions | Restrict to compliant jurisdictions; pause non-compliant features |
| 6 | Multi-sig treasury operations cause operational friction (delayed approvals, lost keys) | Medium | Medium | Auto-escalation for pending approvals; backup signer set; time-based auto-approval for low-risk movements | Emergency override with full board audit trail |
| 7 | Projection rebuild takes too long during disaster recovery | Low | High | Snapshot strategy; parallel rebuild per partition; SLA of 1 hour for full rebuild | Pre-compute failover projections; warm standby |
| 8 | NFT marketplace liquidity insufficient at launch | Medium | Medium | Start with secondary market tokens; add NFT marketplace after liquidity established | Cross-platform listing aggregation; market-making incentives |
| 9 | Cross-context event schema evolution leads to consumer breakage | Medium | Medium | Schema registry enforcement; backward-compatibility mandatory; consumer contract tests | Versioned event endpoints; parallel consumer versions during migration |
| 10 | AI model reliability (hallucinations, bias, availability) | Medium | Low | Human-in-the-loop for all financial recommendations; AI advisory only; fallback to rules-based system | AI features feature-flagged; non-blocking for core platform |

### 19.2 Risk Response Matrix

| Risk Domain | Accept | Mitigate | Transfer | Avoid |
|-------------|--------|----------|----------|-------|
| Blockchain complexity | | ✓ Multi-chain abstraction | | ✓ BNB-first |
| Performance at scale | | ✓ Benchmarks in Sprint 1 | | |
| Architectural drift | | ✓ Contract tests | ✓ External architecture audit | |
| Third-party failures | | ✓ Circuit breakers | ✓ SLA with providers | |
| Regulatory risk | | ✓ Legal monitoring | ✓ External legal counsel | ✓ Jurisdiction gating |
| Operational friction | | ✓ Auto-escalation | | |
| Disaster recovery | ✓ Acceptable rebuild time | ✓ Snapshots | | |
| AI reliability | ✓ Advisory only | ✓ Human-in-the-loop | | |
| Schema evolution | | ✓ Registry + validators | | |

---

## 20. Future Expansion

### 20.1 Planned Enhancements

| Feature | Target Release | Dependencies | Design Status |
|---------|---------------|--------------|---------------|
| **On-chain governance execution** | V2.0 | S18 Governance, Smart contract audit | Concept |
| **Cross-chain multi-token support** | V2.0 | S9 Payment, S15 Treasury | Concept |
| **Real-time property IoT integration** | V2.0 | S6 Property, S27 Map | Concept |
| **Mobile applications (iOS/Android)** | V2.0 | S29 Notification, S19 Identity | Concept |
| **Staking and yield farming** | V2.1 | S14 Reward, S18 Governance | Concept |
| **Property tokenization as a service (white-label)** | V2.1 | S6 Property, S7 Investment | Concept |
| **Advanced AI trading agents** | V2.1 | S23 AI, S8 Secondary Market | Concept |
| **DeFi integration (lending, borrowing against tokens)** | V2.1 | S12 NFT, S10 Ownership | Concept |
| **Real estate index fund token** | V2.2 | S13 Dividend, S28 Valuation | Concept |
| **Insurance pool (on-chain coverage)** | V2.2 | S16 Reserve, S18 Governance | Concept |

### 20.2 Architectural Expansion Capacity

The architecture is designed for the following expansion patterns without restructuring:

| Pattern | How It Works | Example |
|---------|-------------|---------|
| **New bounded context** | Create new package; register events in Domain Event Catalog; subscribe to existing events; publish new events | New S31 Insurance context |
| **New event type** | Add to Domain Event Catalog; implement producer; consumers opt-in; schema registry validates | New ComplianceEventType |
| **New payment method** | Implement PaymentAdapter interface; register in adapter registry; no state machine changes | New SEPA transfer adapter |
| **New chain** | Implement ChainAdapter interface; implement token adapters; BlockchainService handles abstraction | New Polygon chain support |
| **New projection** | Create new subscriber; implement projection store; add to rebuildable projection list | New VP analytics projection |
| **New worker** | Create new worker; subscribe to event stream; implement idempotent handler; register consumer group | New performance-report-worker |
| **New AI model** | Add model to AIModel registry; implement inference adapter; no pipeline change | New price prediction model |
| **New compliance provider** | Implement provider adapter; register in provider registry; feature-flag per jurisdiction | New Onfido KYC provider |

### 20.3 Deprecation and Migration Strategy

When a bounded context or event type is deprecated:

1. **Announce deprecation** via System event (SchemaVersionUpdated with deprecation notice).
2. **Stop producing** new events from the deprecated context.
3. **Migration period** — consumers are given a minimum of 3 sprints (6 weeks) to migrate.
4. **Graceful shutdown** — deprecated context enters read-only mode for 2 sprints after migration period.
5. **Event replay** — consumers rebuild projections from remaining events before final removal.
6. **Context removal** — package removed from monorepo; event types retired from registry.

### 20.4 Scalability Roadmap

| Metric | V1.0 Target | V1.5 Target | V2.0 Target |
|--------|-------------|-------------|-------------|
| Active investors | 10,000 | 50,000 | 250,000 |
| Properties | 100 | 500 | 2,500 |
| Daily transactions | 1,000 | 10,000 | 100,000 |
| Event throughput | 1,000/sec | 5,000/sec | 25,000/sec |
| Commission calculations/day | 5,000 | 25,000 | 125,000 |
| Dividend distributions/cycle | 10,000 | 100,000 | 1,000,000 |
| NFT minted | 1,000 | 10,000 | 100,000 |
| Governance proposals | 10/month | 50/month | 500/month |

---

> **This blueprint is a living document.** Every engineering decision that deviates from or extends these specifications must be documented with rationale and approved through the architecture review process. The Domain Event Catalog, Ecosystem Architecture document, Event Constitution, and this Implementation Blueprint form the complete architectural canon of the RELCKO platform.