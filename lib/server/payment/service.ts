import { Prisma } from "@prisma/client";
import type { ParsedPayload, PaymentProvider, PaymentProviderStatus } from "./provider";
import { PaymentError } from "./errors";

export interface PaymentServiceConfig {
  readonly providers: readonly PaymentProvider[];
}

export interface PaymentRecord {
  readonly id: string;
  readonly investmentId: string;
  readonly paymentStatus: string;
  readonly capturedAmount: number;
  readonly capturedCurrency: string;
  readonly capturedAt: Date | null;
  readonly paymentProvider: string;
  readonly providerPaymentId: string | null;
  readonly providerEventId: string | null;
  readonly consumedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function createProviderMap(providers: readonly PaymentProvider[]): Map<string, PaymentProvider> {
  const map = new Map<string, PaymentProvider>();
  for (const p of providers) {
    map.set(p.name, p);
  }
  return map;
}

export async function processWebhookEvent(
  providerName: string,
  body: string,
  headers: Record<string, string>,
  db: Prisma.TransactionClient,
  config: PaymentServiceConfig,
): Promise<PaymentRecord> {
  const providerMap = createProviderMap(config.providers);
  const provider = providerMap.get(providerName);
  if (!provider) {
    throw new PaymentError(400, "UNKNOWN_PAYMENT_PROVIDER", `Unknown payment provider: ${providerName}`);
  }

  const isValid = await provider.verifyWebhook(body, headers);
  if (!isValid) {
    throw new PaymentError(401, "WEBHOOK_SIGNATURE_INVALID", `Webhook signature verification failed for provider ${providerName}`);
  }

  const payload = await provider.parsePayload(body);

  const existing = await db.paymentReference.findUnique({
    where: { providerEventId: payload.providerEventId },
  });
  if (existing) {
    if (existing.paymentStatus === "CONSUMED") {
      return existing;
    }
    const updated = await db.paymentReference.update({
      where: { providerEventId: payload.providerEventId },
      data: {
        paymentStatus: provider.status(payload),
        providerPaymentId: provider.providerReference(payload),
        capturedAmount: provider.capturedAmount(payload),
        capturedCurrency: provider.capturedCurrency(payload),
        capturedAt: payload.capturedAt,
        providerResponse: payload.rawResponse,
      },
    });
    return updated;
  }

  const matchingInvestment = await db.investment.findUnique({
    where: { id: payload.investmentId },
  });
  if (!matchingInvestment) {
    await db.auditEvent.create({
      data: {
        actorId: "payment-gateway",
        action: "payment.orphaned",
        resource: "payment",
        resourceId: payload.providerEventId,
        details: JSON.stringify({ provider: providerName, investmentId: payload.investmentId }),
      },
    });
    throw new PaymentError(422, "INVESTMENT_NOT_FOUND", `Investment ${payload.investmentId} not found`);
  }

  const existingForInvestment = await db.paymentReference.findUnique({
    where: { investmentId: payload.investmentId },
  });
  if (existingForInvestment) {
    if (existingForInvestment.paymentStatus !== "CONSUMED") {
      const updated = await db.paymentReference.update({
        where: { investmentId: payload.investmentId },
        data: {
          paymentStatus: provider.status(payload),
          providerPaymentId: provider.providerReference(payload),
          providerEventId: payload.providerEventId,
          capturedAmount: provider.capturedAmount(payload),
          capturedCurrency: provider.capturedCurrency(payload),
          capturedAt: payload.capturedAt,
          providerResponse: payload.rawResponse,
        },
      });
      return updated;
    }
  }

  const record = await db.paymentReference.create({
    data: {
      investmentId: payload.investmentId,
      paymentStatus: provider.status(payload),
      capturedAmount: provider.capturedAmount(payload),
      capturedCurrency: provider.capturedCurrency(payload),
      capturedAt: payload.capturedAt,
      paymentProvider: providerName,
      providerPaymentId: provider.providerReference(payload),
      providerEventId: payload.providerEventId,
      providerResponse: payload.rawResponse,
    },
  });

  await db.auditEvent.create({
    data: {
      actorId: "payment-gateway",
      action: "payment.received",
      resource: "payment",
      resourceId: record.id,
      details: JSON.stringify({
        provider: providerName,
        providerEventId: payload.providerEventId,
        providerPaymentId: provider.providerReference(payload),
        investmentId: payload.investmentId,
        amount: provider.capturedAmount(payload),
        currency: provider.capturedCurrency(payload),
        status: provider.status(payload),
      }),
    },
  });

  return record;
}

export function isTerminalStatus(status: PaymentProviderStatus): boolean {
  return status === "VERIFIED" || status === "FAILED" || status === "REFUNDED" || status === "VOIDED";
}
