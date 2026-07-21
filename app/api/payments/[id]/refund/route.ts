import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanDistribute } from "@/lib/server/authz";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { requestRefundTx, completeRefundTx } from "@/lib/server/financial/refund";

interface RefundRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RefundRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    assertCanDistribute(actor);
    const { id } = await context.params;
    const body = await readJsonBody(request) as Record<string, unknown>;
    const action = body?.action === "complete" ? "complete" : "request";

    const result = await prisma.$transaction((tx) =>
      action === "complete"
        ? completeRefundTx(tx, { paymentReferenceId: id, actorId: actor.id })
        : requestRefundTx(tx, { paymentReferenceId: id, actorId: actor.id }),
    );

    return new Response(JSON.stringify(result), {
      status: result.alreadyRefunded ? 200 : 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}