import { prisma } from "@/lib/server/prisma";
import { executeAtMostOnce, requireIdempotencyKey } from "@/lib/server/idempotency";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanCancel } from "@/lib/server/authz";
import { canonicalBody, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { cancelInvestmentTx } from "@/lib/server/financial/cancel";

interface CancelRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: CancelRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const key = requireIdempotencyKey(request);
    const { id } = await context.params;
    const body = await readJsonBody(request);

    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment) {
      return new Response(JSON.stringify({ error: "Investment not found", code: "INVESTMENT_NOT_FOUND" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    assertCanCancel(actor, investment.accountId);

    const result = await executeAtMostOnce(
      prisma,
      {
        key,
        accountId: actor.id,
        endpoint: `POST /api/investments/${id}/cancel`,
        requestBody: canonicalBody(body),
      },
      (tx) => cancelInvestmentTx(tx, { investmentId: id, actorId: actor.id }),
    );

    return jsonResponse(result.body, result.statusCode);
  } catch (error) {
    return errorResponse(error);
  }
}
