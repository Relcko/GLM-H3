import { createHmac, timingSafeEqual } from "node:crypto";
import type { ParsedPayload, PaymentProvider, PaymentProviderStatus } from "../provider";

const TOLERANCE_SECONDS = 300;

export interface StripeConfig {
  readonly webhookSecret: string;
  readonly toleranceSeconds?: number;
}

export function createStripeProvider(config: StripeConfig): PaymentProvider {
  const tolerance = config.toleranceSeconds ?? TOLERANCE_SECONDS;

  function verifySignature(body: string, signatureHeader: string): boolean {
    const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts)) return false;
    if (Math.abs(now - ts) > tolerance) return false;

    const signedPayload = `${timestamp}.${body}`;
    const expected = createHmac("sha256", config.webhookSecret).update(signedPayload).digest("hex");

    const bufA = Buffer.from(signature, "utf8");
    const bufB = Buffer.from(expected, "utf8");
    if (bufA.length !== bufB.length) return false;
    try {
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  function parseAmount(raw: string): number {
    const sanitized = raw.replace(/[^0-9]/g, "");
    const parsed = parseInt(sanitized, 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`Cannot parse amount from: ${raw}`);
    }
    return parsed;
  }

  return {
    name: "stripe",

    async verifyWebhook(body: string, headers: Record<string, string>): Promise<boolean> {
      const signatureHeader = headers["stripe-signature"];
      if (!signatureHeader) return false;
      return verifySignature(body, signatureHeader);
    },

    async parsePayload(body: string): Promise<ParsedPayload> {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const dataWrapper = parsed.data;
      const dataObj = dataWrapper && typeof dataWrapper === "object"
        ? ((dataWrapper as Record<string, unknown>).object as Record<string, unknown>)
        : parsed;

      const providerEventId = (parsed.id as string) ?? "";
      const providerPaymentId = (dataObj.id as string) ?? "";
      const metadata = dataObj.metadata as Record<string, unknown> | undefined;
      const investmentId = (metadata?.investment_id as string) ?? "";
      const capturedAmount = dataObj.amount_captured ? parseAmount(String(dataObj.amount_captured)) : parseAmount(String(dataObj.amount ?? "0"));
      const capturedCurrency = (dataObj.currency as string) ?? "usd";
      const capturedAt = dataObj.created ? new Date((dataObj.created as number) * 1000) : new Date();
      const rawStatus = (dataObj.status as string) ?? "";
      const status = mapStripeStatus(rawStatus);

      return {
        providerEventId,
        providerPaymentId,
        investmentId,
        capturedAmount,
        capturedCurrency: capturedCurrency.toUpperCase(),
        capturedAt,
        status,
        rawResponse: body,
      };
    },

    providerReference(payload: ParsedPayload): string {
      return payload.providerPaymentId;
    },

    capturedAmount(payload: ParsedPayload): number {
      return payload.capturedAmount;
    },

    capturedCurrency(payload: ParsedPayload): string {
      return payload.capturedCurrency;
    },

    status(payload: ParsedPayload): PaymentProviderStatus {
      return payload.status;
    },
  };
}

function mapStripeStatus(stripeStatus: string): PaymentProviderStatus {
  switch (stripeStatus) {
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "processing":
      return "PENDING";
    case "requires_capture":
      return "AUTHORIZED";
    case "succeeded":
      return "VERIFIED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "VOIDED";
    default:
      return "PENDING";
  }
}

export { TOLERANCE_SECONDS };
