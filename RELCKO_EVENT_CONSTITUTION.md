# RELCKO Event Constitution v1.0

**Status:** Architecture Authority — Ratified
**Companion documents:** `EVENT_ARCHITECTURE.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `AUDIT_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`

**Scope:** This constitution governs every event produced, consumed, stored, or
replayed anywhere within the RELCKO platform, including all modules, services,
agents, smart contracts, AI copilots, integrations, and third-party adapters.

**Authority:** This document supersedes all local event conventions. No module,
service, or engineer may deviate from these articles without a formal amendment.

---

## Preamble

Events are the fundamental atoms of state change in RELCKO. Every investment,
every transfer, every commission, every governance action, every dividend
distribution is recorded as an event. The integrity of the event log is the
integrity of the platform. This constitution establishes the inviolable rules by
which events live, die, and are reborn.

---

## 1. Philosophy

### 1.1 Why RELCKO Is Event-Driven

RELCKO is a platform of record for real-world asset ownership. Every action has
legal, financial, and regulatory consequences. A relational database captures
current state but erases history. An event log preserves every decision, every
attribution, every movement. Event-driven architecture is chosen because it is
the only paradigm that satisfies simultaneous demands for auditability,
replayability, and decentralization.

### 1.2 Why Events Are Immutable

An event that has been recorded represents a fact that occurred at a point in
time. A fact cannot be unwritten. Immutability is not a technical preference; it
is an architectural commitment to truth. Any system that permits event mutation
is, by definition, untrustworthy.

### 1.3 Why Events Are the Source of Truth

Current state (investor portfolio balance, property fraction supply, voting
power) is derived from events. The event log is the primary record. All read
models, projections, caches, and materialized views are secondary. If a
projection and the event log disagree, the event log prevails. There is no
appeal.

---

## 2. Event Principles

Every event in RELCKO must satisfy the following principles:

| # | Principle | Definition |
|---|-----------|------------|
| 2.1 | **Determinism** | Replaying the same events in the same order shall always produce identical state. No event handler may use non-deterministic sources (wall clock, random, external API) during replay. |
| 2.2 | **Immutability** | Once committed to the log, an event may never be altered, deleted, or amended. Correction is achieved by appending a compensating event, never by mutation. |
| 2.3 | **Idempotency** | Processing the same event twice must produce the same business effect as processing it once. Every consumer must be idempotent by construction. |
| 2.4 | **Replayability** | Any event stream may be replayed from origin to reconstruct identical state. Replay is the mechanism of recovery, audit, and projection rebuild. |
| 2.5 | **Auditability** | Every event must be explained: who produced it, what caused it, when it occurred, and what fact it records. No orphan events. |
| 2.6 | **Traceability** | Every event carries a chain of causation linking it to the event that triggered it, the user action that initiated it, and the distributed trace it belongs to. |
| 2.7 | **Versioning** | Every event carries an explicit schema version. Breaking changes produce a new event type. Backward compatibility is maintained until formal deprecation. |
| 2.8 | **Ordering** | Events within an aggregate are totally ordered. Across aggregates, ordering is eventual unless causal dependencies are declared. |
| 2.9 | **Isolation** | Events are self-contained. They carry all data required for processing. No consumer should need to query external state to interpret an event. |
| 2.10 | **Consistency** | Eventual consistency is the default. Strong consistency is guaranteed only within an aggregate boundary. Cross-aggregate invariants are enforced by compensating workflows. |

---

## 3. Event Lifecycle

Every event traverses the following states. No event may skip a state. No event
may be processed in a state not defined herein.

```
Created → Validated → Published → Consumed → Projected → Archived → Expired
                              ↓
                           Replayed
```

### 3.1 Created

An event is created by a producer (service, controller, agent, smart contract)
as a structured fact recording a state change. Creation must populate all
required envelope fields. The event is not yet visible to consumers.

### 3.2 Validated

The event bus or producer middleware validates the event against its schema and
constitutional rules:
- Required fields present and well-typed
- Schema version declared and recognized
- Producer identity authenticated
- Aggregate causal dependencies satisfied (if any)
- Payload conforms to contract

Invalid events are rejected before publication. Rejection is itself recorded as
a system event.

### 3.3 Published

A validated event is committed to the durable, append-only event log. Once
committed, it is immutable. Publication makes the event visible to all
authorized consumers. The event log is the single source of truth.

### 3.4 Consumed

Subscribers receive published events according to their subscription scope.
Consumers must be idempotent. Consumption failure does not affect the event
log — only the consumer's projection.

### 3.5 Projected

Consumed events are applied to read models, materialized views, caches, and
derived state. Projections are secondary. They may be rebuilt from the event log
at any time.

### 3.6 Archived

Events transition from hot storage to warm or cold storage according to the
retention policy defined in Article 12. Archival preserves the event in full;
it does not truncate, redact, or compress the payload.

### 3.7 Replayed

An event may be replayed from any point in its lifecycle. Replay reproduces
every downstream projection identically. Replay does not modify the event log.

### 3.8 Expired

An event reaches its retention limit and is deleted according to Article 12.
Permanent events (Article 12.4) never expire.

---

## 4. Event Ownership

### 4.1 Who Owns an Event

The producing module owns the event definition, schema, and semantics. Ownership
is not transferable without a formal governance vote.

### 4.2 Who May Publish

Only authenticated producers with write permission on the aggregate domain may
publish events. Publication permissions are defined in the Permission Model
(`PERMISSION_MODEL.md`) and enforced by the event bus.

### 4.3 Who May Consume

Any authenticated subscriber with a legitimate need may consume events.
Consumption permissions are scoped by module, aggregate type, and event type.
The full permission matrix is defined in the Permission Model.

### 4.4 Who May Never Modify an Event

No actor — human or automated — may ever modify a committed event. This includes
administrators, root users, database operators, and emergency protocols. The
only legitimate response to an incorrect event is a compensating event.

### 4.5 Event Schema Ownership

Event schemas are owned by the producing module's domain team. Schema changes
follow the versioning rules of Article 9. No module may alter another module's
event schema.

---

## 5. Event Envelope

Every event must conform to the following canonical envelope. The envelope is
the universal structure that wraps all domain-specific payloads.

### 5.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | UUID v7 | Globally unique event identifier. Monotonic by timestamp. |
| `type` | String | Fully qualified event type name in the form `{domain}.{aggregate}.{action}` (e.g., `marketplace.investment.confirmed`). |
| `aggregateId` | UUID | Identifier of the aggregate instance this event belongs to. |
| `version` | Positive Integer | Monotonically increasing sequence number within the aggregate. |
| `timestamp` | ISO 8601 UTC | Moment at which the event was created by the producer. |
| `producer` | String | Identity of the service, module, or agent that created the event. |
| `schemaVersion` | Positive Integer | Version of the event schema (see Article 9). |
| `payload` | JSON Object | Domain-specific data. Schema defined by the producing module. |

### 5.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | UUID | Identifier linking this event to a top-level business operation. All events triggered by the same user action share the same correlationId. |
| `causationId` | UUID | Identifier of the immediate parent event that caused this event. Forms the causation chain. |
| `traceId` | UUID | Distributed tracing identifier spanning service boundaries. All events in a single trace share the same traceId. |
| `actorId` | UUID | Identity of the human or system actor who initiated the operation. |
| `aggregateType` | String | Type name of the aggregate (e.g., `Investment`, `Property`, `Proposal`). |
| `partitionKey` | String | Key used for physical partitioning of the event stream. Defaults to `aggregateId` if absent. |
| `metadata` | JSON Object | Extensible bag of non-domain metadata (region, deployment, environment, tags). |

### 5.3 Correlation and Causation

The triple `(correlationId, causationId, traceId)` forms the backbone of event
traceability:

- **correlationId:** Identifies the originating business operation. Immutable for
  the lifetime of the operation. All events triggered directly or indirectly by
  a single user request share this value.
- **causationId:** Identifies the immediate cause. If event B is produced as a
  side effect of processing event A, then B.causationId = A.eventId. This forms
  an acyclic directed graph of causation.
- **traceId:** Identifies the distributed trace. All events across all services
  that participate in serving a single top-level request share this value.

These three identifiers together enable complete forensic reconstruction of how
any event came to be.

---

## 6. Ordering Rules

### 6.1 Aggregate Ordering

Within a single aggregate, events are strictly ordered by `version`. The event
log must guarantee that for any given aggregate, events are delivered to
consumers in monotonically increasing version order. Gaps are not permitted.

### 6.2 Cross-Aggregate Ordering

No global ordering guarantee exists across aggregates. Cross-aggregate events
are ordered only by causal dependency (expressed via `causationId`). Consumers
that require cross-aggregate consistency must buffer events until all causal
dependencies are satisfied.

### 6.3 Partition Ordering

Within a physical partition (defined by `partitionKey`), events are ordered by
`timestamp`. Different partitions have no ordering guarantees relative to each
other.

### 6.4 Replay Ordering

During replay, events are delivered in the same order as they were originally
published. For aggregate-scoped replays, this means strict `version` order. For
global replays, this means `timestamp` order per partition.

### 6.5 Duplicate Ordering

If a duplicate event arrives (same `eventId` and `aggregateId`), it is discarded.
Duplicate ordering is irrelevant because the event is not processed. See
Article 7.

---

## 7. Idempotency Constitution

### 7.1 Sacrosanct Principle

Every event consumer shall be idempotent. This is not a recommendation. It is a
constitutional requirement.

### 7.2 Duplicate Handling

A duplicate event is any event whose `eventId` and `aggregateId` match an
already-processed event. The consumer must detect duplicates and skip
processing. The deduplication window must cover the maximum expected replay
depth.

### 7.3 Exactly-Once vs At-Least-Once

The event bus delivers at-least-once. Exactly-once business effect is achieved
by the consumer's idempotency key (the `eventId`), never by the transport. The
bus shall never guarantee exactly-once delivery, because such guarantees are
impossible in distributed systems without sacrificing availability.

### 7.4 Replay Safety

Replay is simply a high-volume form of at-least-once delivery. The same
idempotency rules apply. A projection must produce identical state whether
events arrive once in real time or a thousand times during replay.

### 7.5 Consumer Responsibilities

Every consumer must:
1. Check for prior processing of `eventId` + `aggregateId` before applying.
2. Store processed event IDs with sufficient durability and retention to cover
   the maximum replay window.
3. Never assume a first-time delivery.

### 7.6 Producer Responsibilities

Every producer must:
1. Generate a unique `eventId` for every event instance.
2. Never reuse `eventId` across retries without ensuring the retry uses the
   original `eventId` (idempotent publication).
3. Ensure that the `(eventId, aggregateId)` pair is globally unique.

---

## 8. Replay Constitution

### 8.1 Right to Replay

Any module, projection, or audit function may request a replay of any event
stream at any time. No permission is required beyond access to the stream. This
right is absolute and may not be denied.

### 8.2 Replay Rules

1. Replay must deliver events in the same order as original publication.
2. Replay must not alter the event log.
3. Replay must include all events, including those that may have been
   compensated or superseded.
4. Replay must respect the same idempotency guarantees as real-time delivery.

### 8.3 Historical Reconstruction

Replay from the origin of an aggregate reconstructs its complete history.
Historical reconstruction is the definitive method for recovering from
projection corruption.

### 8.4 Snapshot Interaction

Snapshots may be used to accelerate replay. A snapshot is a materialized state
at a given version. When a snapshot exists, replay may start from the snapshot
version rather than the origin, applying only events after the snapshot. The
snapshot must be recomputed from the event log — never the converse.

### 8.5 Projection Rebuilding

Any projection may be rebuilt by:
1. Clearing the projection state.
2. Replaying all relevant events from the origin (or from the latest snapshot).
3. Applying each event idempotently.

After rebuild, the projection must be byte-identical to a projection that was
built incrementally over time.

### 8.6 Late Replay

Events that arrive after a projection has already advanced beyond their version
(late events) must be rejected. The aggregate enforces strict causal ordering;
a late event indicates a corrupted stream or a bug.

### 8.7 Partial Replay

A consumer may request a partial replay scoped by aggregate, event type,
time range, or version range. The event bus must support all four scoping
dimensions.

---

## 9. Event Versioning

### 9.1 Schema Evolution

Event schemas evolve. The `schemaVersion` field records the version of the
schema used when the event was created. Every event carries the version that was
current at its creation time.

### 9.2 Backward Compatibility

A change is backward-compatible if an event written with the new schema can be
consumed correctly by a consumer using the old schema. The following changes are
always backward-compatible:
- Adding an optional field to the payload.
- Adding an optional field to the envelope metadata.
- Extending an enum with new values.

### 9.3 Forward Compatibility

A change is forward-compatible if an event written with the old schema can be
consumed correctly by a consumer using the new schema. The following rules
ensure forward compatibility:
- Consumers must ignore unknown fields.
- Consumers must treat missing optional fields as their default value.
- Required fields may never be removed.

### 9.4 Breaking Changes

A change is breaking if it violates backward or forward compatibility. Breaking
changes include:
- Removing a required field.
- Changing the type of an existing field.
- Renaming a field.
- Making an optional field required.

Breaking changes require a new event type. The old event type must continue to
be published until the deprecation window expires.

### 9.5 Type Deprecation

When a new event type supersedes an old one:
1. Add the new event type to the schema registry.
2. Begin dual publication (both old and new types) for a minimum of one full
   release cycle.
3. Mark the old type as deprecated in the schema registry.
4. After the dual-publication window, cease publication of the old type.
5. Archive the old type definition. Old events remain in the log and remain
   replayable forever.

### 9.6 Schema Registry

The event schema registry is the authoritative catalog of every event type,
including all historical versions. It must be append-only and versioned
independently of the event log.

---

## 10. Security

### 10.1 Event Signing

Every event must be cryptographically signed by its producer. The signature
covers the entire envelope including the payload. Signature verification is
performed by the event bus before publication and optionally by consumers.

### 10.2 Integrity Verification

The event log must provide integrity verification at rest and in transit.
Tampering with a committed event must be detectable. A Merkle-style hash chain
over the event stream (each event's hash includes the previous event's hash) is
the minimum requirement.

### 10.3 Producer Authentication

The event bus must authenticate every producer before accepting events.
Authentication is per-producer-identity, not per-module. Shared secrets are
prohibited.

### 10.4 Consumer Authorization

The event bus must authorize every subscription before delivering events.
Authorization is scoped by:
- Event type.
- Aggregate type.
- Aggregate instance (where applicable).
- Time range (where applicable).

### 10.5 Tamper Detection

Any event whose signature or hash-chain position is invalid must be treated as a
security incident. The event must be quarantined, an `AlertRaised` event
published, and the security team notified.

---

## 11. Audit

### 11.1 Every Event Must Be Explainable

Given any event, a human auditor must be able to determine:
- What fact the event records.
- Who or what produced it.
- When it was produced.
- What business operation caused it.
- What prior event caused it (via `causationId`).
- What top-level operation initiated the chain (via `correlationId`).

### 11.2 Every Event Must Be Traceable

The triple `(correlationId, causationId, traceId)` must enable a complete
forensic trace from any event back to the originating user action and forward
to all downstream consequences.

### 11.3 Every Event Must Be Reproducible

Any event stream, from any point in time, must be fully replayable to reproduce
the exact state that existed at any prior moment. This is the fundamental
guarantee of the event log.

### 11.4 Audit Log

A dedicated audit projection materializes every event for compliance and
regulatory access. The audit log must be queryable by actor, aggregate, event
type, and time range. The audit log is a derived projection and may be rebuilt
from the event log at any time.

---

## 12. Retention

### 12.1 Hot Storage

Events in hot storage are immediately accessible for real-time consumption and
replay. Retention in hot storage is defined per event type. The default is 90
days.

### 12.2 Warm Storage

Events in warm storage are accessible within seconds. Warm storage retains
events that are beyond the hot window but still within active audit or replay
range. The default warm retention is 365 days.

### 12.3 Cold Storage

Events in cold storage are accessible within hours. Cold storage is the final
tier before deletion. The default cold retention is 7 years for financial events
and 3 years for non-financial events, subject to regulatory requirements.

### 12.4 Permanent Events

The following event types are permanent and must never be deleted:
- `InvestmentConfirmed`
- `MarketplaceSaleCompleted`
- `TreasuryMovementApproved`
- `DividendDistributed`
- `GovernanceProposalCreated`
- `VoteCast`
- `KYCApproved`
- `KYCRejected`
- `CommissionPaid`
- Any event explicitly marked permanent by governance vote.

### 12.5 Deletion Policy

Event deletion is governed by the following rules:
- No event may be deleted before its retention period expires.
- Permanent events may never be deleted.
- Deletion must be logged as a system event.
- Deletion is irrevocable. Cryptographic verification of deletion is
  recommended.
- Regulatory-required events override all retention configurations.

---

## 13. Error Handling

### 13.1 Poison Events

A poison event is an event that causes a deterministic, unrecoverable failure in
one or more consumers despite being valid according to the schema registry.
Poison events must not be retried automatically.

### 13.2 Dead-Letter Queue

Any event that exhausts its retry limit or is classified as poison is routed to
a dead-letter queue (DLQ). Events in the DLQ are quarantined. No consumer
processes DLQ events automatically.

### 13.3 Retry Policy

Transient consumer failures trigger automatic retries with exponential backoff.
The maximum retry count is 5. After the fifth failure, the event is routed to
the DLQ.

### 13.4 Manual Intervention

DLQ events require human review. An operator must:
1. Inspect the event and the consumer failure.
2. Decide whether to skip, retry, or compensate.
3. Record the decision and action as an `AdminActionLogged` event.
4. If a compensating event is required, produce it explicitly.

### 13.5 Aggregate Pause

If an aggregate produces poison events or exhibits persistent failures, the
aggregate may be paused. A paused aggregate stops producing and consuming events
until explicitly resumed by an operator. Pause and resume are themselves events.

---

## 14. Constitutional Articles

The following articles are the inviolable, non-negotiable principles of the
RELCKO Event Constitution. No module, service, or actor may deviate from them
under any circumstances.

---

**Article 1 — Event Immutability**

Events are immutable. A committed event may never be altered, deleted, or
amended. Correction shall be achieved exclusively by appending a compensating
event.

**Article 2 — Event Log as Truth**

The event log is the single source of truth. Every read model, projection,
cache, and materialized view is a derived artifact. When any derived artifact
disagrees with the event log, the event log prevails.

**Article 3 — Idempotent Consumption**

Every event consumer shall be idempotent. The same event, processed once or a
thousand times, must produce the identical business effect.

**Article 4 — Deterministic Replay**

Replaying the same set of events in the same order shall always produce
identical state. No consumer may introduce non-deterministic behavior during
replay. This includes the use of wall-clock timestamps, random number
generators, or external API calls.

**Article 5 — Compensating Events**

An incorrect event shall never be corrected by mutation. The only legitimate
correction is a compensating event that explicitly reverses or amends the
original fact. The compensating event must reference the original event via its
`causationId`.

**Article 6 — Causation Chain**

Every event caused by the processing of another event must set its `causationId`
to the `eventId` of the causing event. The resulting directed acyclic graph of
causation must be complete, with no broken links.

**Article 7 — Universal Traceability**

Every event must carry `correlationId`, `causationId`, and `traceId` to enable
complete forensic traceability from any point in the system to any other point.

**Article 8 — Schema Registry Authority**

The event schema registry is the authoritative definition of every event type.
No event may be published without a registered schema. No schema may be altered
without versioning.

**Article 9 — Backward Compatibility**

Event producers must maintain backward compatibility for all published event
types. A new event type shall be introduced for breaking changes. Dual
publication shall be maintained for no fewer than one full release cycle.

**Article 10 — Right to Replay**

Any module, projection, or audit function may replay any event stream at any
time without seeking permission. No authentication gate, rate limit, or
throttle may deny the right to replay.

**Article 11 — No Deletion of Permanent Events**

Events designated as permanent shall never be deleted. The list of permanent
event types may be amended only by governance vote.

**Article 12 — Producer Authentication**

Every event producer must be authenticated before publishing. Anonymous
publication is prohibited. Authentication is per-producer-identity, not
per-module.

**Article 13 — Integrity Chain**

The event log must maintain a cryptographic hash chain such that any tampering
with a committed event is detectable. Each event's hash must include the hash of
the immediately preceding event in the aggregate stream.

**Article 14 — Poison Event Quarantine**

Any event that exhausts retries or causes unrecoverable failure shall be
routed to a dead-letter queue. No poison event shall be automatically retried
outside the DLQ.

**Article 15 — Compensating Event for Any Incorrect Fact**

Any actor who discovers that a committed event records an incorrect fact must
immediately produce a compensating event. Delay in correction is a violation of
this constitution.

**Article 16 — Aggregate Causal Ordering**

Events within an aggregate shall be totally ordered by monotonically increasing
version. Gap-free delivery within the aggregate is a constitutional requirement.

**Article 17 — Snapshot Subordination**

Snapshots are derived from the event log, never the reverse. A snapshot may be
used to accelerate replay but must never serve as the authoritative source of
truth. If a snapshot and the event log diverge, the snapshot must be rebuilt
from the log.

**Article 18 — Audit Completeness**

Every event that occurs in the system must be recorded in the event log. No
state change may bypass the event log. Any operation that modifies state without
producing an event is a constitutional violation.

**Article 19 — Event Isolation**

Every event must be self-contained. An event shall carry all data necessary for
its processing. Consumers should not be required to query external state to
interpret or apply an event.

**Article 20 — Deletion Audit**

Every event deletion must be recorded as a system event. Deletion is
irreversible. No event may be deleted before its retention period expires.

---

## 15. Future Compatibility

### 15.1 Marketplace

The marketplace module produces events (`InvestmentConfirmed`,
`MarketplaceSaleCompleted`, `OwnershipUpdated`, etc.) that are fully governed by
this constitution. Future marketplace features (Dutch auctions, reserve pricing,
batch sales) must introduce new event types via the versioning rules of Article
9. No existing event type shall be modified.

### 15.2 NFT

NFT events (`NFTMinted`, `NFTSold`, `RoyaltiesPaid`) are governed identically.
NFT metadata may include references to off-chain content, but those references
must be immutable (content-addressed URIs). Event payloads must not embed entire
media blobs.

### 15.3 AI

AI agent events (`CopilotQueryReceived`, `CopilotAnswerIssued`,
`CopilotPolicyViolation`) must satisfy all constitutional requirements,
including idempotency and traceability. Queries and answers are immutable facts.
Policy violations are permanent audit events.

### 15.4 Cross-Chain

Events that originate on external chains (Ethereum, L2s, other L1s) must be
wrapped in a RELCKO envelope with proof of origin (block number, transaction
hash, log index, chain ID). The wrapping event is subject to this constitution.
The inner event is governed by the source chain's finality rules.

### 15.5 International

RELCKO operates across jurisdictions. Event payloads must include
jurisdiction-relevant metadata (GDPR consent, data residency, regulatory
classification) when required. Regional retention policies may extend but never
shorten the retention periods defined in Article 12.

### 15.6 Enterprise

Enterprise tenants may configure additional event routing, audit hooks, and
retention policies within their scope. Enterprise overrides must not compromise
the constitutional inviolability of the event log. No enterprise configuration
may delete or modify a committed event.

### 15.7 AI Agents and Autonomous Publishers

Any AI agent or autonomous system that publishes events must do so through a
producer identity that is distinct from human operators. The agent's identity,
decision rationale, and policy violations must be recorded in the event payload.
Autonomous events remain subject to all articles of this constitution, including
the immutable commitment of Article 1 and the causation traceability of Article
6.

---

## 16. Open Constitutional Decisions

The following items are explicitly left to implementation discretion. They are
not governed by this constitution and may be decided independently by each
module, service, or deployment:

| # | Decision | Rationale |
|---|----------|-----------|
| 16.1 | **Event transport technology** (Kafka, Pulsar, NATS, RabbitMQ, in-process bus) | The constitution governs behavior, not infrastructure. Any transport that satisfies ordering (Section 6), durability (Section 3), and at-least-once delivery (Section 7) is acceptable. |
| 16.2 | **Serialization format** (JSON, Avro, Protobuf, MessagePack) | The envelope schema and payload structure are defined; the wire format is an implementation detail. |
| 16.3 | **Database technology** for event storage (PostgreSQL, EventStoreDB, DynamoDB, Kafka log) | Any storage engine that provides append-only durability, ordering per aggregate, and integrity verification is acceptable. |
| 16.4 | **Snapshot frequency and storage** | The decision of when to create snapshots, how many to retain, and how to store them is a performance tuning parameter. |
| 16.5 | **Dead-letter queue implementation** | DLQ routing, storage, and notification mechanisms are operational decisions. |
| 16.6 | **Retry intervals and backoff parameters** | Base interval, multiplier, maximum interval, and jitter are environment-specific. |
| 16.7 | **Encryption at rest for events** | The constitution requires integrity (Article 10); encryption is a security layer orthogonal to the event model. |
| 16.8 | **Partition count and partitioning strategy** | Physical partitioning is a scalability parameter. The constitution defines logical ordering (Section 6). |
| 16.9 | **Monitoring and alerting thresholds** | Operational observability (latency, throughput, backlog depth, error rates) is deployment-specific. |
| 16.10 | **Hot/warm/cold storage tiering technology** | S3, GCS, Azure Blob, Glacier, tape — any tiering system that honors retention windows (Article 12) is compliant. |
| 16.11 | **Producer identity format and authentication mechanism** | JWT, API keys, mTLS, OAuth — the constitution requires authentication (Article 12), not a specific protocol. |
| 16.12 | **Consumer offset management** | Committed offsets, checkpointing frequency, and rebalancing strategy are consumer-group implementation details. |
| 16.13 | **Event type naming conventions** | The required format is `{domain}.{aggregate}.{action}`; the specific values and namespace hierarchy are determined by module owners. |
| 16.14 | **Compaction policy** | Whether and how to compact the event log (removing events that have been superseded for non-permanent streams) is a storage optimization. |
| 16.15 | **Multi-region replication strategy** | Active-active, active-passive, read replicas — the constitution governs the logical event contract, not the physical replication topology. |

---

## Amendments

This constitution may be amended only by a governance vote that achieves the
same quorum and approval threshold as a parameter-change proposal.

An amendment must:
1. Clearly identify the article(s) being amended.
2. State the rationale for the change.
3. Provide a transition plan for existing events and consumers.
4. Update the constitution version number.

---

*End of RELCKO Event Constitution v1.0.*
