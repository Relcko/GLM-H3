import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { claimDistributionTx } from "@/lib/server/financial/claim";
import { AuthorizationError } from "@/lib/server/auth";

interface ClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: ClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;
    await readJsonBody(request);

    const result = await prisma.$transaction((tx) =>
      claimDistributionTx(tx, { distributionId: id, investorId: actor.id }),
    );

    return jsonResponse(result, result.alreadyClaimed ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}
