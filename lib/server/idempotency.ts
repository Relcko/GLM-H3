/**
 * Sprint 3B — Execute-at-most-once financial idempotency.
 *
 * Replaces "claim-first" semantics with an exclusive-ownership lease model:
 *
 *  PART 1 — Exclusive claim ownership
 *    Every in-flight request holds a lease: a random `ownerToken` (UUID)
 *    plus a monotonically increasing `version`. Claim, reclaim, completion
 *    and release are all conditional on (id, ownerToken, version, status)
 *    via single-statement compare-and-swap UPDATEs, so exactly ONE process
 *    can own an in-progress request. Concurrent reclaim attempts lose the
 *    CAS race and receive 409. Completion/release that does not own the
 *    lease affects zero rows and throws — a request can never complete or
 *    release another request's claim.
 *
 *    All CAS writes are single atomic SQL statements (`$executeRaw`), never
 *    ORM read→write pairs: two connections doing SELECT→UPDATE against
 *    SQLite otherwise deadlock into the busy timeout (measured in Sprint 3B
 *    integration testing: 5s stall + P1008 vs. 1ms clean CAS).
 *
 *  PART 2 — Crash recovery
 *    The business transaction and the durable idempotency completion are
 *    ONE logical operation: `completeClaim` runs inside the same Prisma
 *    `$transaction` as the business writes. There is no crash window:
 *      - crash before commit  → both roll back; the stale lease is CAS-
 *                               reclaimed after `staleAfterMs` and the
 *                               request re-executes exactly once;
 *      - crash at/after commit → both are durable; a retry replays the
 *                               stored response without re-executing.
 *    If the completion CAS fails (ownership lost), the error aborts the
 *    transaction and the business writes roll back with it.
 *
 *  PART 3 — Mandatory idempotency
 *    `requireIdempotencyKey` enforces the `Idempotency-Key` header on
 *    financial endpoints (400 otherwise).
 *
 * Replay correctness: a completed record replays its stored status/body for
 * the SAME canonical request body; the same key with a DIFFERENT body is
 * rejected with 422.
 */

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

/** How long a finished record is kept for replay. */
export const CLAIM_TTL_MS = 24 * 60 * 60 * 1000;
/** Default in-progress lease timeout before a claim is considered stale. */
export const DEFAULT_STALE_CLAIM_MS = 60_000;

export class IdempotencyKeyRequiredError extends Error {
  readonly statusCode = 400;
  readonly code = "IDEMPOTENCY_KEY_REQUIRED";
  constructor() {
    super("Idempotency-Key header is required on financial endpoints");
  }
}

export class IdempotencyConflictError extends Error {
  readonly statusCode = 409;
  readonly code = "IDEMPOTENCY_IN_PROGRESS";
  constructor(message = "A request with this Idempotency-Key is already in progress") {
    super(message);
  }
}

export class IdempotencyBodyMismatchError extends Error {
  readonly statusCode = 422;
  readonly code = "IDEMPOTENCY_KEY_BODY_MISMATCH";
  constructor() {
    super("Idempotency-Key was already used with a different request body");
  }
}

export class ClaimOwnershipLostError extends Error {
  readonly statusCode = 409;
  readonly code = "CLAIM_OWNERSHIP_LOST";
  constructor() {
    super("Idempotency claim is owned by another process");
  }
}

export interface IdempotencyContext {
  /** Value of the Idempotency-Key header (required). */
  readonly key: string;
  /** Scope: account (or admin actor) the request belongs to. */
  readonly accountId: string;
  /** Scope: endpoint identity, e.g. "POST /api/investments". */
  readonly endpoint: string;
  /** Canonical request body used for replay-correctness comparison. */
  readonly requestBody: string;
}

export interface HandlerResult<T> {
  readonly statusCode: number;
  readonly body: T;
}

export type FinancialHandler<T> = (tx: Prisma.TransactionClient) => Promise<HandlerResult<T>>;

export interface ExecuteOptions {
  /** In-progress lease timeout; reclaim is possible only after this. */
  readonly staleAfterMs?: number;
  /** Record retention for replay. */
  readonly claimTtlMs?: number;
}

/** Exclusive lease over one idempotency record. */
export interface ClaimLease {
  readonly id: string;
  readonly ownerToken: string;
  readonly version: number;
}

export type ClaimOutcome<T> =
  | { readonly kind: "claimed"; readonly lease: ClaimLease }
  | { readonly kind: "replay"; readonly statusCode: number; readonly body: T };

export interface ExecuteOutcome<T> extends HandlerResult<T> {
  readonly replayed: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Attempt to exclusively claim the request.
 *
 * - Fresh key           → atomic INSERT (unique constraint admits exactly one).
 * - Stale/failed claim  → single-statement CAS reclaim. The UPDATE carries
 *                         the staleness + ownership + body predicates, so
 *                         exactly one concurrent reclaimer wins (affected
 *                         rows = 1); losers read the row back and get 409.
 * - Completed key       → replay stored response (body must match).
 *
 * The reclaim is one atomic SQL statement (not an ORM read→write pair):
 * two connections doing SELECT→UPDATE against SQLite otherwise deadlock
 * into the busy timeout (verified in Sprint 3B load testing).
 */
export async function claimRequest<T>(
  db: PrismaClient,
  ctx: IdempotencyContext,
  options: ExecuteOptions = {},
): Promise<ClaimOutcome<T>> {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_CLAIM_MS;
  const claimTtlMs = options.claimTtlMs ?? CLAIM_TTL_MS;
  const ownerToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + claimTtlMs);

  try {
    const created = await db.idempotencyKey.create({
      data: {
        key: ctx.key,
        accountId: ctx.accountId,
        endpoint: ctx.endpoint,
        requestBody: ctx.requestBody,
        status: "in_progress",
        ownerToken,
        version: 0,
        expiresAt,
      },
    });
    return { kind: "claimed", lease: { id: created.id, ownerToken, version: 0 } };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  // Atomic compare-and-swap reclaim. Only a stale in_progress lease (crashed
  // owner) or a failed one may be taken over, and only for the SAME body.
  const staleBefore = new Date(now.getTime() - staleAfterMs);
  const reclaimed = await db.$executeRaw`
    UPDATE "IdempotencyKey"
    SET "ownerToken" = ${ownerToken},
        "version" = "version" + 1,
        "status" = ${"in_progress"},
        "statusCode" = ${0},
        "responseBody" = ${""},
        "processedAt" = NULL,
        "createdAt" = ${now},
        "expiresAt" = ${expiresAt}
    WHERE "accountId" = ${ctx.accountId}
      AND "endpoint" = ${ctx.endpoint}
      AND "key" = ${ctx.key}
      AND "requestBody" = ${ctx.requestBody}
      AND ("status" = ${"failed"} OR ("status" = ${"in_progress"} AND "createdAt" < ${staleBefore}))`;

  const existing = await db.idempotencyKey.findUnique({
    where: { accountId_endpoint_key: { accountId: ctx.accountId, endpoint: ctx.endpoint, key: ctx.key } },
  });
  if (!existing) {
    // Unique violation but no record: the row was released between the two
    // statements. Treat as a conflict — the caller retries with the same key.
    throw new IdempotencyConflictError();
  }

  if (reclaimed === 1) {
    if (existing.ownerToken !== ownerToken) {
      // Defensive: the CAS row must be ours.
      throw new IdempotencyConflictError("Idempotency claim was reclaimed by another process");
    }
    return { kind: "claimed", lease: { id: existing.id, ownerToken, version: existing.version } };
  }

  if (existing.status === "completed") {
    if (existing.requestBody !== ctx.requestBody) {
      throw new IdempotencyBodyMismatchError();
    }
    return {
      kind: "replay",
      statusCode: existing.statusCode,
      body: JSON.parse(existing.responseBody) as T,
    };
  }

  if (existing.requestBody !== ctx.requestBody) {
    throw new IdempotencyBodyMismatchError();
  }
  throw new IdempotencyConflictError();
}

/**
 * Durably complete a claim. MUST run inside the same `$transaction` as the
 * business writes so business commit + completion are one logical operation.
 * The CAS on (id, ownerToken, version, in_progress) guarantees only the
 * lease owner can complete; any other process affects zero rows and the
 * resulting error rolls the whole transaction back.
 */
export async function completeClaim<T>(
  tx: Prisma.TransactionClient,
  lease: ClaimLease,
  result: HandlerResult<T>,
): Promise<void> {
  const completed = await tx.$executeRaw`
    UPDATE "IdempotencyKey"
    SET "status" = ${"completed"},
        "statusCode" = ${result.statusCode},
        "responseBody" = ${JSON.stringify(result.body)},
        "processedAt" = ${new Date()},
        "ownerToken" = NULL
    WHERE "id" = ${lease.id}
      AND "ownerToken" = ${lease.ownerToken}
      AND "version" = ${lease.version}
      AND "status" = ${"in_progress"}`;
  if (completed !== 1) {
    throw new ClaimOwnershipLostError();
  }
}

/**
 * Release a claim after a failed execution so a retry may reclaim it.
 * Ownership-verified: a process that lost its lease cannot release another
 * process's claim. Best-effort — if the process crashed, the stale-claim
 * CAS reclaim path covers the leftover lease.
 */
export async function releaseClaim(db: PrismaClient, lease: ClaimLease): Promise<void> {
  await db.$executeRaw`
    UPDATE "IdempotencyKey"
    SET "status" = ${"failed"}, "ownerToken" = NULL
    WHERE "id" = ${lease.id}
      AND "ownerToken" = ${lease.ownerToken}
      AND "version" = ${lease.version}
      AND "status" = ${"in_progress"}`;
}

/**
 * Execute a financial handler at most once for a given Idempotency-Key.
 *
 * Claim (exclusive) → run business writes + durable completion in ONE
 * transaction → replay stored response on retries.
 */
export async function executeAtMostOnce<T>(
  db: PrismaClient,
  ctx: IdempotencyContext,
  handler: FinancialHandler<T>,
  options: ExecuteOptions = {},
): Promise<ExecuteOutcome<T>> {
  const claim = await claimRequest<T>(db, ctx, options);
  if (claim.kind === "replay") {
    return { statusCode: claim.statusCode, body: claim.body, replayed: true };
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const result = await handler(tx);
        await completeClaim(tx, claim.lease, result);
        return result;
      },
      { maxWait: 5_000, timeout: 15_000 },
    );
    return { ...result, replayed: false };
  } catch (error) {
    await releaseClaim(db, claim.lease).catch(() => undefined);
    throw error;
  }
}

/** Enforce the mandatory Idempotency-Key header (Part 3). */
export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim();
  if (!key) throw new IdempotencyKeyRequiredError();
  return key;
}
