import { prisma } from "@/lib/server/prisma";
import { executeAtMostOnce, requireIdempotencyKey } from "@/lib/server/idempotency";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanDistribute } from "@/lib/server/authz";
import { canonicalBody, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { distributeDistributionTx } from "@/lib/server/financial/distribute";

interface DistributeRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: DistributeRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const key = requireIdempotencyKey(request);
    const { id } = await context.params;
    const body = await readJsonBody(request);

    assertCanDistribute(actor);

    const result = await executeAtMostOnce(
      prisma,
      {
        key,
        accountId: actor.id,
        endpoint: `POST /api/treasury/distributions/${id}/distribute`,
        requestBody: canonicalBody(body),
      },
      (tx) => distributeDistributionTx(tx, { distributionId: id, actorId: actor.id }),
    );

    return jsonResponse(result.body, result.statusCode);
  } catch (error) {
    return errorResponse(error);
  }
}
