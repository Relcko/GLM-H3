# M3-3 Treasury & Distribution Engine — Architecture Revision v2

| Metadata | Value |
|----------|-------|
| **Milestone** | M3-3 |
| **Domain** | Treasury / Distribution |
| **Base Package** | `packages/treasury` |
| **Pattern** | Event Sourcing + CQRS + Saga Orchestration + Clean Architecture |
| **Cross-Cuts** | Identity, Portfolio, Governance, Investment |
| **Status** | Architecture Revision v2 — for final approval before implementation |
| **Supersedes** | `docs/M3-3-TREASURY-DISTRIBUTION-ENGINE.md` (v1) |
| **Revision Driver** | Principal Architect review |

---

## Table of Contents

1. [Revision Summary](#1-revision-summary)
2. [Review Findings Disposition](#2-review-findings-disposition)
3. [Software Requirements Specification (SRS)](#3-software-requirements-specification-srs)
4. [Domain Model](#4-domain-model)
5. [CQRS](#5-cqrs)
6. [Events](#6-events)
7. [DistributionSaga](#7-distributionsaga)
8. [Aggregate Responsibilities](#8-aggregate-responsibilities)
9. [State Machines](#9-state-machines)
10. [Storage Model](#10-storage-model)
11. [REST API](#11-rest-api)
12. [Authorization Model & Security Contracts](#12-authorization-model--security-contracts)
13. [Error Hierarchy](#13-error-hierarchy)
14. [Idempotency Strategy (Financial-Grade)](#14-idempotency-strategy-financial-grade)
15. [Retry Strategy](#15-retry-strategy)
16. [Concurrency Strategy](#16-concurrency-strategy)
17. [Audit Logging](#17-audit-logging)
18. [Migration Strategy from M3-2B](#18-migration-strategy-from-m3-2b)
19. [Sequence Diagrams](#19-sequence-diagrams)
20. [Testing Strategy](#20-testing-strategy)
21. [Folder Structure](#21-folder-structure)
22. [Implementation Roadmap (Reordered)](#22-implementation-roadmap-reordered)
23. [Risks and Mitigation](#23-risks-and-mitigation)

---

## 1. Revision Summary

The Principal Architect review identified systemic issues in v1 that would block financial-grade production deployment. v2 preserves the original aggregate decomposition and CQRS/event-sourcing foundation but introduces the following structural changes:

1. **Eventual consistency for execution.** Recipient payment is no longer performed inside the `ExecuteDistribution` handler. A persistent `DistributionSaga` orchestrates per-recipient settlement asynchronously, with compensating actions on failure.
2. **Removal of live progress counter on the `Distribution` aggregate.** Per-recipient progress is observed entirely through the recipient read-model; the distribution aggregate is no longer written once per recipient.
3. **Financial-grade idempotency.** TTL-based in-memory keys are replaced by a durable, append-only Idempotency Ledger co-committed in the same transaction as the produced events. Cross-domain deduplication is governed by the Outbox.
4. **Recipient materialization as an explicit domain step.** A new lifecycle phase `RecipientsMaterialized` (between `Approved` and `Executing`) plus dedicated commands/events decouples eligibility materialization from execution.
5. **State-machine consolidation.** `Recovered` is removed as a distribution-level status (recovery is per-recipient). Transitions are made unambiguous and exhaustive.
6. **Cleaned event model.** The `DistributionExecutionProgress` event is deleted; recipient-tier events are the source of per-recipient truth; events are described as immutable records with versioning rules.
7. **Security contracts specified.** Signed command payloads, signed approvals, tamper-evident audit trail, data-isolation enforcement contracts, and signing-key custody rules.
8. **NFR-1 split.** Internal command-response objective (applies to API callers) is separated from the external per-recipient throughput SLA (applies to settlement completion).
9. **Roadmap reordered** so Saga infrastructure and the Idempotency Ledger precede execution handlers.
10. **Migration from M3-2B** is specified as a dual-write + backfill + cutover strategy rather than a breaking replacement.

---

## 2. Review Findings Disposition

Each finding is drawn from the Principal Architect review. Disposition is recorded as **Accepted**, **Partially Accepted**, or **Rejected**; rejected findings carry an engineering justification.

### 2.1 Preserve existing aggregate split
**Disposition: Accepted.**

The three aggregates (`Distribution`, `DistributionRecipient`, `DistributionSchedule`) are preserved. Their static structure is sound; the defects are in the orchestration and lifecycle model, not in the aggregate boundaries. The `DistributionRecipient` aggregate remains the unit of per-recipient payment truth, which is required for financial-grade audit.

### 2.2 Adopt eventual consistency using a `DistributionSaga`
**Disposition: Accepted.**

The synchronous batch execution inside `ExecuteDistribution` is replaced. `ExecuteDistribution` now transitions the `Distribution` aggregate to `Executing` and **starts** a `DistributionSaga`. The saga drives per-recipient payment as transactions against `DistributionRecipient` aggregates, then emits a terminal `CompleteDistribution` or `FailDistribution` command back to the `Distribution` aggregate when the recipient set reaches a terminal p95.

Rationale: a single synchronous handler cannot maintain a 5-second wall-clock SLA for 10,000 recipients under realistic ledger/payment-gateway latency; mixed synchronous/asynchronous persistence also violates single-writer-per-stream expectations.

### 2.3 Remove the live `Distribution` progress counter
**Disposition: Accepted.**

The `DistributionExecutionProgress` event is deleted. The `Distribution` aggregate is not written once per recipient. Running totals (`totalDistributed`, `totalFailed`, `totalRecovered`) are no longer mutated per-recipient; they are recomputed **only** at terminal transition (`ExecutionFinalized`), from the recipient read-model. Live progress is served by projections over recipient-tier events, not by re-loading the distribution aggregate.

Rationale: per-recipient writes to the distribution stream create a serialization point that destroys horizontal scalability, conflict on optimistic-concurrency retries, and a high event-stream volume for replay.

### 2.4 Redesign idempotency for financial-grade durability
**Disposition: Accepted.**

The v1 design (client-supplied `idempotencyKey` with a 24-hour TTL in a side store) is replaced by:

- A **durable, append-only Idempotency Ledger** table co-committed with the event-store write in the same database transaction.
- **No TTL** — entries are retained per regulatory retention policy (7 years default).
- Returned responses are persisted and replayed on duplicate submission.
- Cross-domain idempotency uses the transactional **Outbox**: outbound events carry `originatingIdempotencyKey` and a per-consumer `deliveredIdempotencyKey`; consumers record processed keys in their own Idempotency Ledger.

Rationale: any TTL-based dedup design can produce a duplicate payout during a late replay, which is an unrecoverable financial loss.

### 2.5 Add recipient materialization commands/events
**Disposition: Accepted.**

A new explicit step materializes `DistributionRecipient` aggregates from an ownership snapshot and eligibility rules, **before** any payment is attempted. New commands/events:

- Command: `MaterializeDistributionRecipients`
- Distribution-tier event: `DistributionRecipientsMaterialized` (carries `recipientCount`, `totalEligibleAmount`, materialization manifest hash)
- Recipient-tier event: `RecipientMaterialized` (emitted per recipient, with eligibility proof)

Materialization is gated by a snapshot reference (`snapshotId`) and an eligibility rule set. This decouples the slow eligibility computation from the fast execute step, lets operators audit the materialized set before execution, and removes the implicit "compute recipients inside execute" assumption from v1 that made retries ambiguous.

### 2.6 Resolve every state-machine inconsistency
**Disposition: Accepted.**

The v1 distribution state machine had the following defects, each resolved in v2 (see §9):

| # | Defect in v1 | Resolution in v2 |
|---|---------------|------------------|
| S1 | `Failed → Executing` (retry) and `Failed → Recovered` are both listed, but recovery is per-recipient; a distribution-level `Recovered` state is misleading. | `Recovered` removed as distribution-level status. Distribution-level recovery is now: distribution stays in `Executing` while per-recipient recoveries proceed; it transitions to `Completed` or `Failed` only at terminal reconciliation. |
| S2 | `Cancelled` reachable from `Executing` in the diagram, contradicting the rule "cannot cancel once execution started". | `Cancelled` is reachable only from `Draft`, `Approved`, and `RecipientsMaterialized`. `Executing` is **not** a cancellable state. |
| S3 | No explicit state between approved and execution; materialization had no home. | New `RecipientsMaterialized` state inserted between `Approved` and `Executing`. |
| S4 | `Recovered → Completed` listed but `Recovered` was also the distribution-level terminal-ish state, conflating per-recipient and per-distribution recovery. | Removed; only `Executing → Completed` or `Executing → Failed` are terminal from `Executing`. |
| S5 | `DistributionSchedule` diagram and enum disagreed (`Executing` vs implicit). | Schedule state machine formalized: `Draft → Scheduled → Executing → Completed`, with `Cancelled` only from `Draft` or `Scheduled`. |
| S6 | Recipient machine allowed `Failed → Recovered` but did not model re-attempt of a still-failed recipient (idempotency of recovery). | Recipient machine: `Pending → Paid \| Failed`; `Failed → Recovered \| Failed` (retry); both `Paid` and `Recovered` are terminal. `Failed` retains retry attempts count. |

### 2.7 Clean up the event model
**Disposition: Accepted.**

Changes applied in §6:

- `DistributionExecutionProgress` is **removed**.
- Per-recipient running totals are **not** events on the distribution stream.
- `DistributionExecutionStarted` retains only `{recipientCount, startedAt, sagaId}` — no batch/concurrency hints (those are saga-internal).
- New events added: `DistributionRecipientsMaterialized`, `RecipientMaterialized`, `DistributionExecutionFinalized` (terminal, computed totals included once).
- `RecipientPaymentPaid/Failed/Recovered` retains per-recipient truth; `statusCode` made structured (enum + reason).
- All event payloads are described as **immutable records**; `version` is always the aggregate's next version, not a hardcoded literal.
- Cross-domain event names are renamed to the project-wide convention `treasury.distribution.<verb>.<sub>` consistently (no pluralization drift).

### 2.8 Specify security contracts
**Disposition: Accepted.**

See §12. The following contracts are now normative:

- Command Authentication Contract (C1): every mutating command carries a signed `CommandMetadata.actor` envelope.
- Approval Signature Contract (C2): every `ApproveDistribution` is recorded with a verifiable cryptographic signature over the canonical command payload + distributionId + approvalEpoch.
- Multi-Sig Quorum Contract (C3): quorum is computed over distinct approver identities and distinct signing keys; stale signatures are rejected via an `approvalEpoch` derived from the distribution version.
- Data Isolation Contract (C4): recipient-scoped queries MUST return only rows for which `investorId == principal.investorId` when the principal's role is `investor`; this is enforced by both the query handler and a projection-level row filter.
- Audit Immutability Contract (C5): every audit record carries a chained hash `H(prevHash || canonicalEvent)`.
- Secrets Custody Contract (C6): payment-provider credentials are reference-only; values live in the secrets manager and are never serialized into events, outbox rows, or logs.

### 2.9 Redefine NFR-1 into separate internal and external performance objectives
**Disposition: Accepted.**

v1 NFR-1 ("Distribution execution SHALL complete within 5 seconds for up to 10,000 recipients") conflated API responsiveness with throughput. Split as:

- **NFR-1a (Internal / Command Responsiveness).** The `ExecuteDistribution` command, `MaterializeDistributionRecipients` command, and `ReconcileDistribution` command SHALL return within 200 ms (p95) regardless of recipient count. These commands only start a saga or compute from projections; they do not perform settlement.
- **NFR-1b (External / Settlement Throughput).** The DistributionSaga SHALL sustain per-recipient settlement throughput of ≥ 200 recipients / second (p50), and complete a 10,000-recipient dividend distribution end-to-end within 90 seconds (p95) excluding payment-gateway-side latency beyond 500 ms per call. Under provider outage, the saga SHALL degrade gracefully (see §15).

### 2.10 Reorder the implementation roadmap
**Disposition: Accepted.**

Roadmap reordered so Saga state, the Idempotency Ledger, and the Outbox ship **before** execution handlers (see §22). Attempting handlers first would propagate the v1 synchronous-batch defect into integration tests and downstream modules.

### 2.11 Add a migration strategy from the current M3-2B implementation
**Disposition: Accepted.**

v1 contained no migration from the existing `DividendClaim` / `DividendSchedule` / `ClaimReceipt` model of M3-2B. v2 §18 specifies a non-breaking migration: read-model federation, dual-write during a brownout, deterministic backfill of `DistributionRecipient` from historical claims, cutover by schedule, and retirement with a tombstone event.

### 2.12 Other findings reviewed but out of scope for this revision
| Finding | Disposition | Note |
|---------|-------------|------|
| Migrate ledger from BIGINT monetary column to native `numeric` for cross-currency scaling. | **Rejected** for v2. Engineering justification: the platform's monetary invariant (§17.3) mandates smallest-unit integer arithmetic. `numeric` would permit fractional units and break the deterministic replay property required by NFR-4. Out of scope; reopen only under a separate currency-ration design. |
| Replace `Money` BigInt with a fixed-point `Decimal128` library. | **Rejected** for v2. Engineering justification: introducing a fixed-point library would require a domain-wide conversion and re-validation of every existing aggregate (`Portfolio`, `Investment`, `Treasury`). The BigInt + smallest-unit invariant is already invariants-tested (property-based suite, v1 §16.5). No compelling technical reason to restructure now. |
| Collapse `DistributionSchedule` into the `Distribution` aggregate. | **Rejected**. Engineering justification: schedules are long-lived (multi-quarter) plans independent of any single executed distribution; many distributions link to one schedule. Merging would create a single multi-year aggregate stream, worsening event-store replay cost and optimistic-concurrency contention. The original split is preserved per finding §2.1. |
| Adopt strong consistency between `Distribution` and `DistributionRecipient` via 2PC. | **Rejected**. Engineering justification: 2PC across the event store and the payment gateway is unavailable under partition, and would re-introduce the synchronous bottleneck §2.2 removes. Eventual consistency + saga compensation is the correct trade-off for a financial system where settlement is inherently asynchronous. |

---

## 3. Software Requirements Specification (SRS)

### 3.1 Business Context
Unchanged from v1 §1.1. The Treasury & Distribution Engine generalizes M3-2B's Dividend Claim foundation into a multi-type distribution engine with automated treasury movements and post-distribution reconciliation. v2 reframes execution as an eventually-consistent saga.

### 3.2 Functional Requirements

#### FR-1 Distribution Management
- **FR-1.1** The system SHALL support creation of distribution proposals for dividends, revenue share, and buybacks.
- **FR-1.2** The system SHALL support approval workflows for distribution proposals, including multi-signature authorization for high-value distributions.
- **FR-1.3** The system SHALL execute distributions by transferring value from a treasury account to eligible recipients **asynchronously** via the `DistributionSaga`.
- **FR-1.4** The system SHALL track per-recipient status (`Pending`, `Paid`, `Failed`, `Recovered`).
- **FR-1.5** The distribution aggregate SHALL NOT be mutated per-recipient during execution; terminal totals are computed once at finalization.

#### FR-2 Distribution Types
Unchanged from v1 §1.2 (FR-2.1 to FR-2.4).

#### FR-3 Treasury Movement Automation
- **FR-3.1** Approval SHALL reserve funds in the source treasury account.
- **FR-3.2** Each successful recipient payment SHALL produce a corresponding ledger entry through the saga, not synchronously in the handler.
- **FR-3.3** Failed payments SHALL trigger compensating actions at the saga level (mark-and-defer); final reversal to source account occurs only at saga terminal transition when unrecoverable failures remain.

#### FR-4 Reconciliation
Unchanged from v1 §1.4 (FR-4.1 to FR-4.3), with the clarification that reconciliation reads **recipient-tier events** plus ledger movements and does not re-read the `Distribution` aggregate stream.

#### FR-5 Idempotency
- **FR-5.1** All mutating distribution commands SHALL be idempotent under the Idempotency Ledger contract (§14).
- **FR-5.2** Replaying any command SHALL NOT cause duplicate payments or duplicate ledger postings.
- **FR-5.3** Cross-domain event delivery SHALL deduplicate on `deliveredIdempotencyKey` persisted in the consumer's Idempotency Ledger.

#### FR-6 Recipient Materialization (NEW)
- **FR-6.1** A distribution SHALL require materialization of its recipient set before execution.
- **FR-6.2** Materialization SHALL compute eligible recipients from an immutable ownership snapshot and an eligibility rule set.
- **FR-6.3** Materialization SHALL produce a manifest hash binding distributionId → recipient set, attested in `DistributionRecipientsMaterialized`.
- **FR-6.4** Execution SHALL refuse to start if no materialization manifest exists for the distribution.

#### FR-7 Audit
Unchanged from v1 §1.6 (FR-6.1 to FR-6.3), renumbered, plus:
- **FR-7.4** Audit records SHALL form a tamper-evident hash chain (Contract C5).

### 3.3 Non-Functional Requirements

| NFR | Text | Source |
|-----|------|--------|
| NFR-1a | (Internal / Command Responsiveness) See §2.9. | Revised |
| NFR-1b | (External / Settlement Throughput) See §2.9. | Revised |
| NFR-2 | Concurrent distribution proposals SHALL NOT corrupt state. | Unchanged |
| NFR-3 | All monetary calculations use integer arithmetic (smallest unit). | Unchanged |
| NFR-4 | Recoverable from any point of failure via event replay and saga state. | Clarified |
| NFR-5 | Multi-signature authorized for amounts above configurable thresholds. | Unchanged |
| NFR-6 (new) | The Idempotency Ledger SHALL survive process, node, and storage-replica failure with no loss of accepted commands. | New |
| NFR-7 (new) | The DistributionSaga SHALL be resumable from its last persisted checkpoint without duplicate or skipped payments after any crash. | New |

---

## 4. Domain Model

### 4.1 Bounded Context
Unchanged diagram from v1 §2.1; the Distribution Engine sub-context now contains a `DistributionSaga` coordinator alongside the three aggregates.

### 4.2 Aggregates (split preserved)

The aggregate decomposition is preserved per §2.1. Field-level changes are listed inline.

#### Aggregate: `Distribution`

| Property | Type | Notes |
|----------|------|-------|
| `id` | `DistributionId` | UUID v7 |
| `distributionType` | `DistributionType` | `Dividend \| RevenueShare \| Buyback` |
| `status` | `DistributionStatus` | Revised enum: `Draft \| Approved \| RecipientsMaterialized \| Executing \| Completed \| Failed \| Cancelled` |
| `sourceAccountId` | `AccountId` | Treasury account to debit |
| `totalAmount` | `Money` | Total value |
| `currency` | `Currency` | ISO 4217 |
| `perUnitAmount` | `Money \| null` | Per-token/share amount (dividends) |
| `materializationManifestHash` | `string \| null` | Hash of recipient set; set at materialization |
| `recipientCount` | `number` | Materialized recipient count; immutable after materialization |
| `sagaId` | `SagaId \| null` | Active saga id when `status == Executing` |
| `finalTotals` | `FinalTotals \| null` | Populated only at terminal transition |
| `scheduleId` | `ScheduleId \| null` | Link to dividend schedule (for dividends) |
| `snapshotId` | `SnapshotId \| null` | Link to ownership snapshot (for dividends) |
| `proposalRef` | `ProposalRef \| null` | Governance proposal reference |
| `metadata` | `Json` | Extensible metadata |
| `version` | `number` | Optimistic concurrency |
| `createdAt`, `updatedAt` | `Timestamp` | |

**Removed fields** vs v1: `eligibleCount` (replaced by `recipientCount`, which is sourced from the materialization manifest and not recomputed), `totalDistributed`, `totalFailed`, `totalRecovered` (now inside `finalTotals`, populated only at `ExecutionFinalized`).

#### Aggregate: `DistributionRecipient`
Unchanged from v1 §2.2, with one added field:

| Property | Type | Notes |
|----------|------|-------|
| `eligibilityProof` | `EligibilityProof` | Hash binding to (snapshotId, snapshotPositionIndex, perUnitAmount) |
| `recoveryAttempts` | `number` | Count of recovery attempts; bounded by policy |

Status enum unchanged: `Pending \| Paid \| Failed \| Recovered` (transitions revised in §9.3).

#### Aggregate: `DistributionSchedule`
Unchanged from v1 §2.2. State machine formalized (§9.2).

#### New Component: `DistributionSaga` (not an aggregate — coordinator)

`DistributionSaga` is a **persistent coordinator**, not a transactional aggregate boundary. It owns a saga-state row, not an event stream; it is replayable from a checkpoint. See §7.

### 4.3 Value Objects

| Value Object | Fields | Notes |
|-------------|--------|-------|
| `DistributionStatus` | enum | `Draft \| Approved \| RecipientsMaterialized \| Executing \| Completed \| Failed \| Cancelled` (revised) |
| `RecipientStatus` | enum | `Pending \| Paid \| Failed \| Recovered` (unchanged values, revised transitions) |
| `EligibilityProof` | `snapshotId`, `positionIndex`, `quantity`, `perUnitAmount`, `hash` | Binding proving recipient eligibility |
| `FinalTotals` | `totalDistributed`, `totalFailed`, `totalRecovered`, `paidCount`, `failedCount`, `recoveredCount`, `writeOffAmount` | Computed once at finalization |
| `IdempotencyKey` | `value: string` | Client-provided, validated (UUID v7 or sha256 hex) |
| `RecoveryStrategy` | enum | `ReAttempt \| Manual \| WriteOff` (unchanged) |
| `AllocationMethod` | enum | `ProRata \| Fixed \| Tiered` (unchanged) |
| `SagaId` | `value: string` | UUID v7 |
| `SagaState` | enum | `Running \| Suspended \| Compensating \| Completed \| Failed` |

All other v1 value objects (DistributionId, RecipientId, DistributionType, Money, Currency, Period, ProposalRef) unchanged.

### 4.4 Domain Services

| Service | Responsibility |
|---------|---------------|
| `DistributionCalculationService` | Computes per-recipient amounts (used in materialization). |
| `DistributionMaterializationService` | Computes eligible recipient set + proofs from snapshot. |
| `DistributionSaga` (orchestrator) | Drives async per-recipient settlement. See §7. |
| `RecoveryOrchestrator` | Issues `RecoverRecipientPayment` commands for retriable failures. |
| `TreasuryReservationService` | Reserves/releases funds; double-entry movements. |
| `ReconciliationEvaluator` | Compares recipient-tier events vs ledger; writes reconciliation report. |
| `IdempotencyLedger` | Durable append-only key/response store. §14. |

Removed from v1: `DistributionExecutionService` (synchronous batch) — its responsibility is moved into `DistributionSaga`.

---

## 5. CQRS

### 5.1 Commands

| Command | Target Aggregate | External? | Notes |
|---------|------------------|-----------|-------|
| `CreateDistribution` | `Distribution` | Yes (API) | Draft |
| `ApproveDistribution` | `Distribution` | Yes | Approves, reserves funds |
| `CancelDistribution` | `Distribution` | Yes | Only from Draft/Approved/RecipientsMaterialized |
| `MaterializeDistributionRecipients` | `Distribution` (lifecycle) + many `DistributionRecipient` | Yes | NEW. Moves to `RecipientsMaterialized` |
| `ExecuteDistribution` | `Distribution` | Yes | Transitions to `Executing` and **starts** the saga |
| `CompleteDistribution` | `Distribution` | Internal (saga) | Terminal |
| `FailDistribution` | `Distribution` | Internal (saga) | Terminal |
| `ReconcileDistribution` | `Distribution` | Yes | Reads projections, writes `DistributionReconciled` |
| `ProcessRecipientPayment` | `DistributionRecipient` | Internal (saga) | Per-recipient settlement |
| `FailRecipientPayment` | `DistributionRecipient` | Internal (saga) | Mark failed |
| `RecoverRecipientPayment` | `DistributionRecipient` | Yes / internal | Recovery attempt |
| `CreateDistributionSchedule` | `DistributionSchedule` | Yes | |
| `ActivateSchedule` | `DistributionSchedule` | Yes | |
| `CloseSchedule` | `DistributionSchedule` | Yes | |

#### Command Payloads (canonical examples)

```
// MaterializeDistributionRecipients
{
  aggregateId: DistributionId;
  type: "treasury.distribution.materialize_recipients";
  data: {
    snapshotId: SnapshotId;
    eligibilityRuleId: string | null;
  };
  metadata: CommandMetadata;       // Signed actor envelope (Contract C1)
}

// ExecuteDistribution
{
  aggregateId: DistributionId;
  type: "treasury.distribution.execute";
  data: {
    sagaOptions: {
      perRecipientTimeoutMs?: number;     // default 30000
      maxParallelism?: number;            // default 10
      recoveryPolicyId?: string | null;
    };
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
    settlementRef: string;     // ledger movement reference used for idempotency binding
  };
  metadata: CommandMetadata;     // actor = system:saga
}
```

### 5.2 Queries
Unchanged from v1 §3.2 with two additions:

| Query | Handler | Description |
|-------|---------|-------------|
| `GetDistributionProgress` | `GetDistributionProgressHandler` | Real-time progress derived from recipient read-model (not from aggregate) — replaces removed progress counter |
| `GetSagaState` | `GetSagaStateHandler` | Saga live state for operators |

---

## 6. Events

### 6.1 Event List (revised)

All events are namespaced `treasury.distribution.*` and `treasury.recipient.*`.

| Event | Stream | Emitted By | Description |
|-------|--------|-----------|-------------|
| `DistributionCreated` | distribution-{id} | `CreateDistributionHandler` | Proposal created |
| `DistributionApproved` | distribution-{id} | `ApproveDistributionHandler` | Approved, funds reserved; carries approval signature manifest |
| `DistributionRecipientsMaterialized` | distribution-{id} | `MaterializeDistributionRecipientsHandler` | Recipient set materialized; carries manifest hash + count |
| `DistributionExecutionStarted` | distribution-{id} | `ExecuteDistributionHandler` | Distribution moved to `Executing`; saga id recorded |
| `DistributionExecutionFinalized` | distribution-{id} | `CompleteDistributionHandler` / `FailDistributionHandler` | Terminal; carries `FinalTotals` |
| `DistributionCancelled` | distribution-{id} | `CancelDistributionHandler` | Cancelled from a cancellable state |
| `DistributionReconciled` | distribution-{id} | `ReconcileDistributionHandler` | Reconciliation result |
| `RecipientMaterialized` | recipient-{id} | `MaterializeDistributionRecipientsHandler` | Single recipient materialized (proof attached) |
| `RecipientPaymentPaid` | recipient-{id} | `ProcessRecipientPaymentHandler` | Settlement successful |
| `RecipientPaymentFailed` | recipient-{id} | `FailRecipientPaymentHandler` | Settlement failed (structured code) |
| `RecipientPaymentRecovered` | recipient-{id} | `RecoverRecipientPaymentHandler` | Recovery succeeded |
| `DistributionScheduleCreated` | schedule-{id} | `CreateScheduleHandler` | |
| `DistributionScheduleActivated` | schedule-{id} | `ActivateScheduleHandler` | |
| `DistributionScheduleClosed` | schedule-{id} | `CloseScheduleHandler` | |
| Sagas: `DistributionSagaStarted`, `DistributionSagaCheckpoint`, `DistributionSagaCompensated`, `DistributionSagaCompleted`, `DistributionSagaSuspended`, `DistributionSagaFailed` | saga-{id} | `DistributionSaga` | Saga lifecycle (own stream; not financial authority) |

**Removed from v1:** `DistributionExecutionProgress`, `DistributionCompleted`, `DistributionFailed`, `DistributionRecoveryInitiated`, `DistributionRecovered`. (`DistributionCompleted`/`DistributionFailed` are unified as `DistributionExecutionFinalized` with a `finalStatus` discriminator; recovery is per-recipient.)

### 6.2 Event Payloads (canonical)

```
// DistributionApproved  — carries approval signature manifest (Contract C2)
{
  eventType: "treasury.distribution.approved";
  aggregateId: DistributionId;
  version: number;                 // next aggregate version
  data: {
    approvals: [{
      approverId: EntityId;
      keyId: string;               // signing-key id from secrets manager (Contract C6)
      signature: string;           // over canonical(distributionId, version, totalAmount, currency)
      signedAt: Timestamp;
    }];
    approvalEpoch: number;          // derived from distribution version, rejects stale signatures
    reservationJournalId: JournalId;
  };
  metadata: EventMetadata;          // includes originatingIdempotencyKey
}

// DistributionRecipientsMaterialized
{
  eventType: "treasury.distribution.recipients_materialized";
  aggregateId: DistributionId;
  version: number;
  data: {
    snapshotId: SnapshotId;
    recipientCount: number;
    totalEligibleAmount: bigint;
    manifestHash: string;           // sha256 over canonical sorted (investorId, eligibleAmount, proof)
    materializedAt: Timestamp;
  };
}

// RecipientMaterialized
{
  eventType: "treasury.recipient.materialized";
  aggregateId: RecipientId;
  version: 1;
  data: {
    distributionId: DistributionId;
    investorId: EntityId;
    eligibleAmount: bigint;
    currency: Currency;
    proof: EligibilityProof;
  };
}

// RecipientPaymentPaid
{
  eventType: "treasury.recipient.paid";
  aggregateId: RecipientId;
  version: number;
  data: {
    distributionId: DistributionId;
    investorId: EntityId;
    amount: bigint;
    currency: Currency;
    settlementRef: string;          // ledger movement reference (idempotency binding)
    txHash: string | null;
    paidAt: Timestamp;
  };
}

// DistributionExecutionFinalized
{
  eventType: "treasury.distribution.execution_finalized";
  aggregateId: DistributionId;
  version: number;
  data: {
    finalStatus: "Completed" | "Failed";
    finalTotals: FinalTotals;
    sagaId: SagaId;
    finalizedAt: Timestamp;
  };
}
```

### 6.3 Cross-Domain Published Events (Outbox)

| Outbox Event | Consumer | Purpose |
|--------------|----------|---------|
| `DistributionExecutionFinalized (finalStatus=Completed)` | Portfolio | Update investor portfolios |
| `RecipientPaymentPaid` | Identity, Portfolio | Record investor payment |
| `DistributionApproved` | Governance | Notify execution authority |
| `DistributionReconciled` | Reporting | Trigger report |

Each outbox row carries `originatingIdempotencyKey` (command-level) and `deliveredIdempotencyKey` (consumer-level). No TTL; dedup at the consumer via its own Idempotency Ledger.

---

## 7. DistributionSaga

### 7.1 Responsibilities

The `DistributionSaga` is a persistent process that drives per-recipient settlement after the `Distribution` aggregate has reached `Executing`. It is the only entity permitted to issue `ProcessRecipientPayment`, `FailRecipientPayment`, `CompleteDistribution`, and `FailDistribution` commands.

### 7.2 State Diagram

```
                  Distribution reaches Executing
                              │
                       saga.start(distributionId)
                              ▼
                         ┌─────────┐  crash / provider 5xx
                  ┌─────►│ Running │──────────────►┐
                  │      └────┬────┘              │
                  │           │                   ▼
   resume         │      all recipients      ┌──────────┐
   from ckpt      │      processed           │ Suspended│
                  │           │              └────┬─────┘
                  │           ▼                  │ schedule / retry
                  │     ┌──────────┐             │
                  │     │ Compensa-│◄────────────┘ (unretriable failure batch)
                  │     │  ting    │
                  │     └────┬─────┘
                  │          │
                  │          ▼
                  │   ┌──────────┐     completed             ┌───────────┐
                  └───│ all done │──────────────────────────►│ Completed │
                      └────┬─────┘                            └───────────┘
                           │ unrecoverable
                           ▼
                      ┌────────┐
                      │ Failed │  → issues FailDistribution
                      └────────┘
```

### 7.3 Saga State Storage

Saga state is persisted in a dedicated row, not the event stream of the distribution. Each row:

```
distribution_saga_state(
  saga_id              UUID PRIMARY KEY,
  distribution_id      UUID NOT NULL,
  state                VARCHAR(20) NOT NULL,           -- Running|Suspended|Compensating|Completed|Failed
  pending_recipients   UUID[] NOT NULL,                -- remaining recipient ids
  in_flight_recipients UUID[] NOT NULL,                -- currently dispatched
  paid_count           INTEGER NOT NULL DEFAULT 0,
  failed_count         INTEGER NOT NULL DEFAULT 0,
  recovered_count      INTEGER NOT NULL DEFAULT 0,
  checkpoint_at        BIGINT NOT NULL,                -- globalPosition cursor
  recovery_policy_id   VARCHAR(64),
  started_at           TIMESTAMPTZ NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL,
  version              INTEGER NOT NULL                -- optimistic concurrency
)
```

A `DistributionSagaCheckpoint` event is written to the saga stream every N successful payments (default N=50) or every T seconds (default T=30). Recovery from crash resumes from `pending_recipients ∖ in_flight_recipients` plus re-issue of any in-flight commands guarded by the Idempotency Ledger.

### 7.4 Per-Recipient Flow

For each `recipientId` in `pending_recipients` (up to `maxParallelism` in flight):

1. Saga issues `ProcessRecipientPayment` with `settlementRef = H(distributionId, recipientId, manifestHash)`. The Idempotency Ledger enforces that this exact ref is settled exactly once, even across saga crashes.
2. Handler loads `DistributionRecipient`, attempts settlement via `TreasuryReservationService` + payment gateway.
3. On success: `RecipientPaymentPaid`; ledger entry posted with `settlementRef`.
4. On failure: `RecipientPaymentFailed` with structured code; saga assigns the recipient to either retry (`ReAttempt` policy) or write-off.
5. On terminal: saga writes checkpoint; updates its row.

### 7.5 Terminal Transition

When `pending_recipients ∪ in_flight_recipients == ∅`:

- If `failed_count > 0` and `recoveryPolicy == Manual`: saga transitions to `Suspended`, surfaces via `ListPendingRecoveries`, and **does not** finalize.
- If all failures were converted to recoveries or write-offs: saga issues `CompleteDistribution` → `DistributionExecutionFinalized(finalStatus=Completed)`.
- If `failed_count` exceeds the write-off cap without policy resolution: saga issues `FailDistribution` → `DistributionExecutionFinalized(finalStatus=Failed)` and rolls back the reservation for the failed amount via `TreasuryReservationService.release`.

---

## 8. Aggregate Responsibilities

### 8.1 `Distribution` Aggregate
**Responsibility:** Lifecycle of a distribution from proposal to terminal finalization.
- **Invariant I1:** `totalAmount === totalEligibleAmount` at `RecipientsMaterialized` (per manifest hash).
- **Invariant I2:** Once `Executing`, the aggregate is not mutated per-recipient.
- **Invariant I3:** `FinalTotals.totalDistributed + FinalTotals.totalFailed + FinalTotals.totalRecovered === totalAmount - writeOff`.
- **Invariant I4:** A distribution cannot be approved without a valid, sufficiently funded source account.
- **Invariant I5:** A distribution cannot be executed before `RecipientsMaterialized` (requires non-null `materializationManifestHash`).
- **Invariant I6:** A distribution cannot be cancelled once `Executing`.
- **Business rule:** Approved distributions MUST have reserved funds; reservation held until terminal finalization or cancellation.

### 8.2 `DistributionRecipient` Aggregate
Unchanged from v1 §5.2 plus:
- **Invariant I7:** `eligibilityProof.hash` MUST verify against `(snapshotId, positionIndex, quantity, perUnitAmount)` at materialization.
- **Invariant I8:** `recoveryAttempts <= policy.maxRecoveryAttempts`. After max, the only permitted terminal transition is `Failed` → write-off (handled by saga; aggregate refuses further `RecoverRecipientPayment`).

### 8.3 `DistributionSchedule` Aggregate
Unchanged from v1 §5.3. State machine formalized in §9.2.

---

## 9. State Machines

### 9.1 Distribution

```
Valid transitions (exhaustive):
  Draft                   -> Approved | Cancelled
  Approved                -> RecipientsMaterialized | Cancelled
  RecipientsMaterialized  -> Executing | Cancelled
  Executing               -> Completed | Failed
  Completed               -> (terminal)
  Failed                  -> (terminal)
  Cancelled               -> (terminal)
```

```
       ┌──────┐  approve        ┌──────────┐  materialize        ┌──────────────────────┐
       │ Draft │ ─────────────► │ Approved │ ──────────────────► │ RecipientsMaterialized│
       └───┬───┘                └────┬─────┘                     └───────────┬──────────┘
           │ cancel                  │ cancel                                 │ execute
           ▼                         ▼                                       ▼
       ┌──────────┐            ┌──────────┐                            ┌───────────┐
       │ Cancelled │            │ Cancelled │                            │ Executing  │
       └──────────┘            └──────────┘                            └─────┬─────┘
                                                                            │ finalize
                                                                  ┌─────────┴─────────┐
                                                                  ▼                   ▼
                                                          ┌───────────┐         ┌────────┐
                                                          │ Completed │         │ Failed │
                                                          └───────────┘         └────────┘
```

Key resolution notes (mapping to §2.6 table): `Recovered` removed; `Cancelled` not reachable from `Executing`; `RecipientsMaterialized` added.

### 9.2 DistributionSchedule

```
           create                activate              finalize
  Draft ──────────► Scheduled ──────────► Executing ──────────► Completed
    │                  │                    │
    └──── Cancelled ◀──┴──── Cancelled ◀───┘    (Cancelled NOT reachable from Executing)
```

`ScheduleStatus` enum (aligned): `Draft | Scheduled | Executing | Completed | Cancelled`. The v1 enum already matched; the diagram is now consistent.

### 9.3 Recipient

```
                      PayRecipient (success)
        Pending ──────────────────────────────► Paid (terminal)
           │
           │ FailRecipientPayment
           ▼
        Failed ────────────► RecoverRecipientPayment ──────────► Recovered (terminal)
           │                                                  (write-off goes Failed → terminal via saga policy)
           │ retry (bounded by policy)
           └──► Failed   (self-loop, recoveryAttempts++ ; after max: terminal)
```

Both `Paid` and `Recovered` are terminal. `Failed` is non-terminal until policy exhaustion or write-off.

---

## 10. Storage Model

### 10.1 Event Store Streams
- `distribution-{id}` — `Distribution` aggregate.
- `recipient-{id}` — `DistributionRecipient` aggregate.
- `schedule-{id}` — `DistributionSchedule` aggregate.
- `saga-{id}` — Saga lifecycle events (operational only; not financial authority).

### 10.2 Read-Model Tables

```sql
-- Distribution read model (revised)
CREATE TABLE distribution_read_model (
  id                            UUID PRIMARY KEY,
  distribution_type             VARCHAR(20) NOT NULL,
  status                        VARCHAR(28) NOT NULL,
  source_account_id             UUID NOT NULL,
  total_amount                  BIGINT NOT NULL,
  currency                      CHAR(3) NOT NULL,
  per_unit_amount               BIGINT,
  schedule_id                   UUID,
  snapshot_id                   UUID,
  allocation_method             VARCHAR(20) NOT NULL,
  materialization_manifest_hash TEXT,
  recipient_count               INTEGER,
  saga_id                       UUID,
  final_total_distributed       BIGINT,
  final_total_failed            BIGINT,
  final_total_recovered         BIGINT,
  final_total_write_off         BIGINT,
  version                       INTEGER NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL,
  updated_at                    TIMESTAMPTZ NOT NULL,
  metadata                      JSONB
);

CREATE TABLE distribution_recipient_read_model (
  id                  UUID PRIMARY KEY,
  distribution_id     UUID NOT NULL REFERENCES distribution_read_model(id),
  investor_id         UUID NOT NULL,
  eligible_amount     BIGINT NOT NULL,
  paid_amount         BIGINT NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL,
  tx_hash             VARCHAR(255),
  failure_reason      TEXT,
  failure_code        VARCHAR(64),       -- NEW structured code
  recovery_attempts   INTEGER NOT NULL DEFAULT 0,
  settlement_ref      VARCHAR(128),      -- NEW idempotency binding
  version             INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recipient_distribution ON distribution_recipient_read_model(distribution_id);
CREATE INDEX idx_recipient_investor     ON distribution_recipient_read_model(investor_id);
CREATE INDEX idx_recipient_status      ON distribution_recipient_read_model(status);
CREATE INDEX idx_recipient_settlement  ON distribution_recipient_read_model(settlement_ref);
```

### 10.3 Idempotency Ledger (NEW — financial-grade)

```sql
CREATE TABLE distribution_idempotency_ledger (
  idempotency_key      VARCHAR(128) PRIMARY KEY,   -- client or internal settled key
  command_type         VARCHAR(64) NOT NULL,
  aggregate_id         UUID NOT NULL,
  actor_id             UUID NOT NULL,
  request_hash         TEXT NOT NULL,              -- sha256 over canonical payload
  response_payload     JSONB,                       -- full response for replay
  response_status      VARCHAR(20) NOT NULL,        -- ok | error
  produced_events      UUID[] NOT NULL DEFAULT '{}',-- event ids co-committed in same txn
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NO TTL; retention driven by regulatory policy
);
CREATE INDEX idx_idem_aggregate ON distribution_idempotency_ledger(aggregate_id);
CREATE INDEX idx_idem_actor_cmd ON distribution_idempotency_ledger(actor_id, command_type);

-- Outbox for cross-domain delivery
CREATE TABLE distribution_outbox (
  outbox_id            UUID PRIMARY KEY,
  aggregate_id        UUID NOT NULL,
  event_type          VARCHAR(80) NOT NULL,
  event_payload       JSONB NOT NULL,
  originating_idempotency_key   VARCHAR(128) NOT NULL,
  delivered_idempotency_key      VARCHAR(128) NOT NULL,
  delivered           BOOLEAN NOT NULL DEFAULT FALSE,
  attempts            INTEGER NOT NULL DEFAULT 0,
  next_attempt_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_undelivered ON distribution_outbox(delivered, next_attempt_at);
```

### 10.4 Projections

| Projection | Source Events | Handler |
|-----------|---------------|---------|
| `distribution_read_model` | all `treasury.distribution.*` events | `DistributionProjection` |
| `distribution_recipient_read_model` | `RecipientMaterialized`, `RecipientPaymentPaid/Failed/Recovered` | `RecipientProjection` |
| `distribution_schedule_read_model` | all `treasury.distribution.schedule.*` | `ScheduleProjection` |
| `distribution_progress` (live) | recipient-tier events only | `ProgressProjection` (cheap) — replaces removed progress counter |

---

## 11. REST API

Routes unchanged from v1 §8. New endpoints:

| Method | Path | Command/Query | Auth |
|--------|------|---------------|------|
| `POST` | `/api/treasury/distributions/:id/materialize` | `MaterializeDistributionRecipients` | `treasury:distribution:materialize` |
| `GET` | `/api/treasury/distributions/:id/progress` | `GetDistributionProgress` | `treasury:distribution:read` |
| `GET` | `/api/treasury/distributions/:id/saga` | `GetSagaState` | `treasury:distribution:read` |

All mutating endpoints accept the `Idempotency-Key` header (HTTP). Duplicates within the ledger return the original response body and status unchanged.

---

## 12. Authorization Model & Security Contracts

### 12.1 Permission Matrix
Updated from v1 §9.1.

| Action | Role | Condition |
|--------|------|-----------|
| `treasury:distribution:create` | `treasury.manager` | — |
| `treasury:distribution:read` | `treasury.analyst`, `treasury.manager`, `investor` | Investors see only own |
| `treasury:distribution:approve` | `treasury.approver` | Multi-sig above threshold |
| `treasury:distribution:materialize` | `treasury.manager` | — |
| `treasury:distribution:execute` | `treasury.operator` | Distribution must be `RecipientsMaterialized` |
| `treasury:distribution:cancel` | `treasury.manager` | Distribution not in `Executing` |
| `treasury:distribution:recover` | `treasury.operator` | — |
| `treasury:distribution:reconcile` | `treasury.auditor` | — |
| `treasury:schedule:create` | `treasury.manager` | — |
| `treasury:schedule:activate` | `treasury.approver` | — |
| `treasury:schedule:close` | `treasury.manager` | — |

### 12.2 Security Contracts

#### Contract C1 — Command Authentication
Every mutating command metadata SHALL carry `actor.principalId`, `actor.role`, `actor.sessionId`, and `actor.signature`. The handler SHALL:
1. Validate the signature against the canonical request body using the actor's current active key (pubkey from Identity service).
2. Reject expired sessions (`iat` outside `±60s` clock skew window).
3. Persist `actor.principalId` and `sessionId` in every emitted domain event.

#### Contract C2 — Approval Signature
For each `ApproveDistribution`:
1. The approver cryptographically signs `canonical(distributionId, distribution.version, totalAmount, currency.currencyCode)` using an approved signing key from the secrets manager.
2. The handler records `{approverId, keyId, signature, signedAt}` and computes `approvalEpoch = distribution.version`.
3. Re-approval is rejected if `signature.approvalEpoch < current.distribution.version` (stale signature).

#### Contract C3 — Multi-Sig Quorum
For distributions above `treasury.approval.threshold` (configurable default $50,000).
1. Quorum = `min(requiredApprovals, configuredQuorum)`.
2. Each approval is bound to a distinct approverId and distinct `keyId`; signature reuse from the same `(approverId, keyId)` is rejected by the Idempotency Ledger.
3. Until quorum is met, the distribution remains in `Approved` (not `RecipientsMaterialized` or `Executing`).

#### Contract C4 — Data Isolation
For queries issued under role `investor`:
1. Query handlers append `WHERE investor_id = :principal.investorId` (or equivalent) to all read-side queries.
2. The cross-cutting projection layer re-applies this filter on every projection row returned, as defense-in-depth.
3. Aggregate-totals endpoints (`GetDistributionSummary`, `GetDistributionSchedule`) SHALL NOT be exposed to `investor`; investors receive only `GetRecipientStatus`, `ListRecipientsByInvestor`.

#### Contract C5 — Audit Immutability
1. Every `DistributionAuditEvent` carries `prevHash` and `hash = H(prevHash || canonicalEvent || idempotencyKey)`.
2. The audit projection validates `hash` against its stored `prevHash` chain on each insert; mismatch raises `AuditChainBrokenError` and halts the projection.
3. Audit records are append-only at the storage layer (deny `UPDATE`, `DELETE`).

#### Contract C6 — Secrets Custody
1. Payment-provider credentials are referenced by key id only; values are never serialized into events, outbox rows, projections, responses, or logs.
2. Signing keys for C1/C2 live in the secrets manager; the engine holds keys in memory only for the duration of a single signature operation; no key material is persisted to disk, temp files, or error stack traces.
3. Rotation of signing keys is permitted only via a documented rotation ceremony; old key ids remain verifiable against historical records.

#### Contract C7 — Outbound Payload Hygiene
No event payload SHALL contain raw PII (only canonical Identity aggregate IDs), payment-provider credentials, or full card/bank details. Financial identifiers (`txHash`, `settlementRef`) are system-internal references only.

---

## 13. Error Hierarchy

Idempotency-related errors are restructured to reflect the new ledger (§14). Full table:

| Error Class | Code | HTTP | Cause |
|-------------|------|------|-------|
| `DistributionError` | `DISTRIBUTION_ERROR` | 422 | Base |
| `DistributionNotFoundError` | `DISTRIBUTION_NOT_FOUND` | 404 | Unknown id |
| `DistributionInvalidStatusError` | `DISTRIBUTION_INVALID_STATUS` | 409 | Illegal transition |
| `DistributionNotMaterializedError` | `DISTRIBUTION_NOT_MATERIALIZED` | 409 | Execute before materialize |
| `DistributionManifestMismatchError` | `DISTRIBUTION_MANIFEST_MISMATCH` | 422 | Recipient set tampering |
| `DistributionAlreadyFinalizedError` | `DISTRIBUTION_ALREADY_FINALIZED` | 409 | Execute/Complete twice |
| `InsufficientReservedFundsError` | `INSUFFICIENT_RESERVED_FUNDS` | 422 | Source underfunded |
| `RecipientNotFoundError` | `RECIPIENT_NOT_FOUND` | 404 | Unknown recipient |
| `RecipientAlreadyPaidError` | `RECIPIENT_ALREADY_PAID` | 409 | Duplicate pay |
| `RecipientPaymentFailedError` | `RECIPIENT_PAYMENT_FAILED` | 422 | Gateway rejected |
| `RecoveryExhaustedError` | `RECOVERY_EXHAUSTED` | 422 | Retry policy exhausted |
| `DistributionScheduleNotFoundError` | `SCHEDULE_NOT_FOUND` | 404 | — |
| `ScheduleInvalidStatusError` | `SCHEDULE_INVALID_STATUS` | 409 | — |
| `ExecutionSagaError` | `SAGA_ERROR` | 422 | Saga internal failure |
| `RecoveryNotPossibleError` | `RECOVERY_NOT_POSSIBLE` | 422 | — |
| `ReconciliationError` | `RECONCILIATION_ERROR` | 422 | Mismatch |
| `MultiSigThresholdNotMet` | `MULTISIG_THRESHOLD_NOT_MET` | 403 | — |
| `StaleApprovalSignatureError` | `STALE_APPROVAL_SIGNATURE` | 403 | Contract C2 violation |
| `UnauthorizedDistributionAction` | `UNAUTHORIZED_DISTRIBUTION_ACTION` | 403 | Contract C1/C4 violation |
| `AuditChainBrokenError` | `AUDIT_CHAIN_BROKEN` | 500 | Contract C5 violation |
| `IdempotencyKeyConflictError` | `IDEMPOTENCY_KEY_CONFLICT` | 409 | Same key, different request hash (§14) |
| `SettlementRefMismatchError` | `SETTLEMENT_REF_MISMATCH` | 409 | `settlementRef` reused for different payload |

---

## 14. Idempotency Strategy (Financial-Grade)

### 14.1 Goals
- Survive process crash, node failure, and database-replica failover with no loss of accepted commands.
- Guarantee at-most-one effect for each `(idempotencyKey, command)` pair for the entire lifetime of the system (no TTL).
- Deduplicate cross-domain deliveries.

### 14.2 Durable Idempotency Ledger

Every mutating command is wrapped:

```
function handle(command):
    ledger := open transaction
    row := ledger.get(command.idempotencyKey)               # within txn
    if row exists:
        if row.request_hash != sha256(canonical(command)):
            raise IdempotencyKeyConflictError               # key reuse with different payload
        return row.response_payload                         # exact replay
    # ... run aggregate logic, produce events, write outbox
    ledger.insert(idempotency_key, command_type, aggregate_id, actor_id,
                  request_hash, response_payload, response_status,
                  produced_events)
    # commit (events + ledger + outbox in same database transaction)
```

The Ledger row MUST be co-committed with the produced events in the **same database transaction**; otherwise durability is not guaranteed.

### 14.3 Internal Idempotency Keys (saga-issued commands)

For commands issued by the `DistributionSaga` to recipient aggregates, the saga synthesizes the idempotency key as:

```
internalKey = "saga:" + sagaId + ":" + settlementRef
```

where `settlementRef = H(distributionId, recipientId, manifestHash)`. This binds a payment attempt to the immutable materialization manifest, so even across saga crash+resume, the ledger will reject any double settlement with the same `settlementRef`.

### 14.4 Cross-Domain Delivery (Outbox)

1. Every emitted domain event spawns an outbox row in the same transaction.
2. The outbox dispatcher delivers rows to consumers; on success `delivered=true`.
3. Consumers MUST persist `deliveredIdempotencyKey` in their own Idempotency Ledger before applying the event's side effect.
4. Redelivery is safe: the consumer's ledger rejects duplicates.

### 14.5 Migration from v1 Idempotency Design
The v1 `isEventProcessed`/`markEventProcessed` pair (TTL=24h) is **retired**. During the M3-2B migration window (§18), both stores run side-by-side (read v1 store first as fallback, write to ledger as authority); after cutover, v1 store becomes read-only table and is no longer consulted for new commands.

---

## 15. Retry Strategy

### 15.1 Per-Recipient Retry (saga-internal)
- Per-recipient retries use the saga retry policy: `maxAttempts: 3`, exponential backoff (initial 1s, max 30s).
- Retryable error codes: `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `NETWORK_ERROR`, `RATE_LIMITED`.
- Non-retryable: `INSUFFICIENT_FUNDS`, `INVALID_ACCOUNT`, `FRAUD_DETECTED`, `COMPLIANCE_REJECTED`.
- After policy exhaustion, the recipient is moved to write-off or manual lane per `recoveryPolicyId`.

### 15.2 Saga-Level Recovery
- The saga writes `DistributionSagaCheckpoint` events to its stream so a crashed worker resumes from the last checkpoint with `pending_recipients ∖ in_flight_recipients` re-issued (Idempotency Ledger protects against double settlement of any in-flight ones).
- Manual recovery is exposed via `ListPendingRecoveries` and `RecoverRecipientPayment`.

### 15.3 Circuit Breaker
- Per payment-provider: open after 5 consecutive failures; half-open after 60s; reclose after 10 successes.
- While open, the saga transitions to `Suspended` and writes `DistributionSagaSuspended`.

---

## 16. Concurrency Strategy

### 16.1 Aggregate Optimistic Concurrency
Unchanged from v1 §13.1. `ExpectedVersion` on every save; on `OptimisticConcurrencyError` the handler re-loads and re-applies.

### 16.2 Saga Concurrency
- The saga is a **single-writer** for each `distribution_saga_state` row, enforced by optimistic concurrency on `version`.
- Per-recipient payments are dispatched up to `maxParallelism` (default 10), each routed to a distinct recipient aggregate stream (no contention across recipients).

### 16.3 Distribution Aggregate Locking
- Distribution-stream writes occur only at lifecycle transitions (`Create`, `Approve`, `Materialize`, `Execute`, `Complete/Fail`, `Cancel`, `Reconcile`), not per recipient; contention is therefore minimal.
- A single active `DistributionSaga` per distribution is enforced by a unique partial index on `distribution_saga_state(distribution_id) WHERE state IN ('Running','Suspended','Compensating')`.

### 16.4 Cross-Domain Ordering
- Events within a stream are ordered by aggregate version.
- Cross-stream ordering uses `globalPosition` from the event store; projections checkpoint on `globalPosition`.

---

## 17. Audit Logging

### 17.1 Audit Event (chained — Contract C5)

```
interface DistributionAuditEvent {
  auditId: string;
  prevHash: string | null;
  hash: string;                          // H(prevHash || canonicalEvent || idempotencyKey)
  aggregateType: 'distribution' | 'distribution_recipient' | 'distribution_schedule';
  aggregateId: string;
  action: string;
  actorId: string;
  principalSessionId: string;
  previousStatus: string | null;
  newStatus: string | null;
  changes: Json;
  reason: string | null;
  correlationId: string;
  idempotencyKey: string | null;
  timestamp: Timestamp;
}
```

### 17.2 Audit Triggers
Unchanged from v1 §14.2 with additions:
- Materialization: manifest hash, recipient count, rule set id.
- Saga state transitions (Running/Suspended/Compensating/Completed/Failed).
- Idempotency Ledger insert (key, command type).
- Outbox delivery (success/retry count).

### 17.3 Audit Output
Dual-publish unchanged: (1) domain event stream (immutable), (2) `audit` topic for SIEM. Additionally, the projected `distribution_audit_chain` table appends every record with a self-check on `hash` (per C5).

---

## 18. Migration Strategy from M3-2B

M3-2B ships `DividendSchedule`, `DividendClaim`, `ClaimReceipt` in `packages/treasury/src/services/dividend-claim-service.ts`. The M3-3 `Distribution`/`DistributionRecipient` model generalizes the M3-2B claim flow. The migration is **non-breaking** and incremental.

### 18.1 Migration Principles
- M3-2B continues operating for schedules created before cutover (no in-place rewrite).
- New dividends from cutover onward use the full M3-3 path (`Distribution` + `DistributionRecipient`).
- No stateful re-issuance of historical payouts; M3-2B `Paid/Completed` claims are read-only references.

### 18.2 Phase F1 — Compatibility Surfaces (Week -2 to Week 0, pre-M3-3 Phase 1)

| Step | Action | Deliverable |
|------|--------|-------------|
| F1.1 | Introduce read-model view `dividend_claim_unified` that exposes every M3-2B claim as a synthetic `DistributionRecipient` row with `eligibilityProof` mined from `(scheduleId, snapshotId, positionIndex, perUnitAmount)`. | View + backfill job |
| F1.2 | Augment `GetRecipientStatus` / `ListRecipientsByInvestor` to UNION the synthetic view with the real recipient read model. Operators see one pane. | Query handlers |
| F1.3 | Add feature flag `treasury.m3_3_enabled` (default off). When off, dividend schedules continue to route through M3-2B claim flow. | Flag + wiring |

### 18.3 Phase F2 — Dual-Write (Week +1 to +3, after M3-3 Phase 3 reaches handlers)

| Step | Action | Deliverable |
|------|--------|-------------|
| F2.1 | When `treasury.m3_3_enabled = brownout` for a schedule, the dividend-service creates *both* an M3-2B `DividendClaim` aggregate and an M3-3 `Distribution` (Draft) referencing that schedule as `scheduleId`. | Dual-write mapper |
| F2.2 | The M3-3 distribution is created in `Draft` only; M3-2B remains authoritative for execution until all matching claims reach `Paid`. | Mapping table `m3_3_to_claim(dist_id, claim_id)` |
| F2.3 | Reconciliation job asserts: for every dual-written pair, `DistributionRecipient.eligibleAmount == DividendClaim.claimedAmount`. Mismatches are surfaced and block cutover. | Reconciliation job |

### 18.4 Phase F3 — Cutover (Week +4)

| Step | Action | Deliverable |
|------|--------|-------------|
| F3.1 | For each schedule meeting the reconciliation invariant, flip `treasury.m3_3_enabled = on` for that schedule. | Schedule-level cutover job |
| F3.2 | New distributions for cut-over schedules use `MaterializeDistributionRecipients` from the snapshot; the M3-2B eligibility computation is **no longer invoked** for these schedules. | Materialization path |
| F3.3 | For the duration of the cutover window (target 4 weeks), `DividendClaim` records for cut-over schedules remain queryable but write-protected via a guard at the handler level: attempting to advance a cut-over `DividendClaim` raises `CLAIM_LEGACY_FROZEN`. | Guard |

### 18.5 Phase F4 — Retirement (Week +8 onward)

| Step | Action | Deliverable |
|------|--------|-------------|
| F4.1 | After all surviving schedules have aged past their claim window AND their M3-3 distributions are `Completed`/`Failed`, publish `DividendScheduleLegacyRetired` (schedule-stream tombstone). | Tombstone event |
| F4.2 | Set M3-2B donation handlers to read-only; remove the dual-write mapper; retain read-model for regulatory retention only. | Decommission PR |
| F4.3 | Reconcile: assert zero open claims and zero unresolved reconciliation mismatches; archive M3-2B code under `legacy/` for audit reference. | Archive sign-off |

### 18.6 Rollback
- any time before F3.2 completion can revert the feature flag to `off` (M3-2B resumes authoritatively).
- During F3, the M3-3 distribution can be `Cancelled` (since Draft→Approved→RecipientsMaterialized are cancellable states); the M3-2B record resumes as authoritative.
- IDs are never reused; rollback leaves the M3-3 distribution in a permanent `Cancelled` state.

---

## 19. Sequence Diagrams

### 19.1 Happy Path (Dividend Distribution)

```
Manager    Approver   Treasury         EventStore         Saga           Portfolio
   |          |          |                 |                |                |
   | Create   |          |                 |                |                |
   |───────────────────►|                 |                |                |
   |          |          | CreateDistribution              |                |
   |          |          |────────────────►| (DistributionCreated)         |
   |          |          |                                  |                |
   |          | Approve (C2/C3)                             |                |
   |          |─────────►| reserve funds in txn             |                |
   |          |          |────────────────►| (DistributionApproved, ledger, outbox) |
   |          |          |                                  |                |
   | Materialize        |                                  |                |
   |─────────►|        |                                  |                |
   |          |        | MaterializeDistributionRecipients |                |
   |          |        |────────────────►| (DistributionRecipientsMaterialized, RecipientMaterialized×N) |
   |          |        |                                  |                |
   | Execute  |        |                                  |                |
   |─────────────────►|                                  |                |
   |          |        | ExecuteDistribution (trans -> Executing)             |
   |          |        |────────────────►| (DistributionExecutionStarted)   |
   |          |        |── startSaga ────►|                |                |
   |          |        |                                  |                |
   |          |        |                                  |  saga.runs     |
   |          |        |                                  |──►PayRecipient×N (Idempotency Ledger)│
   |          |        |                                  |──►RecipientPaymentPaid×N            |
   |          |        |                                  |──►DistributionSagaCheckpoint       |
   |          |        |                                  |                |
   |          |        |  saga → CompleteDistribution                       |                |
   |          |        |────────────────►| (DistributionExecutionFinalized=Completed)        |
   |          |        |                  outbox ───────►Portfolio ───────►|                |
```

### 19.2 Recovery Flow

```
Operator   Treasury      Saga                EventStore
   |          |            |                     |
   | ListPending          |                     |
   |─────────►|           |                     |
   |◄──FailedRecipients   |                     |
   |          |            |                     |
   | RecoverRecipient      |                     |
   |─────────►|           |                     |
   |          | ─►RecoverRecipientPayment        |   (Idempotency Ledger guards)
   |          |            |──────────────────►| (RecipientPaymentRecovered)
   |          |            |                    |
   |          |            | if all terminal: Complete──►| (DistributionExecutionFinalized)
   |◄──Result |            |                     |
```

### 19.3 Reconciliation Flow

```
Auditor    Treasury     RecipientProjection   Ledger      EventStore
   |          |                |                  |           |
   | Reconcile|                |                  |           |
   |─────────►|                |                  |           |
   |          | query recipientsPaidTotals over projection  |
   |          |──────────────►|                  |           |
   |          | sum movements by distributionId  |           |
   |          |──────────────────────────────────►|          |
   |          | compare + tolerance                            |
   |          |─────────────────────────────────────────────►| (DistributionReconciled)
   |◄──Report                                                  |
```

---

## 20. Testing Strategy

### 20.1 Test Pyramid
Unchanged shape from v1 §16.1; emphasis on saga resilience and idempotency-ledger durability.

### 20.2 Unit Tests

| Suite | Coverage |
|------|----------|
| Distribution State Machine | All transitions in §9.1, including rejected transitions (e.g. `Executing → Cancelled` rejected) |
| Materialization Service | Snapshot-frozen computation; manifest hash stability under reordering |
| Saga State Machine | All transitions in §7.2 |
| Recovery Policy | Retry, Manual, WriteOff |
| Money Arithmetic | Unchanged from v1 |

### 20.3 Integration Tests (Add)

| Suite | SUT | Key Scenarios |
|------|-----|---------------|
| Idempotency Ledger | Handler + Ledger + EventStore | Duplicate replay returns same payload; key conflict raises 409 |
| Saga Crash Recovery | Saga + Recipient stream + Ledger | Kill saga mid-flight; resume; assert no duplicate settlement by `settlementRef` |
| Outbox Delivery | Outbox + Consumer mock | Retry on consumer down; dedup at consumer |
| Materialization | Distribution + Snapshot adapter | 10K recipients; manifest hash deterministic |
| Migration Compatibility | M3-2B claim service + M3-3 distribution | Dual-write parity asserts invariant on `eligibleAmount` |

### 20.4 Property-Based Tests (Add)
- `∀ cmd: replay(cmd.idempotencyKey) === firstResponse`
- `∀ saga crash point: totalPaidByLedger === countPaidRecipientAggregates`
- `∀ recipient: settlementRef uniqueness across retries`
- `∀ audit insert: hash === H(prevHash || canonical || idempotencyKey)`

### 20.5 NFR-1 Benchmarks
- NFR-1a: `ExecuteDistribution` p95 < 200ms over 10,000 recipient distribution (saga started, returns immediately).
- NFR-1b: end-to-end 10,000-recipient dividend completes < 90s p95 with mocked gateway.

---

## 21. Folder Structure

```
packages/treasury/src/distribution/
├── index.ts
├── distribution.module.ts
├── domain/
│   ├── distribution.aggregate.ts
│   ├── distribution-recipient.aggregate.ts
│   ├── distribution-schedule.aggregate.ts
│   ├── value-objects.ts
│   ├── errors.ts
│   ├── events.ts
│   └── state-machine.ts
├── application/
│   ├── commands/
│   │   ├── create-distribution.*
│   │   ├── approve-distribution.*
│   │   ├── materialize-distribution-recipients.*     # NEW
│   │   ├── execute-distribution.*                     # reduced to "start saga"
│   │   ├── complete-distribution.*                    # saga-issued
│   │   ├── fail-distribution.*                        # saga-issued
│   │   ├── cancel-distribution.*
│   │   ├── recover-recipient-payment.*
│   │   ├── process-recipient-payment.*                # saga-issued
│   │   ├── fail-recipient-payment.*                   # saga-issued
│   │   ├── reconcile-distribution.*
│   │   ├── create-schedule.*
│   │   ├── activate-schedule.*
│   │   └── close-schedule.*
│   ├── queries/
│   │   ├── ... (v1 set)
│   │   ├── get-distribution-progress.*                # NEW (projection-sourced)
│   │   └── get-saga-state.*                           # NEW
│   └── dto/
├── saga/                                              # NEW
│   ├── distribution.saga.ts
│   ├── saga-state.repository.ts
│   ├── saga-checkpoint.event.ts
│   └── saga-policies.ts
├── domain-services/
│   ├── distribution-calculation.service.ts
│   ├── distribution-materialization.service.ts        # NEW
│   ├── recovery-orchestrator.service.ts
│   ├── treasury-reservation.service.ts
│   └── reconciliation-evaluator.service.ts
├── infrastructure/
│   ├── distribution-event-store.repository.ts
│   ├── idempotency-ledger.repository.ts               # NEW (durable ledger)
│   ├── outbox.dispatcher.ts                            # NEW
│   ├── distribution-projection.ts
│   ├── recipient-projection.ts
│   ├── schedule-projection.ts
│   ├── progress-projection.ts                          # NEW
│   ├── audit-chain-validation.projection.ts           # NEW (Contract C5)
│   └── payment-gateway/
├── security/                                           # NEW
│   ├── command-signature.verifier.ts                   # Contract C1
│   ├── approval-signature.verifier.ts                  # Contract C2/C3
│   ├── data-isolation.filter.ts                        # Contract C4
│   └── secrets.keyring.ts                             # Contract C6
├── migration/                                          # NEW
│   ├── m3-2b-compat.view.ts                            # Phase F1
│   ├── dual-write.mapper.ts                            # Phase F2
│   ├── reconcile-parity.job.ts                         # Phase F2
│   ├── cutover.service.ts                               # Phase F3
│   └── retire.job.ts                                   # Phase F4
├── interfaces/
│   └── ...
├── adapters/
│   └── ...
└── __tests__/
    ├── unit/
    ├── integration/
    │   ├── idempotency-ledger.test.ts
    │   ├── saga-crash-recovery.test.ts
    │   ├── materialization.test.ts
    │   ├── outbox-delivery.test.ts
    │   └── m3-2b-migration-parity.test.ts
    └── fixtures/
```

---

## 22. Implementation Roadmap (Reordered)

The roadmap is reordered so that Saga infrastructure, the Idempotency Ledger, and the Outbox ship **before** execution handlers. Attempting handlers first would propagate the v1 synchronous-batch defect into integration tests and downstream modules.

### Phase R1 — Foundation & Financial-Grade Plumbing (Week 1-2)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R1.1 | `value-objects.ts`, `errors.ts` (revised enums + new errors) | — |
| R1.2 | `state-machine.ts` (revised transitions §9) | R1.1 |
| R1.3 | `idempotency-ledger.repository.ts` (durable, append-only) | R1.1 |
| R1.4 | `outbox.dispatcher.ts` + outbox table | R1.3 |
| R1.5 | `command-signature.verifier.ts`, `approval-signature.verifier.ts`, `data-isolation.filter.ts`, `secrets.keyring.ts` (Contracts C1–C6) | R1.1 |
| R1.6 | Property tests for Idempotency Ledger: replay returns identical response, key conflict detection | R1.3 |

### Phase R2 — Aggregates & Materialization (Week 3)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R2.1 | `distribution.aggregate.ts` (revised status enum, no per-recipient totals) | R1.2 |
| R2.2 | `distribution-recipient.aggregate.ts` (with `eligibilityProof`, recovery attempts) | R1.2 |
| R2.3 | `distribution-schedule.aggregate.ts` (formalized state machine) | R1.2 |
| R2.4 | `distribution-materialization.service.ts` + `MaterializeDistributionRecipients` command/handler | R2.1, R2.2 |
| R2.5 | Unit tests for aggregates + materialization (manifest hash determinism) | R2.1–R2.4 |

### Phase R3 — Saga (Week 4)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R3.1 | `distribution.saga.ts`, `saga-state.repository.ts`, saga policy table | R2.1, R2.2 |
| R3.2 | `saga-checkpoint.event.ts` + checkpoint writer | R3.1 |
| R3.3 | `ExecuteDistribution` handler reduced to status transition + `saga.start` | R3.1, R2.1 |
| R3.4 | Saga crash-recovery integration test (kill mid-flight; assert at-most-one settlement by `settlementRef`) | R3.1, R1.3 |
| R3.5 | Circuit breaker against payment gateway | R3.1 |

### Phase R4 — Application Handlers (Week 5)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R4.1 | `CreateDistribution`, `ApproveDistribution` (with C2/C3), `CancelDistribution` | R2.1, R1.5 |
| R4.2 | `CompleteDistribution`/`FailDistribution` (saga-issued terminal handlers; populate `FinalTotals`) | R3.1, R2.1 |
| R4.3 | `ProcessRecipientPayment`, `FailRecipientPayment`, `RecoverRecipientPayment` (saga-issued, Idempotency Ledger-guarded) | R3.1, R2.2, R1.3 |
| R4.4 | `ReconcileDistribution` (reads projections + ledger; emits `DistributionReconciled`) | R2.2, R3.1 |
| R4.5 | Query handlers including new `GetDistributionProgress` and `GetSagaState` | R2.1–R2.3 |

### Phase R5 — Infrastructure & Projections (Week 6)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R5.1 | Event-store repository + stream routing | R4.1–R4.4 |
| R5.2 | `distribution-projection`, `recipient-projection`, `schedule-projection`, `progress-projection` | R4.1–R4.4 |
| R5.3 | `audit-chain-validation.projection` (Contract C5 hash-chain validation on insert) | R5.2 |
| R5.4 | Payment gateway interface + mock | R3.5 |
| R5.5 | Integration tests: lifecycle, idempotency, outbox delivery | R5.1–R5.4 |

### Phase R6 — API, Security & Hardening (Week 7)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R6.1 | REST controllers + validators for all endpoints | R4.5 |
| R6.2 | Security middleware integration (Contracts C1, C2, C4) | R1.5 |
| R6.3 | Cross-domain adapters (Portfolio, Governance, Identity) | R5.4 |
| R6.4 | E2E critical paths | R6.1–R6.3 |
| R6.5 | NFR-1a / NFR-1b benchmarks | R5.5 |

### Phase R7 — Migration & Reconciliation (Week 8)

| Step | Deliverable | Depends On |
|------|-------------|------------|
| R7.1 | `m3-2b-compat.view` (Phase F1) + parity property tests | R5.2 |
| R7.2 | `dual-write.mapper` (Phase F2) + reconcile-parity job | R7.1 |
| R7.3 | `cutover.service` (Phase F3) + per-schedule flag flips | R7.2, R6.4 |
| R7.4 | Multi-sig approval full integration (high-value end-to-end) | R6.2 |
| R7.5 | `retire.job` scaffold (Phase F4) for later dry-run | R7.3 |

---

## 23. Risks and Mitigation

v1 risks updated; new rows identified by `(new)`.

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|------------|-----------|
| R1 | Payment gateway outage blocks distribution | High | Medium | Saga `Suspended` state, circuit breaker, manual recovery; reservation held until saga terminal |
| R2 | Concurrent approval creates double-reservation | High | Low | Idempotency Ledger co-commit; aggregate optimistic concurrency |
| R3 | Saga crash mid-flight | High | Medium | `DistributionSagaCheckpoint` + Idempotency Ledger `settlementRef` binding guarantees at-most-one settlement per recipient |
| R4 | Integer overflow | High | Very Low | `bigint` everywhere; property-based tests |
| R5 | Replayed cross-domain event causes duplicate side effects | Medium | Low | Outbox + `deliveredIdempotencyKey` consumer ledger |
| R6 | Snapshot drift during materialization | Medium | Medium | Materialization reads immutable snapshot; eligibility proof pinned to snapshot version |
| R7 | Multi-sig quorum never reached | Low | Low | Configurable timeout + escalation; stale-signature rejection via `approvalEpoch` |
| R8 | Recovery loop indefinitely | Low | Low | `maxRecoveryAttempts` enforced at aggregate + saga policy; manual escalation after exhaustion |
| R9 | Reconciliation mismatch | Medium | Low | Tolerance threshold; manual resolution; full event trace |
| R10 | Cross-domain adapter failure | Medium | Medium | Cached snapshot; stale-data warning; circuit breaker |
| R11 (new) | Idempotency Ledger/partition failure drops a key | High (duplicate pay) | Low | Ledger is append-only and co-committed in the same transaction as the produced events; WAF RPO=0 |
| R12 (new) | Tampered audit chain (insider risk) | High | Low | `audit-chain-validation.projection` halts on `prevHash` mismatch; separate write/read credentials |
| R13 (new) | Stale approval signature reused after distribution update | Medium | Medium | Contract C2 `approvalEpoch` vs `distribution.version`; Idempotency Ledger forbids same key reuse |
| R14 (new) | M3-2B ↔ M3-3 parity drift during dual-write window | Medium | Medium | Phase F2 reconciliation job blocks per-schedule cutover until invariant holds |
| R15 (new) | Saga `Suspended` indefinitely under provider outage | Medium | Medium | Configured `suspensionTimeout`; on expiry, manual recovery lane surfaces via `ListPendingRecoveries` |

---

## Appendix A — Glossary (additions)

| Term | Definition |
|------|-----------|
| DistributionSaga | Persistent coordinator that drives per-recipient settlement after a distribution reaches `Executing` |
| Idempotency Ledger | Durable append-only store co-committed with produced events that guarantees at-most-one effect per idempotency key for the lifetime of the system |
| Settlement Ref | Deterministic hash binding a recipient payment attempt to the immutable materialization manifest; guards saga-issued payments against double settlement |
| Materialization Manifest | Hash over the canonical sorted recipient set eligible under a snapshot + rule set; referenced by `DistributionRecipientsMaterialized` and used in `settlementRef` |
| Outbox | Transactional table that records cross-domain events to be dispatched with at-least-once delivery and deduplicated by consumers |

## Appendix B — Contract Index

| Contract | Domain |
|----------|--------|
| C1 | Command Authentication |
| C2 | Approval Signature |
| C3 | Multi-Sig Quorum |
| C4 | Data Isolation |
| C5 | Audit Immutability |
| C6 | Secrets Custody |
| C7 | Outbound Payload Hygiene |

## Appendix C — NFR Index

| NFR | Domain |
|-----|--------|
| NFR-1a | Internal Command Responsiveness (≤ 200ms p95) |
| NFR-1b | External Settlement Throughput (≥ 200 r/s; 10K recipients ≤ 90s p95) |
| NFR-2 | Concurrency correctness |
| NFR-3 | Integer arithmetic |
| NFR-4 | Event replay recoverability |
| NFR-5 | Multi-sig at threshold |
| NFR-6 | Idempotency Ledger durability |
| NFR-7 | Saga resumability |

---

*End of Architecture Revision v2. This document is intended for final approval prior to implementation; no further design changes are expected outside of approval feedback.*