export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

export interface ApiPostOptions {
  readonly idempotencyKey?: string;
  readonly headers?: Record<string, string>;
  readonly signal?: AbortSignal;
  readonly conflictRetries?: number;
  readonly conflictDelayMs?: number;
  readonly networkRetries?: number;
}

interface ErrorPayload {
  error?: string;
  code?: string;
  details?: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options: ApiPostOptions = {},
): Promise<T> {
  const idempotencyKey = options.idempotencyKey ?? generateIdempotencyKey();
  const conflictRetries = options.conflictRetries ?? 3;
  const networkRetries = options.networkRetries ?? 1;
  const baseDelay = options.conflictDelayMs ?? 250;

  let lastError: unknown;
  const maxAttempts = 1 + Math.max(conflictRetries, networkRetries);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
          ...options.headers,
        },
        body: JSON.stringify(body ?? {}),
        signal: options.signal,
      });
    } catch (networkError) {
      lastError = networkError;
      if (attempt < networkRetries) {
        await sleep(baseDelay * 2 ** attempt);
        continue;
      }
      break;
    }

    const payload = (await response.json().catch(() => null)) as (ErrorPayload & T) | null;

    if (response.status === 409 && payload?.code === "IDEMPOTENCY_IN_PROGRESS" && attempt < conflictRetries) {
      await sleep(baseDelay * 2 ** attempt);
      continue;
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload?.code ?? "API_ERROR",
        payload?.error ?? `Request failed with status ${response.status}`,
        payload?.details,
      );
    }

    return payload as T;
  }

  throw lastError instanceof Error ? lastError : new ApiError(0, "NETWORK_ERROR", String(lastError));
}

export interface CreateInvestmentRequest {
  readonly propertyId: string;
  readonly tokens: number;
}

export interface CreateInvestmentResponse {
  readonly investmentId: string;
  readonly accountId: string;
  readonly propertyId: string;
  readonly tokens: number;
  readonly tokenPrice: number;
  readonly amount: number;
  readonly status: string;
  readonly availableTokens: number;
  readonly inventoryReserved: number;
  readonly inventoryCommitted: number;
}

export interface CancelInvestmentResponse {
  readonly investmentId: string;
  readonly status: string;
  readonly propertyId: string;
  readonly tokens: number;
  readonly availableTokens: number;
  readonly inventoryReserved: number;
  readonly inventoryCommitted: number;
  readonly alreadyCancelled: boolean;
  readonly reversalTransactionId?: string;
}

export interface DistributeResponse {
  readonly distributionId: string;
  readonly status: string;
  readonly propertyId: string;
  readonly eligibleTokens: number;
  readonly perTokenAmount: number;
  readonly totalDistributed: number;
  readonly allocationCount: number;
  readonly alreadyDistributed: boolean;
}

export interface SettlementResponse {
  readonly investmentId: string;
  readonly status: string;
  readonly transactionId?: string;
  readonly paymentReferenceId?: string;
  readonly propertyId: string;
  readonly tokens: number;
  readonly amount: number;
  readonly availableTokens: number;
  readonly inventoryReserved: number;
  readonly inventoryCommitted: number;
}

export const financialApi = {
  createInvestment(input: CreateInvestmentRequest, options?: ApiPostOptions) {
    return apiPost<CreateInvestmentResponse>("/api/investments", input, options);
  },
  cancelInvestment(investmentId: string, options?: ApiPostOptions) {
    return apiPost<CancelInvestmentResponse>(
      `/api/investments/${encodeURIComponent(investmentId)}/cancel`,
      {},
      options,
    );
  },
  settleInvestment(investmentId: string, options?: ApiPostOptions) {
    return apiPost<SettlementResponse>(
      `/api/investments/${encodeURIComponent(investmentId)}/settle`,
      {},
      options,
    );
  },
  distributeDistribution(distributionId: string, options?: ApiPostOptions) {
    return apiPost<DistributeResponse>(
      `/api/treasury/distributions/${encodeURIComponent(distributionId)}/distribute`,
      {},
      options,
    );
  },
};
