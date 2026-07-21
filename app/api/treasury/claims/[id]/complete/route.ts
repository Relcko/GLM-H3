import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { completeClaimAction } from "@/lib/server/financial/claim-actions";

interface CompleteClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: CompleteClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;

    const result = await completeClaimAction(id, actor.id);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
