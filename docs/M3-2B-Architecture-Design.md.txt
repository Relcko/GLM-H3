M3-2B ARCHITECTURE DESIGN SPECIFICATION

  Domain: Dividend Claim Lifecycle
  Status: Design — awaiting approval before implementation
  Foundation: M3-2A (DividendSchedule + OwnershipSnapshot + SnapshotPosition)

  ───
  1. DOMAIN MODEL

  ───
  Three new types. All ADDITIVE. Built on M3-2A foundation.

  1.1 — ClaimStatus enum

    export enum ClaimStatus {
      Eligible   = "eligible",    // SnapshotPosition exists, claim window open
      Initiated  = "initiated",   // Investor submitted claim request
      Claimed    = "claimed",     // Claim validated against immutable snapshot
      Paid       = "paid",        // Distribution settled to investor
      Completed  = "completed",   // All settlements confirmed
      Expired    = "expired",     // Claim window closed without action
      Disputed   = "disputed",    // Under administrative review
    }

  1.2 — DividendClaim (aggregate)

    export interface DividendClaim {
      readonly id: EntityId;
      readonly scheduleId: EntityId;              // FK → DividendSchedule
      readonly snapshotId: EntityId;              // FK → OwnershipSnapshot
      readonly investorId: EntityId;
      readonly positionIndex: number;             // index into SnapshotPosition[]
      readonly claimedAmount: Money;              // derived from 
  SnapshotPosition.quantity × perTokenAmount
      readonly status: ClaimStatus;
      readonly initiatedAt?: Timestamp;           // when investor submitted claim
      readonly claimedAt?: Timestamp;             // when claim validated
      readonly paidAt?: Timestamp;                // when distribution settled
      readonly completedAt?: Timestamp;           // final settlement
      readonly expiresAt?: Timestamp;             // claim window deadline
      readonly metadata: Record<string, unknown>;
      readonly createdAt: Timestamp;
    }

  Aggregate root: DividendClaim. Each claim is uniquely identified by (scheduleId,
   investorId). Only one active claim per investor per schedule.

  1.3 — ClaimReceipt (value object)

    export interface ClaimReceipt {
      readonly claimId: EntityId;
      readonly scheduleId: EntityId;
      readonly investorId: EntityId;
      readonly claimedAmount: Money;
      readonly status: ClaimStatus;
      readonly proof: string;                     // hash of (scheduleId + 
  investorId + snapshotPosition)
      readonly issuedAt: Timestamp;
    }

  Value object, not persisted independently. Returned to the caller as proof of
  claim. Can be recomputed from DividendClaim at any time.

  Relationship diagram (with M3-2A):

    DividendSchedule (1)
        └── OwnershipSnapshot (1)
                ├── SnapshotPosition[] (N)
                └── DividendClaim[] (N)           ← M3-2B addition
                        └── ClaimReceipt (value, derived)

  Invariant: DividendClaim.claimedAmount must match exactly
  SnapshotPosition.quantity × DividendSchedule.perTokenAmount. If no matching
  SnapshotPosition exists for the investor, the claim is invalid. The
  SnapshotPosition is the immutable source of truth — live portfolio ownership is
  never consulted for an existing claim.

  ───
  1. LIFECYCLE

  ───
    Eligible ──► Initiated ──► Claimed ──► Paid ──► Completed
       │              │            │         │
       │              │            │         └──► Disputed (if payment fails)
       │              │            │
       │              │            └──► Expired (if distribution never settles)
       │              │
       │              └──► Expired (if claim window closes)
       │
       └──► Expired (if claim window closes without action)

  Transition rules:

  ┌───────────┬───────────┬─────────────────────────────────────────────────────┐
  │ From      │ To        │ Condition                                           │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Eligible  │ Initiated │ Investor calls initiateClaim(scheduleId)            │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Eligible  │ Expired   │ expiresAt passes without initiateClaim              │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Initiated │ Claimed   │ Validation succeeds: SnapshotPosition exists,       │
  │           │           │ identity match                                      │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Initiated │ Expired   │ expiresAt passes before validation completes        │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Claimed   │ Paid      │ Distribution service settles amount to investor     │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Claimed   │ Expired   │ Distribution never settles before deadline          │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Paid      │ Completed │ All settlement confirmations received, receipt      │
  │           │           │ issued                                              │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Paid      │ Disputed  │ Administrative override (recovery, error, etc.)     │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Disputed  │ Completed │ Dispute resolved, final settlement recorded         │
  ├───────────┼───────────┼─────────────────────────────────────────────────────┤
  │ Disputed  │ Claimed   │ Dispute reverted — return to claimed state          │
  └───────────┴───────────┴─────────────────────────────────────────────────────┘

  Invariants:

  - Cannot transition backward to Prior state (except Disputed → Claimed via
  admin)
  - Cannot transition to Paid or Completed without passing through Claimed
  - claimedAmount is derived once at Initiated → Claimed and never recalculated
  - Claim is tied to specific SnapshotPosition via positionIndex — immutable
  reference
  - Snapshot must exist and be in Snapshotted status for any claim to be initiated

  Transition gate — Initiated → Claimed validation:

  1. OwnershipSnapshot.scheduleId === DividendClaim.scheduleId — snapshot belongs
  to schedule
  2. SnapshotPosition[positionIndex].investorId === DividendClaim.investorId —
  identity match
  3. SnapshotPosition[positionIndex].quantity × DividendSchedule.perTokenAmount 
  === DividendClaim.claimedAmount — amount derived correctly
  4. DividendSchedule.status === Snapshotted || Closed — schedule is in valid
  state for claims

  ───
  1. SNAPSHOT INTEGRATION

  ───
  Immutable reference model:

  - Every DividendClaim stores snapshotId + positionIndex — a direct, immutable
  pointer into OwnershipSnapshot.positions[]
  - At claim validation time (Initiated → Claimed), the service reads the
  snapshot, validates the position, and derives claimedAmount
  - After Claimed status is set, the positionIndex is frozen — if the snapshot is
  superseded by a new one (future M3 feature), existing claims remain valid
  against their original snapshot
  - Live portfolio ownership is never consulted for a snapshotted claim

  Validation pipeline — validateClaimPosition():

    function validateClaimPosition(
      schedule: DividendSchedule,
      snapshot: OwnershipSnapshot,
      position: SnapshotPosition,
      claim: DividendClaim,
    ): boolean {
      // 1. Snapshot belongs to schedule
      if (snapshot.scheduleId !== claim.scheduleId) return false;

      // 2. Investor owns this position
      if (position.investorId !== claim.investorId) return false;

      // 3. Claimed amount matches entitlement
      const entitlement = position.quantity * schedule.perTokenAmount;
      if (claim.claimedAmount.amount !== entitlement) return false;

      // 4. Snapshot is active (not superseded)
      if (snapshot.version < 1) return false;

      return true;
    }

  ───
  1. SERVICE LAYER

  ───
  Additive to DividendService. No existing method signatures change.

  New public methods:

    initiateClaim(actorId, scheduleId)                          → DividendClaim
    validateClaim(actorId, claimId)                             → DividendClaim
    markClaimPaid(actorId, claimId)                             → DividendClaim
    completeClaim(actorId, claimId)                             → ClaimReceipt
    expireClaim(claimId)                                        → DividendClaim
    disputeClaim(actorId, claimId, reason)                      → DividendClaim
    resolveDispute(actorId, claimId, resolution, targetStatus)  → DividendClaim

    getClaim(scheduleId, investorId)                            → DividendClaim |
  undefined
    listClaimsBySchedule(scheduleId)                            → DividendClaim[]
    listClaimsByInvestor(investorId)                            → DividendClaim[]
    listClaimsByStatus(status)                                  → DividendClaim[]
    getClaimReceipt(claimId)                                    → ClaimReceipt

  initiateClaim() internal flow:

    initiateClaim(actorId, scheduleId):
      1. schedule = repo.getSchedule(scheduleId)
      2. Validate schedule.status in [Snapshotted, Closed]
      3. snapshot = repo.getSnapshotBySchedule(scheduleId)
      4. Find investor's SnapshotPosition by investorId
         → if not found: throw "No eligible position for this investor"
      5. Check no existing claim for (scheduleId, investorId)
         → if exists and status ≠ Expired: throw "Claim already exists"
         → if exists and status = Expired: allow re-initiation
      6. Calculate claimedAmount = position.quantity × schedule.perTokenAmount
      7. Create DividendClaim { status: Initiated, claimedAmount, positionIndex,
  snapshotId, expiresAt }
      8. repo.saveClaim(claim)
      9. Emit DividendClaimInitiated
     10. Log and return claim

  validateClaim() internal flow:

    validateClaim(actorId, claimId):
      1. claim = repo.getClaim(claimId)
      2. Validate claim.status === Initiated
      3. schedule = repo.getSchedule(claim.scheduleId)
      4. snapshot = repo.getSnapshot(claim.snapshotId)
      5. position = snapshot.positions[claim.positionIndex]
      6. Call validateClaimPosition(schedule, snapshot, position, claim)
         → if false: transition to Disputed, throw
      7. Transition claim.status → Claimed, set claimedAt
      8. repo.saveClaim(claim)
      9. Emit DividendClaimed
     10. Log and return claim

  Authorization model:

  - initiateClaim: actorId must equal the investorId in the SnapshotPosition, OR
  actor is admin
  - validateClaim: admin-only (claim validation against snapshot is
  automated/scheduled)
  - markClaimPaid: admin/distribution-worker only
  - disputeClaim / resolveDispute: admin-only
  - Query methods: investor can only see their own claims; admin sees all

  ───
  1. REPOSITORY ADDITIONS

  ───
  All additive. No existing method signatures changed.

    export interface TreasuryRepository {
      // === EXISTING (untouched) ===

      // === M3-2A (already in place) ===
      saveSchedule(d: DividendSchedule): void;
      getSchedule(id: EntityId): DividendSchedule | undefined;
      listSchedulesByProperty(propertyId: EntityId): DividendSchedule[];
      listSchedulesByStatus(status: ScheduleStatus): DividendSchedule[];
      listAllSchedules(): DividendSchedule[];
      saveSnapshot(s: OwnershipSnapshot): void;
      getSnapshot(id: EntityId): OwnershipSnapshot | undefined;
      getSnapshotBySchedule(scheduleId: EntityId): OwnershipSnapshot | undefined;
      saveSnapshotPositions(snapshotId: EntityId, positions: readonly
  SnapshotPosition[]): void;
      listSnapshotPositions(snapshotId: EntityId): SnapshotPosition[];

      // === M3-2B (new, additive) ===
      saveClaim(c: DividendClaim): void;
      getClaim(id: EntityId): DividendClaim | undefined;
      getClaimByScheduleAndInvestor(scheduleId: EntityId, investorId: EntityId):
  DividendClaim | undefined;
      listClaimsBySchedule(scheduleId: EntityId): DividendClaim[];
      listClaimsByInvestor(investorId: EntityId): DividendClaim[];
      listClaimsByStatus(status: ClaimStatus): DividendClaim[];
    }

  In-memory implementation adds:

  - private readonly claims = new Map<EntityId, DividendClaim>()
  - private readonly claimsByScheduleInvestor = new Map<string, EntityId>()
  (composite key: ${scheduleId}:${investorId})

  ───
  1. EVENTS

  ───
  All additive. Existing event constants unchanged.

    // === M3-2B ADDITIONS ===
    DividendClaimInitiated:  "treasury.dividend_claim_initiated",
    DividendClaimed:         "treasury.dividend_claimed",
    DividendClaimPaid:       "treasury.dividend_claim_paid",
    DividendClaimCompleted:  "treasury.dividend_claim_completed",
    DividendClaimExpired:    "treasury.dividend_claim_expired",
    DividendClaimDisputed:   "treasury.dividend_claim_disputed",

  Event payloads:

  ┌────────────────────────┬─────────────┬──────────────────────────────────────┐
  │ Event                  │ AggregateId │ Key payload fields                   │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimInitiated │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ claimedAmount                        │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimed        │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ snapshotId, positionIndex,           │
  │                        │             │ validatedAmount                      │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimPaid      │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ paidAmount, txHash?                  │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimCompleted │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ receiptProof                         │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimExpired   │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ expiredAt                            │
  ├────────────────────────┼─────────────┼──────────────────────────────────────┤
  │ DividendClaimDisputed  │ claim.id    │ claimId, scheduleId, investorId,     │
  │                        │             │ reason                               │
  └────────────────────────┴─────────────┴──────────────────────────────────────┘

  Emit rule: Events emitted ONLY after repo.saveClaim() succeeds. No event
  precedes persistence.

  Canonical ordering for a single claim:

    1. DividendClaimInitiated     ← initiateClaim()
    2. DividendClaimed            ← validateClaim()
    3. DividendClaimPaid          ← markClaimPaid() (triggered by distribution 
  completion)
    4. DividendClaimCompleted     ← completeClaim()

  Failure branch:

    1. DividendClaimInitiated     ← initiateClaim()
    2. DividendClaimExpired       ← expireClaim() (never validated, window closed)

  Dispute branch:

    3a. DividendClaimDisputed     ← disputeClaim()
    3b. DividendClaimCompleted    ← resolveDispute(payload.resolution,
  targetStatus=Completed)

  ───
  1. API INTEGRATION

  ───
  Existing routes preserved unchanged:

    POST /api/treasury/distributions/[id]/snapshot     — unchanged (M3-2A)
    POST /api/treasury/distributions/[id]/distribute   — unchanged (existing)
    POST /api/treasury/distributions/[id]/claim        — refactored internally to
  delegate to DividendClaim lifecycle

  POST /api/treasury/distributions/[id]/claim internal change:

  Currently this route calls claimDistributionTx() directly in Prisma. After
  M3-2B:

    POST /api/treasury/distributions/[id]/claim
      └─ authenticateRequest(request)
      └─ dividendService.initiateClaim(actor.id, distributionId)
      └─ (optional, async) dividendService.validateClaim(admin, claimId)
      └─ return ClaimReceipt

  The existing HTTP contract is preserved:

  - Same URL
  - Same request/response shapes ({ allocationId, distributionId, investorId, 
  grossAmount, claimStatus, alreadyClaimed, transactionId? })
  - Status codes remain 201 (new) / 200 (already claimed) / 409 (concurrent)
  - CAS semantics preserved via getClaimByScheduleAndInvestor + status gating

  No new API routes introduced.

  ───
  1. SECURITY DESIGN

  ───
  8.1 — Double claim prevention

    // Atomic check via getClaimByScheduleAndInvestor
    const existing = repo.getClaimByScheduleAndInvestor(scheduleId, investorId);
    if (existing && existing.status !== ClaimStatus.Expired) {
      throw new DuplicateClaimError(scheduleId, investorId);
    }

  The claimsByScheduleInvestor composite key in the in-memory repo enforces
  uniqueness. For a real database, a UNIQUE(scheduleId, investorId) constraint
  provides the same guarantee.

  8.2 — Replay protection

  initiateClaim() is idempotent via the composite key lookup. If a claim already
  exists and is Claimed or beyond, the existing claim is returned. If Expired, a
  new claim record is created.

  8.3 — Idempotency key support

  initiateClaim() accepts an optional idempotencyKey. The repository's existing
  isIdempotencyKeyUsed / markIdempotencyKey mechanism is re-used.

  8.4 — Authorization

  ┌────────────────┬───────────────────────────────────┐
  │ Operation      │ Who can perform                   │
  ├────────────────┼───────────────────────────────────┤
  │ initiateClaim  │ Claim owner (investorId) or admin │
  ├────────────────┼───────────────────────────────────┤
  │ validateClaim  │ Admin / scheduled worker          │
  ├────────────────┼───────────────────────────────────┤
  │ markClaimPaid  │ Distribution worker / admin       │
  ├────────────────┼───────────────────────────────────┤
  │ completeClaim  │ Admin                             │
  ├────────────────┼───────────────────────────────────┤
  │ expireClaim    │ Scheduled worker (time-based)     │
  ├────────────────┼───────────────────────────────────┤
  │ disputeClaim   │ Admin                             │
  ├────────────────┼───────────────────────────────────┤
  │ resolveDispute │ Admin                             │
  ├────────────────┼───────────────────────────────────┤
  │ Query (own)    │ Claim owner (investorId)          │
  ├────────────────┼───────────────────────────────────┤
  │ Query (all)    │ Admin                             │
  └────────────────┴───────────────────────────────────┘

  Authorization is enforced in the service layer before any state mutation.
  Identity is verified via actorId parameter.

  8.5 — Audit trail

  Every state transition records DivdendClaim.*At timestamp fields (initiatedAt,
  claimedAt, paidAt, completedAt, expiresAt). The proof field in ClaimReceipt
  provides a deterministic hash (hash(scheduleId + investorId + positionIndex + 
  snapshotId)) that can be independently verified against the snapshot. Immutable
  claim records — no overwrite, only state transitions.

  ───
  1. TEST STRATEGY

  ───
  New test file: packages/treasury/src/__tests__/dividend-claim.test.ts

    describe("DividendClaim", () => {
      describe("initiateClaim", () => {
        it("creates claim in Initiated status from Eligible SnapshotPosition")
        it("derives claimedAmount from SnapshotPosition × perTokenAmount")
        it("emits DividendClaimInitiated with correct payload")
        it("rejects claim when no SnapshotPosition exists for investor")
        it("rejects claim when schedule is not Snapshotted or Closed")
        it("returns existing claim when already initiated (idempotent)")
        it("allows re-initiation if prior claim was Expired")
        it("supports idempotency key for replay-safe submission")
      })

      describe("validateClaim", () => {
        it("transitions Initiated → Claimed upon successful validation")
        it("emits DividendClaimed event")
        it("rejects validation for non-Initiated claims")
        it("rejects validation when SnapshotPosition does not match investor")
        it("rejects validation when claimedAmount does not match entitlement")
        it("rejects validation by non-admin actor")
      })

      describe("markClaimPaid", () => {
        it("transitions Claimed → Paid on distribution settlement")
        it("emits DividendClaimPaid")
        it("rejects if claim is not in Claimed status")
      })

      describe("completeClaim", () => {
        it("transitions Paid → Completed")
        it("returns ClaimReceipt with verifiable proof hash")
        it("emits DividendClaimCompleted")
        it("rejects completion from non-Paid status")
      })

      describe("expireClaim", () => {
        it("transitions Eligible → Expired when window closes")
        it("transitions Initiated → Expired when window closes")
        it("emits DividendClaimExpired")
        it("does not expire Claimed or Paid claims")
      })

      describe("disputeClaim + resolveDispute", () => {
        it("transitions Paid → Disputed with reason")
        it("allows resolveDispute to return to Claimed")
        it("allows resolveDispute to set Completed")
        it("emits DividendClaimDisputed on dispute")
        it("rejects dispute from non-Paid claims")
        it("rejects dispute by non-admin")
      })

      describe("query methods", () => {
        it("getClaim returns by scheduleId + investorId")
        it("listClaimsBySchedule returns all claims for schedule")
        it("listClaimsByInvestor filters by investor")
        it("listClaimsByStatus filters by status")
        it("getClaimReceipt returns verifiable receipt")
      })

      describe("snapshot immutability", () => {
        it("claim positionIndex refers to immutable snapshot position")
        it("claim survives snapshot rescans (positions not recalculated)")
        it("claimedAmount does not change even if ownership changes")
      })

      describe("security", () => {
        it("investor cannot claim another investor's position")
        it("double-initiate returns existing claim (no duplicate)")
        it("idempotency key prevents duplicate claim creation")
      })
    })

  Existing tests — zero modifications required. All M3-2A dividend-schedule tests
  continue to pass. All M3-2 dividend-buyback-burn tests continue to pass. New
  tests are in a separate file.

  ───
  1. MIGRATION PLAN

  ───
    Phase 1: Types + events (zero impact)
      ├── types.ts:     ClaimStatus enum, DividendClaim interface, ClaimReceipt
  interface
      ├── events.ts:    6 new event constants
      └── Verify: pnpm typecheck (0 new failures)

    Phase 2: Repository (zero impact on existing code)
      ├── repository.ts:     6 new method signatures
      ├── in-memory-repository.ts:  Map + composite-key index implementations
      └── Verify: pnpm typecheck

    Phase 3: Service methods (additive to DividendService)
      ├── dividend-service.ts:
      │   ├── initiateClaim()
      │   ├── validateClaim()
      │   ├── markClaimPaid()
      │   ├── completeClaim()
      │   ├── expireClaim()
      │   ├── disputeClaim()
      │   ├── resolveDispute()
      │   └── query methods
      └── Verify: pnpm typecheck

    Phase 4: Internal API routing (transparent refactor)
      ├── app/api/treasury/distributions/[id]/claim/route.ts:
      │   └── delegate to dividendService.initiateClaim() internally
      │   └── preserve identical HTTP contract
      └── Verify: existing API tests pass unchanged

    Phase 5: Exports update
      ├── index.ts: export ClaimStatus, DividendClaim, ClaimReceipt (types + enum)
      └── Verify: pnpm typecheck

    Phase 6: Tests
      ├── dividend-claim.test.ts (new file, 30+ test cases)
      └── Verify: pnpm test (0 regressions)

    Phase 7: Full validation
      ├── pnpm lint
      ├── pnpm typecheck
      ├── pnpm test
      └── Report new vs pre-existing failures; confirm regression count = 0

  Files modified: 6 existing + 1 new test file. Breaking changes: 0. Lines of new 
  code: ~450.

  ───
  IMPLEMENTATION CONTRACT SUMMARY

  ┌──────────────────────┬──────────────────────────────────────────────────────┐
  │ Concern              │ Decision                                             │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Claim aggregate      │ DividendClaim — one per (scheduleId, investorId),    │
  │                      │ composite uniqueness                                 │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Status lifecycle     │ Eligible → Initiated → Claimed → Paid → Completed    │
  │                      │ (Expired/Disputed as branches)                       │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Snapshot integration │ Immutable positionIndex reference; live portfolio    │
  │                      │ never consulted after snapshot                       │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Service layer        │ All methods additive to DividendService; no existing │
  │                      │ signatures change                                    │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Repository           │ 6 additive methods; composite-key index for          │
  │                      │ uniqueness                                           │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Events               │ 6 new events; emitted only after persistence         │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ API routes           │ Existing POST /claim route preserved; delegates      │
  │                      │ internally to DividendService                        │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Security             │ CAS via composite key; replay via idempotency key;   │
  │                      │ authorization by actorId                             │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Audit                │ Immutable timestamps per transition; verifiable      │
  │                      │ ClaimReceipt.proof hash                              │
  ├──────────────────────┼──────────────────────────────────────────────────────┤
  │ Migration            │ 7-phase additive plan; existing tests unchanged      │
  └──────────────────────┴──────────────────────────────────────────────────────┘





