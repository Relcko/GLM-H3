import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { assertCanDistribute } from "@/lib/server/authz";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { runReconciliationTx } from "@/lib/server/financial/reconciliation";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    assertCanDistribute(actor);
    const body = await readJsonBody(request) as Record<string, unknown>;
    const reportType = (body?.reportType as string) ?? "manual";

    const result = await prisma.$transaction((tx) =>
      runReconciliationTx(tx, reportType),
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}