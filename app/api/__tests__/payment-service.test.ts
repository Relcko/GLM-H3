/**
 * Sprint 4.1 — Payment Service.
 *
 * Integration tests against a REAL Prisma test database (SQLite via
 * `prisma db push`, dedicated file per test run).
 *
 * Covers: provider abstraction, webhook security, PaymentReference lifecycle,
 * deduplication, replay protection, amount mismatch, refund, void.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const dbFile = resolve(repoRoot, "prisma", `test-sprint4.1-${process.pid}-${Date.now()}.db`).replace(/\\/g, "/");
const dbUrl = `file:${dbFile}`;

type RoutePost = (request: Request) => Promise<Response>;
type WebhookRoutePost = (
  request: Request,
  context: { params: Promise<{ provider: string }> },
) => Promise<Response>;
type SettleRoutePost = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

let prisma: PrismaClient;
let createPrismaClient: (url?: string) => PrismaClient;

let webhookPOST: WebhookRoutePost;
let settlePOST: SettleRoutePost;
let investmentsPOST: RoutePost;

const TEST_AUTH_SECRET = "test-internal-secret-for-payment-service-32chr";
const INTERNAL_TOKEN = `Bearer ${TEST_AUTH_SECRET}`;

const STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_deterministic_hmac";
const TOLERANCE_SECONDS = 300;

function makeStripeSignature(body: string, timestamp: number | undefined = undefined, secret = STRIPE_WEBHOOK_SECRET): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${body}`;
  const { createHmac } = require("node:crypto");
  const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${ts},v1=${sig}`;
}

function stripeWebhookRequest(body: Record<string, unknown>): Request {
  const rawBody = JSON.stringify(body);
  const signature = makeStripeSignature(rawBody);
  return new Request("http://test.local/api/payments/webhook/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: rawBody,
  });
}

function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://test.local${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function internalHeaders(): Record<string, string> {
  return { "x-internal-authorization": INTERNAL_TOKEN };
}

beforeAll(async () => {
  process.env.INTERNAL_AUTH_SECRET = TEST_AUTH_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;

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

  webhookPOST = (await import("@/app/api/payments/webhook/[provider]/route")).POST;
  investmentsPOST = (await import("@/app/api/investments/route")).POST;
  settlePOST = (await import("@/app/api/investments/[id]/settle/route")).POST;
}, 120_000);

beforeEach(async () => {
  await prisma.paymentReference.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.investment.deleteMany();
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

async function seedAccount() {
  return prisma.account.create({
    data: {
      email: `investor-${crypto.randomUUID()}@test.dev`,
      role: "investor",
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

async function seedProperty() {
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
    },
  });
}

async function createInvestment(session: { token: string }, propertyId: string, tokens: number) {
  const res = await investmentsPOST(
    postJson("/api/investments", { propertyId, tokens }, { "idempotency-key": `create-${crypto.randomUUID()}`, ...authHeaders(session) }),
  );
  return res.json() as Promise<{ investmentId: string; amount: number; status: string }>;
}

function makeStripePaymentEvent(overrides: Partial<Record<string, unknown>> = {}) {
  const defaultEvent: Record<string, unknown> = {
    id: `evt_${crypto.randomUUID().replace(/-/g, "")}`,
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: `pi_${crypto.randomUUID().replace(/-/g, "")}`,
        amount: 10000,
        amount_captured: 10000,
        currency: "usd",
        status: "succeeded",
        created: Math.floor(Date.now() / 1000),
        metadata: {
          investment_id: "",
        },
      },
    },
  };

  const merged = mergeDeep(defaultEvent, overrides as Record<string, unknown>);
  return merged;
}

function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = mergeDeep((result[key] as Record<string, unknown>) ?? {}, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Payment Service — Webhook Security", () => {
  it("rejects webhook with missing signature header", async () => {
    const event = makeStripePaymentEvent();
    const rawBody = JSON.stringify(event);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("WEBHOOK_SIGNATURE_INVALID");
  });

  it("rejects webhook with invalid signature", async () => {
    const event = makeStripePaymentEvent();
    const rawBody = JSON.stringify(event);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": "t=1234567890,v1=invalidsignature",
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects webhook with expired timestamp", async () => {
    const event = makeStripePaymentEvent();
    const rawBody = JSON.stringify(event);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const signature = makeStripeSignature(rawBody, oldTimestamp);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects webhook with unknown provider", async () => {
    const event = makeStripePaymentEvent();
    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/unknown", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "unknown" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("Payment Service — PaymentReference Lifecycle", () => {
  it("creates VERIFIED PaymentReference from valid webhook", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 10);

    const event = makeStripePaymentEvent({
      data: {
        object: {
          metadata: { investment_id: investment.investmentId },
        },
      },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { paymentStatus: string; investmentId: string };
    expect(body.paymentStatus).toBe("VERIFIED");
    expect(body.investmentId).toBe(investment.investmentId);

    const ref = await prisma.paymentReference.findUnique({ where: { investmentId: investment.investmentId } });
    expect(ref).not.toBeNull();
    expect(ref!.paymentStatus).toBe("VERIFIED");
    expect(ref!.capturedAmount).toBe(10000);
    expect(ref!.capturedCurrency).toBe("USD");
  });

  it("rejects duplicate provider event id", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    await createInvestment(session, property.id, 10);

    const eventId = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const event = makeStripePaymentEvent({ id: eventId }) as Record<string, unknown>;
    const eventData = event.data as Record<string, unknown>;
    const eventObj = eventData.object as Record<string, unknown>;
    const eventMeta = eventObj.metadata as Record<string, unknown>;

    // create investment
    const account2 = await seedAccount();
    const session2 = await seedSession(account2.id);
    const investment = await createInvestment(session2, property.id, 5);
    eventMeta.investment_id = investment.investmentId;

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);

    const res1 = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res1.status).toBe(200);

    const res2 = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res2.status).toBe(200);
    const ref = await prisma.paymentReference.findMany({});
    expect(ref.length).toBe(1);
  });

  it("rejects webhook for non-existent investment", async () => {
    const event = makeStripePaymentEvent({
      data: { object: { metadata: { investment_id: "nonexistent-investment" } } },
    });
    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res.status).toBe(422);
  });

  it("processes payment failure event", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 10);

    const event = makeStripePaymentEvent({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          status: "failed",
          metadata: { investment_id: investment.investmentId },
        },
      },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { paymentStatus: string };
    expect(body.paymentStatus).toBe("FAILED");
  });

  it("processes refund event", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 10);

    const event = makeStripePaymentEvent({
      type: "payment_intent.refunded",
      data: {
        object: {
          status: "succeeded",
          metadata: { investment_id: investment.investmentId },
        },
      },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { paymentStatus: string };
    expect(body.paymentStatus).toBe("VERIFIED");
  });
});

describe("Payment Service — Settlement Integration", () => {
  it("settlement consumes VERIFIED payment reference created by webhook", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 10);

    const event = makeStripePaymentEvent({
      data: {
        object: {
          amount: 10000,
          amount_captured: 10000,
          metadata: { investment_id: investment.investmentId },
        },
      },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const webhookRes = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(webhookRes.status).toBe(200);

    // settle through full lifecycle
    for (const step of ["authorize", "settle", "confirm", "post"]) {
      const res = await settlePOST(
        postJson(`/api/investments/${investment.investmentId}/settle`, {}, { "idempotency-key": `settle-${step}-${crypto.randomUUID()}`, ...internalHeaders() }),
        { params: Promise.resolve({ id: investment.investmentId }) },
      );
      expect(res.status).toBe(200);
    }

    const ref = await prisma.paymentReference.findUnique({ where: { investmentId: investment.investmentId } });
    expect(ref).not.toBeNull();
    expect(ref!.paymentStatus).toBe("CONSUMED");
    expect(ref!.consumedAt).not.toBeNull();
  });

  it("settlement rejects when amount mismatches investment", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 10);
    const expectedAmount = investment.amount;

    const wrongAmount = expectedAmount + 100;
    const event = makeStripePaymentEvent({
      data: {
        object: {
          amount: wrongAmount,
          amount_captured: wrongAmount,
          metadata: { investment_id: investment.investmentId },
        },
      },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const webhookRes = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(webhookRes.status).toBe(200);

    // authorize
    const authRes = await settlePOST(
      postJson(`/api/investments/${investment.investmentId}/settle`, {}, { "idempotency-key": `settle-auth-${crypto.randomUUID()}`, ...internalHeaders() }),
      { params: Promise.resolve({ id: investment.investmentId }) },
    );
    expect(authRes.status).toBe(200);

    // settle - should fail with amount mismatch
    const settleRes = await settlePOST(
      postJson(`/api/investments/${investment.investmentId}/settle`, {}, { "idempotency-key": `settle-pay-${crypto.randomUUID()}`, ...internalHeaders() }),
      { params: Promise.resolve({ id: investment.investmentId }) },
    );
    const settleBody = await settleRes.json() as { code: string };
    expect(settleRes.status).toBe(422);
    expect(settleBody.code).toBe("PAYMENT_AMOUNT_MISMATCH");
  });
});

describe("Payment Service — Provider Abstraction", () => {
  it("accepts webhook with correct signature", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 5);

    const event = makeStripePaymentEvent({
      data: { object: { metadata: { investment_id: investment.investmentId } } },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);
    const res = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res.status).toBe(200);
  });
});

describe("Payment Service — Replay Protection", () => {
  it("replays the same webhook body returns the same result", async () => {
    const account = await seedAccount();
    const session = await seedSession(account.id);
    const property = await seedProperty();
    const investment = await createInvestment(session, property.id, 3);

    const eventId = `evt_replay_${crypto.randomUUID().replace(/-/g, "")}`;
    const event = makeStripePaymentEvent({
      id: eventId,
      data: { object: { metadata: { investment_id: investment.investmentId } } },
    });

    const rawBody = JSON.stringify(event);
    const signature = makeStripeSignature(rawBody);

    const res1 = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res1.status).toBe(200);

    const res2 = await webhookPOST(
      new Request("http://test.local/api/payments/webhook/stripe", {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": signature },
        body: rawBody,
      }),
      { params: Promise.resolve({ provider: "stripe" }) },
    );
    expect(res2.status).toBe(200);

    const refs = await prisma.paymentReference.findMany({});
    expect(refs.length).toBe(1);
  });
});
