import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanDistribute } from "@/lib/server/authz";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { voidPaymentTx } from "@/lib/server/financial/void";

interface VoidRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: VoidRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    assertCanDistribute(actor);
    const { id } = await context.params;
    await readJsonBody(request);

    const result = await prisma.$transaction((tx) =>
      voidPaymentTx(tx, { paymentReferenceId: id, actorId: actor.id }),
    );

    return new Response(JSON.stringify(result), {
      status: result.alreadyVoided ? 200 : 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}