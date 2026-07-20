import { prisma } from "@/lib/server/prisma";
import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";

interface PayoutGetRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: PayoutGetRouteContext): Promise<Response> {
  try {
    await authenticateRequest(request);
    const { id } = await context.params;

    const payout = await prisma.payout.findUnique({ where: { id } });
    if (!payout) {
      return new Response(JSON.stringify({ error: "Payout not found", code: "PAYOUT_NOT_FOUND" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify(payout), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}