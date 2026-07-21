# M3-3 Treasury & Distribution Engine — Architecture Specification

| Metadata | Value |
|----------|-------|
| **Milestone** | M3-3 |
| **Domain** | Treasury / Distribution |
| **Base Package** | `packages/treasury` |
| **Pattern** | Event Sourcing + CQRS + Clean Architecture |
| **Cross-Cuts** | Identity, Portfolio, Governance, Investment |
| **Status** | Architecture Draft |

---

## Table of Contents

1. [Software Requirements Specification (SRS)](#1-software-requirements-specification-srs)
2. [Domain Model](#2-domain-model)
3. [CQRS](#3-cqrs)
4. [Events](#4-events)
5. [Aggregate Responsibilities](#5-aggregate-responsibilities)
6. [State Machine](#6-state-machine)
7. [Storage Model](#7-storage-model)
8. [REST API](#8-rest-api)
9. [Authorization Model](#9-authorization-model)
10. [Error Hierarchy](#10-error-hierarchy)
11. [Idempotency Strategy](#11-idempotency-strategy)
12. [Retry Strategy](#12-retry-strategy)
13. [Concurrency Strategy](#13-concurrency-strategy)
14. [Audit Logging](#14-audit-logging)
15. [Sequence Diagrams](#15-sequence-diagrams)
16. [Testing Strategy](#16-testing-strategy)
17. [Security Considerations](#17-security-considerations)
18. [Folder Structure](#18-folder-structure)
19. [Implementation Roadmap](#19-implementation-roadmap)
20. [Risks and Mitigation](#20-risks-and-mitigation)

---

## 1. Software Requirements Specification (SRS)

### 1.1 Business Context

The Treasury & Distribution Engine manages the lifecycle of all value distributions to token holders and stakeholders. It extends M3-2B's Dividend Claim foundation with a generalized distribution engine capable of handling multiple distribution types, automated treasury movements, and post-distribution reconciliation.

### 1.2 Functional Requirements

#### FR-1: Distribution Management
- **FR-1.1** The system SHALL support creation of distribution proposals for dividends, revenue share, and buybacks.
- **FR-1.2** The system SHALL support approval workflows for distribution proposals.
- **FR-1.3** The system SHALL execute distributions by transferring value from treasury accounts to eligible recipients.
- **FR-1.4** The system SHALL track per-recipient distribution status (pending, paid, failed, recovered).

#### FR-2: Distribution Types
- **FR-2.1** Dividend distributions SHALL distribute per-token amounts based on ownership snapshots.
- **FR-2.2** Revenue-share distributions SHALL distribute a pool amount proportionally to eligible holders.
- **FR-2.3** Buyback distributions SHALL use treasury funds to repurchase tokens from the market.
- **FR-2.4** Each distribution type MAY have distinct eligibility criteria and calculation rules.

#### FR-3: Treasury Movement Automation
- **FR-3.1** Distribution approval SHALL automatically reserve funds in the source treasury account.
- **FR-3.2** Distribution execution SHALL automatically create the corresponding ledger entries.
- **FR-3.3** Failed distributions SHALL automatically trigger fund reversal to the source account.

#### FR-4: Reconciliation
- **FR-4.1** The system SHALL reconcile distributed amounts against treasury account balances.
- **FR-4.2** The system SHALL detect and flag discrepancies between expected and actual distributions.
- **FR-4.3** The system SHALL support manual resolution of reconciliation failures.

#### FR-5: Idempotency
- **FR-5.1** All distribution commands SHALL be idempotent.
- **FR-5.2** Replaying a distribution SHALL NOT result in duplicate payments.
- **FR-5.3** The system SHALL maintain a processed-event log for cross-domain events.

#### FR-6: Audit
- **FR-6.1** All distribution lifecycle transitions SHALL produce audit events.
- **FR-6.2** The system SHALL record actor identity for every state mutation.
- **FR-6.3** The system SHALL support full traceability from proposal to individual recipient payment.

### 1.3 Non-Functional Requirements

- **NFR-1**: Distribution execution SHALL complete within 5 seconds for up to 10,000 recipients.
- **NFR-2**: The system SHALL support concurrent distribution proposals without data corruption.
- **NFR-3**: All monetary calculations SHALL use integer arithmetic (smallest unit, no floats).
- **NFR-4**: The system SHALL be recoverable from any point of failure via event replay.
- **NFR-5**: Access to distribution approval SHALL require multi-signature authorization for amounts exceeding configurable thresholds.

---

## 2. Domain Model

### 2.1 Bounded Context

```
┌──────────────────────────────────────────────────────────────┐
│                   Treasury Context                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Account  │  │   Ledger     │  │   Distribution        │   │
│  │ Mgmt     │  │   (Journal)  │  │   Engine (M3-3)      │   │
│  └──────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Reserve  │  │ Movement     │  │ Claim Engine         │   │
│  │ Mgmt     │  │              │  │ (M3-2B)              │   │
│  └──────────┘  └──────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Aggregates

#### Aggregate: `Distribution`

| Property | Type | Notes |
|----------|------|-------|
| `id` | `DistributionId` | UUID v7 |
| `distributionType` | `DistributionType` | `Dividend \| RevenueShare \| Buyback` |
| `status` | `DistributionStatus` | State machine |
| `sourceAccountId` | `AccountId` | Treasury account to debit |
| `totalAmount` | `Money` | Total value to distribute |
| `currency` | `Currency` | ISO 4217 |
| `perUnitAmount` | `Money \| null` | Per-token/share amount (dividends) |
| `eligibleCount` | `number` | Number of eligible recipients |
| `totalDistributed` | `Money` | Running total of successful payments |
| `totalFailed` | `Money` | Running total of failed payments |
| `totalRecovered` | `Money` | Running total of recovered payments |
| `scheduleId` | `ScheduleId \| null` | Link to dividend schedule (for dividends) |
| `snapshotId` | `SnapshotId \| null` | Link to ownership snapshot (for dividends) |
| `proposalRef` | `ProposalRef \| null` | Governance proposal reference |
| `metadata` | `Json` | Extensible metadata |
| `version` | `number` | Optimistic concurrency |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

#### Aggregate: `DistributionRecipient`

| Property | Type | Notes |
|----------|------|-------|
| `id` | `RecipientId` | UUID v7 |
| `distributionId` | `DistributionId` | Parent distribution |
| `investorId` | `EntityId` | Recipient identity |
| `eligibleAmount` | `Money` | Computed eligible amount |
| `paidAmount` | `Money` | Amount actually paid |
| `status` | `RecipientStatus` | `Pending \| Paid \| Failed \| Recovered` |
| `txHash` | `string \| null` | On-chain tx hash (if applicable) |
| `failureReason` | `string \| null` | Failure detail |
| `paidAt` | `Timestamp \| null` | |
| `version` | `number` | Optimistic concurrency |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

#### Aggregate: `DistributionSchedule`

| Property | Type | Notes |
|----------|------|-------|
| `id` | `ScheduleId` | UUID v7 |
| `distributionType` | `DistributionType` | |
| `propertyId` | `EntityId` | Asset/property identifier |
| `period` | `Period` | Distribution period |
| `totalAmount` | `Money` | |
| `perUnitAmount` | `Money` | |
| `currency` | `Currency` | |
| `status` | `ScheduleStatus` | `Draft \| Scheduled \| Executing \| Completed \| Cancelled` |
| `distributionIds` | `DistributionId[]` | Links to executed distributions |
| `version` | `number` | |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

### 2.3 Value Objects

| Value Object | Fields | Notes |
|-------------|--------|-------|
| `DistributionId` | `value: string` | UUID v7 |
| `RecipientId` | `value: string` | UUID v7 |
| `DistributionType` | enum | `Dividend \| RevenueShare \| Buyback` |
| `DistributionStatus` | enum | `Draft \| Approved \| Executing \| Completed \| Failed \| Recovered \| Cancelled` |
| `RecipientStatus` | enum | `Pending \| Paid \| Failed \| Recovered` |
| `Money` | `amount: bigint`, `currency: Currency` | Smallest unit (e.g., cents) |
| `Currency` | `code: string` | ISO 4217 |
| `Period` | `start: Timestamp`, `end: Timestamp` | |
| `ProposalRef` | `proposalId: string`, `proposalType: string` | Governance link |
| `RecoveryStrategy` | enum | `ReAttempt \| Manual \| WriteOff` |
| `AllocationMethod` | enum | `ProRata \| Fixed \| Tiered` |

### 2.4 Domain Services

| Service | Responsibility |
|---------|---------------|
| `DistributionCalculationService` | Computes per-recipient amounts based on allocation method |
| `DistributionExecutionService` | Orchestrates the execution of a distribution batch |
| `RecoveryOrchestrator` | Manages recovery workflows for failed distributions |
| `TreasuryReservationService` | Reserves and releases funds in treasury accounts |
| `ReconciliationEvaluator` | Detects and reports distribution vs. treasury discrepancies |

---

## 3. CQRS

### 3.1 Commands

| Command | Handler | Description |
|---------|---------|-------------|
| `CreateDistribution` | `CreateDistributionHandler` | Creates a new distribution proposal (Draft) |
| `ApproveDistribution` | `ApproveDistributionHandler` | Approves distribution, reserves funds |
| `ExecuteDistribution` | `ExecuteDistributionHandler` | Executes payments to recipients |
| `CompleteDistribution` | `CompleteDistributionHandler` | Marks distribution as completed |
| `FailDistribution` | `FailDistributionHandler` | Marks distribution as failed |
| `RecoverDistribution` | `RecoverDistributionHandler` | Initiates recovery for failed payments |
| `CancelDistribution` | `CancelDistributionHandler` | Cancels a draft/approved distribution |
| `ProcessRecipientPayment` | `ProcessRecipientPaymentHandler` | Processes single recipient payment |
| `FailRecipientPayment` | `FailRecipientPaymentHandler` | Marks recipient payment as failed |
| `RecoverRecipientPayment` | `RecoverRecipientPaymentHandler` | Recovers a failed recipient payment |
| `CreateDistributionSchedule` | `CreateScheduleHandler` | Creates a distribution schedule |
| `ActivateSchedule` | `ActivateScheduleHandler` | Activates a schedule for execution |
| `CloseSchedule` | `CloseScheduleHandler` | Closes a completed schedule |
| `ReconcileDistribution` | `ReconcileDistributionHandler` | Triggers reconciliation for a distribution |

#### Command Payloads

```typescript
// CreateDistribution
{
  aggregateId: DistributionId;
  type: "treasury.distribution.create";
  data: {
    distributionType: DistributionType;
    sourceAccountId: AccountId;
    totalAmount: bigint;
    currency: Currency;
    perUnitAmount?: bigint;
    scheduleId?: ScheduleId;
    snapshotId?: SnapshotId;
    proposalRef?: ProposalRef;
    allocationMethod: AllocationMethod;
    metadata?: Json;
  };
  metadata: CommandMetadata;
}

// ExecuteDistribution
{
  aggregateId: DistributionId;
  type: "treasury.distribution.execute";
  data: {
    recipientIds: RecipientId[];
    batchSize?: number; // default 100
  };
  metadata: CommandMetadata;
}

// ProcessRecipientPayment
{
  aggregateId: RecipientId;
  type: "treasury.distribution.recipient.pay";
  data: {
    distributionId: DistributionId;
    investorId: EntityId;
    amount: bigint;
    currency: Currency;
  };
  metadata: CommandMetadata;
}
```

### 3.2 Queries

| Query | Handler | Description |
|-------|---------|-------------|
| `GetDistribution` | `GetDistributionHandler` | Single distribution by ID |
| `ListDistributionsByStatus` | `ListDistributionsByStatusHandler` | Distributions filtered by status |
| `ListDistributionsByPeriod` | `ListDistributionsByPeriodHandler` | Distributions by date range |
| `ListDistributionsByType` | `ListDistributionsByTypeHandler` | Filtered by distribution type |
| `GetDistributionRecipients` | `GetRecipientsHandler` | Paginated recipients for a distribution |
| `GetRecipientStatus` | `GetRecipientStatusHandler` | Single recipient status |
| `ListRecipientsByInvestor` | `ListRecipientsByInvestorHandler` | All distributions for an investor |
| `GetDistributionSummary` | `GetSummaryHandler` | Aggregated distribution stats |
| `ListPendingRecoveries` | `ListPendingRecoveriesHandler` | Recoverable failed payments |
| `GetDistributionSchedule` | `GetScheduleHandler` | Single schedule by ID |
| `ListSchedulesByStatus` | `ListSchedulesByStatusHandler` | Schedules filtered by status |
| `GetReconciliationReport` | `GetReconciliationHandler` | Reconciliation report for a distribution |

---

## 4. Events

### 4.1 Event List

All events use the `treasury.distribution.*` namespace.

| Event | Emitted By | Description |
|-------|-----------|-------------|
| `DistributionCreated` | `CreateDistributionHandler` | Distribution proposal created |
| `DistributionApproved` | `ApproveDistributionHandler` | Distribution approved, funds reserved |
| `DistributionExecutionStarted` | `ExecuteDistributionHandler` | Batch execution begun |
| `DistributionExecutionProgress` | `ProcessRecipientPaymentHandler` | Per-recipient progress update |
| `DistributionCompleted` | `CompleteDistributionHandler` | All recipients paid |
| `DistributionFailed` | `FailDistributionHandler` | Distribution terminated with errors |
| `DistributionCancelled` | `CancelDistributionHandler` | Distribution cancelled |
| `DistributionRecoveryInitiated` | `RecoverDistributionHandler` | Recovery workflow started |
| `DistributionRecovered` | `RecoverDistributionHandler` | Recovery completed successfully |
| `RecipientPaymentPaid` | `ProcessRecipientPaymentHandler` | Individual payment succeeded |
| `RecipientPaymentFailed` | `FailRecipientPaymentHandler` | Individual payment failed |
| `RecipientPaymentRecovered` | `RecoverRecipientPaymentHandler` | Failed payment recovered |
| `DistributionScheduleCreated` | `CreateScheduleHandler` | Schedule registered |
| `DistributionScheduleActivated` | `ActivateScheduleHandler` | Schedule activated |
| `DistributionScheduleClosed` | `CloseScheduleHandler` | Schedule lifecycle ended |
| `DistributionReconciled` | `ReconcileDistributionHandler` | Reconciliation completed |

### 4.2 Event Payloads

```typescript
// DistributionCreated
{
  eventType: "treasury.distribution.created";
  aggregateId: DistributionId;
  version: 1;
  data: {
    distributionType: DistributionType;
    sourceAccountId: AccountId;
    totalAmount: bigint;
    currency: Currency;
    perUnitAmount: bigint | null;
    scheduleId: ScheduleId | null;
    snapshotId: SnapshotId | null;
    allocationMethod: AllocationMethod;
    eligibleCount: number;
    proposalRef: ProposalRef | null;
    metadata: Json | null;
  };
  metadata: EventMetadata;
}

// DistributionApproved
{
  eventType: "treasury.distribution.approved";
  aggregateId: DistributionId;
  version: 2;
  data: {
    approvedBy: EntityId;
    approvedAt: Timestamp;
    reservationJournalId: JournalId | null;
  };
  metadata: EventMetadata;
}

// DistributionExecutionStarted
{
  eventType: "treasury.distribution.execution_started";
  aggregateId: DistributionId;
  version: 3;
  data: {
    totalRecipients: number;
    batchSize: number;
    startedAt: Timestamp;
  };
  metadata: EventMetadata;
}

// RecipientPaymentPaid
{
  eventType: "treasury.distribution.recipient.paid";
  aggregateId: RecipientId;
  version: 1;
  data: {
    distributionId: DistributionId;
    investorId: EntityId;
    amount: bigint;
    currency: Currency;
    txHash: string | null;
    paidAt: Timestamp;
  };
  metadata: EventMetadata;
}

// RecipientPaymentFailed
{
  eventType: "treasury.distribution.recipient.failed";
  aggregateId: RecipientId;
  version: 1;
  data: {
    distributionId: DistributionId;
    investorId: EntityId;
    amount: bigint;
    reason: string;
    errorCode: string;
  };
  metadata: EventMetadata;
}

// DistributionCompleted
{
  eventType: "treasury.distribution.completed";
  aggregateId: DistributionId;
  version: N;
  data: {
    totalDistributed: bigint;
    totalFailed: bigint;
    totalRecovered: bigint;
    paidCount: number;
    failedCount: number;
    completedAt: Timestamp;
  };
  metadata: EventMetadata;
}
```

### 4.3 Published Events (Cross-Domain)

| Event | Consumer | Purpose |
|-------|----------|---------|
| `DistributionCompleted` | Portfolio | Update investor portfolio with distribution history |
| `RecipientPaymentPaid` | Identity | Record payment for investor |
| `DistributionApproved` | Governance | Notify governance of execution |
| `DistributionReconciled` | Reporting | Trigger report generation |

---

## 5. Aggregate Responsibilities

### 5.1 `Distribution` Aggregate

**Responsibility:** Manages the lifecycle of a single distribution from proposal through execution and reconciliation.

**Invariants:**
- `totalAmount` MUST equal `sum(eligibleAmount)` across all recipients at creation.
- `totalDistributed + totalFailed + totalRecovered` MUST NOT exceed `totalAmount`.
- Status transitions MUST follow the state machine (Section 6).
- Approved distributions MUST have reserved funds in the source account.
- Completed distributions MUST have `totalDistributed + totalRecovered === totalAmount - writeOffAmount`.

**Business rules:**
- A distribution cannot be approved without a valid source account with sufficient balance.
- A distribution cannot be executed before approval.
- A distribution cannot be cancelled once execution has started.
- Failed payments within an executing distribution do not block other payments.

### 5.2 `DistributionRecipient` Aggregate

**Responsibility:** Tracks the individual payment status for a single recipient within a distribution.

**Invariants:**
- `paidAmount` MUST NOT exceed `eligibleAmount`.
- `Recovered` status SHALL only be reachable from `Failed`.
- `Paid` status SHALL only be set after successful payment confirmation.

### 5.3 `DistributionSchedule` Aggregate

**Responsibility:** Defines the terms and triggers for recurring distributions (e.g., quarterly dividends).

**Invariants:**
- A schedule cannot be activated without at least one linked snapshot.
- A schedule cannot be closed with active (non-completed/cancelled) distributions.
- A schedule's total distributed amount MUST NOT exceed its `totalAmount`.

---

## 6. State Machine

### 6.1 Distribution State Machine

```
                    ┌──────────┐
                    │  Draft   │
                    └────┬─────┘
                         │ approve
                    ┌────▼─────┐
              ┌─────│ Approved │
              │     └────┬─────┘
              │          │ execute
              │     ┌────▼────────┐
              │     │ Executing   │◄────────────┐
              │     └──┬──────┬───┘             │
              │        │      │                  │
              │   ┌────▼─┐  ┌─▼────────┐       │
              │   │ Compl│  │ Failed   │────────┘
              │   │ -eted│  └────┬─────┘  retry
              │   └──┬───┘       │ recover
              │      │      ┌────▼──────┐
              │      │      │ Recovered │
              │      │      └────┬──────┘
              │      │           │
              │      │     ┌────▼──────┐
              └──────┴─────│ Cancelled │
                           └───────────┘

Valid transitions:
  Draft     -> Approved | Cancelled
  Approved  -> Executing | Cancelled
  Executing -> Completed | Failed
  Failed    -> Executing (retry) | Recovered
  Recovered -> Completed
  Cancelled -> (terminal)
  Completed -> (terminal)
```

### 6.2 DistributionSchedule State Machine

```
  Draft ──────────► Scheduled ──────────► Executing ──────────► Completed
    │                  │                      │
    └──────Cancelled───┴──────Cancelled───────┘
```

### 6.3 Recipient Status Machine

```
  Pending ──► Paid (terminal)
     │
     └──► Failed ──► Recovered (terminal)
```

---

## 7. Storage Model

### 7.1 Event Store Schema

The `Distribution` and `DistributionRecipient` aggregates are stored as event streams in the existing `EventStore`.

```sql
-- Read model (projected from events)
CREATE TABLE distribution_read_model (
  id                    UUID PRIMARY KEY,
  distribution_type     VARCHAR(20) NOT NULL,
  status                VARCHAR(20) NOT NULL,
  source_account_id     UUID NOT NULL,
  total_amount          BIGINT NOT NULL,
  currency              CHAR(3) NOT NULL,
  per_unit_amount       BIGINT,
  schedule_id           UUID,
  snapshot_id           UUID,
  allocation_method     VARCHAR(20) NOT NULL,
  eligible_count        INTEGER NOT NULL,
  total_distributed     BIGINT NOT NULL DEFAULT 0,
  total_failed          BIGINT NOT NULL DEFAULT 0,
  total_recovered       BIGINT NOT NULL DEFAULT 0,
  version               INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL,
  metadata              JSONB
);

CREATE INDEX idx_distribution_status ON distribution_read_model(status);
CREATE INDEX idx_distribution_type ON distribution_read_model(distribution_type);
CREATE INDEX idx_distribution_schedule ON distribution_read_model(schedule_id);
CREATE INDEX idx_distribution_created ON distribution_read_model(created_at DESC);

CREATE TABLE distribution_recipient_read_model (
  id                UUID PRIMARY KEY,
  distribution_id   UUID NOT NULL REFERENCES distribution_read_model(id),
  investor_id       UUID NOT NULL,
  eligible_amount   BIGINT NOT NULL,
  paid_amount       BIGINT NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL,
  tx_hash           VARCHAR(255),
  failure_reason    TEXT,
  version           INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recipient_distribution ON distribution_recipient_read_model(distribution_id);
CREATE INDEX idx_recipient_investor ON distribution_recipient_read_model(investor_id);
CREATE INDEX idx_recipient_status ON distribution_recipient_read_model(status);

CREATE TABLE distribution_schedule_read_model (
  id                UUID PRIMARY KEY,
  distribution_type VARCHAR(20) NOT NULL,
  property_id       UUID NOT NULL,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  total_amount      BIGINT NOT NULL,
  per_unit_amount   BIGINT,
  currency          CHAR(3) NOT NULL,
  status            VARCHAR(20) NOT NULL,
  distribution_ids  UUID[],
  version           INTEGER NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL
);
```

### 7.2 Projection Handlers

| Projection | Source Event | Handler |
|-----------|-------------|---------|
| `distribution_read_model` | ALL Distribution events | `DistributionProjection` |
| `distribution_recipient_read_model` | RecipientPaymentPaid, RecipientPaymentFailed, RecipientPaymentRecovered | `RecipientProjection` |
| `distribution_schedule_read_model` | ALL Schedule events | `ScheduleProjection` |

---

## 8. REST API

### 8.1 Endpoints

All endpoints are prefixed with `/api/treasury/distributions`.

| Method | Path | Command/Query | Auth |
|--------|------|--------------|------|
| `POST` | `/api/treasury/distributions` | `CreateDistribution` | `treasury:distribution:create` |
| `GET` | `/api/treasury/distributions` | `ListDistributionsByStatus` | `treasury:distribution:read` |
| `GET` | `/api/treasury/distributions/:id` | `GetDistribution` | `treasury:distribution:read` |
| `POST` | `/api/treasury/distributions/:id/approve` | `ApproveDistribution` | `treasury:distribution:approve` |
| `POST` | `/api/treasury/distributions/:id/execute` | `ExecuteDistribution` | `treasury:distribution:execute` |
| `POST` | `/api/treasury/distributions/:id/complete` | `CompleteDistribution` | `treasury:distribution:complete` |
| `POST` | `/api/treasury/distributions/:id/cancel` | `CancelDistribution` | `treasury:distribution:cancel` |
| `POST` | `/api/treasury/distributions/:id/recover` | `RecoverDistribution` | `treasury:distribution:recover` |
| `GET` | `/api/treasury/distributions/:id/recipients` | `GetDistributionRecipients` | `treasury:distribution:read` |
| `GET` | `/api/treasury/distributions/:id/recipients/:rid` | `GetRecipientStatus` | `treasury:distribution:read` |
| `POST` | `/api/treasury/distributions/:id/reconcile` | `ReconcileDistribution` | `treasury:distribution:reconcile` |
| `GET` | `/api/treasury/distributions/summary` | `GetDistributionSummary` | `treasury:distribution:read` |
| `GET` | `/api/treasury/distributions/recoveries/pending` | `ListPendingRecoveries` | `treasury:distribution:recover` |
| `POST` | `/api/treasury/schedules` | `CreateDistributionSchedule` | `treasury:schedule:create` |
| `GET` | `/api/treasury/schedules` | `ListSchedulesByStatus` | `treasury:schedule:read` |
| `GET` | `/api/treasury/schedules/:id` | `GetDistributionSchedule` | `treasury:schedule:read` |
| `POST` | `/api/treasury/schedules/:id/activate` | `ActivateSchedule` | `treasury:schedule:activate` |
| `POST` | `/api/treasury/schedules/:id/close` | `CloseSchedule` | `treasury:schedule:close` |

### 8.2 Response Envelope

```typescript
// Success
{
  "status": "ok",
  "data": T,
  "meta": {
    "correlationId": "string",
    "timestamp": "ISO8601"
  }
}

// Error
{
  "status": "error",
  "error": {
    "code": "string",
    "message": "string",
    "details": {} | null,
    "correlationId": "string"
  }
}
```

---

## 9. Authorization Model

### 9.1 Permission Matrix

| Action | Role | Condition |
|--------|------|-----------|
| `treasury:distribution:create` | `treasury.manager` | — |
| `treasury:distribution:read` | `treasury.analyst`, `treasury.manager`, `investor` | Investors see only own distributions |
| `treasury:distribution:approve` | `treasury.approver` | Single-signature below threshold; multi-sig above |
| `treasury:distribution:execute` | `treasury.operator` | — |
| `treasury:distribution:complete` | `treasury.operator` | — |
| `treasury:distribution:cancel` | `treasury.manager` | Cannot cancel executing distributions |
| `treasury:distribution:recover` | `treasury.operator` | — |
| `treasury:distribution:reconcile` | `treasury.auditor` | — |
| `treasury:schedule:create` | `treasury.manager` | — |
| `treasury:schedule:activate` | `treasury.approver` | — |
| `treasury:schedule:close` | `treasury.manager` | — |

### 9.2 Multi-Signature Approval

For distributions exceeding a configurable threshold (e.g., $50,000 equivalent):

```typescript
interface MultiSigDistributionApproval {
  distributionId: DistributionId;
  requiredApprovals: number;
  approvals: Approval[];
  threshold: Money;
}

interface Approval {
  approverId: EntityId;
  approvedAt: Timestamp;
  signature: string;
}
```

### 9.3 Investor Data Isolation

- Investors SHALL only see distributions where they are a recipient.
- Investors SHALL NOT see aggregate distribution totals or other recipients.
- Treasury managers and auditors SHALL have full visibility.

---

## 10. Error Hierarchy

### 10.1 Error Classes

All errors extend `TreasuryError` from `packages/treasury/src/errors.ts`.

| Error Class | Code | HTTP | Cause |
|-----------|------|------|-------|
| `DistributionError` | `DISTRIBUTION_ERROR` | 422 | Base distribution error |
| `DistributionNotFoundError` | `DISTRIBUTION_NOT_FOUND` | 404 | Invalid distribution ID |
| `DistributionInvalidStatusError` | `DISTRIBUTION_INVALID_STATUS` | 409 | Illegal status transition |
| `DistributionAlreadyCompletedError` | `DISTRIBUTION_ALREADY_COMPLETED` | 409 | Double completion attempt |
| `InsufficientReservedFundsError` | `INSUFFICIENT_RESERVED_FUNDS` | 422 | Source account underfunded |
| `RecipientNotFoundError` | `RECIPIENT_NOT_FOUND` | 404 | Invalid recipient ID |
| `RecipientAlreadyPaidError` | `RECIPIENT_ALREADY_PAID` | 409 | Duplicate payment attempt |
| `RecipientPaymentFailedError` | `RECIPIENT_PAYMENT_FAILED` | 422 | Payment provider rejected |
| `DistributionScheduleNotFoundError` | `SCHEDULE_NOT_FOUND` | 404 | Invalid schedule ID |
| `ScheduleInvalidStatusError` | `SCHEDULE_INVALID_STATUS` | 409 | Illegal schedule transition |
| `ExecutionBatchError` | `EXECUTION_BATCH_ERROR` | 422 | Batch processing failure |
| `RecoveryNotPossibleError` | `RECOVERY_NOT_POSSIBLE` | 422 | Recovery preconditions not met |
| `ReconciliationError` | `RECONCILIATION_ERROR` | 422 | Balance mismatch detected |
| `MultiSigThresholdNotMet` | `MULTISIG_THRESHOLD_NOT_MET` | 403 | Insufficient approvals |
| `UnauthorizedDistributionAction` | `UNAUTHORIZED_DISTRIBUTION_ACTION` | 403 | Missing permission |

### 10.2 Error Response Format

```json
{
  "error": {
    "code": "DISTRIBUTION_INVALID_STATUS",
    "message": "Cannot approve distribution in status 'Executing'",
    "details": {
      "distributionId": "uuid",
      "currentStatus": "Executing",
      "expectedStatus": "Draft",
      "transition": "Draft -> Approved"
    },
    "correlationId": "uuid"
  }
}
```

---

## 11. Idempotency Strategy

### 11.1 Idempotency Key

Every mutating command SHALL accept an `idempotencyKey` in its metadata.

```typescript
interface CommandMetadata {
  actorId: EntityId;
  correlationId: CorrelationId;
  idempotencyKey?: string; // Client-provided UUID
  timestamp: Timestamp;
}
```

### 11.2 Idempotency Store

The existing `TreasuryRepository` already has:
```typescript
isEventProcessed(idempotencyKey: string): Promise<boolean>;
markEventProcessed(idempotencyKey: string): Promise<void>;
```

Implementation:
- Keys stored with a TTL of 24 hours.
- On command receipt, check `isEventProcessed`. If processed, return the previous result.
- On successful command completion, `markEventProcessed` with the result.
- On command failure, allow retry with the same key (delete the key or mark as failed).

### 11.3 Idempotency Per Aggregate

For aggregate-based operations, the aggregate version acts as a natural idempotency guard:
- If a command is replayed, the aggregate's `loadFromHistory` will replay all events, and the command handler will see the aggregate in the target state (already transitioned).
- The handler checks the current status and rejects if the transition is invalid.

### 11.4 At-Least-Once Delivery for Cross-Domain Events

Published events use the `idempotencyKey` from the originating command. Downstream consumers SHALL use this key for their own idempotency checking to handle duplicate deliveries.

---

## 12. Retry Strategy

### 12.1 Per-Recipient Retry

Failed recipient payments SHALL NOT block other recipients. The system SHALL:

1. Record the failure with a reason code.
2. Continue processing the remaining batch.
3. Expose failed recipients via `ListPendingRecoveries`.
4. Support manual or automatic retry via `RecoverDistribution`.

### 12.2 Retry Policy (for Payment Processing)

```typescript
const retryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: [
    'PROVIDER_TIMEOUT',
    'PROVIDER_UNAVAILABLE',
    'NETWORK_ERROR',
    'RATE_LIMITED'
  ],
  nonRetryableErrors: [
    'INSUFFICIENT_FUNDS',
    'INVALID_ACCOUNT',
    'FRAUD_DETECTED',
    'COMPLIANCE_REJECTED'
  ]
};
```

### 12.3 Batch Execution Retry

- If a batch execution fails mid-way, the system SHALL record a checkpoint of processed recipients.
- On retry, the system SHALL skip already-paid recipients and resume from the checkpoint.
- The `ExecuteDistribution` command SHALL be safe to re-issue.

### 12.4 Recovery Orchestration

```typescript
interface RecoveryOrchestrator {
  recoverDistribution(
    distributionId: DistributionId,
    strategy: RecoveryStrategy,
    actorId: EntityId
  ): Promise<RecoveryResult>;
}

enum RecoveryStrategy {
  ReAttempt = 're_attempt',     // Retry failed payments
  Manual = 'manual',            // Flag for manual intervention
  WriteOff = 'write_off'        // Accept loss, close out
}
```

---

## 13. Concurrency Strategy

### 13.1 Optimistic Concurrency via Aggregate Version

The `Distribution` aggregate uses the standard event-sourcing optimistic concurrency:

```typescript
// Repository
saveDistribution(events: DomainEvent[], expectedVersion: number): Promise<void>;

// Handler
const distribution = await distributionRepository.loadById(id);
distribution.execute(cmd.data);
await distributionRepository.save(
  distribution.getUncommittedEvents(),
  distribution.version
);
```

On version conflict (`OptimisticConcurrencyError`), the handler retries with a fresh load.

### 13.2 Global Ordering via Event Store

- Events within a stream are strictly ordered by version.
- Cross-stream ordering uses `globalPosition` from the event store.
- Projections use `globalPosition` as a checkpoint cursor for ordered replay.

### 13.3 Batch Execution Concurrency

- Recipient payments within a batch MAY be processed in parallel.
- Each recipient SHALL be its own aggregate stream with independent versioning.
- Parallel processing SHALL use a configurable concurrency limit (default: 10).
- The distribution aggregate SHALL track a running counter of processed recipients.

```typescript
interface BatchExecutionConfig {
  batchSize: number;         // Number of recipients per batch
  concurrency: number;       // Parallel workers
  checkpointInterval: number; // Save progress every N payments
}
```

### 13.4 Distribution Schedule Locking

- A distribution schedule SHALL NOT have two concurrent `ActivateSchedule` commands.
- The schedule aggregate version enforces this.
- Distribution creation from a schedule SHALL be serialized per schedule.

---

## 14. Audit Logging

### 14.1 Audit Event Structure

```typescript
interface DistributionAuditEvent {
  auditId: string;
  aggregateType: 'distribution' | 'distribution_recipient' | 'distribution_schedule';
  aggregateId: string;
  action: string;
  actorId: string;
  previousStatus: string | null;
  newStatus: string | null;
  changes: Json;
  reason: string | null;
  correlationId: string;
  idempotencyKey: string | null;
  timestamp: Timestamp;
}
```

### 14.2 Audit Triggers

| Action | Audit Entry |
|--------|-------------|
| Distribution created | Full payload, actor, timestamp |
| Distribution approved | Approver, approval method (single/multi-sig) |
| Distribution execution started | Batch config, total recipients |
| Recipient payment succeed | Recipient ID, amount, tx hash |
| Recipient payment failed | Recipient ID, amount, error reason |
| Distribution completed | Final totals, duration |
| Distribution cancelled | Canceller, reason |
| Recovery action | Recovery strategy, affected recipients |
| Reconciliation | Discrepancies found, resolved status |

### 14.3 Audit Output

Audit events are dual-published:
1. Written to the event store as domain events (permanent, immutable).
2. Published to a separate `audit` event bus topic for SIEM/analytics integration.

---

## 15. Sequence Diagrams

### 15.1 Happy Path: Dividend Distribution

```
Investor     Governance     Treasury       Portfolio     EventStore
   |             |             |               |             |
   |             |   Propose   |               |             |
   |             |────────────>|               |             |
   |             |             | CreateDistribution           |
   |             |             |──────────────>|             |
   |             |             |<DistributionCreated>        |
   |             |   Approve  |               |             |
   |             |────────────>|               |             |
   |             |             | ApproveDistribution         |
   |             |             |──────────────>|             |
   |             |             | ReserveFunds                |
   |             |             |────┐                       |
   |             |             |    │ (MovementService)     |
   |             |             |<───┘                       |
   |             |             |<DistributionApproved>      |
   |             |             |                            |
   |             |             | CreateSnapshot             |
   |   Schedule  |             |────┐                       |
   |   Activates |             |    │ (DividendService)     |
   |             |             |<───┘                       |
   |             |             | ExecuteDistribution        |
   |             |             |──────────────>|             |
   |             |             | Batch:                     |
   |             |             | ──►RecipientPaid (×N)     |
   |             |             | ──►RecipientFailed (×M)   |
   |             | Complete    |               |             |
   |<────────────|─────────────|──────────────>|             |
   |             |             |               |             |
   |             |             |<DistributionCompleted>     |
   |  Receive    |             | PublishEvent               |
   |  Payment    |<════════════|═══════════════|══════════>  |
```

### 15.2 Recovery Flow

```
Operator      Treasury       EventStore
   |             |             |
   | List Pending              |
   |────────────>|             |
   |<─── FailedRecipients      |
   |             |             |
   | Recover     |             |
   |────────────>|             |
   |             | for each:   |
   |             | ──►Retry    |
   |             | ──►Success  |
   |             | ──►Record   |
   |             |────────────>|
   |             |             |
   |             |<DistributionRecovered>
   |<─── RecoveryResult        |
```

### 15.3 Reconciliation Flow

```
Auditor       Treasury       TreasuryAccount   EventStore
   |             |               |               |
   | Reconcile   |               |               |
   |────────────>|               |               |
   |             | Compute:                       |
   |             │ sum(paid) vs                   |
   |             │ account movement               |
   |             |────┐           |               |
   |             |    │ Compare   |               |
   |             |<───┘           |               |
   |             |               |               |
   |             |──┐ Match?     |               |
   |             |  │ YES: Pass  |               |
   |             |  │ NO:  Flag  |               |
   |             |<──┘           |               |
   |             |<DistributionReconciled>        |
   |<─── Report                    |               |
```

---

## 16. Testing Strategy

### 16.1 Test Pyramid

```
         ┌──────┐
         │ E2E  │  Critical paths only (3-5 tests)
        ┌┴──────┴┐
        │Integration│  Aggregate + EventStore + Projection
       ┌┴──────────┴┐
       │  Unit Tests │  Domain logic, state machines, calculations
       └─────────────┘
```

### 16.2 Unit Tests

| Test Suite | Coverage | Examples |
|-----------|----------|----------|
| Distribution State Machine | All 15 transitions | Draft→Approved, Approved→Executing, Executing→Failed, Failed→Recovered |
| Distribution Invariants | 5 invariants | Total amount validation, status guards |
| Recipient State Machine | 3 transitions | Pending→Paid, Pending→Failed, Failed→Recovered |
| Calculation Service | Allocation methods | Pro-rata, fixed, tiered, edge cases (zero, rounding) |
| Money Arithmetic | All operations | Addition, subtraction, comparison, currency mismatch |
| Eligibility Computation | Rules engine | Minimum holdings, exclusion lists, date-based eligibility |
| Recovery Orchestration | Strategy selection | Re-attempt, manual, write-off |

### 16.3 Integration Tests

| Test Suite | System Under Test | Key Scenarios |
|-----------|------------------|---------------|
| Distribution Lifecycle | Aggregate + Repository + EventStore | Full happy path, cancellation, failure + recovery |
| Batch Execution | Aggregate + EventStore + PaymentProvider (mock) | 100 recipients, partial failure, progress checkpoint |
| Concurrency | Aggregate + Repository | Two concurrent approvals, version conflict resolution |
| Idempotency | Command Handler + IdempotencyStore | Duplicate command, replayed command after failure |
| Multi-Sig Approval | Aggregate + Repository | Threshold met, threshold not met, double-signature |

### 16.4 Test Fixtures

```typescript
// Builder pattern for Distribution aggregate
class DistributionBuilder {
  static default(): DistributionBuilder;
  withId(id: DistributionId): this;
  withType(type: DistributionType): this;
  withAmount(amount: bigint): this;
  withRecipients(count: number): this;
  inStatus(status: DistributionStatus): this;
  build(): Distribution;
}

// Test events
const distributionCreated = distributionCreatedEvent({
  distributionType: DistributionType.Dividend,
  totalAmount: BigInt(1000000), // $10,000.00 in cents
  currency: 'USD',
  allocationMethod: AllocationMethod.ProRata,
});
```

### 16.5 Property-Based Tests

| Property | Description |
|----------|-------------|
| `totalAmount === sum(eligibleAmounts)` | Distribution invariants after creation |
| `sum(paid + failed + recovered) <= totalAmount` | Never over-distribute |
| `completed => sum(paid + recovered) === totalAmount - writeOff` | Completion integrity |
| `∀e ∈ events: replay(e) === original` | Event sourcing determinism |

---

## 17. Security Considerations

### 17.1 Input Validation

- All monetary amounts validated as positive integers in smallest unit.
- Currency codes validated against ISO 4217.
- Distribution amounts checked against source account balance before approval.
- Recipient lists validated against the portfolio adapter (no phantom recipients).

### 17.2 Access Control

- All distribution mutations require explicit permission check.
- Investor data isolation enforced at the query handler level.
- Multi-sig approval enforced for high-value distributions.
- Rate limiting on `ExecuteDistribution` (max 1 concurrent execution per source account).

### 17.3 Data Integrity

- All financial operations use integer arithmetic only (no floating point).
- Double-entry ledger enforced for all treasury movements.
- Event store provides append-only, immutable audit trail.
- Aggregate versioning prevents lost updates.

### 17.4 Secrets Management

- Payment provider credentials stored in external secrets manager.
- No secrets in event payloads.
- Idempotency keys are internal-only (not exposed to external clients after initial response).

### 17.5 Compliance

- Distribution records retained per regulatory requirements (configurable, default 7 years).
- Audit events are immutable and independently queryable.
- Privacy: investor IDs in events are the canonical Identity aggregate IDs (not PII).

---

## 18. Folder Structure

```
packages/treasury/
├── src/
│   ├── distribution/                    # NEW: M3-3 Distribution Module
│   │   ├── index.ts                     # Public exports
│   │   ├── distribution.module.ts       # Module registration
│   │   │
│   │   ├── domain/                      # Domain layer
│   │   │   ├── distribution.aggregate.ts
│   │   │   ├── distribution-recipient.aggregate.ts
│   │   │   ├── distribution-schedule.aggregate.ts
│   │   │   ├── value-objects.ts
│   │   │   ├── errors.ts
│   │   │   ├── events.ts
│   │   │   └── state-machine.ts
│   │   │
│   │   ├── application/                 # Application layer (CQRS)
│   │   │   ├── commands/
│   │   │   │   ├── create-distribution.command.ts
│   │   │   │   ├── create-distribution.handler.ts
│   │   │   │   ├── approve-distribution.command.ts
│   │   │   │   ├── approve-distribution.handler.ts
│   │   │   │   ├── execute-distribution.command.ts
│   │   │   │   ├── execute-distribution.handler.ts
│   │   │   │   ├── complete-distribution.command.ts
│   │   │   │   ├── complete-distribution.handler.ts
│   │   │   │   ├── cancel-distribution.command.ts
│   │   │   │   ├── cancel-distribution.handler.ts
│   │   │   │   ├── fail-distribution.command.ts
│   │   │   │   ├── fail-distribution.handler.ts
│   │   │   │   ├── recover-distribution.command.ts
│   │   │   │   ├── recover-distribution.handler.ts
│   │   │   │   ├── process-recipient-payment.command.ts
│   │   │   │   ├── process-recipient-payment.handler.ts
│   │   │   │   ├── fail-recipient-payment.command.ts
│   │   │   │   ├── fail-recipient-payment.handler.ts
│   │   │   │   ├── recover-recipient-payment.command.ts
│   │   │   │   ├── recover-recipient-payment.handler.ts
│   │   │   │   ├── create-schedule.command.ts
│   │   │   │   ├── create-schedule.handler.ts
│   │   │   │   ├── activate-schedule.command.ts
│   │   │   │   ├── activate-schedule.handler.ts
│   │   │   │   ├── close-schedule.command.ts
│   │   │   │   ├── close-schedule.handler.ts
│   │   │   │   ├── reconcile-distribution.command.ts
│   │   │   │   └── reconcile-distribution.handler.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── get-distribution.query.ts
│   │   │   │   ├── get-distribution.handler.ts
│   │   │   │   ├── list-distributions.query.ts
│   │   │   │   ├── list-distributions.handler.ts
│   │   │   │   ├── get-recipients.query.ts
│   │   │   │   ├── get-recipients.handler.ts
│   │   │   │   ├── get-recipient-status.query.ts
│   │   │   │   ├── get-recipient-status.handler.ts
│   │   │   │   ├── list-recipients-by-investor.query.ts
│   │   │   │   ├── list-recipients-by-investor.handler.ts
│   │   │   │   ├── get-distribution-summary.query.ts
│   │   │   │   ├── get-distribution-summary.handler.ts
│   │   │   │   ├── list-pending-recoveries.query.ts
│   │   │   │   ├── list-pending-recoveries.handler.ts
│   │   │   │   ├── get-schedule.query.ts
│   │   │   │   ├── get-schedule.handler.ts
│   │   │   │   ├── list-schedules.query.ts
│   │   │   │   ├── list-schedules.handler.ts
│   │   │   │   ├── get-reconciliation-report.query.ts
│   │   │   │   └── get-reconciliation-report.handler.ts
│   │   │   │
│   │   │   └── dto/
│   │   │       ├── distribution.dto.ts
│   │   │       ├── recipient.dto.ts
│   │   │       └── schedule.dto.ts
│   │   │
│   │   ├── domain-services/             # Domain services
│   │   │   ├── distribution-calculation.service.ts
│   │   │   ├── distribution-execution.service.ts
│   │   │   ├── recovery-orchestrator.service.ts
│   │   │   ├── treasury-reservation.service.ts
│   │   │   └── reconciliation-evaluator.service.ts
│   │   │
│   │   ├── infrastructure/              # Infrastructure layer
│   │   │   ├── distribution.repository.ts
│   │   │   ├── distribution-event-store.repository.ts
│   │   │   ├── distribution-projection.ts
│   │   │   ├── recipient-projection.ts
│   │   │   ├── schedule-projection.ts
│   │   │   ├── idempotency-store.ts
│   │   │   └── payment-gateway/
│   │   │       ├── payment-gateway.interface.ts
│   │   │       ├── payment-gateway.mock.ts
│   │   │       └── payment-gateway.stripe.ts
│   │   │
│   │   ├── interfaces/                  # API layer
│   │   │   ├── distribution.controller.ts
│   │   │   ├── distribution-schedule.controller.ts
│   │   │   ├── distribution.routes.ts
│   │   │   ├── distribution.validator.ts
│   │   │   └── distribution.swagger.ts
│   │   │
│   │   ├── adapters/                    # Cross-domain adapters
│   │   │   ├── portfolio.adapter.ts
│   │   │   ├── governance.adapter.ts
│   │   │   └── identity.adapter.ts
│   │   │
│   │   └── __tests__/                   # Tests
│   │       ├── unit/
│   │       │   ├── distribution.aggregate.test.ts
│   │       │   ├── distribution-recipient.test.ts
│   │       │   ├── distribution-schedule.test.ts
│   │       │   ├── state-machine.test.ts
│   │       │   ├── calculation-service.test.ts
│   │       │   └── money.test.ts
│   │       ├── integration/
│   │       │   ├── distribution-lifecycle.test.ts
│   │       │   ├── batch-execution.test.ts
│   │       │   ├── concurrency.test.ts
│   │       │   ├── idempotency.test.ts
│   │       │   └── multisig.test.ts
│   │       └── fixtures/
│   │           ├── distribution.fixture.ts
│   │           ├── events.fixture.ts
│   │           └── builders.ts
│   │
│   └── (existing modules remain)
│       ├── account-service.ts
│       ├── ledger-service.ts
│       ├── movement-service.ts
│       ├── dividend-service.ts
│       ├── dividend-claim-service.ts
│       └── ...
│
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 19. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 1.1 | Define value objects and errors | `errors.ts`, `value-objects.ts` | — |
| 1.2 | Implement state machine | `state-machine.ts` with exhaustive transition map | 1.1 |
| 1.3 | Implement Distribution aggregate | `distribution.aggregate.ts` with `when()` and business methods | 1.2 |
| 1.4 | Implement DistributionRecipient aggregate | `distribution-recipient.aggregate.ts` | 1.1 |
| 1.5 | Implement DistributionSchedule aggregate | `distribution-schedule.aggregate.ts` | 1.1 |
| 1.6 | Define events | `events.ts` with all event classes | 1.1 |
| 1.7 | Unit tests for aggregates | All state machine transitions + invariants | 1.3-1.6 |

### Phase 2: CQRS Handlers (Week 3-4)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 2.1 | Create/Approve/Cancel commands | `create-distribution.handler.ts`, `approve-distribution.handler.ts`, `cancel-distribution.handler.ts` | 1.3 |
| 2.2 | Execute/Complete/Fail commands | `execute-distribution.handler.ts`, `complete-distribution.handler.ts`, `fail-distribution.handler.ts` | 1.3 |
| 2.3 | Recovery commands | `recover-distribution.handler.ts`, `recover-recipient-payment.handler.ts` | 1.4 |
| 2.4 | Schedule commands | `create-schedule.handler.ts`, `activate-schedule.handler.ts`, `close-schedule.handler.ts` | 1.5 |
| 2.5 | Query handlers | All 12 query handlers | 1.3-1.5 |
| 2.6 | DTOs and mappings | `distribution.dto.ts`, `recipient.dto.ts`, `schedule.dto.ts` | — |

### Phase 3: Domain Services (Week 5)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 3.1 | DistributionCalculationService | Pro-rata, fixed, tiered calculation | 1.1 |
| 3.2 | DistributionExecutionService | Batch processing, checkpoint, parallel execution | 2.2 |
| 3.3 | RecoveryOrchestrator | Re-attempt, manual, write-off strategies | 2.3 |
| 3.4 | TreasuryReservationService | Fund reservation via MovementService | — |
| 3.5 | ReconciliationEvaluator | Balance comparison, discrepancy detection | — |

### Phase 4: Infrastructure (Week 6-7)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 4.1 | Event store repository | `distribution-event-store.repository.ts` | 2.1-2.4 |
| 4.2 | Projections | `distribution-projection.ts`, `recipient-projection.ts`, `schedule-projection.ts` | 1.6 |
| 4.3 | Idempotency store | `idempotency-store.ts` | — |
| 4.4 | Payment gateway interface + mock | `payment-gateway.interface.ts`, `payment-gateway.mock.ts` | — |
| 4.5 | Integration tests | Full lifecycle, batch execution, concurrency, idempotency | 4.1-4.4 |

### Phase 5: API & Adapters (Week 8)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 5.1 | REST controller | `distribution.controller.ts` | 2.5 |
| 5.2 | Request validation | `distribution.validator.ts` | — |
| 5.3 | Cross-domain adapters | `portfolio.adapter.ts`, `governance.adapter.ts`, `identity.adapter.ts` | — |
| 5.4 | Auth middleware integration | Permission checks | — |
| 5.5 | API tests | All endpoints | 5.1-5.4 |
| 5.6 | E2E tests | Critical distribution paths | 5.5 |

### Phase 6: Reconciliation & Hardening (Week 9)

| Step | Task | Deliverable | Depends On |
|------|------|-------------|------------|
| 6.1 | Multi-sig approval | Multi-signature distribution approval | 2.1 |
| 6.2 | Reconciliation endpoint | `reconcile-distribution.handler.ts` | 3.5 |
| 6.3 | Audit event integration | Dual-publish to audit topic | — |
| 6.4 | Property-based tests | Distribution invariant verification | 4.1 |
| 6.5 | Performance benchmarks | 10K recipient distribution, recovery | 4.2 |

---

## 20. Risks and Mitigation

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|------------|------------|
| R1 | Payment gateway outage blocks distribution | High — payments cannot complete | Medium | Idempotent retry with exponential backoff; manual recovery path; circuit breaker for provider |
| R2 | Concurrent distribution approval creates double-reservation | High — funds reserved twice | Low | Aggregate versioning prevents concurrent writes; conditional reservation with idempotency key |
| R3 | Batch execution failure mid-way with inconsistent state | High — partial distribution | Medium | Checkpoint every N payments; resume from checkpoint; distribution-level completion guard |
| R4 | Integer overflow in monetary calculations | High — incorrect distribution | Very Low | Use `bigint` for all amounts; property-based tests with max supply × max price |
| R5 | Replayed events cause duplicate cross-domain side effects | Medium — duplicate notifications | Low | Cross-domain idempotency via `idempotencyKey`; at-least-once delivery with deduplication |
| R6 | Investor eligibility snapshot changes during distribution | Medium — incorrect recipients | Medium | Snapshot frozen at schedule activation; distribution uses snapshot version, not live data |
| R7 | Multi-sig quorum never reached | Low — distribution blocked | Low | Configurable timeout and escalation path; governance override for stale proposals |
| R8 | Recovery attempts loop indefinitely on consistently failing payments | Low — resource exhaustion | Low | Maximum retry limit (3); escalation to manual review after limit reached |
| R9 | Reconciliation detects persistent discrepancy | Medium — audit finding | Low | Configurable tolerance threshold; manual resolution workflow; full event trace for investigation |
| R10 | Cross-domain adapter failures (Portfolio/Governance unavailable) | Medium — distribution blocked | Medium | Cached snapshot strategy; graceful degradation with stale data warning; timeout with circuit breaker |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Distribution | A single execution of value transfer from treasury to eligible recipients |
| Recipient | An entity entitled to receive a distribution payment |
| Distribution Schedule | A plan defining recurring distribution terms (period, amount, eligibility) |
| Ownership Snapshot | A point-in-time record of token holder positions |
| Pro-Rata | Allocation method where value is distributed proportionally to ownership |
| Multi-Sig | Multi-signature approval requiring multiple authorized parties |
| Recovery | The process of retrying or writing off failed distribution payments |
| Reconciliation | The process of verifying distributed amounts match treasury movements |
| Checkpoint | A saved progress marker for resuming interrupted batch execution |

## Appendix B: Command/Query Index

| Identifier | Type | Route | Auth |
|-----------|------|-------|------|
| `TreasuryDistributionCreate` | Command | `POST /api/treasury/distributions` | `treasury:distribution:create` |
| `TreasuryDistributionApprove` | Command | `POST /api/treasury/distributions/:id/approve` | `treasury:distribution:approve` |
| `TreasuryDistributionExecute` | Command | `POST /api/treasury/distributions/:id/execute` | `treasury:distribution:execute` |
| `TreasuryDistributionComplete` | Command | `POST /api/treasury/distributions/:id/complete` | `treasury:distribution:complete` |
| `TreasuryDistributionCancel` | Command | `POST /api/treasury/distributions/:id/cancel` | `treasury:distribution:cancel` |
| `TreasuryDistributionFail` | Command | (internal) | `treasury:distribution:execute` |
| `TreasuryDistributionRecover` | Command | `POST /api/treasury/distributions/:id/recover` | `treasury:distribution:recover` |
| `TreasuryRecipientPay` | Command | (internal) | `treasury:distribution:execute` |
| `TreasuryRecipientFail` | Command | (internal) | `treasury:distribution:execute` |
| `TreasuryRecipientRecover` | Command | (internal) | `treasury:distribution:recover` |
| `TreasuryScheduleCreate` | Command | `POST /api/treasury/schedules` | `treasury:schedule:create` |
| `TreasuryScheduleActivate` | Command | `POST /api/treasury/schedules/:id/activate` | `treasury:schedule:activate` |
| `TreasuryScheduleClose` | Command | `POST /api/treasury/schedules/:id/close` | `treasury:schedule:close` |
| `TreasuryDistributionReconcile` | Command | `POST /api/treasury/distributions/:id/reconcile` | `treasury:distribution:reconcile` |
| `GetTreasuryDistribution` | Query | `GET /api/treasury/distributions/:id` | `treasury:distribution:read` |
| `ListTreasuryDistributions` | Query | `GET /api/treasury/distributions` | `treasury:distribution:read` |
| `GetTreasuryDistributionRecipients` | Query | `GET /api/treasury/distributions/:id/recipients` | `treasury:distribution:read` |
| `GetTreasuryRecipientStatus` | Query | `GET /api/treasury/distributions/:id/recipients/:rid` | `treasury:distribution:read` |
| `ListTreasuryRecipientsByInvestor` | Query | `GET /api/investors/:id/distributions` | `investor:self` |
| `GetTreasuryDistributionSummary` | Query | `GET /api/treasury/distributions/summary` | `treasury:distribution:read` |
| `ListTreasuryPendingRecoveries` | Query | `GET /api/treasury/distributions/recoveries/pending` | `treasury:distribution:recover` |
| `GetTreasuryDistributionSchedule` | Query | `GET /api/treasury/schedules/:id` | `treasury:schedule:read` |
| `ListTreasuryDistributionSchedules` | Query | `GET /api/treasury/schedules` | `treasury:schedule:read` |
| `GetTreasuryReconciliationReport` | Query | `GET /api/treasury/distributions/:id/reconcile` | `treasury:distribution:reconcile` |
