import { authenticateRequest } from "@/lib/server/auth";
import { errorResponse, jsonResponse, readJsonBody, stringField } from "@/lib/server/http";
import {
  initiateClaimAction,
  listClaimsByScheduleAction,
  listClaimsByInvestorAction,
  listClaimsByStatusAction,
} from "@/lib/server/financial/claim-actions";

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await authenticateRequest(request);
    const body = await readJsonBody(request);

    const scheduleId = stringField(body, "scheduleId");
    if (!scheduleId) {
      return jsonResponse({ error: "scheduleId is required", code: "INVALID_INPUT" }, 400);
    }
    const investorId = stringField(body, "investorId");
    if (!investorId) {
      return jsonResponse({ error: "investorId is required", code: "INVALID_INPUT" }, 400);
    }
    const quantity = stringField(body, "quantity");
    if (!quantity) {
      return jsonResponse({ error: "quantity is required", code: "INVALID_INPUT" }, 400);
    }
    const amount = stringField(body, "amount");
    if (!amount) {
      return jsonResponse({ error: "amount is required", code: "INVALID_INPUT" }, 400);
    }
    const currency = stringField(body, "currency");
    if (!currency) {
      return jsonResponse({ error: "currency is required", code: "INVALID_INPUT" }, 400);
    }

    const expiresAt =
      typeof body === "object" && body !== null
        ? ((body as Record<string, unknown>).expiresAt as number | undefined)
        : undefined;

    const result = await initiateClaimAction(
      { scheduleId, investorId, quantity, amount, currency, expiresAt },
      actor.id,
    );

    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    await authenticateRequest(request);
    const url = new URL(request.url);
    const scheduleId = url.searchParams.get("scheduleId");
    const investorId = url.searchParams.get("investorId");
    const status = url.searchParams.get("status");

    let claims;
    if (scheduleId) {
      claims = listClaimsByScheduleAction(scheduleId);
    } else if (investorId) {
      claims = listClaimsByInvestorAction(investorId);
    } else if (status) {
      claims = listClaimsByStatusAction(status);
    } else {
      return jsonResponse({ error: "One of scheduleId, investorId, or status is required", code: "INVALID_INPUT" }, 400);
    }

    return jsonResponse(claims);
  } catch (error) {
    return errorResponse(error);
  }
}
