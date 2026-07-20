import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanDistribute } from "@/lib/server/authz";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { createDistributionSnapshotTx } from "@/lib/server/financial/snapshot";

interface SnapshotRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: SnapshotRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    assertCanDistribute(actor);
    const { id } = await context.params;
    await readJsonBody(request);

    const result = await prisma.$transaction((tx) =>
      createDistributionSnapshotTx(tx, { distributionId: id }),
    );

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
