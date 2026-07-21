import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { expireClaimAction } from "@/lib/server/financial/claim-actions";

interface ExpireClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: ExpireClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;

    const result = await expireClaimAction(id, actor.id);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
