/** Web-standard HTTP helpers shared by the financial API routes. */

import {
  ClaimOwnershipLostError,
  IdempotencyBodyMismatchError,
  IdempotencyConflictError,
  IdempotencyKeyRequiredError,
} from "./idempotency";
import { AuthenticationError, AuthorizationError } from "./auth";
import { FinancialError } from "./financial/errors";
import { PaymentError } from "./payment/errors";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type StatusedError = { statusCode: number; code: string; message: string; details?: unknown };

function isStatusedError(error: unknown): error is StatusedError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

export function errorResponse(error: unknown): Response {
  // Prisma operation timeout (P1008) = lost a cross-process write race.
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P1008"
  ) {
    return jsonResponse(
      { error: "Concurrent modification — retry the request with the same Idempotency-Key", code: "CONCURRENT_MODIFICATION" },
      409,
    );
  }
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof IdempotencyKeyRequiredError ||
    error instanceof IdempotencyConflictError ||
    error instanceof IdempotencyBodyMismatchError ||
    error instanceof ClaimOwnershipLostError ||
    error instanceof FinancialError ||
    error instanceof PaymentError ||
    isStatusedError(error)
  ) {
    const e = error as StatusedError;
    return jsonResponse({ error: e.message, code: e.code, details: e.details }, e.statusCode);
  }
  return jsonResponse(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    500,
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new FinancialError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

/** Stable canonical string for replay-correctness comparison. */
export function canonicalBody(body: unknown): string {
  return JSON.stringify(body ?? {});
}

export function stringField(body: unknown, field: string): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
