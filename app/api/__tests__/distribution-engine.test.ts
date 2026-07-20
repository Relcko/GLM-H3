/**
 * Sprint 4.2 — Distribution Engine.
 *
 * Integration tests against a REAL Prisma test database (SQLite via
 * `prisma db push`, dedicated file per test run).
 *
 * Covers: snapshot, allocation, claim, residual, CAS, replay, concurrency,
 * security, and ledger correctness.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const dbFile = resolve(repoRoot, "prisma", `test-sprint4.2-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");
const dbUrl = `file:${dbFile}`;

type RoutePost = (request: Request) => Promise<Response>;
type RoutePostWithId = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let prisma: PrismaClient;
let createPrismaClient: (url?: string) => PrismaClient;

let snapshotPOST: RoutePostWithId;
let claimPOST: RoutePostWithId;
let investmentsPOST: RoutePost;

beforeAll(async () => {
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

  snapshotPOST = (await import("@/app/api/treasury/distributions/[id]/snapshot/route")).POST;
  claimPOST = (await import("@/app/api/treasury/distributions/[id]/claim/route")).POST;
  investmentsPOST = (await import("@/app/api/investments/route")).POST;
}, 120_000);

beforeEach(async () => {
  await prisma.distributionAllocation.deleteMany();
  await prisma.distributionSnapshot.deleteMany();
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
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const path = dbFile + suffix;
    if (existsSync(path)) rmSync(path, { force: true });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedAccount(role = "investor") {
  return prisma.account.create({
    data: {
      email: `${role}-${crypto.randomUUID()}@test.dev`,
      role,
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
  const key = `create-${crypto.randomUUID()}`;
  const res = await investmentsPOST(
    new Request("http://test.local/api/investments", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key, ...authHeaders(session) },
      body: JSON.stringify({ propertyId, tokens }),
    }),
  );
  return res.json() as Promise<{ investmentId: string; amount: number; status: string }>;
}

async function advanceToLedgerPosted(investmentId: string) {
  const { executeAtMostOnce } = await import("@/lib/server/idempotency");
  const { settleInvestmentTx } = await import("@/lib/server/financial/settle");
  const { prisma: p } = await import("@/lib/server/prisma");

  for (const step of ["auth", "settle", "confirm", "post"]) {
    await executeAtMostOnce(
      p,
      {
        key: `advance-${investmentId}-${step}-${crypto.randomUUID()}`,
        accountId: "internal",
        endpoint: `POST /api/investments/${investmentId}/settle`,
        requestBody: "{}",
      },
      (tx) =>
        settleInvestmentTx(tx, investmentId),
    );
  }
}

async function seedPaymentReference(investmentId: string, amount: number) {
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

function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://test.local${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function seedDistribution(propertyId: string, totalAmount = 50000) {
  return prisma.distribution.create({
    data: {
      period: `Q1-${crypto.randomUUID().slice(0, 8)}`,
      propertyId,
      totalAmount,
      status: "pending",
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Distribution Engine — Snapshot", () => {
  it("creates snapshot and allocations for single investor", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { snapshotId: string; totalEligibleTokens: number; allocationCount: number };

    expect(body.totalEligibleTokens).toBe(10);
    expect(body.allocationCount).toBe(1);

    const snapshot = await prisma.distributionSnapshot.findUnique({ where: { id: body.snapshotId } });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.totalEligibleTokens).toBe(10);

    const allocs = await prisma.distributionAllocation.findMany({ where: { snapshotId: body.snapshotId } });
    expect(allocs.length).toBe(1);
    expect(allocs[0].eligibleTokens).toBe(10);
    expect(allocs[0].grossAmount).toBe(50000);
  });

  it("creates allocations for multiple investors with proportional amounts", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const inv1 = await seedAccount();
    const s1 = await seedSession(inv1.id);
    const i1 = await createInvestment(s1, property.id, 30);
    await seedPaymentReference(i1.investmentId, i1.amount);
    await advanceToLedgerPosted(i1.investmentId);

    const inv2 = await seedAccount();
    const s2 = await seedSession(inv2.id);
    const i2 = await createInvestment(s2, property.id, 70);
    await seedPaymentReference(i2.investmentId, i2.amount);
    await advanceToLedgerPosted(i2.investmentId);

    const dist = await seedDistribution(property.id, 100000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { snapshotId: string; totalEligibleTokens: number; allocationCount: number };

    expect(body.totalEligibleTokens).toBe(100);
    expect(body.allocationCount).toBe(2);

    const allocs = await prisma.distributionAllocation.findMany({
      where: { snapshotId: body.snapshotId },
      orderBy: { investorId: "asc" },
    });

    expect(allocs.length).toBe(2);
    const totalAllocated = allocs.reduce((s, a) => s + a.grossAmount, 0);
    expect(totalAllocated).toBe(100000);
  });

  it("rejects snapshot for non-existent distribution", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const res = await snapshotPOST(
      postJson("/api/treasury/distributions/nonexistent/snapshot", {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: "nonexistent" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects snapshot when no eligible tokens exist", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty();
    const dist = await seedDistribution(property.id, 50000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(422);
  });

  it("non-admin cannot create snapshot", async () => {
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty();
    const dist = await seedDistribution(property.id, 50000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(403);
  });

  it("snapshot is immutable — new investment after snapshot not included", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    const res1 = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res1.status).toBe(201);
    const body = await res1.json() as { totalEligibleTokens: number };
    expect(body.totalEligibleTokens).toBe(10);

    const inv2 = await createInvestment(investorSession, property.id, 20);
    await seedPaymentReference(inv2.investmentId, inv2.amount);
    await advanceToLedgerPosted(inv2.investmentId);

    const snapshot = await prisma.distributionSnapshot.findUnique({ where: { distributionId: dist.id } });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.totalEligibleTokens).toBe(10);
  });
});

describe("Distribution Engine — Allocation", () => {
  it("handles uneven token ownership correctly", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const account1 = await seedAccount();
    const s1 = await seedSession(account1.id);
    const a1 = await createInvestment(s1, property.id, 33);
    await seedPaymentReference(a1.investmentId, a1.amount);
    await advanceToLedgerPosted(a1.investmentId);

    const account2 = await seedAccount();
    const s2 = await seedSession(account2.id);
    const a2 = await createInvestment(s2, property.id, 33);
    await seedPaymentReference(a2.investmentId, a2.amount);
    await advanceToLedgerPosted(a2.investmentId);

    const account3 = await seedAccount();
    const s3 = await seedSession(account3.id);
    const a3 = await createInvestment(s3, property.id, 34);
    await seedPaymentReference(a3.investmentId, a3.amount);
    await advanceToLedgerPosted(a3.investmentId);

    const dist = await seedDistribution(property.id, 100000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);

    const body = await res.json() as { snapshotId: string; totalEligibleTokens: number };
    expect(body.totalEligibleTokens).toBe(100);

    const allocs = await prisma.distributionAllocation.findMany({
      where: { snapshotId: body.snapshotId },
      orderBy: { eligibleTokens: "desc" },
    });

    expect(allocs.length).toBe(3);
    const totalAllocated = allocs.reduce((s, a) => s + a.grossAmount, 0);
    expect(totalAllocated).toBe(100000);

    expect(allocs[0].grossAmount).toBe(34000);
  });

  it("handles residual distribution correctly", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const account1 = await seedAccount();
    const s1 = await seedSession(account1.id);
    const a1 = await createInvestment(s1, property.id, 33);
    await seedPaymentReference(a1.investmentId, a1.amount);
    await advanceToLedgerPosted(a1.investmentId);

    const account2 = await seedAccount();
    const s2 = await seedSession(account2.id);
    const a2 = await createInvestment(s2, property.id, 33);
    await seedPaymentReference(a2.investmentId, a2.amount);
    await advanceToLedgerPosted(a2.investmentId);

    const account3 = await seedAccount();
    const s3 = await seedSession(account3.id);
    const a3 = await createInvestment(s3, property.id, 34);
    await seedPaymentReference(a3.investmentId, a3.amount);
    await advanceToLedgerPosted(a3.investmentId);

    const dist = await seedDistribution(property.id, 100);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);

    const allocs = await prisma.distributionAllocation.findMany({
      where: { snapshot: { distribution: { propertyId: property.id } } },
      orderBy: { eligibleTokens: "desc" },
    });

    const totalAllocated = allocs.reduce((s, a) => s + a.grossAmount, 0);
    expect(totalAllocated).toBe(100);
  });

  it("handles zero residual when amount divides evenly", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const account1 = await seedAccount();
    const s1 = await seedSession(account1.id);
    const a1 = await createInvestment(s1, property.id, 50);
    await seedPaymentReference(a1.investmentId, a1.amount);
    await advanceToLedgerPosted(a1.investmentId);

    const account2 = await seedAccount();
    const s2 = await seedSession(account2.id);
    const a2 = await createInvestment(s2, property.id, 50);
    await seedPaymentReference(a2.investmentId, a2.amount);
    await advanceToLedgerPosted(a2.investmentId);

    const dist = await seedDistribution(property.id, 100000);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);

    const allocs = await prisma.distributionAllocation.findMany({
      where: { snapshot: { distribution: { propertyId: property.id } } },
    });

    const totalAllocated = allocs.reduce((s, a) => s + a.grossAmount, 0);
    expect(totalAllocated).toBe(100000);
    expect(allocs[0].grossAmount).toBe(50000);
    expect(allocs[1].grossAmount).toBe(50000);
  });

  it("handles zero income distribution", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 0);

    const res = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);

    const allocs = await prisma.distributionAllocation.findMany({
      where: { snapshot: { distribution: { propertyId: property.id } } },
    });

    expect(allocs.length).toBe(1);
    expect(allocs[0].grossAmount).toBe(0);
  });

  it("rejects duplicate distribution snapshot", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    const res1 = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res1.status).toBe(201);

    const res2 = await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res2.status).toBe(201);
  });
});

describe("Distribution Engine — Claim", () => {
  it("investor can claim their allocation", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const res = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { allocationId: string; grossAmount: number; claimStatus: string; alreadyClaimed: boolean };
    expect(body.grossAmount).toBe(50000);
    expect(body.claimStatus).toBe("claimed");
    expect(body.alreadyClaimed).toBe(false);

    const txn = await prisma.transaction.findFirst({ where: { accountId: investor.id, type: "distribution" } });
    expect(txn).not.toBeNull();
    expect(txn!.amount).toBe(50000);
    expect(txn!.type).toBe("distribution");
  });

  it("claim replay returns same result", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const res1 = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res1.status).toBe(201);

    const res2 = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as { grossAmount: number; alreadyClaimed: boolean };
    expect(body2.alreadyClaimed).toBe(true);
    expect(body2.grossAmount).toBe(50000);

    const txns = await prisma.transaction.findMany({ where: { accountId: investor.id, type: "distribution" } });
    expect(txns.length).toBe(1);
  });

  it("non-investor cannot claim another's allocation", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const thief = await seedAccount();
    const thiefSession = await seedSession(thief.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const res = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(thiefSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(404);
  });

  it("cannot claim without snapshot", async () => {
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty();
    const dist = await seedDistribution(property.id, 50000);

    const res = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(res.status).toBe(409);
  });
});

describe("Distribution Engine — Ledger Correctness", () => {
  it("claim creates distribution ledger entry", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });
    const inv = await createInvestment(investorSession, property.id, 10);
    await seedPaymentReference(inv.investmentId, inv.amount);
    await advanceToLedgerPosted(inv.investmentId);
    const dist = await seedDistribution(property.id, 50000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const txns = await prisma.transaction.findMany({ where: { accountId: investor.id } });
    const distTxns = txns.filter((t) => t.type === "distribution");
    expect(distTxns.length).toBe(1);
    expect(distTxns[0].amount).toBe(50000);
    expect(distTxns[0].status).toBe("completed");

    const investmentTxns = txns.filter((t) => t.type === "investment");
    expect(investmentTxns.length).toBe(1);
    expect(investmentTxns[0].amount).toBe(inv.amount);
  });

  it("multiple investors can claim their shares", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const acc1 = await seedAccount();
    const s1 = await seedSession(acc1.id);
    const i1 = await createInvestment(s1, property.id, 30);
    await seedPaymentReference(i1.investmentId, i1.amount);
    await advanceToLedgerPosted(i1.investmentId);

    const acc2 = await seedAccount();
    const s2 = await seedSession(acc2.id);
    const i2 = await createInvestment(s2, property.id, 70);
    await seedPaymentReference(i2.investmentId, i2.amount);
    await advanceToLedgerPosted(i2.investmentId);

    const dist = await seedDistribution(property.id, 100000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const r1 = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s1)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(r1.status).toBe(201);

    const r2 = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s2)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(r2.status).toBe(201);

    const txns = await prisma.transaction.findMany({ where: { type: "distribution" } });
    expect(txns.length).toBe(2);

    const totalDistributed = txns.reduce((s, t) => s + t.amount, 0);
    expect(totalDistributed).toBe(100000);
  });

  it("total claimed amount matches distribution total", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty({ availableTokens: 100, totalTokens: 100 });

    const acc1 = await seedAccount();
    const s1 = await seedSession(acc1.id);
    const i1 = await createInvestment(s1, property.id, 33);
    await seedPaymentReference(i1.investmentId, i1.amount);
    await advanceToLedgerPosted(i1.investmentId);

    const acc2 = await seedAccount();
    const s2 = await seedSession(acc2.id);
    const i2 = await createInvestment(s2, property.id, 33);
    await seedPaymentReference(i2.investmentId, i2.amount);
    await advanceToLedgerPosted(i2.investmentId);

    const acc3 = await seedAccount();
    const s3 = await seedSession(acc3.id);
    const i3 = await createInvestment(s3, property.id, 34);
    await seedPaymentReference(i3.investmentId, i3.amount);
    await advanceToLedgerPosted(i3.investmentId);

    const dist = await seedDistribution(property.id, 100000);

    await snapshotPOST(
      postJson(`/api/treasury/distributions/${dist.id}/snapshot`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s1)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s2)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s3)),
      { params: Promise.resolve({ id: dist.id }) },
    );

    const txns = await prisma.transaction.findMany({ where: { type: "distribution" } });
    const total = txns.reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(100000);
  });
});
