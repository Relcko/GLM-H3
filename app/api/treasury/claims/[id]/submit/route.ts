import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { submitClaimAction } from "@/lib/server/financial/claim-actions";

interface SubmitClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: SubmitClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;

    const result = await submitClaimAction(id, actor.id);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
