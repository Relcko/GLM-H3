# RELCKO Technical Specification (RTS) v1.0

**Status:** Engineering Specification — Contract Authority
**Classification:** Internal — All Engineering Teams
**Canonical References:**
- RELCKO Ecosystem Architecture v1.2.1
- RELCKO Event Constitution v1.0
- RELCKO Domain Event Catalog v1.0
- RELCKO Implementation Blueprint v1.0

**Authority:** This specification defines the engineering contracts that every implementation — whether by human developers or AI coding systems — must satisfy. It is not architecture (which defines the "why") and not implementation (which defines the "how"). It is the precise specification of "what" must be built.

---

## 1. Purpose and Scope

### 1.1 Purpose

This document is the authoritative engineering specification for building the RELCKO platform. It translates the architecture canon into implementable contracts. Every module, aggregate, service, worker, projection, command, event, and integration has a defined contract that must be satisfied.

### 1.2 Scope

The specification covers:

- **30 bounded contexts** (S1–S30) spanning agent management, investment, secondary trading, NFT, treasury, governance, identity, compliance, and platform operations.
- **45 aggregates** with defined responsibilities, invariants, commands, events, and lifecycle state machines.
- **65+ domain services** with defined inputs and responsibilities.
- **160+ commands** with preconditions, postconditions, and validation requirements.
- **207 domain events** from the Domain Event Catalog with publication and consumption contracts (refer to Canon Synchronization Board Report v1.0 for per-context reconciliation).
- **45 projections** with rebuild strategies and consistency expectations.
- **27 background workers** with trigger, idempotency, and error-handling contracts.
- **13 integration points** with adapter contracts.

### 1.3 Relationship to Architecture Canon

| Document | Relationship |
|----------|-------------|
| Ecosystem Architecture v1.2.1 | Defines module boundaries and responsibilities; RTS specifies engineering contracts |
| Event Constitution v1.0 | Defines governing event principles; RTS specifies event contracts and guarantees |
| Domain Event Catalog v1.0 | Defines all 196 events; RTS references and adds consumption contracts |
| Implementation Blueprint v1.0 | Defines implementation sequence; RTS provides the contract each implementation must satisfy |

---
### 1.4 Who Must Comply

- **Human developers** implementing any bounded context, aggregate, service, projection, worker, or integration.
- **AI coding systems** generating code for any RELCKO component.
- **QA engineers** writing tests against specification contracts.
- **Code reviewers** verifying implementations against specification.
- **Technical writers** documenting system behavior.

---

## 2. Engineering Standards

### 2.1 Naming Conventions

#### 2.1.1 General Rules

| Element | Convention | Example |
|---------|-----------|---------|
| Bounded contexts | PascalCase prefix with S{Number} | S1Agent, S9Payment |
| Packages | kebab-case with c- prefix | c-agent, c-payment |
| Aggregates | PascalCase | Property, Commission, MarketplaceListing |
| Value Objects | PascalCase | Money, Percentage, CommissionRate |
| Domain Services | PascalCase with Service suffix | CommissionCalculationService |
| Application Services (Commands) | PascalCase with Handler suffix | CreatePropertyHandler |
| Application Services (Queries) | PascalCase with Query suffix | GetPortfolioQuery |
| Events | PascalCase with past-tense verb | PropertyCreated, CommissionPaid |
| Commands | PascalCase with imperative verb | CreateProperty, ApproveCommission |
| Projections | PascalCase with Projection suffix | PropertyListProjection |
| Workers | PascalCase with Worker suffix | CommissionCalculationWorker |
| Repository Interfaces | PascalCase with I prefix and Repository suffix | IPropertyRepository |
| Repository Implementations | PascalCase with Repository suffix | PostgresPropertyRepository |
| Adapters | PascalCase with Adapter suffix | BNBAdapter, KYCAdapter |
| Read Models | PascalCase with no suffix | PortfolioHolding, AgentDashboard |

#### 2.1.2 Event Naming

Events follow the pattern {Aggregate}{PastTenseVerb}:
- PropertyCreated, PropertyApproved, PropertyPublished
- PaymentInitiated, PaymentPending, PaymentFailed
- CommissionCalculated, CommissionApproved, CommissionPaid

Event types in the schema registry follow the pattern {domain}.{aggregate}.{action}:
- gent.agent.registered
- payment.payment.initiated
- commission.commission.calculated

#### 2.1.3 File and Folder Naming

- Files: kebab-case (commission-calculation-service.ts, property-created-event.ts)
- Folders: kebab-case (domain/, pplication/, infrastructure/)
- Test files: {name}.test.ts or {name}.spec.ts

### 2.2 Package Conventions

#### 2.2.1 Monorepo Package Structure

Every bounded context package at packages/bc-{name}/ follows:

`
packages/bc-{name}/
├── src/
│   ├── domain/
│   │   ├── aggregates/       # Aggregate roots, entities
│   │   ├── events/           # Event definitions (re-exported from catalog)
│   │   ├── invariants/       # Invariant enforcement rules
│   │   └── value-objects/    # Domain value objects
│   ├── application/
│   │   ├── commands/         # Command handlers
│   │   ├── queries/          # Query handlers
│   │   └── use-cases/        # Use case orchestration
│   ├── infrastructure/
│   │   ├── persistence/      # Repository implementations
│   │   ├── event-publishing/ # Event publisher implementations
│   │   └── projections/      # Read model projections
│   ├── interfaces/
│   │   ├── controllers/      # API controllers (if applicable)
│   │   ├── event-subscribers/# Event subscribers
│   │   └── graphql/          # GraphQL resolvers (if applicable)
│   └── index.ts              # Public API exports
├── __tests__/
├── package.json
└── tsconfig.json
`

#### 2.2.2 Shared Packages

| Package | Purpose | Owned By |
|---------|---------|----------|
| domain-event-catalog | Event type definitions, schemas, schema registry client | Platform Team |
| event-bus | Event bus abstractions, publisher/subscriber interfaces, DLQ support | Platform Team |
| event-store | Event append/read/replay, snapshot support, stream management | Platform Team |
| permission | Permission model, RBAC, attribute-based enforcement | Platform Team |
| 
otification | Notification dispatch abstractions, channel adapters | Platform Team |
| udit-log | Audit log projection, hash chain verification | Platform Team |

### 2.3 Folder Conventions

#### 2.3.1 Internal Layer Access Rules

| Layer | May Import From | Must Not Import From |
|-------|----------------|---------------------|
| domain/ | Domain layer only (other aggregates, value objects, events) | Infrastructure, interfaces, application |
| pplication/ | Domain layer, shared packages | Infrastructure, interfaces |
| infrastructure/ | Domain layer, application layer, shared packages | Interfaces |
| interfaces/ | Application layer, domain layer, shared packages | Infrastructure |

#### 2.3.2 Cross-Package Import Rules

- A bounded context package may only import from shared packages (domain-event-catalog, event-bus, event-store, permission, 
otification, udit-log).
- A bounded context package must never import another bounded context package directly.
- Cross-context communication occurs exclusively through the event bus.

### 2.4 Dependency Rules

#### 2.4.1 Architectural Dependency Rules

1. **No circular dependencies.** The dependency graph of all bounded contexts is acyclic and must remain acyclic.
2. **No skip-layer dependencies.** A consumer depends on the bounded context that owns the event, not on transitive producers.
3. **Foundation contexts (S19–S22, S24, S26) never depend on domain contexts.** They depend on shared infrastructure only.
4. **Read-model contexts (S11, S27, S28) never produce domain events.** They consume and project only.
5. **Infrastructure contexts (S29, S30) never depend on domain contexts.** They are terminal consumers.
6. **Shared infrastructure packages have zero dependencies on any bounded context.**

#### 2.4.2 Event Dependency Rules

1. **Every event has exactly one producing bounded context.** No event is produced by more than one context.
2. **Every event consumer subscribes to events from the event bus, never directly from the producer.**
3. **Consumers must not require synchronous responses from event processing.** Events are fire-and-forget from the producer's perspective.
4. **Domain events must not be used for infrastructure concerns** (e.g., health checks, metrics polling — use separate channels).

### 2.5 Error Handling Standards

#### 2.5.1 Error Classification

| Category | Definition | Handling |
|----------|-----------|----------|
| **Validation Error** | Input does not satisfy preconditions | Reject command; return error to caller; no event published |
| **Authorization Error** | Actor lacks required permission | Reject command; log security event; no event published |
| **Concurrency Error** | Optimistic concurrency conflict | Retry with fresh aggregate state; max 3 retries |
| **Transient Infrastructure Error** | Database timeout, network failure | Retry with exponential backoff; max 5 retries; route to DLQ after exhaustion |
| **Deterministic Domain Error** | Invariant violation, invalid state transition | Reject command; domain error returned; no event published |
| **Poison Event** | Event causes unrecoverable consumer failure | Route to DLQ on first failure; no automatic retry |
| **Integration Error** | External service failure | Circuit breaker pattern; fallback strategy; alert on threshold |

#### 2.5.2 Retry Policy

| Context | Base Delay | Multiplier | Max Delay | Max Retries | Jitter |
|---------|-----------|------------|-----------|-------------|--------|
| Command handling | 50ms | 2 | 5s | 3 | 10% |
| Event consumption | 100ms | 2 | 30s | 5 | 10% |
| Integration adapters | 200ms | 2 | 60s | 3 | 10% |
| Worker processing | 100ms | 2 | 30s | 5 | 10% |

#### 2.5.3 Error Response Contract

Every command handler must return a structured result:

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether the command was processed |
| errorCode | string (optional) | Machine-readable error code on failure |
| errorMessage | string (optional) | Human-readable error description |
| correlationId | string | Trace identifier linking to originating request |
| events | Event[] (optional) | Events produced on success |

### 2.6 Logging Standards

#### 2.6.1 Log Entry Schema

Every log entry must include:

`
{
  "timestamp": "2026-01-15T10:30:00.000Z",
  "level": "info|warn|error|debug",
  "service": "bc-commission",
  "correlationId": "uuid",
  "causationId": "uuid",
  "aggregateId": "uuid",
  "aggregateType": "Commission",
  "eventType": "CommissionCalculated",
  "message": "Human-readable description",
  "metadata": { ... }
}
`

#### 2.6.2 Log Level Rules

| Level | Usage | Environment |
|-------|-------|-------------|
| error | Recoverable failures that require investigation | Production, Staging, Dev |
| warn | Non-critical anomalies, retries, degraded operation | Production, Staging, Dev |
| info | State transitions, command results, event publications | Production (scoped), Staging, Dev |
| debug | Detailed diagnostic information | Dev only |

#### 2.6.3 Sensitive Data Rules

The following data must never appear in logs:
- Passwords, secrets, API keys, tokens
- Wallet private keys, seed phrases
- Full payment instrument numbers (card numbers, bank accounts)
- Personal identification numbers (SSN, passport, tax ID)
- KYC document contents
- Authentication credentials

### 2.7 Configuration Standards

#### 2.7.1 Configuration Sources

| Priority | Source | Scope |
|----------|--------|-------|
| 1 | Environment variables | Deployment-specific values (secrets, URLs, ports) |
| 2 | Configuration service (S25 Admin) | Runtime-configurable parameters (feature flags, limits) |
| 3 | Environment-specific config files | Non-sensitive defaults per environment |
| 4 | Default values in code | Fallback defaults |

#### 2.7.2 Configuration Categories

| Category | Storage | Who Can Modify |
|----------|---------|---------------|
| Secrets | Secrets manager (AWS Secrets Manager / HashiCorp Vault) | Platform team only |
| Feature flags | Configuration service | Admin team |
| Business parameters | Configuration service / Governance | Governance vote for sensitive params |
| Infrastructure config | Environment variables / deployment manifests | Platform team |

#### 2.7.3 Configuration Validation

Every configuration value must be validated at startup:
- Required values must have non-null, non-empty values.
- Numeric values must be within defined ranges.
- String values must match defined patterns where applicable.
- Service startup must fail on invalid configuration (fail fast).

---
## 3. Aggregate Contracts

### 3.1 Aggregate Contract Template

Every aggregate in the RELCKO platform must satisfy the following contract template:

`
Aggregate: {Name}
Bounded Context: S{N} — {Name}

Responsibilities:
- {Primary responsibility of this aggregate}

Invariants:
- {Invariant 1 — must be enforced on every state transition}
- {Invariant 2}

Allowed Commands:
- {Command 1} → produces {Event 1}
- {Command 2} → produces {Event 2}

Produced Events:
- {Event 1} — {When produced}
- {Event 2} — {When produced}

Consumed Events:
- {Event X} — {How this event affects state}

Lifecycle:
{State1} → {State2} → {State3} ...
`

### 3.2 S1 — Agent Context Aggregates

#### 3.2.1 Agent

**Responsibilities:** Manage agent identity, status, commission rate, and lifecycle from registration through termination.

**Invariants:**
- Each investor can be an agent at most once (single agent identity per identity).
- Commission rate is set at registration and is the authoritative base rate for all future commissions.
- Agent status transitions follow the state machine: REGISTERED → PENDING → ACTIVE → INACTIVE → ACTIVE (loop) → SUSPENDED → TERMINATED.
- Only ACTIVE agents receive team override commissions.
- INACTIVE agents retain personal commission eligibility and rank title.
- TERMINATED is final; terminated agents stop earning on all future transactions.

**Allowed Commands:** RegisterAgent, ActivateAgent, DeactivateAgent, ChangeAgentStatus, RecordTaskCompletion

**Produced Events:** AgentRegistered, AgentActivated, AgentDeactivated, AgentStatusChanged, AgentTaskCompleted, AgentEnteredGracePeriod

**Consumed Events:**
- IdentityVerified (S19) — triggers registration eligibility
- CommissionCalculated (S3) — affects performance metrics
- ReferralConverted (S2) — may trigger activation

**Lifecycle:** REGISTERED → PENDING → ACTIVE ↔ INACTIVE → SUSPENDED → TERMINATED

#### 3.2.2 AgentStatus

**Responsibilities:** Track agent status transitions and active window timestamps for override eligibility computation.

**Invariants:**
- ActiveUntil is a computed rolling window (now + 30 days on each qualifying sale).
- Grace period notification fires when ActiveUntil minus now < grace period threshold.
- Status change audit trail is immutable.

**Allowed Commands:** None (sub-aggregate of Agent)

**Produced Events:** AgentEnteredGracePeriod

**Consumed Events:** AgentActivated, AgentDeactivated, AgentStatusChanged

**Lifecycle:** TRACKING → GRACE → EXPIRED → TRACKING (loop)

### 3.3 S2 — Network Context Aggregates

#### 3.3.1 Referral

**Responsibilities:** Establish and manage the permanent sponsor link between an investor and an agent.

**Invariants:**
- One active referral per investor (single sponsor for life).
- Referral code must belong to an ACTIVE or INACTIVE agent.
- Self-referral is prohibited (investor ≠ agent).
- The sponsor relationship is lifelong and never changes except by admin intervention.

**Allowed Commands:** CreateReferral, ConvertReferral

**Produced Events:** ReferralCreated, ReferralConverted, ReferralExpired

**Consumed Events:**
- InvestmentAllocated (S7) — triggers conversion evaluation
- SettlementCompleted (S9) — confirms conversion
- RefundCompleted (S9) — may affect commission reversal

**Lifecycle:** CREATED → CONVERTED → EXPIRED

#### 3.3.2 AgentTeam

**Responsibilities:** Maintain the agent network graph with parent-child relationships and level tracking.

**Invariants:**
- The team graph is acyclic (no circular parentage).
- Each agent has exactly one parent (except root agents).
- Maximum tree depth is enforced (configurable, default 10 levels).
- An agent may only be in one team at a time.

**Allowed Commands:** JoinTeam, RestructureTeam, MoveAgent

**Produced Events:** TeamChanged, AgentPerformanceSnapshot

**Consumed Events:** AgentRegistered, AgentDeactivated, AgentStatusChanged

**Lifecycle:** CREATED → UPDATED → RESTRUCTURED

#### 3.3.3 AgentPerformance

**Responsibilities:** Track agent key performance indicators including referral conversions, team volume, rank progression, and leaderboard position.

**Invariants:**
- Performance metrics are computed from events, never set directly.
- Rank is derived from performance thresholds set by governance.
- Leaderboard positions are recomputed per schedule or campaign event.

**Allowed Commands:** SnapshotPerformance

**Produced Events:** AgentPerformanceSnapshot, LeaderboardUpdated

**Consumed Events:** ReferralConverted, CommissionPaid, CampaignRewardIssued

**Lifecycle:** UPDATING (continuous — no terminal state)

### 3.4 S3 — Commission Context Aggregates

#### 3.4.1 Commission

**Responsibilities:** Calculate, approve, hold, pay, or reverse commission amounts for qualifying sales.

**Invariants:**
- Commission amount = f(saleValue, rate, multiplier) — deterministic formula.
- Override routes to the nearest ACTIVE upline agent.
- If no ACTIVE upline exists at any level, commission routes to Treasury.
- A commission may not exceed the sale value.

**Allowed Commands:** CalculateCommission, ApproveCommission, PayCommission, HoldCommission, ReleaseCommission, ReverseCommission

**Produced Events:** CommissionCalculated, CommissionApproved, CommissionPaid, CommissionHeld, CommissionReleased, CommissionReversed

**Consumed Events:**
- SettlementCompleted (S9) — triggers calculation
- MarketplaceSaleCompleted (S8) — triggers calculation
- TreasuryFunded (S15) — allows payout

**Lifecycle:** CALCULATED → APPROVED → PAID | HELD | REVERSED

#### 3.4.2 CommissionBatch

**Responsibilities:** Group commission payouts into batches for batch settlement processing.

**Invariants:**
- Sum of commissions in batch = calculated total.
- Batch is all-or-nothing (all commissions in batch settle together).
- A commission belongs to exactly one batch.

**Allowed Commands:** CreateBatch, CalculateBatch, ApproveBatch, SettleBatch

**Produced Events:** Commission batch events

**Consumed Events:** CommissionCalculated, CommissionApproved

**Lifecycle:** CREATED → CALCULATED → APPROVED → SETTLED

#### 3.4.3 CommissionRate

**Responsibilities:** Manage commission rate definitions, tiers, and governance-approved adjustments.

**Invariants:**
- Rates are governed by treasury policy and may only be changed by governance vote.
- Rate changes are effective from the next calculation cycle (not retroactive).
- Historical rates are preserved for replay.

**Allowed Commands:** ChangeCommissionRate

**Produced Events:** CommissionRateChanged

**Consumed Events:** GovernanceParameterChanged (S18) — rate policy changes

**Lifecycle:** No terminal state (versioned over time)

#### 3.4.4 OverrideRoute

**Responsibilities:** Define and manage override commission routing through the agent team hierarchy.

**Invariants:**
- Routes to ACTIVE upline only.
- Routes compress upward past INACTIVE agents.
- Treasury is the final fallback if no ACTIVE upline exists at any level.

**Allowed Commands:** UpdateOverrideRoute, CompressOverrideRoute

**Produced Events:** OverrideRouteChanged, OverrideCompressed

**Consumed Events:** AgentActivated, AgentDeactivated, AgentStatusChanged

**Lifecycle:** CREATED → UPDATED → COMPRESSED

### 3.5 S4 — Qualification Context Aggregates

#### 3.5.1 QualifyingSale

**Responsibilities:** Determine whether a sale qualifies for commission attribution by applying all qualifying criteria.

**Invariants:**
- Cooling period must be enforced (configurable per jurisdiction, default 14 days).
- KYC of the investor must be approved before sale qualifies.
- Minimum investment value must be met (configurable per property).
- A sale that is refunded or cancelled loses qualification.
- Each sale is evaluated for qualification exactly once.

**Allowed Commands:** VerifySale, ConfirmQualification, RejectQualification, ExtendCooling

**Produced Events:** QualifyingSaleVerified, CoolingPeriodEnded, CoolingPeriodExtended

**Consumed Events:**
- SettlementCompleted (S9) — triggers qualification verification
- KYCApproved (S20) — required for qualification

**Lifecycle:** SUBMITTED → VERIFIED → COOLED → CONFIRMED | REJECTED

#### 3.5.2 QualifyingCriteria

**Responsibilities:** Define and manage the criteria that determine sale qualification.

**Invariants:**
- Criteria may include: min value, cooling period, KYC requirement, refund window.
- Criteria changes are effective for new sales only (not retroactive).

**Allowed Commands:** UpdateQualifyingCriteria

**Produced Events:** QualifyingCriteriaUpdated

**Consumed Events:** GovernanceParameterChanged (S18)

**Lifecycle:** No terminal state (versioned)

### 3.6 S5 — Campaign Context Aggregates

#### 3.6.1 Campaign

**Responsibilities:** Manage time-boxed referral campaigns with defined rules, budgets, and reward structures.

**Invariants:**
- Campaign start date must precede end date.
- Campaign budget must not be exceeded.
- Campaign rules are immutable once the campaign is ACTIVE.
- A campaign may be in one state at a time.

**Allowed Commands:** CreateCampaign, UpdateCampaign, ActivateCampaign, EndCampaign, ArchiveCampaign

**Produced Events:** CampaignCreated, CampaignUpdated, CampaignEnded

**Consumed Events:**
- ReferralConverted (S2) — triggers reward evaluation

**Lifecycle:** DRAFT → ACTIVE → ENDED → ARCHIVED

#### 3.6.2 CampaignReward

**Responsibilities:** Track individual reward issuance within a campaign, ensuring each conversion is rewarded exactly once.

**Invariants:**
- Each qualifying referral conversion generates exactly one reward per campaign.
- Reward amount is determined by campaign rules at conversion time.
- Budget consumption must not exceed campaign budget.

**Allowed Commands:** IssueReward

**Produced Events:** CampaignRewardIssued

**Consumed Events:** ReferralConverted (S2)

**Lifecycle:** PENDING → ISSUED

### 3.7 S6 — Property Context Aggregates

#### 3.7.1 Property

**Responsibilities:** Manage the full property lifecycle from creation through approval, publishing, funding, operations, and archival.

**Invariants:**
- Total fraction supply is fixed at approval and cannot be changed.
- Fractions must sum to exactly 100% of ownership.
- SPV (Special Purpose Vehicle) must exist in 1:1 relationship with property.
- A property may only be in one state at a time.
- Dividend activation requires the property to be OPERATIONAL.

**Allowed Commands:** CreateProperty, ApproveProperty, PublishProperty, UpdateProperty, PauseProperty, ResumeProperty, DelistProperty, ArchiveProperty, StartFunding, ActivateDividend

**Produced Events:** PropertyCreated, PropertyApproved, PropertyPublished, PropertyUpdated, PropertyPaused, PropertyResumed, PropertyDelisted, PropertyArchived, PropertyFundingStarted, PropertyOperational, DividendActivated

**Consumed Events:**
- DocumentVerified (S24) — document checks for approval
- GovernanceParameterChanged (S18) — property policy updates

**Lifecycle:** CREATED → APPROVED → PUBLISHED → FUNDED → OPERATIONAL → ARCHIVED

#### 3.7.2 PropertyFraction

**Responsibilities:** Manage the fraction breakdown of property ownership, ensuring total supply integrity.

**Invariants:**
- Sum of all fractions = 100%.
- Each fraction has a unique identifier.
- Fractions may be homogeneous (fungible tokens) or heterogeneous.
- Fraction structure is immutable after property approval.

**Allowed Commands:** None (sub-aggregate of Property)

**Consumed Events:** PropertyCreated, PropertyApproved

**Lifecycle:** Fixed at property approval

#### 3.7.3 SPV (Special Purpose Vehicle)

**Responsibilities:** Represent the legal entity that holds the property asset, ensuring 1:1 property-to-SPV mapping and legal compliance.

**Invariants:**
- Each SPV is associated with exactly one property.
- SPV legal documents must be verified before property can be approved.
- SPV jurisdiction must be legally compliant for tokenization.

**Allowed Commands:** None (managed through Property lifecycle)

**Lifecycle:** Fixed at property creation

### 3.8 S7 — Primary Investment Context Aggregates

#### 3.8.1 Investment

**Responsibilities:** Manage the primary investment lifecycle from initiation through allocation or rejection.

**Invariants:**
- Available supply must not be exceeded by total allocations.
- Minimum investment amount must be respected.
- Only one investment round may be active per property at a time.
- Investor KYC must be approved before investment can proceed.
- Investment allocation is final once published to Ownership.

**Allowed Commands:** StartInvestment, AllocateInvestment, RejectInvestment, CancelInvestment

**Produced Events:** InvestmentStarted, InvestmentAllocated, InvestmentRejected, InvestmentCancelled

**Consumed Events:**
- PropertyPublished (S6) — investment eligibility opens
- SettlementCompleted (S9) — payment confirmed
- KYCApproved (S20) — investor eligibility

**Lifecycle:** STARTED → RESERVED → PAID → ALLOCATED | REJECTED | CANCELLED

#### 3.8.2 Reservation

**Responsibilities:** Hold investment reservations with time-to-live enforcement, managing expiry and promotion from waiting lists.

**Invariants:**
- Reservation TTL is enforced (configurable, default 24 hours).
- Reserved quantity must not exceed available supply.
- A reservation can be promoted from the waiting list when supply becomes available.

**Allowed Commands:** CreateReservation, PromoteReservation, CancelReservation

**Produced Events:** ReservationCreated, ReservationExpired, WaitingListPromoted

**Consumed Events:** InvestmentAllocated, RoundClosed

**Lifecycle:** CREATED → EXPIRED → PROMOTED | CANCELLED

#### 3.8.3 Round

**Responsibilities:** Manage investment rounds with defined hard caps, start/end dates, and state transitions.

**Invariants:**
- Round hard cap must be respected (total allocated ≤ hard cap).
- Round end date (if set) closes the round automatically.
- Only one round can be ACTIVE per property at a time.
- A closed round may not be reopened.

**Allowed Commands:** OpenRound, CloseRound

**Produced Events:** RoundOpened, RoundClosed

**Consumed Events:** PropertyFundingStarted (S6)

**Lifecycle:** OPENED → ACTIVE → CLOSED

### 3.9 S8 — Secondary Market Context Aggregates

#### 3.9.1 MarketplaceListing

**Responsibilities:** Represent a sell order on the secondary market with price, quantity, and status management.

**Invariants:**
- Listed quantity must not exceed seller's verified balance.
- Price must be within allowed bounds (no zero-price listings, no price exceeding max multiplier of NAV).
- A listing can only be created for properties that are past their primary round.

**Allowed Commands:** CreateListing, UpdateListing, CancelListing

**Produced Events:** MarketplaceListingCreated, MarketplaceListingUpdated, MarketplaceListingCancelled

**Consumed Events:** OwnershipMinted (S10), OwnershipTransferred (S10)

**Lifecycle:** CREATED → ACTIVE → UPDATED → CANCELLED | SOLD

#### 3.9.2 Offer

**Responsibilities:** Represent a buy offer against an active listing with price agreement and expiration.

**Invariants:**
- Offer price must be ≥ 0 and within allowed bounds.
- Offer must reference an ACTIVE listing.
- Offer expires at TTL (configurable, default 48 hours).
- Only one accepted offer per listing at a time.

**Allowed Commands:** CreateOffer, AcceptOffer, WithdrawOffer, RejectOffer

**Produced Events:** OfferCreated, OfferAccepted, OfferWithdrawn, OfferRejected

**Consumed Events:** MarketplaceListingCreated, MarketplaceListingCancelled

**Lifecycle:** CREATED → ACCEPTED | WITHDRAWN | REJECTED

#### 3.9.3 Escrow

**Responsibilities:** Hold funds in escrow during a secondary trade, ensuring atomic settlement or cancellation.

**Invariants:**
- Escrow amount must equal the accepted offer price.
- Escrow may only be released on successful settlement or mutual cancellation.
- FX rate is frozen at the moment of escrow creation.
- Escrow release must transfer funds to the seller minus platform fees.

**Allowed Commands:** HoldEscrow, ReleaseEscrow, ReturnEscrow

**Produced Events:** EscrowHeld, EscrowReleased

**Consumed Events:** OfferAccepted (S8), SettlementCompleted (S9)

**Lifecycle:** HELD → RELEASED | RETURNED

#### 3.9.4 MarketplaceSale

**Responsibilities:** Represent the completed sale record on the secondary market.

**Invariants:**
- Each sale corresponds to exactly one listing and one accepted offer.
- Sale records are immutable once completed.
- Commission is calculated based on sale parameters.

**Allowed Commands:** CompleteSale, CancelSale

**Produced Events:** MarketplaceSaleCompleted, MarketplaceSaleCancelled, SecondaryPriceUpdated

**Consumed Events:** EscrowReleased (S8)

**Lifecycle:** PENDING → COMPLETED | CANCELLED

### 3.10 S9 — Payment and Settlement Context Aggregates

#### 3.10.1 Payment

**Responsibilities:** Manage the full payment lifecycle from initiation through settlement, failure, or expiry.

**Invariants:**
- FX rate is frozen at payment initiation and never changes during processing.
- Amount invariant is maintained throughout the lifecycle.
- Payment state transitions are strictly ordered.
- A payment may only be refunded up to the original amount.
- Blockchain transactions require minimum confirmations before settlement.

**Allowed Commands:** InitiatePayment, ConfirmPayment, FailPayment, ExpirePayment

**Produced Events:** PaymentInitiated, PaymentPending, PaymentSettling, SettlementCompleted, PaymentFailed, PaymentExpired

**Consumed Events:**
- InvestmentStarted (S7) — triggers payment initiation
- OfferAccepted (S8) — triggers payment for secondary trades

**Lifecycle:** INITIATED → PENDING → SETTLING → SETTLED | FAILED | EXPIRED

#### 3.10.2 Refund

**Responsibilities:** Process payment refunds to the original payment method, maintaining amount integrity.

**Invariants:**
- Refund amount must not exceed the original payment amount.
- Refund must route to the original payment method.
- Partial refunds are allowed but cumulative refunds must not exceed original amount.
- Refund is complete only when funds are confirmed returned.

**Allowed Commands:** InitiateRefund, CompleteRefund

**Produced Events:** RefundInitiated, RefundCompleted

**Consumed Events:** PaymentFailed (S9), InvestmentRejected (S7)

**Lifecycle:** INITIATED → COMPLETED

#### 3.10.3 SettlementLedger

**Responsibilities:** Maintain an immutable record of all settled transactions for reconciliation and audit.

**Invariants:**
- Every settlement is recorded as an entry in the settlement ledger.
- The ledger is append-only and immutable.
- Ledger entries are keyed by settlement ID and are idempotent.
- Total debits must equal total credits within each settlement period.

**Allowed Commands:** ReconcileLedger

**Produced Events:** SettlementReconciled

**Consumed Events:** SettlementCompleted (S9), RefundCompleted (S9)

**Lifecycle:** Append-only (continuous)
### 3.11 S10 — Ownership Context Aggregates
### 3.11 S10 — Ownership Context Aggregates

#### 3.11.1 OwnershipEvent

**Responsibilities:** Record every ownership change as an immutable event.

**Invariants:**
- Total supply invariant: sum(balances) = total supply - total burned.
- An investor may not transfer more than their verified balance.
- Ownership is always represented as a fraction of total supply.

**Allowed Commands:** MintOwnership, TransferOwnership, ReclaimOwnership, BurnOwnership

**Produced Events:** OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned

**Consumed Events:**
- InvestmentAllocated (S7) - triggers mint
- MarketplaceSaleCompleted (S8) - triggers transfer
- BurnExecuted (S17) - ownership burn

**Lifecycle:** Append-only event stream (no terminal state)

#### 3.11.2 OwnershipSnapshot

**Responsibilities:** Create point-in-time snapshots of ownership distribution.

**Invariants:**
- A snapshot is immutable once taken.
- Snapshot state must be reproducible from the event log.
- Snapshots are keyed by (propertyId, snapshotVersion).

**Allowed Commands:** TakeSnapshot

**Produced Events:** OwnershipSnapshotTaken

**Consumed Events:** DividendScheduled (S13), GovernanceProposalCreated (S18)

**Lifecycle:** REQUESTED -> TAKEN

### 3.12 S11 - Portfolio Context Aggregates

#### 3.12.1 PortfolioHolding

**Responsibilities:** Track an investor's aggregate holdings across all properties and positions.

**Invariants:**
- Portfolio quantity = sum of all ownership events for the investor.
- Cost basis is computed from weighted average of all acquisitions.
- Portfolio is a derived projection, not an authoritative store.

**Allowed Commands:** None (read-model; updated by projections)

**Produced Events:** PortfolioHoldingChanged, PortfolioValueUpdated, PortfolioPerformanceUpdated

**Consumed Events:**
- OwnershipMinted (S10), OwnershipTransferred (S10)
- SecondaryPriceUpdated (S8), ValuationUpdated (S28)
- DividendDistributed (S13), NFTSold (S12)

**Lifecycle:** Continuous updating (no terminal state)

### 3.13 S12 - NFT Context Aggregates

#### 3.13.1 NFTCollection

**Responsibilities:** Define and manage NFT collections with supply caps, metadata schemas, and access rights.

**Invariants:**
- Max supply is enforced if set (no mints beyond max supply).
- Metadata schema is defined at collection creation.
- Collection may be ACTIVE (minting allowed) or ARCHIVED (no new mints).

**Allowed Commands:** CreateCollection, ArchiveCollection

**Produced Events:** NFTCreated

**Lifecycle:** CREATED -> ACTIVE -> ARCHIVED

#### 3.13.2 NFTAsset

**Responsibilities:** Represent an individual NFT token with ownership, metadata, and state management.

**Invariants:**
- 1:1 relationship between NFT token ID and the asset record.
- Metadata content hash is immutable after mint.
- Freeze state blocks all transfers and marketplace operations.
- Only the owner may list, transfer, or burn.

**Allowed Commands:** MintNFT, TransferNFT, FreezeNFT, UnfreezeNFT, BurnNFT, RedeemNFT, EvolveNFT, UpdateMetadata

**Produced Events:** NFTMinted, NFTTransferred, NFTFrozen, NFTUnfrozen, NFTBurned, NFTRedeemed, NFTEvolved, NFTMetadataUpdated

**Consumed Events:**
- PaymentInitiated (S9) - for NFT purchases
- SettlementCompleted (S9) - for NFT trade settlement

**Lifecycle:** CREATED -> MINTED -> FROZEN <-> ACTIVE -> BURNED | REDEEMED

#### 3.13.3 NFTListing

**Responsibilities:** Manage NFT listings with pricing, duration, and status.

**Invariants:**
- Only the NFT owner may create a listing.
- An NFT may have at most one active listing at a time.

**Allowed Commands:** ListNFT, DelistNFT

**Produced Events:** NFTListed, NFTDelisted

**Lifecycle:** ACTIVE -> DELISTED | SOLD

#### 3.13.4 NFTOffer

**Responsibilities:** Manage buy offers for NFTs.

**Invariants:**
- Offer must reference an active listing or a specific NFT.
- Offer expires after TTL (configurable).

**Allowed Commands:** CreateNFTOffer, AcceptNFTOffer, WithdrawNFTOffer

**Produced Events:** NFTOfferCreated, NFTOfferAccepted, NFTOfferWithdrawn

**Lifecycle:** CREATED -> ACCEPTED | WITHDRAWN

#### 3.13.5 NFTAuction

**Responsibilities:** Manage NFT auctions with bidding and winner determination.

**Invariants:**
- Bids must exceed the current highest bid.
- The auction ends at the configured end time.
- The highest bidder at auction end wins.

**Allowed Commands:** StartAuction, PlaceBid, EndAuction

**Produced Events:** NFTAuctionStarted, NFTAuctionBid, NFTAuctionEnded

**Lifecycle:** STARTED -> ACTIVE -> ENDED

#### 3.13.6 NFTSale

**Responsibilities:** Record completed NFT sales with royalty distribution.

**Invariants:**
- Each sale has exactly one buyer and one seller.
- Sale is immutable once completed.

**Allowed Commands:** CompleteNFTSale

**Produced Events:** NFTSold, RoyaltiesPaid

**Lifecycle:** PENDING -> COMPLETED

#### 3.13.7 NFTBlacklist

**Responsibilities:** Maintain a blacklist of addresses or NFTs prohibited from platform interaction.

**Invariants:**
- Blacklisted addresses cannot list, buy, sell, or transfer NFTs.
- Blacklisting requires compliance or security authority.

**Allowed Commands:** BlacklistNFT, BlacklistAddress

**Produced Events:** NFTBlacklisted

**Consumed Events:** ComplianceFlagRaised (S20), FraudDetected (S21)

**Lifecycle:** Append-only blacklist

### 3.14 S13 - Dividend Context Aggregates

#### 3.14.1 Dividend

**Responsibilities:** Manage the full dividend lifecycle from calculation through distribution or recovery.

**Invariants:**
- Dividend pool = net income x distribution policy percentage.
- Per-unit amount = dividend pool / total eligible units.
- A dividend may only be distributed once.
- Unclaimed amounts after the claim window are recovered to treasury.

**Allowed Commands:** CalculateDividend, ApproveDividend, ScheduleDividend, DistributeDividend, RecoverDividend, RejectDividend

**Produced Events:** DividendCalculated, DividendApproved, DividendScheduled, DividendDistributed, DividendRecovered, DividendRejected

**Consumed Events:**
- PropertyOperational (S6) - enables dividend activation
- TreasuryFunded (S15) - funding for distribution
- OwnershipSnapshotTaken (S10) - determines eligible holders

**Lifecycle:** CALCULATED -> APPROVED -> FUNDED -> SCHEDULED -> DISTRIBUTED -> RECOVERED | REJECTED

#### 3.14.2 DividendPayment

**Responsibilities:** Track per-holder dividend claims.

**Invariants:**
- Payment amount = holder's entitlement x per-unit amount.
- Each holder may claim at most once per dividend cycle.

**Allowed Commands:** ClaimDividend

**Produced Events:** DividendClaimed

**Lifecycle:** PENDING -> CLAIMED -> RECOVERED

#### 3.14.3 TaxDocument

**Responsibilities:** Generate and manage tax documents for dividend income.

**Invariants:**
- Tax documents are generated per holder per dividend cycle.
- Withholding tax is applied where required by jurisdiction.

**Allowed Commands:** IssueTaxDocument

**Produced Events:** TaxDocumentIssued

**Lifecycle:** PENDING -> ISSUED

### 3.15 S14 - Reward Context Aggregates

#### 3.15.1 Reward

**Responsibilities:** Track non-commission incentives from crediting through payout.

**Invariants:**
- Reward amount must not exceed the incentive program budget.
- Eligibility rules are evaluated at credit time (not payout time).

**Allowed Commands:** CreditIncentive, PayReward

**Produced Events:** IncentiveCredited, RewardPaid

**Consumed Events:** TreasuryFunded (S15), SettlementCompleted (S9)

**Lifecycle:** CREDITED -> PAID

#### 3.15.2 IncentiveProgram

**Responsibilities:** Define and manage incentive programs with budgets and eligibility rules.

**Invariants:**
- Program budget is capped and enforced.
- End date must be after start date.
- A deactivated program may not issue new rewards.

**Allowed Commands:** CreateProgram, ActivateProgram, DeactivateProgram

**Produced Events:** IncentiveProgramActivated, IncentiveProgramDeactivated

**Lifecycle:** DRAFT -> ACTIVE -> DEACTIVATED

#### 3.15.3 LeadershipPool

**Responsibilities:** Manage the quarterly leadership pool distribution to eligible senior agents.

**Invariants:**
- Only ACTIVE Platinum+ agents are eligible.
- The pool is distributed once per quarter.

**Allowed Commands:** DistributeLeadershipPool

**Produced Events:** LeadershipPoolDistributed

**Lifecycle:** Per-quarter distribution

### 3.16 S15 - Treasury Context Aggregates

#### 3.16.1 TreasuryAccount

**Responsibilities:** Represent a treasury account with balance tracking and multi-sig security.

**Invariants:**
- Balance = sum(deposits) - sum(withdrawals) - sum(allocations).
- Multi-sig approval is required for all movements.
- A CLOSED account may not be reopened.

**Allowed Commands:** DepositTreasury, WithdrawTreasury, FreezeAccount, CloseAccount

**Produced Events:** TreasuryDeposit, TreasuryWithdrawal

**Lifecycle:** ACTIVE -> FROZEN -> CLOSED

#### 3.16.2 TreasuryMovement

**Responsibilities:** Manage the approval and execution workflow for treasury value movements.

**Invariants:**
- Movement requires N-of-M approvals (default 2-of-3 standard, 3-of-5 large).
- Amount must not exceed available balance.
- Large movements require governance approval.

**Allowed Commands:** RequestMovement, ApproveMovement, ExecuteMovement, RejectMovement

**Produced Events:** TreasuryMovementApproved

**Lifecycle:** REQUESTED -> APPROVED -> EXECUTED | REJECTED

#### 3.16.3 TreasuryAllocation

**Responsibilities:** Manage allocation of treasury funds across operational domains.

**Invariants:**
- Allocation must follow the defined allocation policy.
- Total allocated must not exceed available balance.

**Allowed Commands:** AllocateTreasury

**Produced Events:** TreasuryAllocated

#### 3.16.4 TreasuryYield

**Responsibilities:** Record yield generated on treasury assets.

**Invariants:**
- Yield is recorded when received, not when anticipated.
- Yield allocation follows the same distribution policy as revenue.

**Allowed Commands:** RecordYield

**Produced Events:** TreasuryYieldRealized

### 3.17 S16 - Reserve Context Aggregates

#### 3.17.1 ReserveFund

**Responsibilities:** Manage reserve sub-funds across seven reserve types.

**Invariants:**
- Reserve balance must never go below zero.
- Drawdown requires authorized authority per reserve type.
- Emergency reserve requires dual-control authorization.

**Allowed Commands:** FundReserve, DrawdownReserve, ReplenishReserve

**Produced Events:** ReserveUpdated, EmergencyReserveUsed, InsuranceTriggered

**Lifecycle:** FUNDED -> AVAILABLE -> DRAWN -> REPLENISHED

### 3.18 S17 - Buyback and Burn Context Aggregates

#### 3.18.1 BuybackProgram

**Responsibilities:** Define and manage buyback programs.

**Invariants:**
- Budget must not be exceeded across all executions.
- A PAUSED program may not execute buybacks.

**Allowed Commands:** CreateBuybackProgram, PauseBuybackProgram, ResumeBuybackProgram, EndBuybackProgram

**Produced Events:** BuybackProgramCreated, BuybackProgramPaused, BuybackProgramResumed

**Lifecycle:** CREATED -> ACTIVE -> PAUSED -> ENDED

#### 3.18.2 BuybackExecution

**Responsibilities:** Execute individual buyback purchases.

**Invariants:**
- Buyback amount must not exceed available budget.

**Allowed Commands:** ExecuteBuyback, CancelBuyback

**Produced Events:** BuybackExecuted, BuybackCancelled

**Lifecycle:** PENDING -> EXECUTED | CANCELLED

#### 3.18.3 BurnExecution

**Responsibilities:** Execute permanent token burns.

**Invariants:**
- Burn amount must not exceed tokens in custody.
- Burning is final and irreversible.

**Allowed Commands:** ExecuteBurn, CancelBurn

**Produced Events:** BurnExecuted, BurnCancelled

**Lifecycle:** PENDING -> EXECUTED | CANCELLED

#### 3.18.4 TokenSupply

**Responsibilities:** Track net token supply metrics.

**Invariants:**
- Supply reduction = cumulative burned - cumulative minted.
- All supply metrics are derived from burn and mint events.

**Produced Events:** SupplyReductionUpdated

**Lifecycle:** Continuous updating (no terminal state)
### 3.19 S18 - Governance Context Aggregates
#### 3.19.1 Proposal

**Responsibilities:** Manage the full lifecycle of governance proposals.

**Invariants:**
- Quorum must be met for the proposal to pass.
- Majority must vote in favor for the proposal to pass.
- Timelock must be observed before execution (minimum 48 hours).

---

## 4. Command Catalog

### 4.1 Command Contract Template

Every command must satisfy the following contract:

```
Command: {Name}
Bounded Context: S{N}
Aggregate: {Aggregate}
Purpose: {What the command does}
Preconditions:
- {Condition that must be true before command execution}
Postconditions:
- {Condition that is true after command execution}
Validation Requirements:
- {Validation rule 1}
- {Validation rule 2}
Produced Events:
- {Event 1} - {When produced}
```

### 4.2 Command Inventory Summary

The complete command inventory of 160+ commands is defined in the Implementation Blueprint Section 7.2. Every command must satisfy:

1. A defined **purpose** statement.
2. Explicit **preconditions** that must be true before execution.
3. Explicit **postconditions** describing state after successful execution.
4. **Validation requirements** that must be satisfied before any state change.
5. The **events produced** on successful execution.

Key command categories:

**S1 Agent:** RegisterAgent, ActivateAgent, DeactivateAgent, ChangeAgentStatus, RecordTaskCompletion
**S2 Network:** CreateReferral, ConvertReferral, JoinTeam, SnapshotPerformance
**S3 Commission:** CalculateCommission, ApproveCommission, PayCommission, HoldCommission, ReleaseCommission, ReverseCommission, ChangeCommissionRate
**S4 Qualification:** VerifySale, ConfirmQualification, ExtendCooling
**S5 Campaign:** CreateCampaign, ActivateCampaign, IssueReward
**S6 Property:** CreateProperty, ApproveProperty, PublishProperty, UpdateProperty, PauseProperty, ResumeProperty, DelistProperty, ArchiveProperty
**S7 Investment:** StartInvestment, AllocateInvestment, OpenRound, CloseRound
**S8 Secondary:** CreateListing, UpdateListing, CancelListing, CreateOffer, AcceptOffer, WithdrawOffer, RejectOffer, HoldEscrow, ReleaseEscrow, CompleteSale, CancelSale
**S9 Payment:** InitiatePayment, ConfirmPayment, FailPayment, ExpirePayment, InitiateRefund, CompleteRefund, ReconcileLedger
**S10 Ownership:** MintOwnership, TransferOwnership, ReclaimOwnership, BurnOwnership, TakeSnapshot
**S12 NFT:** CreateCollection, ArchiveCollection, MintNFT, TransferNFT, FreezeNFT, UnfreezeNFT, BurnNFT, RedeemNFT, ListNFT, DelistNFT, CreateNFTOffer, AcceptNFTOffer, WithdrawNFTOffer, StartAuction, PlaceBid, EndAuction, CompleteNFTSale, BlacklistNFT
**S13 Dividend:** CalculateDividend, ApproveDividend, ScheduleDividend, DistributeDividend, RecoverDividend, RejectDividend, ClaimDividend, IssueTaxDocument
**S14 Reward:** CreditIncentive, PayReward, CreateProgram, ActivateProgram, DeactivateProgram, DistributeLeadershipPool
**S15 Treasury:** DepositTreasury, WithdrawTreasury, RequestMovement, ApproveMovement, ExecuteMovement, RejectMovement, AllocateTreasury, RecordYield, FreezeAccount, CloseAccount
**S16 Reserve:** FundReserve, DrawdownReserve, ReplenishReserve
**S17 Buyback:** CreateBuybackProgram, PauseBuybackProgram, ResumeBuybackProgram, EndBuybackProgram, ExecuteBuyback, CancelBuyback, ExecuteBurn, CancelBurn
**S18 Governance:** CreateProposal, ExecuteProposal, VetoProposal, CastVote, ChangeGovernanceParameter
**S19 Identity:** RegisterIdentity, VerifyIdentity, SuspendIdentity, BanIdentity, LinkWallet, VerifyWallet, FreezeWallet, UnlinkWallet, GrantPermission, RevokePermission
**S20 Compliance:** SubmitKYC, ApproveKYC, RejectKYC, OpenCase, ApproveCase, RejectCase, RaiseFlag, ResolveFlag, GenerateAMLAlert, ReviewAMLAlert
**S21 Security:** CreateIncident, InvestigateIncident, ResolveIncident, LockdownEmergency, LiftLockdown, DetectThreat, MitigateThreat, RotateSecret
**S23 AI:** GenerateRecommendation, AcceptRecommendation, RejectRecommendation, RunDetection, GenerateForecast, DeployModel, ArchiveModel, IndexKnowledge, StoreMemory, ClearMemory
**S24 Document:** UploadDocument, VerifyDocument, RejectDocument, ArchiveDocument, GrantAccess, RevokeAccess
**S25 Admin:** LogAdminAction, PauseSystem, ResumeSystem
**S26 Audit:** RecordAuditTrail, VerifyIntegrity, GenerateReport, ExportReport
**S27 Map:** GeocodeProperty, ComputeGeoRegion, UpdateMapLayer
**S28 Valuation:** RecordValuation
**S29 Notification:** SendNotification, RaiseAlert, ResolveAlert
**S30 System:** RegisterSchema, DeprecateSchema

---

## 5. Query Catalog

### 5.1 Read Model Principles

1. **All read models are projections.** No read model is an authoritative store. Every read model may be cleared and rebuilt from the event log.
2. **Read models never serve as source of truth.** The event log is the single source of truth.
3. **Read models are eventually consistent.** Cross-read-model consistency is achieved through causal dependencies, not synchronous writes.
4. **Read models are permission-scoped.** Every read model query must enforce access controls.
5. **Read models are optimized for read patterns.** They may denormalize, aggregate, and cache for query performance.

### 5.2 Projection Ownership

| Projection | Owner | Primary Key | Source Events | Consistency |
|------------|-------|-------------|---------------|-------------|
| AgentStatusProjection | S1 Agent | agentId | AgentRegistered, AgentActivated, AgentDeactivated, AgentStatusChanged | < 1s lag |
| AgentTeamProjection | S2 Network | agentId | TeamChanged, AgentRegistered | < 5s lag |
| AgentPerformanceProjection | S2 Network | agentId | AgentPerformanceSnapshot | Snapshot-based |
| ReferralProjection | S2 Network | referralId | ReferralCreated, ReferralConverted, ReferralExpired | < 1s lag |
| CommissionProjection | S3 Commission | commissionId | CommissionCalculated, CommissionApproved, CommissionPaid, CommissionReversed | < 1s lag |
| OverrideRouteProjection | S3 Commission | routeId | OverrideRouteChanged | < 1s lag |
| PropertyProjection | S6 Property | propertyId | All Property events | < 1s lag |
| PropertyListProjection | S6 Property | -- | PropertyPublished, PropertyPaused, PropertyDelisted | < 5s lag |
| InvestmentProjection | S7 Investment | investmentId | All Investment events | < 1s lag |
| RoundProjection | S7 Investment | roundId | RoundOpened, RoundClosed | < 1s lag |
| ListingBookProjection | S8 Secondary | propertyId | MarketplaceListingCreated, MarketplaceListingCancelled | < 1s lag |
| OfferBookProjection | S8 Secondary | listingId | OfferCreated, OfferAccepted, OfferWithdrawn, OfferRejected | < 1s lag |
| EscrowProjection | S8 Secondary | escrowId | EscrowHeld, EscrowReleased | < 1s lag |
| PaymentProjection | S9 Payment | paymentId | All Payment events | < 1s lag |
| SettlementLedgerProjection | S9 Payment | -- | SettlementCompleted, RefundCompleted | < 5s lag |
| OwnershipBalanceProjection | S10 Ownership | investorId + propertyId | OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned | < 1s lag |
| OwnershipHistoryProjection | S10 Ownership | investorId | All Ownership events | < 5s lag |
| PortfolioHoldingProjection | S11 Portfolio | investorId | Ownership events, NFT events | < 5s lag |
| PortfolioValueProjection | S11 Portfolio | investorId | ValuationUpdated, SecondaryPriceUpdated, DividendDistributed | < 5s lag |
| NFTCollectionProjection | S12 NFT | collectionId | NFTCreated, NFTMinted, NFTBurned | < 1s lag |
| NFTBalanceProjection | S12 NFT | ownerId | NFTMinted, NFTTransferred, NFTBurned, NFTRedeemed | < 1s lag |
| DividendProjection | S13 Dividend | dividendId | All Dividend events | < 1s lag |
| DividendEligibilityProjection | S13 Dividend | propertyId | OwnershipSnapshotTaken | Snapshot-based |
| RewardProjection | S14 Reward | recipientId | IncentiveCredited, RewardPaid | < 5s lag |
| TreasuryBalanceProjection | S15 Treasury | accountId | TreasuryDeposit, TreasuryWithdrawal, TreasuryAllocated | < 1s lag |
| TreasuryHealthProjection | S15 Treasury | -- | TreasuryBalanced, TreasuryRebalanced, ReserveUpdated | < 5s lag |
| ReserveHealthProjection | S16 Reserve | reserveId | ReserveUpdated, EmergencyReserveUsed | < 5s lag |
| SupplyProjection | S17 Buyback | -- | BuybackExecuted, BurnExecuted, SupplyReductionUpdated | < 1s lag |
| ProposalTallyProjection | S18 Governance | proposalId | VoteCast | < 1s lag |
| VotingPowerProjection | S18 Governance | identityId | OwnershipMinted, OwnershipTransferred, NFTTransferred | < 5s lag |
| ComplianceCaseProjection | S20 Compliance | caseId | ComplianceFlagRaised, ComplianceApproved, ComplianceRejected | < 1s lag |
| KYCStatusProjection | S20 Compliance | identityId | KYCSubmitted, KYCApproved, KYCRejected | < 1s lag |
| RiskScoreProjection | S22 Risk | entityId | RiskScoreChanged | < 5s lag |
| AIRecommendationProjection | S23 AI | recommendationId | AIRecommendationGenerated, AIRecommendationAccepted, AIRecommendationRejected | < 5s lag |
| DocumentIndexProjection | S24 Document | documentId | DocumentUploaded, DocumentVerified, DocumentAccessed | < 1s lag |
| AuditLogProjection | S26 Audit | eventId | All events (mirror) | < 1s lag |
| GeoRegionProjection | S27 Map | regionId | PropertyGeocoded, GeoRegionComputed | < 5s lag |
| ValuationTimeSeriesProjection | S28 Valuation | propertyId + date | ValuationRecorded | < 1s lag |
| PropertyNAVProjection | S28 Valuation | propertyId | ValuationRecorded | < 1s lag |
| AlertProjection | S29 Notification | alertId | AlertRaised, AlertResolved | < 1s lag |
| SchemaRegistryProjection | S30 System | schemaId | SchemaVersionUpdated | < 1s lag |

### 5.3 Consistency Model

| Consistency Level | Definition | Used For |
|-------------------|------------|----------|
| Strong | Read reflects all prior writes | Aggregate state within the same context |
| Eventual (< 1s) | Read reflects writes within 1 second | Most projections with single event source |
| Eventual (< 5s) | Read reflects writes within 5 seconds | Cross-context projections, aggregated data |
| Snapshot-based | Read reflects state at a specific snapshot version | Dividends, governance voting power |
| Stale-read allowed | Read may reflect slightly outdated data | Public listings, map layers, leaderboards |

---

## 6. Event Contracts

### 6.1 Reference to Domain Event Catalog

The complete, authoritative definition of every event is in the **RELCKO Domain Event Catalog v1.0** (196 events across 30 bounded contexts).

This section defines the **event contracts** that govern publication, consumption, versioning, and replay.

### 6.2 Event Envelope Contract

Every event must conform to:

**Required fields:** eventId (UUID v7), type (domain.aggregate.action), aggregateId (UUID), version (positive integer), timestamp (ISO 8601 UTC), producer (authenticated identity), schemaVersion (positive integer), payload (JSON Object per schema)

**Optional fields:** correlationId (UUID), causationId (UUID), traceId (UUID), actorId (UUID), partitionKey (string, defaults to aggregateId), metadata (JSON Object)

### 6.3 Publication Guarantees

| Guarantee | Commitment |
|-----------|------------|
| Durability | Events are persisted to durable storage before acknowledgment |
| Ordering | Events within an aggregate are strictly ordered by version; no gaps |
| At-least-once | Delivery is at-least-once; exactly-once effect is the consumer's responsibility |
| Idempotent publication | Retrying the same event (eventId + aggregateId) does not produce duplicates |
| Schema validation | Events are validated against the schema registry before publication |
| Integrity | Events are cryptographically signed; the event log is a hash chain |

### 6.4 Consumer Expectations

Every consumer must:
1. Be idempotent - processing the same event twice produces identical business effect.
2. Detect duplicates by checking (eventId, aggregateId) before applying.
3. Store processed event IDs durably for the maximum replay window.
4. Set causationId on every secondary event to the triggering event's eventId.
5. Not use wall clock, random numbers, or external API calls during replay.
6. Retry transient failures with backoff; route deterministic failures to DLQ.

### 6.5 Versioning Requirements

| Change Type | Action |
|-------------|--------|
| Backward-compatible (add optional field, extend enum) | Increment schemaVersion; continue publishing |
| Breaking (remove field, change type, rename) | Create new event type; dual-publish for one full release cycle |
| Deprecation | Mark old type deprecated; stop publishing after dual-pub window |
| Removal | Archive old type definition; old events remain replayable |

### 6.6 Replay Expectations

1. Any module may replay any event stream at any time without permission.
2. Replay delivers events in the same order as original publication.
3. Replay does not alter the event log.
4. Replay includes all events (including compensated or superseded).
5. Replay respects the same idempotency guarantees as real-time delivery.
6. Projection rebuild: clear state, replay all events, verify byte-identical result.

---

## 7. Projection Contracts

### 7.1 Projection Contract Template

```
Projection: {Name}
Owner: S{N}
Subscribes To: {Event types}
Key: {Primary key}
Rebuild Strategy: {How the projection is rebuilt}
Failure Handling: {What happens on failure}
Consistency: {Expected lag}
```

### 7.2 Rebuild Strategy (applies to all 45 projections)

1. Clear current projection state (truncate or drop).
2. Determine starting point (origin or latest snapshot).
3. Replay all relevant events in order.
4. Apply each event idempotently.
5. Verify byte-identical state to incrementally-built version.

### 7.3 Failure Handling (applies to all projections)

- Transient failure: Retry with exponential backoff (base 100ms, max 5 retries).
- Deterministic failure: Route event to DLQ; alert operator.
- Rebuild failure: Log error; retain prior state; alert operator; no data loss.

### 7.4 Snapshot Strategy

- Checkpoints after processing N events (configurable, default 1000).
- Snapshots store complete projection state at a given event version.
- Rebuild starts from latest snapshot, then applies remaining events.

### 7.5 Rebuild SLA

| Projection Size | Target Rebuild Time | Snapshot Interval |
|-----------------|-------------------|-------------------|
| < 10,000 records | < 1 minute | 1,000 events |
| 10,000-100,000 records | < 10 minutes | 1,000 events |
| 100,000-1,000,000 records | < 1 hour | 10,000 events |
| > 1,000,000 records | < 4 hours | 10,000 events |

---

## 8. Worker Contracts

### 8.1 Worker Architecture Contract

Every worker must satisfy:
1. **Stateless.** No state between invocations.
2. **Idempotent.** Same event twice = same result.
3. **Horizontally scalable.** Multiple instances process in parallel.
4. **Failure-resilient.** Transient = retry; poison = DLQ.
5. **Monitored.** RED metrics + consumer lag.

### 8.2 Commission Calculation Worker

| Property | Specification |
|----------|--------------|
| Trigger | SettlementCompleted, MarketplaceSaleCompleted |
| Input | Sale event: saleId, propertyId, buyerId, amount, agentReferral |
| Function | Calculate personal + override commissions through team hierarchy |
| Idempotency Key | saleId |
| Partitioning | Partitioned by propertyId |
| Output | CommissionCalculated events |

### 8.3 Commission Payment Worker

| Property | Specification |
|----------|--------------|
| Trigger | CommissionApproved |
| Input | Commission event: commissionId, agentId, amount, currency |
| Function | Initiate treasury movement for commission payout |
| Idempotency Key | commissionId |
| Partitioning | Partitioned by agentId |
| Output | CommissionPaid |

### 8.4 Settlement Worker

| Property | Specification |
|----------|--------------|
| Trigger | PaymentInitiated |
| Input | Payment event: paymentId, method, amount, currency |
| Function | Monitor payment confirmation; advance through PENDING -> SETTLING -> SETTLED |
| Idempotency Key | paymentId |
| Partitioning | Partitioned by paymentId |
| Output | SettlementCompleted, PaymentFailed, PaymentExpired |

### 8.5 Escrow Worker

| Property | Specification |
|----------|--------------|
| Trigger | OfferAccepted |
| Input | Offer event: offerId, listingId, buyerId, sellerId, price |
| Function | Initiate escrow hold; release on settlement or return on cancellation |
| Idempotency Key | offerId |
| Output | EscrowHeld, EscrowReleased |

### 8.6 Notification Dispatch Worker

| Property | Specification |
|----------|--------------|
| Trigger | Any notification event |
| Input | Notification event: recipientId, channel, template, data |
| Function | Route to configured channels; track delivery; retry on failure |
| Idempotency Key | notificationId |
| Partitioning | Partitioned by recipientId |

### 8.7 Treasury Allocation Worker

| Property | Specification |
|----------|--------------|
| Trigger | TreasuryDeposit |
| Input | Treasury deposit event: depositId, amount, source |
| Function | Evaluate allocation rules; distribute funds to domains |
| Idempotency Key | depositId |
| Partitioning | Single (coordination required) |
| Output | TreasuryAllocated, TreasuryFunded |

### 8.8 Treasury Rebalance Worker

| Property | Specification |
|----------|--------------|
| Trigger | Schedule, BuybackExecuted, large TreasuryDeposit |
| Function | Compute current vs target weight deviations; execute rebalancing |
| Idempotency Key | rebalanceId |
| Partitioning | Single (coordination required) |
| Output | TreasuryRebalanced |

### 8.9 Buyback Execution Worker

| Property | Specification |
|----------|--------------|
| Trigger | BuybackProgram trigger (schedule, market condition, governance) |
| Function | Monitor market conditions; execute buyback on DEX/OTC |
| Idempotency Key | buybackId |
| Partitioning | Single (coordination required) |
| Output | BuybackExecuted |

### 8.10 Dividend Calculation Worker

| Property | Specification |
|----------|--------------|
| Trigger | Schedule (per property dividend cycle) |
| Input | Property net income, distribution policy, ownership snapshot |
| Function | Compute dividend pool per policy; determine per-unit amount |
| Idempotency Key | dividendId |
| Partitioning | Partitioned by propertyId |
| Output | DividendCalculated |

### 8.11 Dividend Distribution Worker

| Property | Specification |
|----------|--------------|
| Trigger | DividendScheduled |
| Input | Approved dividend, ownership snapshot, treasury funding |
| Function | Distribute payouts to all eligible holders |
| Idempotency Key | dividendId |
| Partitioning | Partitioned by propertyId |
| Output | DividendDistributed |

### 8.12 Risk Score Worker

| Property | Specification |
|----------|--------------|
| Trigger | Any risk signal event |
| Input | Risk signal: entityId, domain, signal type, signal data |
| Function | Evaluate risk factors across 12 domains; update scores |
| Idempotency Key | entityId + domain + signalId |
| Partitioning | Partitioned by risk domain |
| Output | RiskScoreChanged |

### 8.13 AI Recommendation Worker

| Property | Specification |
|----------|--------------|
| Trigger | AI trigger event, schedule |
| Function | Run AI inference; generate recommendation with explainability |
| Idempotency Key | recommendationId |
| Output | AIRecommendationGenerated |

### 8.14 Replay Worker

| Property | Specification |
|----------|--------------|
| Trigger | Admin request |
| Input | Scope: aggregateId, event type, time range, projection name |
| Function | Clear target; replay events from origin (or latest snapshot) |
| Idempotency Key | replayId |
| Output | Target projection rebuilt |

---

## 9. Integration Contracts

### 9.1 Integration Principles

1. **All integrations use the event bus.** No integration bypasses canonical event flow.
2. **Adapters are stateless.** Adapters translate between RELCKO events and external protocols.
3. **Failures are isolated.** External failure never blocks RELCKO event processing.
4. **Idempotency at boundaries.** External calls are retry-safe with idempotency keys.
5. **Circuit breakers.** Adapters implement circuit breakers to prevent cascading failures.

### 9.2 Wallet Integration

| Property | Specification |
|----------|--------------|
| Purpose | SIWE (EIP-4361) authentication and wallet verification |
| Protocol | SIWE for authentication; JSON-RPC for on-chain verification |
| Adapter Contract | authenticate(message, signature) -> identity; verifyWallet(address) -> verified |
| Security | SIWE signature validation (domain, nonce, message freshness); no address-only login |
| Idempotency | Keyed by nonce; each nonce used at most once |

### 9.3 Blockchain Integration

| Property | Specification |
|----------|--------------|
| Purpose | On-chain token operations, settlement verification, multi-sig |
| Protocol | JSON-RPC via provider nodes |
| Supported Chains | BNB Chain (primary), Ethereum L2s (future) |
| Confirmations | BNB: 15; Ethereum L2: 200 or finality |
| Reorg Handling | Compensating event on reorg beyond confirmation depth |
| Gas Management | Estimation before submission; price oracle; fallback on failure |
| Security | Private keys in HSM; multi-sig for treasury; transaction simulation |
| Idempotency | Keyed by (chainId, nonce) or internal idempotency key |

### 9.4 Marketplace Integration

| Property | Specification |
|----------|--------------|
| Purpose | Ingest listings and sales from external platforms |
| Protocol | Event bus (external adapter translates external events) |
| Adapter Contract | translateExternalEvent(externalPayload) -> RelckoEvent |
| Validation | Schema validation; producer authentication; event type whitelist |

### 9.5 KYC/AML Provider Integration

| Property | Specification |
|----------|--------------|
| Purpose | Identity verification, document verification, sanctions screening |
| Protocol | REST API (outbound), Webhook (inbound) |
| Adapter Contract | submitKYC(identityData, documents) -> requestId; screenAddress(address) -> result |
| Provider Abstraction | Multiple providers via KYCAdapter interface; selection per jurisdiction |
| Data Handling | PII transmitted only to provider; never stored in RELCKO logs |
| Idempotency | Keyed by requestId |

### 9.6 Notification Provider Integration

| Property | Specification |
|----------|--------------|
| Purpose | Multi-channel delivery (email, SMS, push) |
| Protocol | SMTP (email), REST API (SMS, push) |
| Adapter Contract | sendEmail(to, subject, body) -> deliveryId; sendSMS(to, message) -> deliveryId |
| Channel Abstraction | Common NotificationAdapter interface; one per channel |
| Rate Limiting | Per-provider limits respected; queue mechanism for burst handling |

### 9.7 Map Tile Service Integration

| Property | Specification |
|----------|--------------|
| Purpose | Geographic map rendering with tile layers |
| Protocol | HTTP/HTTPS tile protocol (Mapbox/Google Maps) |
| Adapter Contract | getTileUrl(layer, z, x, y) -> url; geocode(address) -> coordinates |
| Caching | Tiles cached with CDN; geocoding cached locally |

### 9.8 AI/LLM Provider Integration

| Property | Specification |
|----------|--------------|
| Purpose | AI inference for recommendations, detection, forecasting |
| Protocol | REST API (provider-specific) |
| Adapter Contract | generateCompletion(prompt, context) -> response; classify(input, categories) -> classification |
| Circuit Breaker | Open on > 10% error rate; fallback to simpler model |
| Data Handling | No PII sent to providers; redaction policy enforced |

### 9.9 PSP Integration

| Property | Specification |
|----------|--------------|
| Purpose | Fiat payment processing (bank transfers, card payments) |
| Protocol | REST API (outbound), Webhook (inbound with signature verification) |
| Adapter Contract | initiatePayment(paymentRequest) -> reference; checkStatus(reference) -> status |
| Idempotency | Keyed by idempotency key on outbound; PSP event ID on webhook |
| Security | Webhook signature verification mandatory; PCI scope handled by PSP |

### 9.10 Object Storage Integration

| Property | Specification |
|----------|--------------|
| Purpose | Secure document storage for legal docs, KYC docs, tax forms, NFT metadata |
| Protocol | S3-compatible API |
| Adapter Contract | upload(content, contentType) -> contentHash, url; getDownloadUrl(contentHash, expiresIn) -> signedUrl |
| Content Addressing | Content stored by SHA-256 hash; no path-based addressing |
| Access Control | Download URLs are signed and time-limited; direct object access blocked |
| Security | Encryption at rest (AES-256); encryption in transit (TLS 1.3) |

---

## 10. Reliability Requirements

### 10.1 Availability Targets

| Component | Target |
|-----------|--------|
| Core platform (investment, payment, ownership) | 99.95% monthly |
| Read projections | 99.9% monthly |
| Event bus | 99.99% monthly |
| Event store | 99.99% monthly |
| Notification delivery | 99.5% monthly |
| AI services | 99.0% monthly |

### 10.2 Durability Requirements

- Event store: 99.9999999% (11 nines) durability - no event loss tolerated.
- Projection databases: Point-in-time recovery with < 1 hour RPO.
- Object store: 99.999999999% durability with cross-region replication.

### 10.3 Recovery Requirements

| Scenario | RPO | RTO |
|----------|-----|-----|
| Single service failure | 0 (no event loss) | < 5 minutes |
| Single AZ failure | 0 (multi-AZ) | < 5 minutes |
| Regional failure | < 1 hour | < 4 hours |
| Data corruption (projection) | 0 (rebuild from events) | < 1 hour |
| Data corruption (event store) | Depends on backup | < 4 hours |
| Full disaster recovery | < 1 hour | < 8 hours |

### 10.4 Reliability Patterns

| Pattern | Application |
|---------|-------------|
| Retry with backoff | All transient failures |
| Circuit breaker | Integration adapters (AI, blockchain, PSP, notifications) |
| Bulkhead | Separate thread pools per bounded context |
| Dead letter queue | All events exhausting retries or poison |
| Health checks | Every service exposes /health endpoint |
| Graceful degradation | AI and map features degrade without affecting core operations |
| Feature flags | New contexts are feature-flagged; activated after staging validation |

---

## 11. Security Requirements

### 11.1 Authentication

| Requirement | Specification |
|-------------|---------------|
| User authentication | SIWE (EIP-4361) mandatory; no email/password login |
| Service authentication | mTLS between services; JWT with service identity claims |
| API authentication | JWT (access token 15 min TTL, refresh token 7 day TTL) |
| Event authentication | Every producer authenticated before publishing (Constitution Article 12) |
| Integration authentication | API keys or OAuth client credentials |

### 11.2 Authorization

| Requirement | Specification |
|-------------|---------------|
| Model | RBAC (Role-Based) + ABAC (Attribute-Based) |
| Enforcement | Server-side only; never client-trusted |
| Permission granularity | Aggregate-level, command-level, field-level |
| Role hierarchy | Roles inherit permissions from parent roles |
| Temporary grants | Auto-expire after configured TTL |
| Multi-sig | Treasury movements require N-of-M approvals (2-of-3 standard, 3-of-5 large) |
| Two-stage gating | No single actor unilaterally moves value |

### 11.3 Data Protection

| Requirement | Specification |
|-------------|---------------|
| Encryption at rest | AES-256-GCM for all databases and object storage |
| Encryption in transit | TLS 1.3 for all communication |
| PII handling | PII encrypted; never logged; access-controlled and audited |
| Secrets management | All secrets in secrets manager; never in code or config |
| Key rotation | Secrets rotated minimum every 90 days |
| Tokenization | Payment card data never touches RELCKO (PSP handles PCI scope) |

### 11.4 Event Security

| Requirement | Specification |
|-------------|---------------|
| Event signing | Every event cryptographically signed by producer |
| Integrity chain | Event log maintains Merkle-style hash chain (Constitution Article 13) |
| Tamper detection | Invalid signature or hash-chain position = security incident; quarantine; alert |
| Producer identity | Per-producer-identity authentication; shared secrets prohibited |
| Consumer authorization | Subscription scoped by event type, aggregate type, instance |


---

## 12. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Command processing (P99) | < 500ms | Command receipt to event published |
| Query/read (P99) | < 200ms | HTTP response time for reads |
| Event ingestion (sustained) | 10,000 events/second | Events written per second |
| Event delivery latency (P99) | < 100ms | Publish to consumer receipt |
| Projection catch-up | 100,000 events/minute | Events applied per minute |
| API response (P99 - reads) | < 200ms | HTTP response time |
| API response (P99 - writes) | < 1s | HTTP response time |
| Concurrent users | 10,000 simultaneous | Active sessions without degradation |

---

## 13. Scaling Targets

| Metric | V1.0 Target | V1.5 Target | V2.0 Target |
|--------|-------------|-------------|-------------|
| Active investors | 10,000 | 50,000 | 250,000 |
| Properties | 100 | 500 | 2,500 |
| Daily transactions | 1,000 | 10,000 | 100,000 |
| Event throughput | 1,000/sec | 5,000/sec | 25,000/sec |
| Commission calculations/day | 5,000 | 25,000 | 125,000 |
| Dividend distributions/cycle | 10,000 | 100,000 | 1,000,000 |
| NFTs minted | 1,000 | 10,000 | 100,000 |
| Governance proposals | 10/month | 50/month | 500/month |

---

## 14. Testing Contracts

### 14.1 Testing Pyramid

| Layer | Coverage | Scope |
|-------|----------|-------|
| Domain Unit Tests | 50% of test effort | Aggregate invariants, services, value objects, state machines |
| Integration Tests | 30% of test effort | Aggregate -> Event -> Projection flow, repository round-trip |
| Contract Tests | 15% of test effort | Cross-context schema conformance, event type compatibility |
| E2E Tests | 5% of test effort | Full-platform business flows across multiple contexts |

### 14.2 Unit Test Contract

- Every aggregate invariant must have at least one test case per invariant.
- Every state machine transition must have a test for valid and invalid transitions.
- Every domain service must have tests with mocked repositories.
- Branch coverage target: 95%+ on domain layer.

### 14.3 Integration Test Contract

- Every aggregate must have at least one integration test per state transition.
- Event publishing must be verifiable: given state, when command, then event published.
- Projection state must be verifiable: after event, projection reflects expected state.
- Idempotent handling must be verified: same event twice produces same state.

### 14.4 Contract Test Contract

- Every event type produced must have a producer contract test validating schema conformance.
- Every event type consumed must have a consumer contract test.
- Schema evolution tests verify backward and forward compatibility.
- Contract tests run in CI on every merge to main.

### 14.5 E2E Test Contract

Every critical business flow must have an E2E test:
- Registration -> KYC -> Investment -> Ownership -> Portfolio
- Agent registration -> Referral -> Sale -> Commission -> Payout
- Property creation -> Approval -> Funding -> Dividend -> Distribution
- Secondary listing -> Offer -> Escrow -> Settlement -> Ownership transfer

### 14.6 Replay Test Contract

- Replaying all events for any aggregate must produce identical state.
- Rebuilding any projection from the event log must produce identical data.
- Loading from snapshot + remaining events must equal full replay.

### 14.7 Performance Test Contract

| Test | Target |
|------|--------|
| Event ingestion | 10,000 events/second sustained |
| Projection catch-up | 100,000 events/minute |
| Command latency | P99 < 500ms |
| API response (reads) | P99 < 200ms |
| Concurrent users | 10,000 simultaneous |

---

## 15. Operational Procedures

### 15.1 Startup Sequence

1. Validate all configuration values (fail fast on invalid config).
2. Connect to event bus and verify connectivity.
3. Register as event producer/consumer with schema registry.
4. Verify schema compatibility with registered schemas.
5. Reconcile consumer offset with event store (catch up if lag detected).
6. Start health check server.
7. Signal readiness to orchestration platform (Kubernetes readiness probe).

### 15.2 Shutdown Sequence

1. Signal unreadiness (stop accepting new requests).
2. Complete in-flight event processing (graceful drain, max 30 seconds).
3. Commit current consumer offset.
4. Disconnect from event bus.
5. Close database connections.
6. Exit.

### 15.3 Deployment Procedure

1. Build and push Docker image to registry.
2. Update deployment manifest with new image tag.
3. Blue-green: deploy new version alongside current; switch traffic after health check.
4. Monitor error rates, latency, and consumer lag during rollout.
5. Auto-rollback on error rate > 1% or health check failure.
6. Post-deploy: verify event flow with synthetic transactions.

### 15.4 Incident Response

1. Alert triggers (error rate, consumer lag, security incident).
2. On-call engineer acknowledges within 5 minutes (critical) or 15 minutes (warning).
3. Assess severity and impact.
4. Apply mitigation (rollback, feature flag disable, emergency pause).
5. Root cause investigation.
6. Post-incident review within 48 hours.


---

## 16. Production Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | All unit tests pass with 95%+ branch coverage on domain layer | CI pipeline |
| 2 | All integration tests pass for the bounded context | CI pipeline |
| 3 | Contract tests pass for all produced and consumed events | CI pipeline |
| 4 | E2E tests pass for all critical business flows | CI pipeline (nightly) |
| 5 | Replay tests verify deterministic rebuild for all projections | CI pipeline (nightly) |
| 6 | Performance benchmarks meet targets (P99 latency, throughput) | Load test result |
| 7 | Security scan passes (container, dependency, secrets) | CI pipeline |
| 8 | Penetration test completed (external auditor) | Before production launch |
| 9 | All secrets stored in secrets manager; none in code or config | Automated scan |
| 10 | All services emit structured logs with correlation IDs | Log inspection |
| 11 | RED metrics configured in Prometheus with Grafana dashboards | Dashboard review |
| 12 | Alert rules configured for critical conditions | Alert configuration review |
| 13 | Runbooks documented for every alert type | Documentation review |
| 14 | Blue-green deployment tested and passing | Deployment drill |
| 15 | Auto-rollback on health check failure tested | Chaos test |
| 16 | Database backup and restore tested | Recovery drill |
| 17 | Disaster recovery plan documented | Plan review |
| 18 | Multi-region failover tested (if applicable) | DR drill |
| 19 | Data retention policy configured and verified | Policy audit |
| 20 | Audit log integrity verified (hash chain) | Integrity check |
| 21 | Capacity planning complete for 6 months of projected growth | Capacity review |

---

## 17. Engineering Checklists

### 17.1 Aggregate Implementation Checklist

- [ ] All invariants are enforced in aggregate methods.
- [ ] State machine transitions are validated before state change.
- [ ] All allowed commands are implemented with pre/postcondition checks.
- [ ] Each command validates input before any state mutation.
- [ ] Events are published after state mutation, not before.
- [ ] Optimistic concurrency control is implemented (version check on save).
- [ ] Idempotency key is generated and validated for each event.
- [ ] Error handling covers validation, authorization, concurrency, and domain errors.
- [ ] Unit tests cover every invariant, state transition, and command path.
- [ ] Integration tests cover each state transition producing correct events.

### 17.2 Event Implementation Checklist

- [ ] Event schema is registered in the schema registry.
- [ ] Event conforms to the canonical envelope format.
- [ ] Event carries correlationId, causationId, and traceId.
- [ ] Event payload contains all data needed for processing (self-contained).
- [ ] No sensitive data (PII, credentials) in event payload.
- [ ] Event version is incremented for schema changes.
- [ ] Backward compatibility maintained per versioning rules.
- [ ] Consumer contract test written for all consumers.

### 17.3 Projection Implementation Checklist

- [ ] Projection handler is idempotent (checks processed event IDs).
- [ ] Projection can be cleared and rebuilt from the event log.
- [ ] Snapshot strategy is configured with appropriate interval.
- [ ] Projection query is indexed for primary access patterns.
- [ ] No N+1 queries in projection rebuild path.
- [ ] Consistency expectations are documented (lag tolerance).
- [ ] Failure handling covers retry, DLQ, and rebuild scenarios.

### 17.4 Worker Implementation Checklist

- [ ] Worker is stateless (no in-memory state between events).
- [ ] Worker is idempotent (duplicate detection before processing).
- [ ] Idempotency key is unique and persistent.
- [ ] Retry with exponential backoff is implemented.
- [ ] Poison events route to DLQ after max retries.
- [ ] RED metrics are exported (Rate, Errors, Duration).
- [ ] Consumer lag is tracked and alertable.
- [ ] Worker can be horizontally scaled (partition-aware).

### 17.5 Integration Adapter Checklist

- [ ] Circuit breaker is implemented (threshold, half-open, cooldown).
- [ ] Idempotency key is used for all external mutation calls.
- [ ] Timeout is configured and enforced.
- [ ] Fallback strategy is defined (cached data, degraded response, error).
- [ ] Retry with exponential backoff and jitter is implemented.
- [ ] External call failures never block RELCKO event processing.
- [ ] Secrets (API keys, tokens) are fetched from secrets manager.
- [ ] Provider-specific rate limits are respected.

---

## 18. ADR Reference Matrix

| ADR | Title | Decision | Date |
|-----|-------|----------|------|
| ADR-001 | Event-Driven Architecture | All cross-module communication via event bus; no direct service calls | V1.0 |
| ADR-002 | Event Sourcing as Default | Aggregate state stored as event stream; relational only where event sourcing adds no value | V1.0 |
| ADR-003 | Single Sponsor for Life | Referral link is permanent; cannot be changed except by admin intervention | V1.0 |
| ADR-004 | Multi-Sig Treasury | All treasury movements require N-of-M approvals; no single-actor value movement | V1.0 |
| ADR-005 | Schema Registry Authority | Every event type registered before publication; breaking changes require new type | V1.0 |
| ADR-006 | At-Least-Once Delivery | Event bus delivers at-least-once; exactly-once effect is consumer's responsibility | V1.0 |
| ADR-007 | Deterministic Replay | Event handlers must not use wall clock, random, or external calls during replay | V1.0 |
| ADR-008 | Immutability by Constitution | Events are immutable; correction is compensating events, never mutation | V1.0 |
| ADR-009 | Human-in-the-Loop for KYC | KYC approval requires human decision; AI advisory only | V1.0 |
| ADR-010 | Blockchain as Pluggable Adapter | Blockchain integration via ChainAdapter interface; chain-specific logic abstracted | V1.0 |
| ADR-011 | Monorepo with Turborepo | All bounded contexts in single monorepo; shared build and test infrastructure | V1.0 |
| ADR-012 | Read Models as Rebuildable Projections | All read models derived from events; never authoritative; always rebuildable | V1.0 |

---

## 19. Glossary

| Term | Definition |
|------|------------|
| Aggregate | A cluster of domain objects treated as a single unit, with an aggregate root enforcing invariants |
| Bounded Context | A logical boundary within which a particular domain model applies |
| CausationId | Event field linking an event to the immediate parent event that caused it |
| Command | An instruction to perform an operation, validated before execution |
| Compensating Event | An event that corrects a previously published incorrect event |
| CorrelationId | Event field linking all events in a business operation |
| Dead Letter Queue (DLQ) | A queue for events that cannot be processed after exhausting retries |
| Domain Event | A record of a state change that occurred in the domain |
| Event Bus | The infrastructure for publishing and subscribing to events |
| Event Sourcing | Storing state as a sequence of events rather than current state |
| Event Store | The durable, append-only storage for the event log |
| Idempotency | The property that processing the same event multiple times produces the same result |
| Invariant | A condition that must always be true for an aggregate |
| Multi-Sig | Multi-signature authorization requiring multiple approvals |
| Projection | A read model derived from events, rebuildable from the event log |
| Replay | Re-processing events to reconstruct state |
| SIWE | Sign-In with Ethereum (EIP-4361) - authentication standard |
| Snapshot | A materialized state at a given event version for accelerating replay |
| SPV | Special Purpose Vehicle - legal entity holding a property |

---

## 20. Appendices

### Appendix A: Bounded Context Index

| ID | Name | Package | Aggregates |
|----|------|---------|------------|
| S1 | Agent | bc-agent | Agent, AgentStatus |
| S2 | Network | bc-network | Referral, AgentTeam, AgentPerformance |
| S3 | Commission | bc-commission | Commission, CommissionBatch, CommissionRate, OverrideRoute |
| S4 | Qualification | bc-qualification | QualifyingSale, QualifyingCriteria |
| S5 | Campaign | bc-campaign | Campaign, CampaignReward |
| S6 | Property | bc-property | Property, PropertyFraction, SPV |
| S7 | Primary Investment | bc-investment | Investment, Reservation, Round |
| S8 | Secondary Market | bc-secondary-market | MarketplaceListing, Offer, Escrow, MarketplaceSale |
| S9 | Payment and Settlement | bc-payment | Payment, Refund, SettlementLedger |
| S10 | Ownership | bc-ownership | OwnershipEvent, OwnershipSnapshot |
| S11 | Portfolio | bc-portfolio | PortfolioHolding, PortfolioAlert |
| S12 | NFT | bc-nft | NFTCollection, NFTAsset, NFTListing, NFTOffer, NFTAuction, NFTSale, RoyaltyPayment, NFTBlacklist |
| S13 | Dividend | bc-dividend | Dividend, DividendPayment, TaxDocument |
| S14 | Reward | bc-reward | Reward, IncentiveProgram, LeadershipPool |
| S15 | Treasury | bc-treasury | TreasuryAccount, TreasuryMovement, TreasuryAllocation, TreasuryYield |
| S16 | Reserve | bc-reserve | ReserveFund |
| S17 | Buyback and Burn | bc-buyback | BuybackProgram, BuybackExecution, BurnExecution, TokenSupply |
| S18 | Governance | bc-governance | Proposal, Vote, VotingPower, GovParameter |
| S19 | Identity and Wallet | bc-identity | Identity, Wallet, Permission |
| S20 | Compliance | bc-compliance | KYC, ComplianceCase, ComplianceFlag, AMLAlert |
| S21 | Security | bc-security | Incident, EmergencyState, Threat, Secret |
| S22 | Risk | bc-risk | RiskScore |
| S23 | AI | bc-ai | AIRecommendation, AIDetection, AIForecast, AIModel, KnowledgeIndex, AIMemory |
| S24 | Document | bc-document | Document, AccessGrant |
| S25 | Administration | bc-admin | AdminLog, SystemState |
| S26 | Audit | bc-audit | AuditLog, AuditReport |
| S27 | Map | bc-map | GeoProperty, GeoRegion, MapLayer |
| S28 | Valuation | bc-valuation | ValuationRecord |
| S29 | Notification | bc-notification | Notification, Alert |
| S30 | System | bc-system | SchemaRegistry |

### Appendix B: Event Count by Context

| Context | Core Events | Business Events | Security Events | Derived Events | Total |
|---------|-------------|----------------|-----------------|----------------|-------|
| S1 Agent | 4 | 4 | 0 | 1 | 9 |
| S2 Network | 4 | 1 | 0 | 1 | 6 |
| S3 Commission | 8 | 8 | 0 | 1 | 17 |
| S4 Qualification | 1 | 3 | 0 | 0 | 4 |
| S5 Campaign | 1 | 3 | 0 | 0 | 4 |
| S6 Property | 11 | 0 | 0 | 0 | 11 |
| S7 Investment | 5 | 2 | 0 | 0 | 7 |
| S8 Secondary | 5 | 1 | 0 | 1 | 7 |
| S9 Payment | 5 | 1 | 0 | 1 | 7 |
| S10 Ownership | 4 | 0 | 0 | 1 | 5 |
| S11 Portfolio | 3 | 0 | 0 | 1 | 4 |
| S12 NFT | 11 | 9 | 0 | 2 | 22 |
| S13 Dividend | 6 | 0 | 0 | 2 | 8 |
| S14 Reward | 3 | 2 | 0 | 0 | 5 |
| S15 Treasury | 7 | 0 | 0 | 1 | 8 |
| S16 Reserve | 2 | 0 | 1 | 0 | 3 |
| S17 Buyback | 4 | 4 | 0 | 1 | 9 |
| S18 Governance | 4 | 1 | 0 | 0 | 5 |
| S19 Identity | 2 | 4 | 0 | 0 | 6 |
| S20 Compliance | 5 | 2 | 0 | 0 | 7 |
| S21 Security | 2 | 3 | 2 | 0 | 7 |
| S22 Risk | 1 | 0 | 0 | 0 | 1 |
| S23 AI | 4 | 2 | 0 | 2 | 8 |
| S24 Document | 2 | 0 | 0 | 1 | 3 |
| S25 Admin | 2 | 0 | 0 | 0 | 2 |
| S26 Audit | 2 | 0 | 0 | 1 | 3 |
| S27 Map | 2 | 0 | 0 | 1 | 3 |
| S28 Valuation | 1 | 0 | 0 | 0 | 1 |
| S29 Notification | 2 | 0 | 0 | 0 | 2 |
| S30 System | 1 | 0 | 0 | 0 | 1 |

### Appendix C: Key Event Types by Retention Classification

**Permanent Events (never deleted):**
AgentRegistered, CommissionPaid, PropertyCreated, InvestmentAllocated, MarketplaceSaleCompleted, OwnershipMinted, NFTMinted, NFTSold, DividendDistributed, DividendApproved, TreasuryDeposit, TreasuryWithdrawal, TreasuryMovementApproved, BuybackExecuted, BurnExecuted, GovernanceProposalCreated, VoteCast, ProposalExecuted, KYCApproved, KYCRejected, IdentityVerified, WalletVerified, IncidentCreated, EmergencyLockdown, AuditTrailRecorded, SchemaVersionUpdated

**Standard Retention (90 days hot, 365 days warm, 3 years cold):**
AgentEnteredGracePeriod, CampaignUpdated, LeaderboardUpdated, PortfolioAlertTriggered, ReserveUpdated, AIForecastGenerated, KnowledgeIndexed, NotificationSent, MapLayerUpdated

---

> **This specification is binding on all implementation work.** Every aggregate, service, worker, projection, command, and integration must conform to the contracts defined herein. Deviations require documented rationale and architecture review board approval.
