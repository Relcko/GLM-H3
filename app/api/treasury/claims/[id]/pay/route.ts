import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { payClaimAction } from "@/lib/server/financial/claim-actions";

interface PayClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: PayClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;

    const result = await payClaimAction(id, actor.id);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
