import { prisma } from "@/lib/server/prisma";
import { executeAtMostOnce, requireIdempotencyKey } from "@/lib/server/idempotency";
import { assertInternalRequest } from "@/lib/server/auth";
import { canonicalBody, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { settleInvestmentTx } from "@/lib/server/financial/settle";

interface SettleRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: SettleRouteContext): Promise<Response> {
  try {
    assertInternalRequest(request);
    const key = requireIdempotencyKey(request);
    const { id } = await context.params;
    const body = await readJsonBody(request);

    const result = await executeAtMostOnce(
      prisma,
      {
        key,
        accountId: "internal",
        endpoint: `POST /api/investments/${id}/settle`,
        requestBody: JSON.stringify(body),
      },
      (tx) => settleInvestmentTx(tx, id),
    );

    return jsonResponse(result.body, result.statusCode);
  } catch (error) {
    return errorResponse(error);
  }
}
