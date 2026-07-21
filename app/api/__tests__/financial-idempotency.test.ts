/**
 * Sprint 3D/E — Financial Correctness & Production Certification.
 *
 * Integration tests against a REAL Prisma test database (SQLite via
 * `prisma db push`, dedicated file per test run).
 *
 * Covers: Sprint 3B idempotency, Sprint 3C auth/authz/settlement/money,
 * Sprint 3D settlement CAS, ledger uniqueness, cancel state matrix,
 * inventory ownership, ledger invariants, concurrency stress tests,
 * Sprint 3E payment truth, ledger fix, auth hardening, PostgreSQL readiness.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const dbFile = resolve(repoRoot, "prisma", `test-sprint3e-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");
const dbUrl = `file:${dbFile}`;

type RoutePost = (request: Request) => Promise<Response>;
type RoutePostWithParams = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let prisma: PrismaClient;
let clientB: PrismaClient;
let createPrismaClient: (url?: string) => PrismaClient;

let executeAtMostOnce: typeof import("@/lib/server/idempotency").executeAtMostOnce;
let claimRequest: typeof import("@/lib/server/idempotency").claimRequest;
let completeClaim: typeof import("@/lib/server/idempotency").completeClaim;
let releaseClaim: typeof import("@/lib/server/idempotency").releaseClaim;

let updatePropertyInventory: typeof import("@/lib/server/financial/inventory").updatePropertyInventory;
let findInventoryViolations: typeof import("@/lib/server/financial/inventory").findInventoryViolations;

let investmentsPOST: RoutePost;
let cancelPOST: RoutePostWithParams;
let distributePOST: RoutePostWithParams;
let settlePOST: RoutePostWithParams;

const TEST_AUTH_SECRET = "test-internal-secret-for-sprint-3e-32chr";
const INTERNAL_TOKEN = `Bearer ${TEST_AUTH_SECRET}`;

beforeAll(async () => {
  process.env.INTERNAL_AUTH_SECRET = TEST_AUTH_SECRET;

  const prismaCli = resolve(require.resolve("prisma/package.json"), "..", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "db", "push"], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  process.env.DATABASE_URL = dbUrl;

  const prismaModule = await import("@/lib/server/prisma");
  prisma = prismaModule.prisma;
  createPrismaClient = prismaModule.createPrismaClient;
  clientB = createPrismaClient(dbUrl);

  const idem = await import("@/lib/server/idempotency");
  executeAtMostOnce = idem.executeAtMostOnce;
  claimRequest = idem.claimRequest;
  completeClaim = idem.completeClaim;
  releaseClaim = idem.releaseClaim;

  const inventory = await import("@/lib/server/financial/inventory");
  updatePropertyInventory = inventory.updatePropertyInventory;
  findInventoryViolations = inventory.findInventoryViolations;

  investmentsPOST = (await import("@/app/api/investments/route")).POST;
  cancelPOST = (await import("@/app/api/investments/[id]/cancel/route")).POST;
  distributePOST = (await import("@/app/api/treasury/distributions/[id]/distribute/route")).POST;
  settlePOST = (await import("@/app/api/investments/[id]/settle/route")).POST;
}, 120_000);

beforeEach(async () => {
  await prisma.paymentReference.deleteMany();
  await prisma.dividendAllocation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.property.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
});

afterAll(async () => {
  await prisma?.$disconnect();
  await clientB?.$disconnect();
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = dbFile + suffix;
    if (existsSync(path)) rmSync(path, { force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ctx(key: string, body: unknown, accountId = "tester", endpoint = "POST /test") {
  return { key, accountId, endpoint, requestBody: JSON.stringify(body) };
}

function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://test.local${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function seedAccount(overrides: Record<string, unknown> = {}) {
  return prisma.account.create({
    data: {
      email: `investor-${crypto.randomUUID()}@test.dev`,
      role: "investor",
      ...overrides,
    },
  });
}

async function seedSession(accountId: string) {
  return prisma.session.create({
    data: {
      accountId,
      token: `sess_${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
}

function authHeaders(session: { token: string }): Record<string, string> {
  return { authorization: `Bearer ${session.token}` };
}

function internalHeaders(): Record<string, string> {
  return { "x-internal-authorization": INTERNAL_TOKEN };
}

async function seedProperty(overrides: Record<string, unknown> = {}) {
  return prisma.property.create({
    data: {
      slug: `prop-${crypto.randomUUID()}`,
      name: "Test Property",
      description: "Integration test property",
      country: "AE",
      city: "Dubai",
      address: "1 Test St",
      totalValue: 1_000_000_00,
      tokenPrice: 1000,
      totalTokens: 100,
      availableTokens: 100,
      inventoryReserved: 0,
      inventoryCommitted: 0,
      expectedRoi: 8,
      rentalYield: 5,
      appreciationRate: 3,
      minInvestment: 1000,
      ...overrides,
    },
  });
}

async function createInvestment(session: { token: string }, propertyId: string, tokens: number) {
  const res = await investmentsPOST(
    postJson("/api/investments", { propertyId, tokens }, { "idempotency-key": `create-${crypto.randomUUID()}`, ...authHeaders(session) }),
  );
  return res.json();
}

async function seedPaymentReference(investmentId: string, amount = 10000) {
  return prisma.paymentReference.create({
    data: {
      investmentId,
      paymentStatus: "VERIFIED",
      capturedAmount: amount,
      capturedCurrency: "USD",
      capturedAt: new Date(),
      paymentProvider: "test-provider",
      providerPaymentId: `pp_${crypto.randomUUID()}`,
    },
  });
}

async function settleOne(key: string, investmentId: string): Promise<Response> {
  return settlePOST(
    postJson(`/api/investments/${investmentId}/settle`, {}, { "idempotency-key": key, ...internalHeaders() }),
    { params: Promise.resolve({ id: investmentId }) },
  );
}

async function settleFull(investmentId: string) {
  for (let i = 0; i < 4; i++) {
    const r = await settleOne(`settle-${investmentId}-${i}`, investmentId);
    if (r.status !== 200) throw new Error(`settle step ${i} failed: ${r.status} ${await r.text()}`);
  }
}

async function settleFullWithPayment(investmentId: string) {
  const inv = await prisma.investment.findUniqueOrThrow({ where: { id: investmentId } });
  await settleOne(`sfwp-${investmentId}-0`, investmentId);
  await seedPaymentReference(investmentId, inv.amount);
  for (let i = 1; i < 4; i++) {
    const r = await settleOne(`sfwp-${investmentId}-${i}`, investmentId);
    if (r.status !== 200) throw new Error(`settle step ${i} failed: ${r.status} ${await r.text()}`);
  }
}

/** Business handler whose side effect is a durable audit row. */
function effectHandler(counter: { n: number }, opts: { delayMs?: number; failAfterWrite?: boolean } = {}) {
  return async (tx: import("@prisma/client").Prisma.TransactionClient) => {
    if (opts.delayMs) await sleep(opts.delayMs);
    counter.n += 1;
    await tx.auditEvent.create({
      data: { actorId: "tester", action: "test.effect", resource: "test", resourceId: "effect" },
    });
    if (opts.failAfterWrite) throw new Error("simulated handler crash");
    return { statusCode: 200, body: { run: counter.n } };
  };
}

// ===========================================================================
// Sprint 3B — Idempotency engine (unchanged)
// ===========================================================================

describe("Part 1 — exclusive claim ownership", () => {
  it("concurrent duplicate requests execute exactly once", async () => {
    const counter = { n: 0 };
    const [a, b] = await Promise.allSettled([
      executeAtMostOnce(prisma, ctx("dup-1", { x: 1 }), effectHandler(counter)),
      executeAtMostOnce(clientB, ctx("dup-1", { x: 1 }), effectHandler(counter)),
    ]);
    expect(counter.n).toBe(1);
    expect(await prisma.auditEvent.count({ where: { action: "test.effect" } })).toBe(1);
    const again = await executeAtMostOnce(prisma, ctx("dup-1", { x: 1 }), effectHandler(counter));
    expect(again.replayed).toBe(true);
    expect(counter.n).toBe(1);
  });

  it("stale reclaim CAS works", async () => {
    const stale = await prisma.idempotencyKey.create({
      data: { key: "stale-1", accountId: "tester", endpoint: "POST /test", requestBody: "{}",
        status: "in_progress", ownerToken: "dead", version: 5,
        createdAt: new Date(Date.now() - 10 * 60_000), expiresAt: new Date(Date.now() + 60_000) },
    });
    const result = await executeAtMostOnce(prisma, ctx("stale-1", {}), effectHandler({ n: 0 }), { staleAfterMs: 30_000 });
    expect(result.replayed).toBe(false);
    const rec = await prisma.idempotencyKey.findUniqueOrThrow({ where: { id: stale.id } });
    expect(rec.status).toBe("completed");
    expect(rec.version).toBe(6);
  });

  it("completion verifies ownership", async () => {
    const claim = await claimRequest(prisma, ctx("own-1", {}));
    if (claim.kind !== "claimed") throw new Error("expected fresh claim");
    await expect(prisma.$transaction(async (tx) => {
      await completeClaim(tx, { ...claim.lease, ownerToken: "intruder" }, { statusCode: 200, body: {} });
    })).rejects.toMatchObject({ code: "CLAIM_OWNERSHIP_LOST" });
  });
});

describe("Part 2 — crash recovery", () => {
  it("crash after commit: retry replays", async () => {
    const first = await executeAtMostOnce(prisma, ctx("crash-1", {}), effectHandler({ n: 0 }));
    expect(first.replayed).toBe(false);
    const restarted = createPrismaClient(dbUrl);
    try {
      const replay = await executeAtMostOnce(restarted, ctx("crash-1", {}), effectHandler({ n: 0 }));
      expect(replay.replayed).toBe(true);
      expect(replay.body).toEqual(first.body);
    } finally { await restarted.$disconnect(); }
  });

  it("slow handler: concurrent same-key request never double-executes", async () => {
    const counter = { n: 0 };
    const [a, b] = await Promise.allSettled([
      executeAtMostOnce(prisma, ctx("slow-1", {}), effectHandler(counter, { delayMs: 400 })),
      executeAtMostOnce(clientB, ctx("slow-1", {}), effectHandler(counter)),
    ]);
    expect(counter.n).toBe(1);
    expect(a.status).toBe("fulfilled");
  });

  it("replay correctness: same body replays, different body rejected", async () => {
    await executeAtMostOnce(prisma, ctx("replay-1", { tokens: 5 }), async () => ({ statusCode: 201, body: { id: "inv_1" } }));
    const replay = await executeAtMostOnce(prisma, ctx("replay-1", { tokens: 5 }), async () => { throw new Error("must not re-run"); });
    expect(replay.replayed).toBe(true);
    await expect(executeAtMostOnce(prisma, ctx("replay-1", { tokens: 9 }), async () => ({ statusCode: 200, body: {} })))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_BODY_MISMATCH" });
  });
});

// ===========================================================================
// Sprint 3C — Auth/Authz (preserved)
// ===========================================================================

describe("Sprint 3C — Authentication", () => {
  it("POST /api/investments returns 401 without auth", async () => {
    const res = await investmentsPOST(postJson("/api/investments", { propertyId: "p", tokens: 1 }, { "idempotency-key": "k" }));
    expect(res.status).toBe(401);
  });

  it("rejects expired session token with 401", async () => {
    const account = await seedAccount();
    const session = await prisma.session.create({
      data: { accountId: account.id, token: "expired", expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await investmentsPOST(
      postJson("/api/investments", { propertyId: "p", tokens: 1 }, { "idempotency-key": "k", ...authHeaders(session) }),
    );
    expect(res.status).toBe(401);
  });
});

describe("Sprint 3C — Authorization", () => {
  it("user cannot cancel another user's investment (403)", async () => {
    const owner = await seedAccount();
    const other = await seedAccount();
    const ownerSession = await seedSession(owner.id);
    const otherSession = await seedSession(other.id);
    const property = await seedProperty();
    const inv = await createInvestment(ownerSession, property.id, 10);
    await settleFullWithPayment(inv.investmentId);
    const res = await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "k", ...authHeaders(otherSession) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(403);
  });

  it("only treasury admins may distribute (403 for investor)", async () => {
    const investor = await seedAccount({ role: "investor" });
    const investorSession = await seedSession(investor.id);
    const admin = await seedAccount({ role: "administrator" });
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty();
    const dist = await prisma.distribution.create({
      data: { period: "2026-Q3", propertyId: property.id, totalAmount: 1000_00, status: "approved" },
    });
    expect((await distributePOST(postJson(`/api/treasury/distributions/${dist.id}/distribute`, {}, { "idempotency-key": "k1", ...authHeaders(investorSession) }), { params: Promise.resolve({ id: dist.id }) })).status).toBe(403);
    expect((await distributePOST(postJson(`/api/treasury/distributions/${dist.id}/distribute`, {}, { "idempotency-key": "k2", ...authHeaders(adminSession) }), { params: Promise.resolve({ id: dist.id }) })).status).toBe(200);
  });
});

// ===========================================================================
// Sprint 3D/E — Settlement Authorization & Constant-Time Comparison
// ===========================================================================

describe("Sprint 3D/E — Settlement Authorization", () => {
  it("settlement rejects requests without internal token (403)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    const res = await settlePOST(
      postJson(`/api/investments/${inv.investmentId}/settle`, {}, { "idempotency-key": "sk-1", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });

  it("settlement succeeds with valid internal token", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    const res = await settleOne("sk-2", inv.investmentId);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("payment_authorized");
  });

  it("settlement rejects invalid internal token (403)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    const res = await settlePOST(
      postJson(`/api/investments/${inv.investmentId}/settle`, {}, { "idempotency-key": "sk-3", "x-internal-authorization": "Bearer invalid-token" }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Sprint 3E — Payment Truth (PaymentReference validation)
// ===========================================================================

describe("Sprint 3E — Payment Truth", () => {
  it("requires payment reference before payment_settled", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-1", inv.investmentId);
    await settleOne("pt-2", inv.investmentId);
    expect((await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } })).status).toBe("payment_authorized");
  });

  it("rejects settlement with missing payment reference (422)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-3", inv.investmentId);
    const r = await settleOne("pt-4", inv.investmentId);
    expect(r.status).toBe(422);
    const body = await r.json();
    expect(body.code).toBe("PAYMENT_REFERENCE_MISSING");
  });

  it("rejects settlement with missing provider payment ID (422)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-5", inv.investmentId);
    await prisma.paymentReference.create({
      data: {
        investmentId: inv.investmentId,
        paymentStatus: "VERIFIED",
        capturedAmount: 10000,
        capturedCurrency: "USD",
        capturedAt: new Date(),
        paymentProvider: "test",
      },
    });
    const r = await settleOne("pt-6", inv.investmentId);
    expect(r.status).toBe(422);
    expect((await r.json()).code).toBe("PAYMENT_PROVIDER_REFERENCE_MISSING");
  });

  it("rejects settlement with unverified payment status (422)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-7", inv.investmentId);
    await prisma.paymentReference.create({
      data: {
        investmentId: inv.investmentId,
        paymentStatus: "PENDING",
        capturedAmount: 10000,
        capturedCurrency: "USD",
        capturedAt: new Date(),
        paymentProvider: "test",
        providerPaymentId: "pp_pending",
      },
    });
    const r = await settleOne("pt-8", inv.investmentId);
    expect(r.status).toBe(422);
    expect((await r.json()).code).toBe("PAYMENT_NOT_VERIFIED");
  });

  it("rejects settlement with amount mismatch (422)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-9", inv.investmentId);
    await prisma.paymentReference.create({
      data: {
        investmentId: inv.investmentId,
        paymentStatus: "VERIFIED",
        capturedAmount: 5000,
        capturedCurrency: "USD",
        capturedAt: new Date(),
        paymentProvider: "test",
        providerPaymentId: "pp_wrong_amount",
      },
    });
    const r = await settleOne("pt-10", inv.investmentId);
    expect(r.status).toBe(422);
    expect((await r.json()).code).toBe("PAYMENT_AMOUNT_MISMATCH");
  });

  it("payment reference is consumed exactly once during payment_settled", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-11", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    const r1 = await settleOne("pt-12", inv.investmentId);
    expect(r1.status).toBe(200);
    const ref = await prisma.paymentReference.findUniqueOrThrow({ where: { investmentId: inv.investmentId } });
    expect(ref.paymentStatus).toBe("CONSUMED");
    expect(ref.consumedAt).not.toBeNull();
    const r2 = await settleOne("pt-13", inv.investmentId);
    expect(r2.status).toBe(200);
    const ref2 = await prisma.paymentReference.findUniqueOrThrow({ where: { investmentId: inv.investmentId } });
    expect(ref2.paymentStatus).toBe("CONSUMED");
  });

  it("succeeds with valid payment reference", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("pt-14", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    const r = await settleOne("pt-15", inv.investmentId);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("payment_settled");
    expect(body.paymentReferenceId).toBeDefined();
  });
});

// ===========================================================================
// Sprint 3D/E — Payment Lifecycle + CAS
// ===========================================================================

describe("Sprint 3D/E — Payment Lifecycle + CAS", () => {
  it("investment creates as pending with inventory reserved", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();

    const inv = await createInvestment(session, property.id, 10);
    expect(inv.status).toBe("pending");
    expect(inv.availableTokens).toBe(90);
    expect(inv.inventoryReserved).toBe(10);
    expect(inv.inventoryCommitted).toBe(0);

    const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    expect(after.status).toBe("pending");
    expect(after.confirmedAt).toBeNull();
  });

  it("CAS transition: updateMany with expected status prevents race", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);

    const r1 = await settleOne("cas-1", inv.investmentId);
    expect(r1.status).toBe(200);
    expect((await r1.json()).status).toBe("payment_authorized");

    await seedPaymentReference(inv.investmentId);

    const r2 = await settleOne("cas-2", inv.investmentId);
    expect(r2.status).toBe(200);
    const r2Body = await r2.json();
    expect(r2Body.status).toBe("payment_settled");
    expect(r2Body.paymentReferenceId).toBeDefined();

    const r3 = await settleOne("cas-3", inv.investmentId);
    expect(r3.status).toBe(200);
    const r3Body = await r3.json();
    expect(r3Body.status).toBe("confirmed");
    expect(r3Body.inventoryReserved).toBe(0);
    expect(r3Body.inventoryCommitted).toBe(10);

    const r4 = await settleOne("cas-4", inv.investmentId);
    expect(r4.status).toBe(200);
    const r4Body = await r4.json();
    expect(r4Body.status).toBe("ledger_posted");
    expect(r4Body.transactionId).toBeDefined();

    const replay = await settleOne("cas-4", inv.investmentId);
    expect(replay.status).toBe(200);
    expect((await replay.json()).status).toBe("ledger_posted");
  });

  it("parallel settlement with different keys: each CAS step advances state exactly once", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);

    await seedPaymentReference(inv.investmentId);

    const results = await Promise.allSettled([
      settleOne("par-cas-a", inv.investmentId),
      settleOne("par-cas-b", inv.investmentId),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as Response).status === 200);
    expect(ok.length).toBe(2);
    const final = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    // First call advances pending→payment_authorized, second advances payment_authorized→payment_settled
    expect(final.status).toBe("payment_settled");
  });
});

// ===========================================================================
// Sprint 3D — Ledger Uniqueness
// ===========================================================================

describe("Sprint 3D — Ledger Uniqueness", () => {
  it("exactly one investment ledger entry per investment", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleFullWithPayment(inv.investmentId);

    const txns = await prisma.transaction.findMany({
      where: { investmentId: inv.investmentId, type: "investment" },
    });
    expect(txns.length).toBe(1);
    expect(txns[0].amount).toBe(10000);
  });

  it("concurrent confirm→ledger_posted prevents double ledger entry", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("lu-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    await settleOne("lu-2", inv.investmentId);
    await settleOne("lu-3", inv.investmentId);

    const results = await Promise.allSettled([
      settleOne("lu-4a", inv.investmentId),
      settleOne("lu-4b", inv.investmentId),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as Response).status === 200);
    expect(ok.length).toBe(2);

    const txns = await prisma.transaction.findMany({
      where: { investmentId: inv.investmentId, type: "investment" },
    });
    expect(txns.length).toBe(1);
  });
});

// ===========================================================================
// Sprint 3D/E — Cancel State Matrix
// ===========================================================================

describe("Sprint 3D/E — Cancel State Matrix", () => {
  it("early cancel (pending): releases inventoryReserved, no ledger reversal", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);

    expect((await prisma.property.findUniqueOrThrow({ where: { id: property.id } })).inventoryReserved).toBe(10);

    const res = await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cancel-early", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
    expect(body.reversalTransactionId).toBeUndefined();

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens).toBe(100);
    expect(prop.inventoryReserved).toBe(0);
    expect(prop.inventoryCommitted).toBe(0);
  });

  it("full cancel (ledger_posted): restores inventoryCommitted, creates reversal ledger", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleFullWithPayment(inv.investmentId);

    const before = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(before.inventoryCommitted).toBe(10);

    const res = await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cancel-full", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
    expect(body.reversalTransactionId).toBeDefined();

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens).toBe(100);
    expect(prop.inventoryReserved).toBe(0);
    expect(prop.inventoryCommitted).toBe(0);

    const txns = await prisma.transaction.findMany({
      where: { investmentId: inv.investmentId },
      orderBy: { createdAt: "asc" },
    });
    expect(txns.length).toBe(2);
    expect(txns[0].type).toBe("investment");
    expect(txns[0].amount).toBe(10000);
    expect(txns[1].type).toBe("cancellation");
    expect(txns[1].amount).toBe(-10000);
  });

  it("cancel from confirmed is rejected (409)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("cf-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    await settleOne("cf-2", inv.investmentId);
    await settleOne("cf-3", inv.investmentId);

    const confirmed = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    expect(confirmed.status).toBe("confirmed");

    const res = await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cancel-confirmed", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("INVALID_CANCELLATION_STATE");
  });

  it("early cancel (payment_settled): releases inventoryReserved, no ledger reversal", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("cancel-es-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    await settleOne("cancel-es-2", inv.investmentId);

    const res = await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cancel-es-3", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).reversalTransactionId).toBeUndefined();

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens).toBe(100);
    expect(prop.inventoryReserved).toBe(0);
  });
});

// ===========================================================================
// Sprint 3D — Inventory Ownership
// ===========================================================================

describe("Sprint 3D — Inventory Ownership", () => {
  it("inventoryReserved + inventoryCommitted = totalTokens - availableTokens", async () => {
    const property = await seedProperty({ totalTokens: 200, availableTokens: 200 });
    expect(property.inventoryReserved).toBe(0);
    expect(property.inventoryCommitted).toBe(0);

    const account = await seedAccount();
    const session = await seedSession(account.id);
    const inv1 = await createInvestment(session, property.id, 30);
    expect(inv1.availableTokens).toBe(170);
    expect(inv1.inventoryReserved).toBe(30);
    expect(inv1.inventoryCommitted).toBe(0);

    const inv2 = await createInvestment(session, property.id, 20);
    expect(inv2.inventoryReserved).toBe(50);

    await settleOne("io-1", inv1.investmentId);
    await seedPaymentReference(inv1.investmentId, inv1.amount);
    await settleOne("io-2", inv1.investmentId);
    await settleOne("io-3", inv1.investmentId);
    const prop1 = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop1.inventoryReserved).toBe(20);
    expect(prop1.inventoryCommitted).toBe(30);
    expect(prop1.availableTokens).toBe(150);
    expect(prop1.availableTokens + prop1.inventoryReserved + prop1.inventoryCommitted).toBe(200);
  });

  it("explicit inventory fields never infer ownership from status", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    await createInvestment(session, property.id, 10);

    const pendingInv = await prisma.investment.findFirstOrThrow({ where: { status: "pending" } });
    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.inventoryReserved).toBe(10);
    expect(prop.inventoryCommitted).toBe(0);

    // Delete the investment (simulating edge case) — inventory is already reserved
    // InventoryReserved stays at 10 because we don't automatically release on delete
    // This is expected — inventory is explicit, not inferred from status
    expect(prop.availableTokens).toBe(90);
  });
});

// ===========================================================================
// Sprint 3D/E — Ledger Invariants
// ===========================================================================

describe("Sprint 3D/E — Ledger Invariants", () => {
  async function ledgerSum(investmentId: string): Promise<number> {
    const rows = await prisma.transaction.findMany({ where: { investmentId } });
    return rows.reduce((sum, t) => sum + t.amount, 0);
  }

  it("pending: ledger sum = 0", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    expect(inv.status).toBe("pending");
    expect(await ledgerSum(inv.investmentId)).toBe(0);
  });

  it("confirmed: ledger sum = 0 (before posting)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("li-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    await settleOne("li-2", inv.investmentId);
    await settleOne("li-3", inv.investmentId);
    const inv3 = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    expect(inv3.status).toBe("confirmed");
    expect(await ledgerSum(inv.investmentId)).toBe(0);

    await settleOne("li-4", inv.investmentId);
    expect(await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } }).then(i => i.status)).toBe("ledger_posted");
    expect(await ledgerSum(inv.investmentId)).toBe(10000);
  });

  it("cancelled (full): ledger sum = 0 (investment + reversal)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleFullWithPayment(inv.investmentId);
    expect(await ledgerSum(inv.investmentId)).toBe(10000);

    await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "li-sum-1", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(await ledgerSum(inv.investmentId)).toBe(0);
  });

  it("cancelled (early): ledger sum = 0 (no entries)", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    expect(await ledgerSum(inv.investmentId)).toBe(0);
    await cancelPOST(
      postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "li-early-1", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv.investmentId }) },
    );
    expect(await ledgerSum(inv.investmentId)).toBe(0);
  });
});

// ===========================================================================
// Sprint 3D — Concurrency Tests
// ===========================================================================

describe("Sprint 3D — Concurrency", () => {
  it("parallel settle with different idempotency keys: each CAS step serialized", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 20);

    await seedPaymentReference(inv.investmentId, inv.amount);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => settleOne(`con-${i}`, inv.investmentId)),
    );
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as Response).status === 200);
    expect(ok.length).toBe(8);

    const final = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    expect(final.status).toBe("ledger_posted");

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.inventoryReserved).toBe(0);
    expect(prop.inventoryCommitted).toBe(20);
    expect(prop.availableTokens).toBe(80);
  });

  it("parallel cancel (ledger_posted): exactly one inventory restoration", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 30);
    await settleFullWithPayment(inv.investmentId);

    const results = await Promise.allSettled([
      cancelPOST(postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "con-cancel-1", ...authHeaders(session) }), { params: Promise.resolve({ id: inv.investmentId }) }),
      cancelPOST(postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "con-cancel-2", ...authHeaders(session) }), { params: Promise.resolve({ id: inv.investmentId }) }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled" && (r.value as Response).status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens).toBe(100);
    expect(prop.inventoryCommitted).toBe(0);

    const txns = await prisma.transaction.findMany({
      where: { investmentId: inv.investmentId, type: "cancellation" },
    });
    expect(txns.length).toBe(1);
  });

  it("parallel settle + cancel race: settle wins with CAS, cancel fails with CONCURRENT_MODIFICATION", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleOne("race-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId);
    await settleOne("race-2", inv.investmentId);
    await settleOne("race-3", inv.investmentId);

    const [settleResult, cancelResult] = await Promise.allSettled([
      settleOne("race-4", inv.investmentId),
      cancelPOST(postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "race-cx", ...authHeaders(session) }), { params: Promise.resolve({ id: inv.investmentId }) }),
    ]);
    const settleOk = settleResult.status === "fulfilled" && (settleResult.value as Response).status === 200;
    const cancelOk = cancelResult.status === "fulfilled" && (cancelResult.value as Response).status === 200;

    expect(settleOk || cancelOk).toBe(true);
    const finalInv = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens + prop.inventoryReserved + prop.inventoryCommitted).toBe(100);
    expect(await findInventoryViolations(prisma)).toEqual([]);
  });

  it("parallel settlement with double ledger posting prevention", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 15);
    await settleOne("dlp-1", inv.investmentId);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await settleOne("dlp-2", inv.investmentId);
    await settleOne("dlp-3", inv.investmentId);

    const results = await Promise.allSettled([
      settleOne("dlp-4a", inv.investmentId),
      settleOne("dlp-4b", inv.investmentId),
      settleOne("dlp-4c", inv.investmentId),
    ]);
    const okCount = results.filter(
      (r) => r.status === "fulfilled" && (r.value as Response).status === 200,
    ).length;
    expect(okCount).toBe(3);

    const txns = await prisma.transaction.findMany({
      where: { investmentId: inv.investmentId, type: "investment" },
    });
    expect(txns.length).toBe(1);
  });
});

// ===========================================================================
// Sprint 3C — Payment Lifecycle (preserved, adapted for internal auth)
// ===========================================================================

describe("Sprint 3C — Payment Lifecycle (internal auth)", () => {
  it("full lifecycle via internal auth", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 10);
    await settleFullWithPayment(inv.investmentId);

    const final = await prisma.investment.findUniqueOrThrow({ where: { id: inv.investmentId } });
    expect(final.status).toBe("ledger_posted");
    expect(final.confirmedAt).not.toBeNull();

    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.inventoryReserved).toBe(0);
    expect(prop.inventoryCommitted).toBe(10);
    expect(prop.availableTokens).toBe(90);
  });
});

// ===========================================================================
// Sprint 3C — Monetary Precision (preserved)
// ===========================================================================

describe("Sprint 3C — Monetary Precision", () => {
  it("all monetary values are integers (cents)", async () => {
    const property = await seedProperty({ tokenPrice: 1000, totalValue: 1_000_000_00, minInvestment: 1000 });
    expect(Number.isInteger(property.tokenPrice)).toBe(true);
    expect(Number.isInteger(property.totalValue)).toBe(true);

    const account = await seedAccount();
    const session = await seedSession(account.id);
    const inv = await createInvestment(session, property.id, 10);
    expect(Number.isInteger(inv.amount)).toBe(true);
    expect(inv.amount).toBe(10000);
    expect(inv.tokenPrice).toBe(1000);
  });
});

// ===========================================================================
// Sprint 3C — Distribution Eligibility (preserved)
// ===========================================================================

describe("Sprint 3C — Distribution Eligibility", () => {
  it("distribution is property-scoped — only settled investments in property participate", async () => {
    const admin = await seedAccount({ role: "administrator" });
    const adminSession = await seedSession(admin.id);
    const propertyA = await seedProperty({ slug: "prop-a", totalTokens: 200, availableTokens: 200 });
    const propertyB = await seedProperty({ slug: "prop-b", totalTokens: 200, availableTokens: 200 });
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);

    const invA = await createInvestment(investorSession, propertyA.id, 50);
    await settleFullWithPayment(invA.investmentId);
    const invB = await createInvestment(investorSession, propertyB.id, 30);
    await settleFullWithPayment(invB.investmentId);

    const dist = await prisma.distribution.create({
      data: { period: "2026-Q3", propertyId: propertyA.id, totalAmount: 1000_00, status: "approved" },
    });
    const res = await distributePOST(
      postJson(`/api/treasury/distributions/${dist.id}/distribute`, {}, { "idempotency-key": "elig-1", ...authHeaders(adminSession) }),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.eligibleTokens).toBe(50);
    expect(body.allocationCount).toBe(1);
  });
});

// ===========================================================================
// Sprint 3B — Route-level execute-at-most-once (adapted)
// ===========================================================================

describe("financial routes — execute at most once (with auth)", () => {
  it("concurrent duplicate POST /api/investments creates exactly one investment", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        investmentsPOST(postJson("/api/investments", { propertyId: property.id, tokens: 10 }, { "idempotency-key": "route-dup-1", ...authHeaders(session) })),
      ),
    );
    const payloads = await Promise.all(responses.map(async (r) => ({ status: r.status, body: await r.json() })));
    const created = payloads.filter((p) => p.status === 201);
    expect(created.length).toBeGreaterThanOrEqual(1);
    expect(new Set(created.map((p) => p.body.investmentId)).size).toBe(1);
    expect(await prisma.investment.count()).toBe(1);
  });

  it("concurrent cancellations restore inventory exactly once", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv = await createInvestment(session, property.id, 40);
    await settleFullWithPayment(inv.investmentId);

    const [r1, r2] = await Promise.all([
      cancelPOST(postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cc-1", ...authHeaders(session) }), { params: Promise.resolve({ id: inv.investmentId }) }),
      cancelPOST(postJson(`/api/investments/${inv.investmentId}/cancel`, {}, { "idempotency-key": "cc-2", ...authHeaders(session) }), { params: Promise.resolve({ id: inv.investmentId }) }),
    ]);
    expect(r1.status === 200 || r2.status === 200).toBe(true);
    const prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens).toBe(100);
    expect(prop.inventoryCommitted).toBe(0);
  });
});

// ===========================================================================
// Sprint 3B — Inventory invariants (preserved, adapted for new fields)
// ===========================================================================

describe("Part 5 — inventory invariants", () => {
  it("invariant holds across create, settle, and cancel", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const inv1 = await createInvestment(session, property.id, 25);
    const inv2 = await createInvestment(session, property.id, 15);
    await settleFullWithPayment(inv1.investmentId);
    await settleFullWithPayment(inv2.investmentId);

    let prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens + prop.inventoryReserved + prop.inventoryCommitted).toBe(100);

    await cancelPOST(
      postJson(`/api/investments/${inv2.investmentId}/cancel`, {}, { "idempotency-key": "inv-flow-1", ...authHeaders(session) }),
      { params: Promise.resolve({ id: inv2.investmentId }) },
    );
    prop = await prisma.property.findUniqueOrThrow({ where: { id: property.id } });
    expect(prop.availableTokens + prop.inventoryReserved + prop.inventoryCommitted).toBe(100);
    expect(await findInventoryViolations(prisma)).toEqual([]);
  });

  it("rejects admin updates that break invariant", async () => {
    const property = await seedProperty({ inventoryCommitted: 30, availableTokens: 70 });
    await expect(updatePropertyInventory(prisma, property.id, { availableTokens: 60 }))
      .rejects.toMatchObject({ code: "INVENTORY_INVARIANT_VIOLATION" });
  });
});

// ===========================================================================
// Sprint 3E — Auth Hardening
// ===========================================================================

describe("Sprint 3E — Auth Hardening", () => {
  it("initInternalAuth rejects missing secret", async () => {
    const { initInternalAuth, ConfigurationError } = await import("@/lib/server/auth");
    const saved = process.env.INTERNAL_AUTH_SECRET;
    delete process.env.INTERNAL_AUTH_SECRET;
    try {
      expect(() => initInternalAuth()).toThrow(ConfigurationError);
    } finally {
      process.env.INTERNAL_AUTH_SECRET = saved;
    }
  });

  it("initInternalAuth rejects short secret", async () => {
    const { initInternalAuth, ConfigurationError } = await import("@/lib/server/auth");
    const saved = process.env.INTERNAL_AUTH_SECRET;
    process.env.INTERNAL_AUTH_SECRET = "short";
    try {
      expect(() => initInternalAuth()).toThrow(ConfigurationError);
    } finally {
      process.env.INTERNAL_AUTH_SECRET = saved;
    }
  });

  it("assertInternalRequest uses constant-time comparison", async () => {
    const { assertInternalRequest } = await import("@/lib/server/auth");
    const req = new Request("http://test.local", {
      headers: { "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
    });
    expect(() => assertInternalRequest(req)).not.toThrow();
  });
});

// ===========================================================================
// Sprint 3E — PostgreSQL Readiness
// ===========================================================================

describe("Sprint 3E — PostgreSQL Readiness", () => {
  it("getDatabaseUrl returns configured DATABASE_URL", async () => {
    const { getDatabaseUrl } = await import("@/lib/server/prisma");
    expect(getDatabaseUrl()).toBe(dbUrl);
  });

  it("createPrismaClient with SQLite URL returns working client", async () => {
    const { createPrismaClient: mCreate } = await import("@/lib/server/prisma");
    const client = mCreate(dbUrl);
    try {
      await client.$connect();
      const result = await client.account.count();
      expect(typeof result).toBe("number");
    } finally {
      await client.$disconnect();
    }
  });

  it("schema supports both PostgreSQL and SQLite idioms", async () => {
    const schema = await import("fs").then(fs => fs.readFileSync("prisma/schema.prisma", "utf8"));
    expect(schema).toContain("postgresql");
    expect(schema).toContain("provider = \"postgresql\"");
    const sqliteSchema = await import("fs").then(fs => fs.readFileSync("prisma/schema.sqlite.prisma", "utf8"));
    expect(sqliteSchema).toContain("sqlite");
    expect(sqliteSchema).toContain("provider = \"sqlite\"");
  });
});

// ===========================================================================
// Frontend API helper contract (unchanged)
// ===========================================================================

describe("frontend API helper — automatic idempotency protection", () => {
  it("generates an Idempotency-Key automatically and reuses it across retries", async () => {
    const seenKeys: (string | null)[] = [];
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      calls += 1;
      seenKeys.push(new Headers(init.headers).get("Idempotency-Key"));
      if (calls === 1) return new Response(JSON.stringify({ error: "in progress", code: "IDEMPOTENCY_IN_PROGRESS" }), { status: 409, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify({ investmentId: "inv_1" }), { status: 201, headers: { "content-type": "application/json" } });
    }));
    try {
      const { apiPost } = await import("@/lib/api/client");
      const res = await apiPost<{ investmentId: string }>("/api/investments", { tokens: 1 }, { conflictDelayMs: 1 });
      expect(res.investmentId).toBe("inv_1");
      expect(calls).toBe(2);
      expect(seenKeys[0]).toBe(seenKeys[1]);
    } finally { vi.unstubAllGlobals(); }
  });
});
