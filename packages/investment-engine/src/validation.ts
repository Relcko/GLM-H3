import type { Address } from "@relcko/types";
import type { InvestmentRequest } from "./types";

export function validateInvestmentRequest(input: unknown): InvestmentRequest {
  const v = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!v.investorId || typeof v.investorId !== "string") errors.push("investorId is required");
  if (!v.propertyId || typeof v.propertyId !== "string") errors.push("propertyId is required");
  if (!v.fractionId || typeof v.fractionId !== "string") errors.push("fractionId is required");
  if (!v.tokens || typeof v.tokens !== "bigint" && typeof v.tokens !== "number") errors.push("tokens must be a bigint or number");
  if (!v.amount || typeof v.amount !== "bigint" && typeof v.amount !== "number") errors.push("amount must be a bigint or number");
  if (!v.currency || typeof v.currency !== "string") errors.push("currency is required");
  if (!v.chainId || typeof v.chainId !== "number") errors.push("chainId is required");
  if (!v.walletAddress || typeof v.walletAddress !== "string") errors.push("walletAddress is required");
  if (!v.idempotencyKey || typeof v.idempotencyKey !== "string") errors.push("idempotencyKey is required");

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }

  return {
    investorId: v.investorId as string as never,
    propertyId: v.propertyId as string as never,
    fractionId: v.fractionId as string as never,
    tokens: BigInt(v.tokens as number),
    amount: BigInt(v.amount as number),
    currency: v.currency as string as never,
    paymentMethod: (v.paymentMethod as string) === "erc20" ? "erc20" as never : "native_token" as never,
    tokenAddress: (v.tokenAddress as string | undefined) as Address | undefined,
    chainId: v.chainId as number,
    walletAddress: v.walletAddress as string as never,
    idempotencyKey: v.idempotencyKey as string,
  };
}
