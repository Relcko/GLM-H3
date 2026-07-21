import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse, readJsonBody, stringField } from "@/lib/server/http";
import { disputeClaimAction } from "@/lib/server/financial/claim-actions";

interface DisputeClaimRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: DisputeClaimRouteContext): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const reason = stringField(body, "reason");

    const result = await disputeClaimAction(id, actor.id, reason);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
