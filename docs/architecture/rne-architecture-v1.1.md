# RELCKO Network Engine (RNE)
## Architecture Specification v1.1

**Status:** Frozen — Implementation Baseline  
**Classification:** Internal — Architecture Decision Record  
**Authors:** Chief Systems Architect  
**Date:** July 2026  
**Version:** 1.1  
**Supersedes:** v1.0  
**Constitutional Compliance Audit:** docs/audit/constitutional-compliance-audit-v1.0.md  

---

## Table of Contents

1. [Vision](#1-vision)
2. [Design Principles](#2-design-principles)
3. [Bounded Contexts](#3-bounded-contexts)
4. [Complete Domain Model](#4-complete-domain-model)
5. [State Machines](#5-state-machines)
6. [Commission Constitution](#6-commission-constitution)
7. [Rank Constitution](#7-rank-constitution)
8. [Event Constitution](#8-event-constitution)
9. [Security Model](#9-security-model)
10. [Scalability](#10-scalability)
11. [Integration](#11-integration)
12. [Testing Strategy](#12-testing-strategy)
13. [Architecture Decision Records](#13-architecture-decision-records)
14. [Architecture Freeze](#14-architecture-freeze)

---

## 1. Vision

### Purpose

The RELCKO Network Engine (RNE) is the deterministic business logic layer that governs agent relationships, sponsorship hierarchies, customer ownership, commission calculations, rank progression, and reward distribution. It is the brain of the RELCKO partner channel.

RNE transforms a flat customer acquisition model into a structured, auditable, incentive-driven partner network. Every commission dollar, every rank promotion, every customer assignment is computed deterministically from immutable facts. There is no ambiguity. There is no operator discretion. The rules are the code, and the code is the constitution.

### Goals

1. **Determinism** — Given identical input state, every computation produces identical output across any number of runs, any time zone, any deployment.
2. **Auditability** — Every commission, rank change, and customer assignment leaves an immutable trail. Any historical computation can be reproduced from the event log.
3. **Scalability** — Support millions of agents, tens of millions of customers, and billions of commission events without degradation.
4. **Extensibility** — New commission types, rank structures, reward programs, and campaign mechanics can be added without modifying core engine logic.
5. **Transparency** — Agents can see exactly why they earned (or did not earn) every commission dollar. No black boxes.
6. **Business Continuity** — Customer ownership survives agent inactivity, rank changes, and restructuring. Customer relationships are permanent.

### Non-Goals

1. **Payment execution** — RNE computes commissions. It does not disburse them. The Financial Core handles settlement and payout.
2. **Customer-facing UI** — RNE provides data. Customer portals are separate concerns.
3. **Real-time guarantees** — RNE is an eventually consistent computation engine. Propagation latency is bounded (seconds, not milliseconds) but not real-time.
4. **Fraud detection** — RNE assumes good-faith transactions. Anomaly detection is a separate system.
5. **Multi-currency** — All commission amounts are denominated in the system base currency. Currency conversion is a platform concern, not an RNE concern.
6. **Tax computation** — RNE computes gross commissions. Tax withholding and reporting are separate subsystems.
7. **Agent-facing UI** — RNE provides APIs and event streams. Agent dashboards are consumer applications.

---

## 2. Design Principles

### 2.1 Determinism

The engine must produce identical results for identical inputs regardless of execution context. This means:

- **No floating-point arithmetic.** All monetary calculations use integer (cents) representation.
- **No dependence on wall-clock time** for commission logic. Time-windowed computations use the event timestamp, not `now()`.
- **Deterministic ordering.** When order matters (e.g., which of two simultaneous sales counts toward a rank), the order is determined by a stable sort on (event timestamp, event ID).
- **Pure functions.** Commission calculations are pure functions of the event stream. No side effects during computation.
- **Reproducible snapshots.** Any past state can be reconstructed from the event store.

### 2.2 Auditability

Every state change is recorded as an immutable event. The event log is the source of truth. The current state is a derived projection.

- **Append-only event store.** Events are written once and never modified.
- **Snapshot isolation.** Periodic snapshots enable efficient reconstruction without replaying the full event log.
- **Every computation leaves a trace.** Commission runs produce a commission event for every line item, linked to the input events that produced it.
- **Administrative actions are events.** Transfers, adjustments, overrides are all recorded events with actor identity and reason.

### 2.3 Scalability

The architecture scales horizontally across event partitions.

- **Event partitioning by agent ID.** All events for an agent subtree are co-located.
- **Read models.** The commission computation reads from materialized views, not the operational database.
- **CQRS.** Command and query models are separated. The commission engine writes events; the read side projects current balances, ranks, and genealogy trees.
- **Asynchronous propagation.** Events are written synchronously to the event store. Projections update asynchronously.

### 2.4 Event-Driven

All domain state changes are expressed as events.

- **Event sourcing.** The current state is the sum of all past events.
- **Eventual consistency.** Projections are eventually consistent with the event store.
- **Idempotent consumers.** Event processors are idempotent. Replaying an event produces the same result.
- **At-least-once delivery.** Event consumers handle duplicates.

### 2.5 Immutable History

Once recorded, history never changes.

- **No updates to events.** Corrections are new events.
- **Retroactive adjustments are new events.** A commission correction is a new commission-adjustment event with its own audit trail.
- **Customer ownership is absolute.** Once assigned, a customer belongs to the agent who first sponsored them. Only an explicit administrative transfer event can change ownership.

### 2.6 Security First

Every operation is authenticated and authorized.

- **Service-to-service authentication.** Internal services use mutual TLS or HMAC-signed tokens.
- **Administrative operations require elevated authorization.** Customer transfers, rank overrides, and commission adjustments require two-person approval.
- **Audit log is append-only.** Even administrators cannot delete or modify audit events.

### 2.7 No Hidden Business Rules

Every business rule is explicit in the codebase and documented.

- **No magic numbers.** Commission rates, rank thresholds, and qualification periods are configurable parameters with sensible defaults.
- **Rules are testable.** Every business rule has a corresponding test that documents the expected behavior.
- **Rules are discoverable.** The commission constitution is machine-readable and human-readable.

---

## 3. Bounded Contexts

### 3.1 Agent Context

**Responsibility:** Agent identity, lifecycle, profile, status, and qualifications.

**Key concepts:** Agent, AgentProfile, AgentStatus, Qualification.

**Events produced:** AgentRegistered, AgentActivated, AgentEnteredGrace, AgentDeactivated, AgentReactivated, AgentQualificationChanged.

**Boundaries:** The Agent context owns agent identity and status. It does not own the sponsor tree or commission calculations.

### 3.2 Customer Context

**Responsibility:** Customer identity, lifecycle, and ownership.

**Key concepts:** Customer, CustomerOwnership, CustomerStatus.

**Events produced:** CustomerRegistered, CustomerOwnershipAssigned, CustomerOwnershipTransferred, CustomerOwnershipVerified, CustomerMerged.

**Boundaries:** Customer ownership is absolute and permanent. The Customer context records who owns each customer. It does not compute what the owner earns.

### 3.3 Network Context

**Responsibility:** The sponsor tree, genealogy, hierarchy traversal, and compression.

**Key concepts:** SponsorEdge, TreePath, AncestorIndex, CompressedAncestor.

**Events produced:** SponsorLinkCreated, SponsorLinkBroken, TreeRestructured.

**Boundaries:** The Network context maintains the graph structure. It does not compute commissions or ranks, but it provides the traversal functions that the Commission and Rank contexts consume.

### 3.4 Commission Context

**Responsibility:** Commission computation, compression, vesting, payout scheduling, refund adjustment, late settlement.

**Key concepts:** CommissionRun, CommissionLine, CommissionType, CompressionResult, CommissionRefundAdjustment, LateSettlementQueue.

**Events produced:** CommissionComputed, CommissionAdjusted, CommissionVoided, CommissionRunCompleted, CommissionRefundAdjusted, CommissionUnclaimedRecorded.

**Boundaries:** The Commission context computes how much each agent earns. It does not disburse funds. It produces commission events that feed the Financial Core payout engine.

### 3.5 Rank Context

**Responsibility:** Rank definitions, promotion/demotion logic, qualification windows, historical rank tracking, rank protection.

**Key concepts:** RankDefinition, RankAssignment, QualificationPeriod, RankVolume, RankProtection.

**Events produced:** RankPromoted, RankDemoted, RankQualificationMet, RankQualificationMissed.

**Boundaries:** The Rank context computes rank assignments. It does not compute commission rates (those are in the Commission context), but rank values influence commission calculations through configurable rate tables.

### 3.6 Reward Context

**Responsibility:** One-time and recurring rewards, bonus programs, reward schedules.

**Key concepts:** RewardDefinition, RewardAward, RewardClaim, RewardSchedule.

**Events produced:** RewardAwarded, RewardClaimed, RewardExpired, RewardProgramActivated.

**Boundaries:** Rewards are separate from commissions. They may have different qualification criteria, vesting schedules, and payout mechanisms.

### 3.7 Campaign Context

**Responsibility:** Time-limited promotional campaigns, contest tracking, leaderboards.

**Key concepts:** Campaign, CampaignQualification, CampaignRanking, CampaignPrize.

**Events produced:** CampaignCreated, CampaignStarted, CampaignEnded, CampaignQualificationMet, CampaignPrizeAwarded.

**Boundaries:** Campaigns operate on top of the base commission and rank engines. They do not modify base commission rules; they add temporary modifiers.

### 3.8 Events Context

**Responsibility:** Event store, event publishing, subscription management, replay, retention.

**Key concepts:** EventStore, EventStream, EventSubscription, EventReplay.

**Events produced:** (System events — EventStored, EventReplayed, SubscriptionCreated.)

**Boundaries:** The Events context is the nervous system. Every other context produces events through it. It does not interpret events; it stores and delivers them.

### 3.9 Audit Context

**Responsibility:** Immutable audit log, administrative action recording, compliance reporting.

**Key concepts:** AuditEntry, AuditActor, AuditAction, AuditResource.

**Events produced:** AuditRecorded.

**Boundaries:** The Audit context records everything. It is append-only. It does not authorize actions; it records them after authorization.

---

## 4. Complete Domain Model

### 4.1 Agent

```
Agent {
  id: AgentId (UUID)
  profile: AgentProfile
  status: AgentStatus [PENDING, ACTIVE, GRACE, INACTIVE, SUSPENDED, TERMINATED]
  sponsorId: AgentId | null
  activationDate: DateTime | null
  lastQualifiedSale: DateTime | null
  activeUntil: DateTime | null
  gracePeriodStart: DateTime | null
  activityWindow: Duration (configurable)
  gracePeriodDuration: Duration (configurable, default 30 days)
  createdAt: DateTime
  updatedAt: DateTime  // monotonically increasing version
}
```

**Invariants:**
- An agent cannot be its own sponsor.
- ActivationDate is set when the first qualified sale is recorded.
- ActiveUntil = LastQualifiedSale + ActivityWindow.
- When ActiveUntil < current time, status transitions to GRACE.
- GRACE duration is 30 calendar days (configurable).
- When gracePeriodStart + gracePeriodDuration < current time, status transitions to INACTIVE.
- An INACTIVE agent may be reactivated by a new qualified sale.
- A TERMINATED agent cannot be reactivated except by administrative override.
- SUSPENDED agents maintain their sponsor tree position but do not earn commissions during suspension.

### 4.2 AgentProfile

```
AgentProfile {
  id: AgentId
  displayName: String
  email: String
  phone: String | null
  taxId: String | null (encrypted)
  payoutPreferences: PayoutPreference
  rank: RankId
  currentCommissionRate: RateTable
}
```

**Invariants:**
- TaxId is stored encrypted at rest.
- PayoutPreference defines how commissions are disbursed (linked to Financial Core payment method).
- CurrentCommissionRate is derived from rank + rank-specific rate table.

### 4.3 Customer

```
Customer {
  id: CustomerId (UUID)
  profile: CustomerProfile
  status: CustomerStatus [ACTIVE, INACTIVE, CHURNED]
  owningAgentId: AgentId
  ownershipVerified: Boolean
  ownershipVerifiedAt: DateTime | null
  createdAt: DateTime
}
```

**Invariants:**
- Every customer has exactly one owning agent.
- Customer ownership is permanent. It does not change due to agent inactivity, rank change, or termination.
- Customer ownership only changes via explicit administrative transfer event.
- OwnershipVerified becomes true when the first qualified property sale is completed for this customer.
- A customer with no verified sales is considered "prospect" status and ownership may be reassigned.

### 4.4 SponsorEdge

```
SponsorEdge {
  id: EdgeId (UUID)
  sponsorId: AgentId
  agentId: AgentId (unique)
  depth: Integer (>= 1)
  active: Boolean
  createdAt: DateTime
}
```

**Invariants:**
- The sponsor tree is a directed acyclic graph (DAG) with a single root.
- Depth is the number of edges from the root to this agent.
- A sponsor relationship is unique per agent (one sponsor per agent).
- The root sponsor has no sponsor.

### 4.5 TreePath

```
TreePath {
  id: PathId (UUID)
  ancestorId: AgentId
  descendantId: AgentId
  depth: Integer
  compressedDepth: Integer | null  // depth skipping inactive agents
}
```

**Invariants:**
- Every ancestor-descendant pair has exactly one TreePath entry.
- Depth = number of edges between ancestor and descendant.
- CompressedDepth = number of edges skipping inactive agents in the path.
- TreePath is the primary data structure for commission override computation.
- When an agent becomes inactive, compressed paths are rebuilt to skip that agent.

### 4.6 CommissionRun

```
CommissionRun {
  id: RunId (UUID)
  runType: CommissionRunType [AUTOMATIC, MANUAL, RETROACTIVE]
  periodStart: DateTime
  periodEnd: DateTime
  status: RunStatus [PENDING, PROCESSING, COMPLETED, FAILED]
  lineCount: Integer
  totalAmount: Integer (cents)
  completedAt: DateTime | null
  error: String | null
}
```

**Invariants:**
- Commission runs are idempotent. Re-running the same period produces identical results.
- A commission run processes all qualifying transactions within the period, including late-settled transactions from the LateSettlementQueue.
- Partial runs are not persisted. Failure causes the entire run to be retried.

### 4.7 CommissionLine

```
CommissionLine {
  id: LineId (UUID)
  runId: RunId
  agentId: AgentId
  commissionType: CommissionType [DIRECT, OVERRIDE, BONUS, CAMPAIGN, REWARD, SPECIAL_INCENTIVE]
  sourceTransactionId: TransactionId
  sourceCustomerId: CustomerId
  amount: Integer (cents)
  rate: Integer (basis points)
  rankAtTime: RankId
  compressionApplied: Boolean
  originalRecipientId: AgentId | null  // who would have received without compression
  overrideChain: OverrideChainEntry[] | null  // full override chain for this line
  createdAt: DateTime
}

OverrideChainEntry {
  agentId: AgentId
  rank: RankId
  rate: Integer (basis points)
  amount: Integer (cents)
}
```

**Invariants:**
- Every commission line is traceable to a specific source transaction.
- Amount = floor(transaction.amount * rate / 10000).
- RankAtTime captures the agent's rank when the commission was computed (not current rank).
- CompressionApplied=true indicates the commission was received via compression (the original recipient was inactive).
- OriginalRecipientId is null for direct commissions and non-null for compressed overrides.
- OverrideChain records every upstream agent in the override chain with their rank, rate, and amount at the time of computation.
- OverrideChain is null for direct commissions.

### 4.8 RankDefinition

```
RankDefinition {
  id: RankId (UUID)
  name: String
  level: Integer (1 = lowest)
  qualificationPeriod: Duration
  requirements: RankRequirement[]
  retentionRequirements: RankRequirement[]
  overrideRates: OverrideRateTable
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Invariants:**
- Ranks form a strict hierarchy. Level is unique and monotonically increasing.
- Higher level = higher override rates.
- A rank cannot be deleted if agents currently hold it.
- Rank requirements must be deterministic.

### 4.9 RankRequirement

```
RankRequirement {
  id: RequirementId (UUID)
  rankId: RankId
  metric: RankMetric [PERSONAL_VOLUME, GROUP_VOLUME, ACTIVE_AGENTS, CUSTOMER_COUNT, QUALIFIED_CUSTOMERS]
  operator: ComparisonOperator [GTE, LTE]
  value: Integer
  periodType: PeriodType [ROLLING_30, ROLLING_90, ROLLING_365, CALENDAR_MONTH, CALENDAR_QUARTER]
}
```

### 4.10 QualificationWindow

```
QualificationWindow {
  id: WindowId (UUID)
  agentId: AgentId
  windowType: WindowType [ACTIVITY, RANK, COMMISSION, REWARD, CAMPAIGN]
  windowStart: DateTime
  windowEnd: DateTime
  requirements: Map<String, Integer>  // accumulated values
  status: WindowStatus [OPEN, QUALIFIED, MISSED, CLOSED]
}
```

### 4.11 RewardDefinition

```
RewardDefinition {
  id: RewardId (UUID)
  name: String
  rewardType: RewardType [ONE_TIME, RECURRING, MILESTONE, CONTEST]
  amount: Integer (cents)
  currency: String
  qualificationCriteria: RewardCriteria
  vestingSchedule: VestingSchedule | null
  maxAwards: Integer | null
  active: Boolean
}
```

### 4.12 Campaign

```
Campaign {
  id: CampaignId (UUID)
  name: String
  campaignType: CampaignType [VOLUME_CONTEST, RECRUITING_CONTEST, HYBRID]
  startDate: DateTime
  endDate: DateTime
  qualificationRules: CampaignQualification
  prizeStructure: PrizeStructure[]
  status: CampaignStatus [DRAFT, SCHEDULED, ACTIVE, ENDED, CANCELLED]
}
```

### 4.13 AuditEntry

```
AuditEntry {
  id: AuditId (UUID)
  timestamp: DateTime
  actorId: String
  actorType: AuditActorType [AGENT, ADMIN, SYSTEM, INTEGRATION]
  action: AuditAction
  resourceType: String  // e.g., "Commission", "Customer", "Agent"
  resourceId: String
  previousState: JSON | null
  newState: JSON | null
  reason: String | null
  metadata: JSON | null
  immutable: Boolean (always true)
}
```

### 4.14 CommissionRefundAdjustment

```
CommissionRefundAdjustment {
  id: AdjustmentId (UUID)
  originalLineId: LineId
  refundTransactionId: TransactionId
  refundAmount: Integer (cents)
  reversalAmount: Integer (cents)
  rate: Integer (basis points)
  agentId: AgentId
  createdAt: DateTime
}
```

**Invariants:**
- ReversalAmount = floor(refundAmount * rate / 10000).
- Every refund adjustment is linked to the original CommissionLine it reverses.
- Original CommissionLine remains unchanged (immutable history).

### 4.15 LateSettlementQueue

```
LateSettlementQueue {
  id: QueueId (UUID)
  transactionId: TransactionId
  transactionAmount: Integer (cents)
  transactionDate: DateTime
  settlementDate: DateTime
  customerId: CustomerId
  owningAgentId: AgentId
  agentRankAtTransactionTime: RankId
  processed: Boolean
  processedInRunId: RunId | null
  createdAt: DateTime
}
```

**Invariants:**
- A transaction enters the LateSettlementQueue when it settles after the commission run for its period has completed.
- The queue is processed at the start of the next commission run.
- Commission is computed using the agent's rank at original transaction time, not at settlement time.
- Once processed, `processed` is set to true and `processedInRunId` is recorded.

### 4.16 Core Invariants Summary

| Invariant | Enforcement | Violation Consequence |
|---|---|---|
| Customer ownership is permanent | Ownership transfer requires admin event with valid transferReason | System integrity failure |
| Agents cannot self-sponsor | Unique constraint on sponsorEdge.agentId | Rejected at write |
| Commission amounts are integers | Domain type enforces integer | Compile-time error |
| Commission lines traceable to source transaction | CommissionLine.sourceTransactionId required | Orphan commission detected at audit |
| Rank levels are unique | Unique constraint on RankDefinition.level | Model validation error |
| Event store is append-only | Storage layer enforces append semantics | Audit failure |
| Every state change has an audit entry | Transactional write: state change + audit | Rollback |
| ActiveUntil = LastQualifiedSale + ActivityWindow | Computed on qualification change | Stale status |
| Compressed override records original recipient | CommissionLine.originalRecipientId required for compressed lines | Audit failure |
| Override chain records every upstream level | CommissionLine.overrideChain required for override lines | Audit failure |
| Snapshot is immutable | Snapshot created once, never modified | Detection alert |
| Customer transfer requires valid transferReason | Validation on CustomerOwnershipTransferred event | Rejected at write |
| Grace period is 30 calendar days | Computed on status transition | Stale status |
| Rank protection period is one full qualification period | protectedUntil on RankAssignment | Premature demotion |

---

## 5. State Machines

### 5.1 Agent State Machine

```
                              ┌─────────────────────────────────────────────┐
                              │                                             │
                              v                                             │
   [PENDING] ──> [ACTIVE] ──> [GRACE] ──> [INACTIVE] ──> [ACTIVE] ─────────┘
       │            │            │             │
       │            │            v             v
       │            └────> [SUSPENDED] ──> [TERMINATED]
       │                         │
       └─────────────────────────┘
```

**Transitions:**

| From | To | Trigger | Authorization |
|---|---|---|---|
| PENDING | ACTIVE | First qualified sale | System |
| ACTIVE | GRACE | ActiveUntil < now | System (scheduled job) |
| GRACE | ACTIVE | New qualified sale | System |
| GRACE | INACTIVE | Grace period expired (gracePeriodStart + 30 days < now) | System (scheduled job) |
| INACTIVE | ACTIVE | New qualified sale | System |
| ACTIVE | SUSPENDED | Admin action | Admin (2-person) |
| GRACE | SUSPENDED | Admin action | Admin (2-person) |
| SUSPENDED | ACTIVE | Admin action | Admin |
| SUSPENDED | TERMINATED | Admin action | Admin (2-person) |
| PENDING | TERMINATED | Admin action | Admin (2-person) |
| INACTIVE | TERMINATED | Admin action | Admin (2-person) |

**Guards:**
- PENDING→ACTIVE requires a verified qualified sale with settlement status `ledger_posted`.
- ACTIVE→GRACE is detected by periodic job scanning `activeUntil < now()`.
- GRACE→INACTIVE is detected by periodic job scanning `gracePeriodStart + gracePeriodDuration < now()`.
- GRACE→ACTIVE requires a new qualified sale during the grace period.
- TERMINATED is a terminal state. No further transitions.

### 5.2 Customer State Machine

```
  [PROSPECT] ──> [ACTIVE] ──> [INACTIVE] ──> [CHURNED]
      │                            │
      └────────────────────────────┘
```

**Transitions:**

| From | To | Trigger | Authorization |
|---|---|---|---|
| PROSPECT | ACTIVE | First qualified property sale | System |
| ACTIVE | INACTIVE | No activity in configurable period | System (scheduled job) |
| INACTIVE | ACTIVE | New qualified property sale | System |
| ACTIVE | CHURNED | Administrative action | Admin (2-person) |
| INACTIVE | CHURNED | Administrative action | Admin (2-person) |
| PROSPECT | ACTIVE | Ownership transfer to new agent | Admin |

**Customer ownership permanence:**
- Customer→Agent ownership is set on first contact (prospect registration).
- Ownership NEVER changes due to agent inactivity, rank change, or termination.
- Ownership may only change via explicit `CustomerOwnershipTransferred` event with admin authorization and a valid transferReason.
- Ownership transfer records both previous and new agent.

### 5.3 Qualification State Machine

```
  [OPEN] ──> [QUALIFIED]
     │           │
     │           v
     └───> [MISSED]
     │
     v
  [CLOSED]
```

**Transitions:**

| From | To | Trigger |
|---|---|---|
| OPEN | QUALIFIED | All requirements met within window |
| OPEN | MISSED | Window end without meeting requirements |
| QUALIFIED | CLOSED | Window end |
| MISSED | CLOSED | Window end |

### 5.4 Commission State Machine (per line)

```
  [PENDING] ──> [COMPUTED] ──> [CONFIRMED]
                    │                │
                    v                v
               [ADJUSTED]       [VOIDED]
                    │
                    v
           [REFUND_ADJUSTED]
```

**Transitions:**

| From | To | Trigger | Authorization |
|---|---|---|---|
| PENDING | COMPUTED | Commission run processes transaction | System |
| COMPUTED | CONFIRMED | Settlement verification | System |
| COMPUTED | ADJUSTED | Retroactive correction | Admin (2-person) |
| CONFIRMED | VOIDED | Transaction reversal | System (auto) |
| CONFIRMED | ADJUSTED | Retroactive rate change | Admin (2-person) |
| CONFIRMED | REFUND_ADJUSTED | Proportional refund | System (auto) |

### 5.5 Reward State Machine

```
  [PENDING] ──> [AWARDED] ──> [VESTING] ──> [CLAIMABLE] ──> [CLAIMED]
                   │                                            │
                   v                                            v
              [EXPIRED]                                    [EXPIRED]
```

### 5.6 Campaign State Machine

```
  [DRAFT] ──> [SCHEDULED] ──> [ACTIVE] ──> [ENDED]
      │                           │            │
      v                           v            v
  [CANCELLED]                [CANCELLED]    [ARCHIVED]
```

---

## 6. Commission Constitution

### 6.1 Direct Commission

An agent earns direct commission on every qualified property sale by a customer they own.

**Formula:**
```
directCommission = floor(transactionAmount * directRate / 10000)
```

**Rules:**
- Direct commission is earned by the customer's owning agent at the time of the transaction.
- The rate is defined by the agent's current rank at the time of the transaction (not at commission computation time).
- Direct commission is earned regardless of agent status, including GRACE, INACTIVE, and SUSPENDED (but SUSPENDED is held until suspension ends).
- Direct commission is always paid. It is never compressed.

### 6.2 Override Commission

Override commission is earned by upline agents on transactions by their downline.

**Formula:**
```
overrideRate = uplineRankRate - directAgentRankRate
overrideCommission = floor(transactionAmount * overrideRate / 10000)
```

**Rules:**
- Override is computed per level in the sponsor tree.
- Each upline level earns the difference between their rank's override rate and the direct agent's rank rate.
- If `uplineRate <= directRate`, that level earns zero override for that transaction.

### 6.3 Compression

When a direct agent is INACTIVE (not GRACE, not TERMINATED, not SUSPENDED), their override commissions are compressed upward to the nearest qualified active upline.

**Compression Algorithm:**
```
1. For each transaction, compute the standard override chain.
2. For each level in the chain where the agent is INACTIVE:
   a. Skip that level.
   b. Redirect the override to the nearest ACTIVE upline.
   c. The ACTIVE upline receives the override at their own rank rate.
3. Record compressionApplied=true and originalRecipientId for the CommissionLine.
4. Record the full overrideChain in the CommissionLine.
```

**Rules:**
- Compression only applies to INACTIVE agents. GRACE agents retain their override position. TERMINATED and SUSPENDED agents are not compressed through (see below).
- TERMINATED agents are treated as removed from the tree entirely for override computation.
- SUSPENDED agents retain their override position during suspension. Override commissions accrue but are not paid until suspension is lifted.
- Compression is recomputed at commission run time, not at transaction time.
- Multiple consecutive inactive levels result in multiple levels of compression.
- If no ACTIVE agent exists upline of a chain of INACTIVE agents, the override for that chain is recorded as UNCLAIMED and retained by RELCKO. An `CommissionUnclaimed` audit event is recorded.

### 6.4 Qualification

An agent must be ACTIVE or GRACE to earn override commissions.

**Activity definition:**
```
Agent is ACTIVE or GRACE:
  agent.status == ACTIVE
  OR agent.status == GRACE
```

**Qualification check:**
```
IsOverrideEligible(agent, periodEnd):
  return (agent.status == ACTIVE OR agent.status == GRACE) AND recordExists(
    QualifiedSale.forAgent(agent.id).where(
      sale.settlementStatus == "ledger_posted"
      AND sale.settledAt >= agent.lastQualifiedSale
      AND sale.settledAt <= periodEnd
    )
  )
```

### 6.5 Inactive Behavior

An INACTIVE agent:
- Retains their position in the sponsor tree.
- Retains all customer ownership.
- Does NOT earn override commissions on downline transactions.
- Does NOT earn rank volume credit.
- Their direct commissions are paid (but may be held if SUSPENDED).
- Their overrides are compressed upward.
- Reactivates on the next qualified sale.

A GRACE agent:
- Retains their position in the sponsor tree.
- Retains all customer ownership.
- Continues to earn override commissions during the grace period.
- Continues to earn rank volume credit.
- Their direct commissions are paid.
- Their overrides are NOT compressed (grace is not inactivity).
- Transitions to ACTIVE on a new qualified sale.
- Transitions to INACTIVE if the grace period expires without a qualified sale.

### 6.6 Customer Permanence

Customer ownership is independent of agent status.

- A customer owned by an INACTIVE agent remains that agent's customer.
- If the INACTIVE agent reactivates, override commissions from that customer's transactions resume flowing to them.
- During inactivity, overrides from that customer flow to the nearest qualified active upline (compression).
- A customer owned by a GRACE agent remains that agent's customer. Override commissions continue to flow to the GRACE agent during the grace period.

### 6.7 Edge Cases

**Cycle detection:** The sponsor tree is validated as a DAG at every link creation. Cycles are rejected.

**Deep tree:** For trees exceeding configured override depth, excess levels receive zero override.

**Same-rate override:** If upline and downline have the same rank rate, the upline earns zero override on that transaction, but compression still applies.

**Multiple transactions same moment:** Ordering is deterministic: sort by (transaction.createdAt, transaction.id).

**Agent reactivation mid-period:** Reactivation applies to future transactions only. Past period commissions are not recalculated.

**Agent termination:** A TERMINATED agent's customers are not automatically reassigned. An administrative transfer is required.

**No active upline:** If no ACTIVE agent exists upline of a chain of INACTIVE agents, the override for that chain is recorded as UNCLAIMED and retained by RELCKO. A `CommissionUnclaimed` audit event is recorded.

**Refund adjustment:** A refund that reduces the transaction amount proportionally reduces the associated direct and override commissions. The reduction is computed by re-applying the original rates to the refunded amount. A `CommissionRefundAdjustment` is created and linked to the original CommissionLine.

**Late settlement:** A transaction settled after the commission run for its period enters the LateSettlementQueue. It is processed in the next available commission run using the agent's rank at original transaction time.

**Rank protection:** An agent who is promoted to a rank holds that rank for a minimum of one full qualification period. The `protectedUntil` field on RankAssignment prevents demotion during this period.

### 6.8 Conflict Resolution

| Conflict | Resolution |
|---|---|
| Two agents claim same customer | First verified qualified sale determines ownership |
| Sponsor tree cycle | Rejected at write — tree must remain acyclic |
| Commission rate ambiguity | Rate at transaction time, not computation time |
| Rank change mid-period | Per-transaction rate applies at transaction time |
| Customer transfer reason invalid | Rejected — must be one of DEATH, FRAUD, LEGAL_ORDER, CORPORATE_DISSOLUTION, MUTUAL_AGREEMENT |
| Late-settled transaction | Processed in next commission run using rank at original transaction time |

### 6.9 Retroactive Adjustments

Retroactive adjustments are new events, not mutations.

**Process:**
1. Admin initiates a RetroactiveAdjustment with reason.
2. The system replays the affected commission run with corrected parameters.
3. New CommissionLine entries are created with negative amounts (reversals) and corrected amounts.
4. A CommissionAdjusted event is recorded for each corrected line.
5. The original CommissionLine records remain unchanged (immutable history).

### 6.10 Audit Requirements

Every commission computation records:
- CommissionRun (scope and status)
- CommissionLine (per-line detail with agent, amount, rate, source)
- Compression decisions (compressionApplied, originalRecipientId)
- Full override chain (overrideChain with agentId, rank, rate, amount for every level)
- Rank-at-time for every agent in the override chain
- Qualification status for every overridden level
- Unclaimed override amounts (if any) with audit event

---

## 7. Rank Constitution

### 7.1 Rank Hierarchy

Ranks form a strict numeric hierarchy:

| Level | Name | Typical Override Rate | Qualification Period |
|---|---|---|---|
| 1 | Associate | 5% | Rolling 30 days |
| 2 | Senior Associate | 8% | Rolling 30 days |
| 3 | Team Leader | 12% | Rolling 90 days |
| 4 | Senior Team Leader | 15% | Rolling 90 days |
| 5 | Regional Manager | 18% | Rolling 365 days |
| 6 | Senior Regional Manager | 20% | Rolling 365 days |
| 7 | National Director | 22% | Rolling 365 days |
| 8 | Executive Director | 25% | Rolling 365 days |

### 7.2 Promotion

Promotion occurs when an agent meets all requirements for the next rank within the qualification period.

**Promotion Algorithm:**
```
CanPromote(agent, targetRank):
  requirements = targetRank.requirements
  for each req in requirements:
    value = AccumulateMetric(agent, req.metric, req.periodType)
    if not Compare(value, req.operator, req.value):
      return false
  return true
```

**Rules:**
- Promotion is evaluated at the end of each qualification period (typically daily).
- An agent may only be promoted one rank at a time (cannot skip ranks).
- Promotion is effective immediately upon meeting requirements.
- Promotion does NOT require maintaining the rank (see Demotion).
- On promotion, `protectedUntil` is set to `promotionDate + qualificationPeriod`. The agent cannot be demoted during this protection period.

### 7.3 Demotion

Demotion occurs when an agent fails to meet the minimum requirements for their current rank AND the rank protection period has expired.

**Minimum Requirements for Rank Retention:**
```
CanRetain(agent, currentRank):
  if agent.currentAssignment.protectedUntil > now():
    return true  // rank protection active
  requirements = currentRank.retentionRequirements  // typically lower than promotion
  for each req in requirements:
    value = AccumulateMetric(agent, req.metric, req.periodType)
    if not Compare(value, req.operator, req.value):
      return false
  return true
```

**Rules:**
- Retention requirements are typically 60-80% of promotion requirements.
- Demotion is evaluated periodically (e.g., monthly).
- An agent cannot be demoted more than one rank per evaluation period.
- An agent cannot be demoted while `protectedUntil` is in the future.
- Demotion does not affect historical rank records (immutable history).
- Commission rates for past periods are based on rank at the time (not demoted rank).

### 7.4 Qualification Windows

Each RankDefinition specifies period types for its requirements:

```
Period Types:
  ROLLING_30:  Last 30 days from evaluation date
  ROLLING_90:  Last 90 days from evaluation date
  ROLLING_365: Last 365 days from evaluation date
  CALENDAR_MONTH: Current calendar month
  CALENDAR_QUARTER: Current calendar quarter
```

**Metrics:**
```
PERSONAL_VOLUME: Total qualified transaction volume from own customers.
GROUP_VOLUME: Total qualified transaction volume from entire downline.
ACTIVE_AGENTS: Count of active agents in downline.
CUSTOMER_COUNT: Total customers owned.
QUALIFIED_CUSTOMERS: Customers with at least one qualified sale.
```

### 7.5 Volume Calculations

- Volume is always in system base currency (cents).
- Volume is based on settled transactions only (`settlementStatus == "ledger_posted"`).
- Volume calculations are deterministic and reproducible.
- Volume includes all transaction types defined as volume-qualifying (configurable).

### 7.6 Historical Ranks

- Every rank assignment is recorded as a RankAssignment event.
- Historical ranks are never modified.
- Commission computations reference the agent's rank at transaction time.
- A complete rank history is available for any agent.

---

## 8. Event Constitution

### 8.1 Event Definition

Every event conforms to a standard envelope:

```json
{
  "eventId": "UUID",
  "eventType": "String",
  "eventVersion": "Integer",
  "producer": "String (context name)",
  "producerId": "String (instance identifier)",
  "timestamp": "DateTime (ISO 8601 UTC)",
  "aggregateId": "String",
  "aggregateType": "String",
  "data": {},
  "metadata": {
    "correlationId": "UUID",
    "causationId": "UUID (parent event)",
    "traceId": "UUID (root operation)"
  }
}
```

### 8.2 Event Catalog

#### Agent Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| AgentRegistered | Agent Context | agentId, profile, sponsorId | Network, Commission, Rank |
| AgentActivated | Agent Context | agentId, activationDate, qualifiedSaleId | Network, Commission, Rank, Reward |
| AgentEnteredGracePeriod | Agent Context | agentId, gracePeriodStart, gracePeriodEnd | Network, Commission, Rank |
| AgentDeactivated | Agent Context | agentId, deactivationDate, reason | Network, Commission, Rank |
| AgentStatusChanged | Agent Context | agentId, previousStatus, newStatus, reason, adminId | Network, Commission, Rank |

#### Customer Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| CustomerRegistered | Customer Context | customerId, owningAgentId, referrerId | Network, Commission |
| CustomerOwnershipAssigned | Customer Context | customerId, agentId, assignmentReason | Commission |
| CustomerOwnershipTransferred | Customer Context | customerId, previousAgentId, newAgentId, adminId, transferReason, reason | Commission, Audit |
| CustomerOwnershipVerified | Customer Context | customerId, agentId, verifiedSaleId | Commission, Rank |
| CustomerStatusChanged | Customer Context | customerId, previousStatus, newStatus | Commission |
| CustomerMerged | Customer Context | survivingCustomerId, mergedCustomerId, owningAgentId, mergeReason | Commission, Audit |

**CustomerOwnershipTransferred transferReason values:**
- DEATH
- FRAUD
- LEGAL_ORDER
- CORPORATE_DISSOLUTION
- MUTUAL_AGREEMENT

Any other value is rejected.

#### Network Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| ReferralCreated | Network Context | agentId, referrerId, referralCode | Commission, Rank |
| ReferralConverted | Network Context | agentId, referralId, investmentId | Commission, Rank, Campaign |
| ReferralExpired | Network Context | agentId, reason | Commission |
| TreeRestructured | Network Context | rootAgentId, changeType | Commission, Rank |
| CompressionPathUpdated | Network Context | agentId, compressedAncestorId, depth | Commission |

#### Commission Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| CommissionRunStarted | Commission Context | runId, periodStart, periodEnd | Audit |
| CommissionRunCompleted | Commission Context | runId, totalAmount, lineCount | Audit, Payout Engine |
| CommissionRunFailed | Commission Context | runId, error | Audit |
| CommissionCalculated | Commission Context | lineId, agentId, amount, rate, sourceTransactionId, overrideChain | Audit, Agent UI |
| CommissionApproved | Commission Context | lineId, agentId, approverId | Audit |
| CommissionPaid | Commission Context | lineId, agentId, amount, paymentReference | Audit, Agent UI |
| CommissionAdjusted | Commission Context | lineId, agentId, adjustmentAmount, reason, adminId | Audit, Agent UI |
| CommissionReversed | Commission Context | lineId, agentId, reversalTransactionId | Audit, Financial Core |
| CommissionRateChanged | Commission Context | agentId, previousRate, newRate, effectiveDate | Commission Engine, Audit |
| CommissionRefundAdjusted | Commission Context | lineId, agentId, refundAmount, reversalAmount, refundTransactionId | Audit, Financial Core |

#### Rank Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| RankAchieved | Rank Context | agentId, rankId, qualificationCriteria, promotionDate, protectedUntil | Commission, Agent, NFT, Governance, Audit |
| RankDemoted | Rank Context | agentId, previousRankId, newRankId, demotionDate, reason | Commission, Agent, Audit |
| QualificationAchieved | Rank Context | agentId, milestoneId, threshold, currentValue, period | Reward, Campaign, Leaderboard |
| RankQualificationMissed | Rank Context | agentId, rankId, metric, actualValue, requiredValue | Audit |

#### Reward Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| IncentiveCredited | Reward Context | incentiveId, agentId, amount, qualificationPeriod | Commission, Audit |
| RewardPaid | Reward Context | incentiveId, agentId, paidAmount | Payout Engine |
| IncentiveExpired | Reward Context | incentiveId, agentId, reason | Audit |
| IncentiveProgramActivated | Reward Context | programId, effectiveDate, rules | Commission |

#### Campaign Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| ReferralCampaignLaunched | Campaign Context | campaignId, name, startDate, endDate, rules | Commission, Rank, Agent |
| CampaignStarted | Campaign Context | campaignId, startDate | Commission, Rank |
| CampaignEnded | Campaign Context | campaignId, endDate, results | Commission, Rank, Reward |
| CampaignQualificationMet | Campaign Context | campaignId, agentId, metric, value | Commission |
| CampaignRewardIssued | Campaign Context | campaignId, agentId, rewardAmount | Audit, Agent |

#### Audit Events

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| AuditTrailRecorded | Audit Context | auditId, action, actorId, resourceType, resourceId, previousState, newState | Audit Store |

### 8.3 Ordering

- Events within the same aggregate (agent, customer) are strictly ordered by sequence number.
- Cross-aggregate events have no ordering guarantees.
- Commission computation reads events in aggregate order.
- The event store guarantees at-least-once delivery within a partition.

### 8.4 Idempotency

Every event consumer is idempotent:
```
ProcessEvent(event):
  if AlreadyProcessed(event.eventId):
    return  // deduplicate
  Apply(event)
  Record(event.eventId, "processed")
```

### 8.5 Replay Behavior

- Events can be replayed from any point in history.
- Replay is the primary mechanism for recovery and retroactive computation.
- Replay produces identical results to the original run (deterministic).
- Idempotent consumers handle replay safely.

### 8.6 Retention

| Event Type | Retention | Tier |
|---|---|---|
| CommissionCalculated | 10 years | Hot |
| RankAchieved | Permanent | Hot |
| ReferralCreated | Permanent | Hot |
| AuditTrailRecorded | Permanent | Hot |
| CommissionRunCompleted | 10 years | Warm |
| CampaignRewardIssued | 7 years | Warm |
| Stale agent events (>5y) | 5 years | Cold |
| Transient processed state | 30 days | Delete |

### 8.7 Versioning

- Events are versioned with `eventVersion`.
- Consumers process events based on their supported version range.
- Schema evolution is additive only (new fields, never removed).
- Breaking changes create a new event type (e.g., `CommissionComputedV2`).

---

## 9. Security Model

### 9.1 Authentication

| Actor | Method | Notes |
|---|---|---|
| Agent | Session token (JWT) | Short-lived (15 min), refresh token (7 days) |
| Admin | Session token (JWT) + MFA | Elevated privileges require step-up auth |
| Internal service | mTLS or HMAC | Machine-to-machine, no user context |
| Integration | API key + HMAC | Third-party integrations, rate-limited |

### 9.2 Authorization

**Principle of least privilege.** Every operation checks authorization against the actor's role and resource ownership.

| Operation | Required Role | Notes |
|---|---|---|
| View own commissions | AGENT | Self only |
| View downline commissions | AGENT | Own downline tree only |
| View any commissions | ADMIN | Full access |
| Transfer customer | ADMIN (2-person) | Two administrators must approve; transferReason must be valid |
| Adjust commission | ADMIN (2-person) | Two administrators must approve |
| Override rank | ADMIN (2-person) | Two administrators must approve |
| Terminate agent | ADMIN (2-person) | Two administrators must approve |
| Run commission | SYSTEM | Only the commission engine |
| Replay events | ADMIN | Requires reason, creates audit entry |

### 9.3 Internal Service Authorization

- Internal services communicate over a private network.
- Requests carry an HMAC-signed token derived from a shared secret.
- Token includes: service identity, timestamp (±5min tolerance), request body hash.
- No user context is propagated for system-to-system calls.

### 9.4 Audit Requirements

Every security-relevant action records:
- Actor identity (user ID or service name)
- Action type
- Resource type and ID
- Previous state (for mutations)
- New state (for mutations)
- Timestamp
- IP address (for user actions)
- Reason (for administrative actions)

### 9.5 Replay Protection

- Event consumers use idempotency keys (eventId) to prevent duplicate processing.
- API endpoints enforce idempotency-key headers for POST/PUT operations.
- Replay of event streams is safe because consumers are idempotent.

### 9.6 Administrative Operations

| Operation | Auth | Audit | 2-Person | Notify Agent |
|---|---|---|---|---|
| Customer transfer | Admin | Yes | Yes | Yes |
| Commission adjustment | Admin | Yes | Yes | Yes |
| Rank override | Admin | Yes | Yes | Yes |
| Agent reactivation | Admin | Yes | Yes | No |
| Agent termination | Admin | Yes | Yes | Yes |
| Run replay | Admin | Yes | No | No |
| Configuration change | Admin | Yes | Yes | No |

### 9.7 Transfer Controls

Customer transfers are the most sensitive operation in the system.

**Transfer Protocol:**
1. Admin A initiates transfer (reason required).
2. System validates `transferReason` against allowed values: DEATH, FRAUD, LEGAL_ORDER, CORPORATE_DISSOLUTION, MUTUAL_AGREEMENT.
3. If `transferReason` is not one of the allowed values, the transfer is rejected.
4. Admin B approves transfer (independent review).
5. System creates `CustomerOwnershipTransferred` event with `transferReason`.
6. Previous agent is notified.
7. New agent is notified.
8. Commissions from the transfer date forward go to the new agent.
9. Past commissions are not retroactively adjusted (grandfathered).

---

## 10. Scalability

### 10.1 Event Sourcing Considerations

The event store is the single source of truth. All state is derived from events.

**Scale targets:**
- 10 million agents
- 50 million customers
- 500 million transactions
- 5 billion events
- 1 million commission lines per run

**Partitioning strategy:**
- Primary partition key: `agentId` (hash range)
- Events within a partition are strictly ordered.
- Cross-partition queries use scatter-gather.
- Commission runs operate within agent partitions.

### 10.2 Read Models

Read models are materialized projections of the event stream:

| Read Model | Update Trigger | Refresh Strategy | Scale |
|---|---|---|---|
| Genealogy Tree | Agent lifecycle events | Incremental | 10M agents |
| Commission Balance | CommissionComputed | Incremental | 10M agents |
| Rank Assignment | RankPromoted/Demoted | Incremental | 10M agents |
| Agent Status | Agent lifecycle events | Incremental | 10M agents |
| Customer Ownership | Customer ownership events | Incremental | 50M customers |
| Leaderboard | CommissionRunCompleted | Batch | 10K entries |
| Audit Trail | AuditRecorded | Append | Unlimited |
| Late Settlement Queue | Transaction settlement events | Incremental | 1M entries |

### 10.3 Caching Strategy

| Cache | Type | TTL | Invalidation |
|---|---|---|---|
| Genealogy subtree | Local (agent partition) | 5 min | Event-driven |
| Commission rates | Global | 1 hour | TTL |
| Rank definitions | Global | 1 hour | TTL |
| Agent profile | Local | 5 min | Event-driven |
| TreePath ancestry | Local (agent partition) | 5 min | Event-driven |

### 10.4 Queue Strategy

**Event Bus:**
- Topic per event type (or aggregate type for high-volume events).
- Partitions within topics for parallelism.
- At-least-once delivery per partition.

**Commission Computation Queue:**
- One job per commission run.
- Agent-level parallelism within a run.
- Dead letter queue for failed lines.
- Retry with exponential backoff (3 attempts).

**Projection Queue:**
- One subscription per read model.
- Idempotent processors.
- Batch processing for high-throughput projections.

### 10.5 Database Strategy

| Store | Technology | Purpose |
|---|---|---|
| Event Store | Append-only log (Kafka/Pulsar + cold storage) | Source of truth |
| Read Models | PostgreSQL (sharded by agentId) | Fast queries |
| Commission Runs | PostgreSQL (partitioned by period) | Batch computation |
| Leaderboards | Redis (sorted sets) | Real-time rankings |
| Audit Log | PostgreSQL (append-only, partitioned) | Compliance |
| Cache | Redis | Hot data |
| Late Settlement Queue | PostgreSQL | Pending late-settled transactions |

---

## 11. Integration

### 11.1 Financial Core

The Financial Core (Sprints 1-4) handles all monetary movements. RNE does not handle money.

**RNE → Financial Core:**
- CommissionRunCompleted events trigger payout creation in the Payout Engine.
- CommissionLine entries are the source of payout amounts.
- Payouts use the existing PaymentReference → Payment Provider flow.

**Financial Core → RNE:**
- Investment settlement events (`ledger_posted`) are the revenue events that trigger commission computation.
- Customer ownership is cross-referenced at transaction settlement time.
- Refund events trigger CommissionRefundAdjustment creation.

### 11.2 Payment Service

- RNE does not interface directly with payment providers.
- Commission payouts flow through the Financial Core Payment Service.
- RNE provides the commission amounts; payment execution is a Financial Core concern.

### 11.3 Distribution Engine

- Distribution payouts (Sprint 4.2) are investor-facing, not agent-facing.
- RNE commissions are operator-facing (agent payouts).
- These are separate payout pipelines that converge at the Payment Service level.

### 11.4 Future Marketplace

- The Marketplace will be a consumer of RNE data.
- Agent profiles, customer ownership, and commission rates may be exposed through Marketplace APIs (read-only).
- Marketplace events (property purchases) are input to RNE commission computation.

### 11.5 Future AI Platform (RIP)

- Not designed for AI integration. The deterministic nature of RNE is deliberate.
- AI may consume RNE data for agent performance predictions, churn analysis, and campaign optimization, but AI does not drive RNE business logic.

### 11.6 Integration Contract

```
Integration = Event Stream + API Boundary
```

**Event Stream (Async):**
- All domain events published to event bus.
- Consumers subscribe to relevant topics.
- Schema governed by event versioning.

**API Boundary (Sync):**
- Read APIs for agent-facing and admin-facing queries.
- Write APIs limited to administrative operations and agent self-service.
- All write operations produce events.

---

## 12. Testing Strategy

### 12.1 Business Invariant Testing

Every invariant in this document has a corresponding test:

```
describe("Customer ownership permanence"):
  it("does not change when agent becomes inactive")
  it("does not change when agent is terminated")
  it("does not change when agent rank changes")
  it("only changes via explicit admin transfer event")
  it("transfer records both previous and new agent")
  it("transfer requires valid transferReason")
  it("transfer with invalid reason is rejected")

describe("Commission determinism"):
  it("identical input produces identical output across 1000 runs")
  it("timezone-independent computation")
  it("integer-only arithmetic")
  it("deterministic ordering of simultaneous transactions")
  it("no residual distribution — all division uses floor()")
```

### 12.2 Concurrency Testing

```
describe("Concurrent commission computation"):
  it("two simultaneous runs for the same period produce identical results")
  it("event ordering is preserved under concurrent writes")
  it("idempotent consumers handle duplicate events")
  it("CAS-based state transitions prevent race conditions")
```

### 12.3 Replay Testing

```
describe("Event replay"):
  it("replay from beginning produces identical state")
  it("replay from snapshot produces identical state")
  it("commission replay produces identical lines")
  it("rank replay produces identical assignments")
```

### 12.4 Commission Correctness

```
describe("Commission computation"):
  it("direct commission = floor(amount * rate / 10000)")
  it("override commission = floor(amount * deltaRate / 10000)")
  it("compression skips inactive agents")
  it("compression records original recipient")
  it("compression records full override chain")
  it("compression respects tree boundaries")
  it("retroactive adjustment creates reversal + corrected lines")
  it("no residual distribution — all division uses floor()")
  it("unclaimed override when no active upline exists")
  it("refund adjustment creates proportional reversal")
  it("late settlement uses rank at original transaction time")
```

### 12.5 Rank Correctness

```
describe("Rank computation"):
  it("promotion when all requirements met")
  it("demotion when retention requirements not met")
  it("cannot skip ranks")
  it("historical rank recorded at transaction time")
  it("rank change does not retroactively affect past commissions")
  it("rank protection prevents demotion during protection period")
  it("rank protection expires after one qualification period")
```

### 12.6 Compression Testing

```
describe("Commission compression"):
  it("single inactive level compressed to parent")
  it("multiple consecutive inactive levels compressed to nearest active")
  it("inactive at root: no compression possible, overrides become unclaimed")
  it("reactivation restores override flow")
  it("compression does not affect direct commissions")
  it("grace agents are not compressed through")
  it("unclaimed override recorded as audit event")
```

### 12.7 Stress Testing

```
describe("Stress testing"):
  it("10M agents in tree with 100 levels deep")
  it("1M commission lines computed in < 60 seconds")
  it("event store handles 10K events/second")
  it("read model projection keeps pace with event production")
```

### 12.8 Grace Period Testing

```
describe("Grace period"):
  it("agent enters grace when activeUntil expires")
  it("agent remains override-eligible during grace")
  it("agent returns to active on qualified sale during grace")
  it("agent becomes inactive after grace expires without sale")
  it("compression does not apply during grace")
```

### 12.9 Transfer Reason Testing

```
describe("Customer transfer reasons"):
  it("accepts DEATH, FRAUD, LEGAL_ORDER, CORPORATE_DISSOLUTION, MUTUAL_AGREEMENT")
  it("rejects unknown transfer reasons")
  it("rejects empty transfer reason")
  it("records transferReason in audit event")
```

### 12.10 Refund and Late Settlement Testing

```
describe("Refund adjustments"):
  it("proportional reversal on partial refund")
  it("full reversal on full refund")
  it("original commission line remains unchanged")

describe("Late settlement"):
  it("late-settled transaction enters queue")
  it("processed in next commission run")
  it("uses rank at original transaction time")
```

---

## 13. Architecture Decision Records

### ADR-001: Integer-Only Monetary Arithmetic

**Decision:** All monetary values are integers (cents). No floating-point arithmetic. No residual distribution. No rounding pools.

**Rationale:** Floating-point arithmetic produces non-deterministic rounding errors that compound across commission chains. Integer arithmetic is deterministic, auditable, and reproducible. A 0.001 cent rounding difference at a deep level of a large tree can snowball into significant discrepancies. The Commission Constitution Article 4 is absolute: "There is no rounding pool, no residual distribution, and no floating-point arithmetic. This rule admits no exception."

**Trade-off:** Slightly more complex rate calculations (basis points instead of percentages). Worth the determinism guarantee.

**Consequences:**
- Commission rates stored as basis points (1/100 of 1%).
- All formulas use `floor()` for division.
- No residual tracking. No largest-remainder method. No rounding pools.

### ADR-002: Event Sourcing for Commission Computation

**Decision:** Commission state is derived from an append-only event stream, not from mutable database records.

**Rationale:** Commission computation must be reproducible and auditable. Event sourcing provides:
- Complete history for any point in time.
- Ability to replay history after bug fixes.
- Natural audit trail — every change is an event.
- Deterministic reconstruction from events.

**Trade-off:** Increased storage, eventual consistency, more complex read model.

**Consequences:**
- Current balances are projections, not facts.
- Read models may lag behind event store (seconds, not milliseconds).
- Snapshot strategy required for efficient recovery.

### ADR-003: Partition by Agent ID

**Decision:** Event streams and read models are partitioned by agent ID.

**Rationale:** Most queries are agent-centric (my commissions, my downline, my rank). Partitioning by agent ID ensures:
- All events for an agent subtree are co-located.
- Commission runs can parallelize across partitions.
- Read models serve agent queries from local data.

**Trade-off:** Cross-agent queries (company-wide reports, global leaderboards) require scatter-gather.

**Consequences:**
- Commission run uses map-reduce pattern across partitions.
- Global aggregations are periodic batch jobs.
- Hot partitions (top-earning agents) need rebalancing strategy.

### ADR-004: Compression at Computation Time, Not Transaction Time

**Decision:** Commission compression is computed at commission run time, not at the time of each transaction.

**Rationale:** Agent status changes over time. Computing compression at transaction time would require recomputation when agent status changes. Computing at run time:
- Uses the most current agent status for the entire period.
- Produces deterministic results (status is known at run time).
- Simplifies the transaction pipeline (transactions don't need to know agent status).

**Trade-off:** If an agent's status changes during a period, a single run may reflect mid-period status changes that wouldn't have been known at transaction time.

**Mitigation:** Runs use agent status snapshot at the end of the run period, not at run execution time.

### ADR-005: Rank at Transaction Time for Commission Rate

**Decision:** Commission rates are determined by the agent's rank at transaction time, not at computation time.

**Rationale:** If an agent is promoted after a transaction but before the commission run, using the current rank would retroactively change the commission for that transaction. This:
- Creates audit issues (why did this transaction earn more than expected?)
- Makes commission amounts unpredictable for agents.
- Breaks determinism (a run at time T and T+1 would produce different results for the same period).

**Trade-off:** Commissions after a promotion don't immediately reflect the new rate for past transactions. The new rate applies to future transactions only.

### ADR-006: Two-Person Approval for Sensitive Operations

**Decision:** Customer transfers, commission adjustments, and rank overrides require approval from two independent administrators.

**Rationale:** These operations have financial implications. A single compromised admin account could:
- Transfer high-value customers to a favored agent.
- Artificially inflate commissions.
- Grant undeserved rank promotions.

Two-person approval is the standard control in financial systems (Stripe, fintechs).

**Trade-off:** Operational overhead for legitimate administrative actions. Worth the security guarantee.

### ADR-007: Agent Status is Derived, Not Stored

**Decision:** Agent status (ACTIVE, GRACE, INACTIVE) is derived from qualification events, not stored as a mutable field.

**Rationale:** Status derivation from events ensures:
- The exact reason for status change is always known.
- Status can be determined for any historical point.
- No silent status mutations.
- Deterministic recomputation.

**Trade-off:** Read path requires event replay or materialized view for current status.

### ADR-008: Configuration as Code

**Decision:** Commission rates, rank thresholds, qualification periods, and reward definitions are code-level configuration, not database records.

**Rationale:** Business-critical parameters should be version-controlled, reviewed, and deployed through the standard CI/CD pipeline. Database-backed configuration:
- Can be changed without review.
- Has no version history (unless explicitly built).
- Creates deployment vs. configuration drift.

**Trade-off:** Changing a rate or threshold requires a deployment. Acceptable for a system where these change infrequently (quarterly or annually).

### ADR-009: Read Models are Eventually Consistent

**Decision:** Read models (commission balances, rank assignments, genealogy trees) are updated asynchronously from the event stream.

**Rationale:** Eventual consistency:
- Decouples read performance from write throughput.
- Allows read models to use different data structures than the event store.
- Scales read capacity independently.
- Simplifies the write path.

**Trade-off:** Users may briefly see stale data (seconds). Acceptable for a commission system where real-time accuracy is not critical.

### ADR-010: No Direct Integration with Payment Providers

**Decision:** RNE does not call payment providers or disburse funds. It produces commission amounts and leaves payout execution to the Financial Core.

**Rationale:** Separation of concerns:
- RNE computes what agents earned.
- Financial Core handles how agents get paid.
- Payment provider changes do not affect commission logic.
- Payment errors do not affect commission computation.

**Trade-off:** An additional integration hop for end-to-end payout. Acceptable for clean architecture.

### ADR-011: Grace Period Between Active and Inactive

**Decision:** A GRACE state is inserted between ACTIVE and INACTIVE in the Agent State Machine. The grace period is 30 calendar days.

**Rationale:** The Commission Constitution Article 22 defines a 30-day grace period. Without it, agents would lose override eligibility immediately upon activity window expiration. The grace period:
- Provides a buffer for agents whose activity window expires.
- Prevents abrupt loss of override income.
- Aligns with industry standard compensation practices.

**Trade-off:** Agents in grace continue to earn overrides for up to 30 days without a qualified sale. Acceptable per constitutional requirement.

### ADR-012: Enumerated Transfer Reasons

**Decision:** Customer transfers are restricted to five constitutional grounds: DEATH, FRAUD, LEGAL_ORDER, CORPORATE_DISSOLUTION, MUTUAL_AGREEMENT. Any other reason is rejected.

**Rationale:** The Commission Constitution Article 8 lists these five exclusive grounds. Allowing transfers for any reason would violate the constitutional principle of permanent customer ownership.

**Trade-off:** Administrative flexibility is reduced. Legitimate transfers outside these five grounds require a constitutional amendment.

### ADR-013: Full Override Chain Recording

**Decision:** Every CommissionLine for an override commission records the full override chain (agentId, rank, rate, amount for every upstream level).

**Rationale:** The Commission Constitution Article 6 requires recording "the identity of every upstream agent in the override chain." A single CommissionLine must contain enough information for a regulator to reconstruct the full override path without traversing the sponsor tree separately.

**Trade-off:** Increased storage per commission line. Worth the auditability guarantee.

### ADR-014: Unclaimed Override on No Active Upline

**Decision:** When no ACTIVE agent exists upline of a chain of INACTIVE agents, the override amount is recorded as UNCLAIMED and retained by RELCKO.

**Rationale:** The Commission Constitution Article 18 Rule 6 specifies this behavior. Without this rule, overrides would be lost without trace.

**Trade-off:** RELCKO retains unclaimed override amounts. These must be tracked separately for financial reporting.

### ADR-015: Rank Protection Period

**Decision:** An agent who is promoted to a rank holds that rank for a minimum of one full qualification period, regardless of subsequent production.

**Rationale:** The Commission Constitution Article 27 requires rank protection. Without it, an agent promoted on day 1 could be demoted on day 2, creating instability and unfairness.

**Trade-off:** An agent who stops producing immediately after promotion retains the rank for the protection period. Acceptable per constitutional requirement.

---

## 14. Architecture Freeze

This document, RNE Architecture Specification v1.1, is the **Implementation Baseline**.

### Freeze Rules

1. **No further architectural changes** may be made without an Architecture Decision Record (ADR).
2. **Every ADR** must be reviewed by the Architecture Board and the Office of the Chief Business Architect.
3. **Every ADR** must include a Constitutional Compliance Review confirming the change does not violate the Commission Constitution.
4. **Constitutional amendments** require CEO and CFO approval before the architecture can be updated.

### Scope of Freeze

The following are frozen as of v1.1:

- All bounded contexts and their responsibilities (§3)
- All domain models and their invariants (§4)
- All state machines and transitions (§5)
- All commission formulas and compression rules (§6)
- All rank rules (§7)
- All event types and schemas (§8)
- All security controls (§9)
- All scalability decisions (§10)
- All integration boundaries (§11)
- All ADRs (§13)

### Modification Process

Any proposed modification must follow this process:

1. **Draft ADR** describing the proposed change, rationale, trade-offs, and consequences.
2. **Architecture Board Review** — the ADR is reviewed for architectural consistency.
3. **Constitutional Compliance Review** — the ADR is reviewed against the Commission Constitution.
4. **Approval** — the ADR is approved by the Architecture Board and the Office of the Chief Business Architect.
5. **Version Update** — the architecture specification is updated to the next minor version.

---

## Appendix A: Glossary

| Term | Definition |
|---|---|
| RNE | RELCKO Network Engine |
| Agent | Registered partner who can own customers and earn commissions |
| Customer | End user who purchases property through an agent |
| Sponsor | Agent who recruited another agent into the network |
| Downline | All agents in the subtree below an agent |
| Upline | All agents on the path from an agent to the root |
| Direct Commission | Commission earned on own customer transactions |
| Override Commission | Commission earned on downline agent transactions |
| Compression | Redirection of override commissions past inactive agents |
| Unclaimed Override | Override retained by RELCKO when no active upline exists |
| Grace Period | 30-day window after activity expiration during which agent remains override-eligible |
| Rank | Hierarchical position with associated commission rates |
| Rank Protection | Minimum one qualification period during which an agent cannot be demoted |
| Qualification | Process of meeting rank requirements |
| Activity Window | Configurable period for maintaining ACTIVE status |
| Basis Point (bps) | 1/100 of 1% (100 bps = 1%) |
| CAS | Compare-And-Swap — atomic conditional update |
| Late Settlement Queue | Queue of transactions settled after their period's commission run |
| Override Chain | Ordered list of every upstream agent in the override path with rank, rate, and amount |

---

## Appendix B: References

| Document | Description |
|---|---|
| Commission Constitution v1.0 | Governing business rules for all commission payments |
| Constitutional Compliance Audit v1.0 | Audit of v1.0 against the Commission Constitution |
| Financial Core Architecture v1.0 | Settlement, payment, ledger, distribution |
| Payment Service Spec v1.0 | Webhook processing, provider abstraction |
| Distribution Engine Spec v1.0 | Snapshot, allocation, claim |
| Brand Guidelines v1.0 | RELCKO brand identity |

---

*This document is the architectural constitution for all RELCKO Network Engine implementation. It supersedes all informal design discussions. Changes to this document require Architecture Board approval and Constitutional Compliance Review.*

*This architecture is frozen as of v1.1. No implementation work may deviate from this specification. Any deviation requires an ADR, Architecture Board review, and Constitutional Compliance Review.*
