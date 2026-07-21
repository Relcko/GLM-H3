import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse } from "@/lib/server/http";
import { getClaimAction, getClaimReceiptAction } from "@/lib/server/financial/claim-actions";

interface ClaimByIdRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: ClaimByIdRouteContext): Promise<Response> {
  try {
    await authenticateRequest(request);
    const { id } = await context.params;

    const claim = getClaimAction(id);
    if (!claim) {
      return jsonResponse({ error: `Claim ${id} not found`, code: "CLAIM_NOT_FOUND" }, 404);
    }

    return jsonResponse(claim);
  } catch (error) {
    return errorResponse(error);
  }
}
