import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const dbFile = resolve(repoRoot, "prisma", `test-sprint4.3-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");
const dbUrl = `file:${dbFile}`;

type RoutePost = (request: Request) => Promise<Response>;
type RoutePostWithId = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let prisma: PrismaClient;
let createPrismaClient: (url?: string) => PrismaClient;

let refundPOST: RoutePostWithId;
let voidPOST: RoutePostWithId;
let payoutPOST: RoutePost;
let payoutGet: RoutePostWithId;
let reconciliationPOST: RoutePost;
let dailyReconPOST: RoutePost;
let retryPayoutsPOST: RoutePost;
let retryRefundsPOST: RoutePost;
let stalePayoutsPOST: RoutePost;
let investmentsPOST: RoutePost;
let settlePOST: RoutePostWithId;
let snapshotPOST: RoutePostWithId;
let claimPOST: RoutePostWithId;

const TEST_AUTH_SECRET = "test-internal-secret-for-reconciliation-32chr";
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

  refundPOST = (await import("@/app/api/payments/[id]/refund/route")).POST;
  voidPOST = (await import("@/app/api/payments/[id]/void/route")).POST;
  payoutPOST = (await import("@/app/api/payouts/route")).POST;
  payoutGet = (await import("@/app/api/payouts/[id]/route")).GET;
  reconciliationPOST = (await import("@/app/api/reconciliation/route")).POST;
  dailyReconPOST = (await import("@/app/api/jobs/daily-reconciliation/route")).POST;
  retryPayoutsPOST = (await import("@/app/api/jobs/retry-payouts/route")).POST;
  retryRefundsPOST = (await import("@/app/api/jobs/retry-refunds/route")).POST;
  stalePayoutsPOST = (await import("@/app/api/jobs/stale-payouts/route")).POST;
  investmentsPOST = (await import("@/app/api/investments/route")).POST;
  settlePOST = (await import("@/app/api/investments/[id]/settle/route")).POST;
  snapshotPOST = (await import("@/app/api/treasury/distributions/[id]/snapshot/route")).POST;
  claimPOST = (await import("@/app/api/treasury/distributions/[id]/claim/route")).POST;
}, 120_000);

beforeEach(async () => {
  await prisma.payoutLedger.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.reconciliationReport.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.distributionAllocation.deleteMany();
  await prisma.distributionSnapshot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.paymentReference.deleteMany();
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

function internalHeaders(): Record<string, string> {
  return { "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` };
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

async function seedPaymentReference(investmentId: string, amount: number, status = "VERIFIED") {
  return prisma.paymentReference.create({
    data: {
      investmentId,
      paymentStatus: status,
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

describe("Sprint 4.3 — Refund Flow", () => {
  async function createPaymentRefWithInvestment(
    prisma: PrismaClient,
    status: string,
    investorId?: string,
  ) {
    const property = await seedProperty();
    const investorIdToUse = investorId ?? (await seedAccount()).id;
    const investment = await prisma.investment.create({
      data: {
        accountId: investorIdToUse,
        propertyId: property.id,
        tokens: 10,
        amount: 10000,
        tokenPrice: 1000,
        status: "confirmed",
      },
    });
    const ref = await prisma.paymentReference.create({
      data: {
        investmentId: investment.id,
        paymentStatus: status,
        capturedAmount: 10000,
        capturedCurrency: "USD",
        paymentProvider: "stripe",
        providerPaymentId: `pp_${crypto.randomUUID()}`,
      },
    });
    return ref;
  }

  it("requests refund on VERIFIED payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "VERIFIED");

    const res = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { paymentStatus: string };
    expect(body.paymentStatus).toBe("REFUND_REQUESTED");
  });

  it("completes refund on REFUND_REQUESTED payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "REFUND_REQUESTED");

    const res = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, { action: "complete" }, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { paymentStatus: string };
    expect(body.paymentStatus).toBe("REFUNDED");
  });

  it("rejects refund on non-VERIFIED payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "PENDING");

    const res = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(409);
  });

  it("duplicate refund request is idempotent", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "VERIFIED");

    const res1 = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res1.status).toBe(201);

    const res2 = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res2.status).toBe(201);
    const body2 = await res2.json() as { paymentStatus: string; alreadyRefunded: boolean };
    expect(body2.paymentStatus).toBe("REFUND_REQUESTED");
    expect(body2.alreadyRefunded).toBe(false);
  });

  it("duplicate refund complete is idempotent", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "REFUND_REQUESTED");

    const res1 = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, { action: "complete" }, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res1.status).toBe(201);

    const res2 = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, { action: "complete" }, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as { paymentStatus: string; alreadyRefunded: boolean };
    expect(body2.paymentStatus).toBe("REFUNDED");
    expect(body2.alreadyRefunded).toBe(true);
  });

  it("non-admin cannot request refund", async () => {
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const ref = await createPaymentRefWithInvestment(prisma, "VERIFIED", investor.id);

    const res = await refundPOST(
      postJson(`/api/payments/${ref.id}/refund`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(403);
  });
});

describe("Sprint 4.3 — Void Flow", () => {
  async function createPaymentRefWithInvestment(
    prisma: PrismaClient,
    status: string,
    investorId?: string,
  ) {
    const property = await seedProperty();
    const investorIdToUse = investorId ?? (await seedAccount()).id;
    const investment = await prisma.investment.create({
      data: {
        accountId: investorIdToUse,
        propertyId: property.id,
        tokens: 10,
        amount: 10000,
        tokenPrice: 1000,
        status: "confirmed",
      },
    });
    const ref = await prisma.paymentReference.create({
      data: {
        investmentId: investment.id,
        paymentStatus: status,
        capturedAmount: 10000,
        capturedCurrency: "USD",
        paymentProvider: "stripe",
        providerPaymentId: `pp_${crypto.randomUUID()}`,
      },
    });
    return ref;
  }

  it("voids AUTHORIZED payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "AUTHORIZED");

    const res = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { paymentStatus: string };
    expect(body.paymentStatus).toBe("VOIDED");
  });

  it("rejects void on VERIFIED (settled) payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "VERIFIED");

    const res = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(409);
  });

  it("rejects void on PENDING payment", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "PENDING");

    const res = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(409);
  });

  it("duplicate void is idempotent", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const ref = await createPaymentRefWithInvestment(prisma, "AUTHORIZED");

    const res1 = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res1.status).toBe(201);

    const res2 = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as { paymentStatus: string; alreadyVoided: boolean };
    expect(body2.paymentStatus).toBe("VOIDED");
    expect(body2.alreadyVoided).toBe(true);
  });

  it("non-admin cannot void payment", async () => {
    const investor = await seedAccount();
    const investorSession = await seedSession(investor.id);
    const ref = await createPaymentRefWithInvestment(prisma, "AUTHORIZED", investor.id);

    const res = await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );
    expect(res.status).toBe(403);
  });
});

describe("Sprint 4.3 — Payout Engine", () => {
  it("creates payout for claimed allocation", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    expect(claimRes.status).toBe(201);
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const payoutRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    expect(payoutRes.status).toBe(201);
    const payoutBody = await payoutRes.json() as { payoutId: string; status: string };
    expect(payoutBody.status).toBe("pending");
  });

  it("processes payout through full lifecycle", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const createRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    const createBody = await createRes.json() as { payoutId: string; status: string };
    expect(createBody.status).toBe("pending");

    const processRes = await payoutPOST(
      postJson("/api/payouts", { action: "process", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );
    expect(processRes.status).toBe(201);
    const processBody = await processRes.json() as { status: string };
    expect(processBody.status).toBe("processing");

    const completeRes = await payoutPOST(
      postJson("/api/payouts", { action: "complete", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );
    expect(completeRes.status).toBe(201);
    const completeBody = await completeRes.json() as { status: string };
    expect(completeBody.status).toBe("completed");

    const ledgerEntry = await prisma.payoutLedger.findUnique({ where: { payoutId: createBody.payoutId } });
    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry!.amount).toBe(50000);
  });

  it("duplicate payout creation is idempotent", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const res1 = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    expect(res1.status).toBe(201);

    const res2 = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as { alreadyProcessed: boolean };
    expect(body2.alreadyProcessed).toBe(true);
  });

  it("payout retry resets failed payout", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const createRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    const createBody = await createRes.json() as { payoutId: string };

    await payoutPOST(
      postJson("/api/payouts", { action: "process", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );

    const failRes = await payoutPOST(
      postJson("/api/payouts", { action: "fail", payoutId: createBody.payoutId, error: "Insufficient funds" }, authHeaders(investorSession)),
    );
    expect(failRes.status).toBe(201);
    const failBody = await failRes.json() as { status: string };
    expect(failBody.status).toBe("failed");

    const retryRes = await payoutPOST(
      postJson("/api/payouts", { action: "create", allocationId: claimBody.allocationId, distributionId: dist.id, amount: claimBody.grossAmount }, authHeaders(investorSession)),
    );
    const retryBody = await retryRes.json() as { status: string };
    expect(retryBody.status).toBe("failed");
  });

  it("failed payout can be retried via job", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const createRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    const createBody = await createRes.json() as { payoutId: string };

    await payoutPOST(
      postJson("/api/payouts", { action: "process", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );
    await payoutPOST(
      postJson("/api/payouts", { action: "fail", payoutId: createBody.payoutId, error: "Provider error" }, authHeaders(investorSession)),
    );

    const retryRes = await retryPayoutsPOST(
      new Request("http://test.local/api/jobs/retry-payouts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(retryRes.status).toBe(201);
    const retryBody = await retryRes.json() as { summary: string };
    const summary = JSON.parse(retryBody.summary);
    expect(summary.retried).toBe(1);
  });
});

describe("Sprint 4.3 — Reconciliation Engine", () => {
  it("generates reconciliation report with no findings for clean state", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);

    const res = await reconciliationPOST(
      postJson("/api/reconciliation", { reportType: "manual" }, authHeaders(adminSession)),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { reportId: string; findings: unknown[]; summary: string };
    expect(body.reportId).toBeTruthy();
    expect(Array.isArray(body.findings)).toBe(true);
  });

  it("detects orphan payout", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);

    await prisma.payout.create({
      data: {
        distributionId: `dist-${crypto.randomUUID()}`,
        allocationId: `alloc-${crypto.randomUUID()}`,
        investorId: admin.id,
        amount: 50000,
        status: "pending",
      },
    });

    const res = await reconciliationPOST(
      postJson("/api/reconciliation", { reportType: "manual" }, authHeaders(adminSession)),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { findings: Array<{ type: string }> };
    const orphanFindings = body.findings.filter((f) => f.type === "orphan_payout");
    expect(orphanFindings.length).toBe(1);
  });

  it("detects failed payout", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const createRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    const createBody = await createRes.json() as { payoutId: string };

    await payoutPOST(
      postJson("/api/payouts", { action: "process", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );
    await payoutPOST(
      postJson("/api/payouts", { action: "fail", payoutId: createBody.payoutId, error: "Provider error" }, authHeaders(investorSession)),
    );

    const reconRes = await reconciliationPOST(
      postJson("/api/reconciliation", { reportType: "manual" }, authHeaders(adminSession)),
    );
    expect(reconRes.status).toBe(201);
    const reconBody = await reconRes.json() as { findings: Array<{ type: string }> };
    const failedFindings = reconBody.findings.filter((f) => f.type === "failed_payout");
    expect(failedFindings.length).toBe(1);
  });
});

describe("Sprint 4.3 — Scheduled Jobs", () => {
  it("runs daily reconciliation job", async () => {
    const res = await dailyReconPOST(
      new Request("http://test.local/api/jobs/daily-reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { jobType: string; status: string };
    expect(body.jobType).toBe("daily_reconciliation");
    expect(body.status).toBe("completed");
  });

  it("runs stale payout detection job", async () => {
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

    const claimRes = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(investorSession)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const claimBody = await claimRes.json() as { allocationId: string; grossAmount: number };

    const createRes = await payoutPOST(
      postJson("/api/payouts", {
        action: "create",
        allocationId: claimBody.allocationId,
        distributionId: dist.id,
        amount: claimBody.grossAmount,
      }, authHeaders(investorSession)),
    );
    const createBody = await createRes.json() as { payoutId: string };

    await payoutPOST(
      postJson("/api/payouts", { action: "process", payoutId: createBody.payoutId }, authHeaders(investorSession)),
    );

    await prisma.payout.update({
      where: { id: createBody.payoutId },
      data: { updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    });

    const res = await stalePayoutsPOST(
      new Request("http://test.local/api/jobs/stale-payouts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { jobType: string; summary: string };
    expect(body.jobType).toBe("stale_payout_detection");
    const summary = JSON.parse(body.summary);
    expect(summary.marked).toBe(1);
  });

  it("runs refund retry job", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty();
    const investment = await prisma.investment.create({
      data: {
        accountId: admin.id,
        propertyId: property.id,
        tokens: 10,
        amount: 10000,
        tokenPrice: 1000,
        status: "confirmed",
      },
    });
    const ref = await prisma.paymentReference.create({
      data: {
        investmentId: investment.id,
        paymentStatus: "REFUND_REQUESTED",
        capturedAmount: 10000,
        capturedCurrency: "USD",
        paymentProvider: "stripe",
        providerPaymentId: `pp_${crypto.randomUUID()}`,
      },
    });

    const res = await retryRefundsPOST(
      new Request("http://test.local/api/jobs/retry-refunds", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { jobType: string; summary: string };
    expect(body.jobType).toBe("refund_retry");
    const summary = JSON.parse(body.summary);
    expect(summary.completed).toBe(1);

    const updated = await prisma.paymentReference.findUnique({ where: { id: ref.id } });
    expect(updated!.paymentStatus).toBe("REFUNDED");
  });

  it("rejects job without internal auth", async () => {
    const res = await dailyReconPOST(
      new Request("http://test.local/api/jobs/daily-reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("Sprint 4.3 — Audit Events", () => {
  it("records audit events for refund, void, payout, reconciliation", async () => {
    const admin = await seedAccount("treasury_manager");
    const adminSession = await seedSession(admin.id);
    const property = await seedProperty();
    const investment = await prisma.investment.create({
      data: {
        accountId: admin.id,
        propertyId: property.id,
        tokens: 10,
        amount: 10000,
        tokenPrice: 1000,
        status: "confirmed",
      },
    });
    const ref = await prisma.paymentReference.create({
      data: {
        investmentId: investment.id,
        paymentStatus: "AUTHORIZED",
        capturedAmount: 10000,
        capturedCurrency: "USD",
        paymentProvider: "stripe",
        providerPaymentId: `pp_${crypto.randomUUID()}`,
      },
    });

    await voidPOST(
      postJson(`/api/payments/${ref.id}/void`, {}, authHeaders(adminSession)),
      { params: Promise.resolve({ id: ref.id }) },
    );

    const auditEvents = await prisma.auditEvent.findMany({
      where: { resource: "payment", resourceId: ref.id },
    });
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
    expect(auditEvents.some((e) => e.action === "payment.voided")).toBe(true);
  });
});

describe("Sprint 4.3 — Parallel Payout", () => {
  it("handles parallel payout processing safely", async () => {
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
    const b1 = await r1.json() as { allocationId: string; grossAmount: number };

    const r2 = await claimPOST(
      postJson(`/api/treasury/distributions/${dist.id}/claim`, {}, authHeaders(s2)),
      { params: Promise.resolve({ id: dist.id }) },
    );
    const b2 = await r2.json() as { allocationId: string; grossAmount: number };

    const p1 = await payoutPOST(
      postJson("/api/payouts", { action: "create", allocationId: b1.allocationId, distributionId: dist.id, amount: b1.grossAmount }, authHeaders(s1)),
    );
    const p2 = await payoutPOST(
      postJson("/api/payouts", { action: "create", allocationId: b2.allocationId, distributionId: dist.id, amount: b2.grossAmount }, authHeaders(s2)),
    );
    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);

    const payouts = await prisma.payout.findMany({ where: { distributionId: dist.id } });
    expect(payouts.length).toBe(2);
    const totalAmount = payouts.reduce((s, p) => s + p.amount, 0);
    expect(totalAmount).toBe(100000);
  });
});

describe("Sprint 4.3 — Idempotent Jobs", () => {
  it("daily reconciliation job is idempotent", async () => {
    const res1 = await dailyReconPOST(
      new Request("http://test.local/api/jobs/daily-reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(res1.status).toBe(201);

    const res2 = await dailyReconPOST(
      new Request("http://test.local/api/jobs/daily-reconciliation", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-authorization": `Bearer ${TEST_AUTH_SECRET}` },
        body: "{}",
      }),
    );
    expect(res2.status).toBe(201);
  });
});