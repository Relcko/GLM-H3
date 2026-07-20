import { prisma } from "@/lib/server/prisma";
import { executeAtMostOnce, requireIdempotencyKey } from "@/lib/server/idempotency";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanInvest } from "@/lib/server/authz";
import { canonicalBody, errorResponse, jsonResponse, readJsonBody, stringField } from "@/lib/server/http";
import { createInvestmentTx } from "@/lib/server/financial/invest";
import { FinancialError } from "@/lib/server/financial/errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const key = requireIdempotencyKey(request);
    const body = await readJsonBody(request);

    const propertyId = stringField(body, "propertyId");
    const tokens = typeof body === "object" && body !== null ? (body as Record<string, unknown>).tokens : undefined;
    if (!propertyId) throw new FinancialError(400, "PROPERTY_REQUIRED", "propertyId is required");
    if (typeof tokens !== "number") throw new FinancialError(400, "INVALID_TOKENS", "tokens must be a number");

    assertCanInvest(actor, actor.id);

    const result = await executeAtMostOnce(
      prisma,
      {
        key,
        accountId: actor.id,
        endpoint: "POST /api/investments",
        requestBody: canonicalBody(body),
      },
      (tx) => createInvestmentTx(tx, { accountId: actor.id, propertyId, tokens }),
    );

    return jsonResponse(result.body, result.statusCode);
  } catch (error) {
    return errorResponse(error);
  }
}
