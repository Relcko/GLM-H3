import { prisma } from "@/lib/server/prisma";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { processWebhookEvent } from "@/lib/server/payment/service";
import { createStripeProvider } from "@/lib/server/payment/providers/stripe";
import type { PaymentServiceConfig } from "@/lib/server/payment/service";

const paymentConfig: PaymentServiceConfig = {
  providers: [
    createStripeProvider({
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    }),
  ],
};

interface WebhookRouteContext {
  params: Promise<{ provider: string }>;
}

export async function POST(request: Request, context: WebhookRouteContext): Promise<Response> {
  try {
    const { provider } = await context.params;
    const body = await request.text();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const record = await prisma.$transaction(async (tx) => {
      return processWebhookEvent(provider, body, headers, tx, paymentConfig);
    });

    return jsonResponse(
      {
        id: record.id,
        investmentId: record.investmentId,
        paymentStatus: record.paymentStatus,
        paymentProvider: record.paymentProvider,
      },
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
