import type { Prisma } from "@prisma/client";
import type { HandlerResult } from "../idempotency";
import { FinancialError } from "./errors";

export interface CreateInvestmentInput {
  readonly accountId: string;
  readonly propertyId: string;
  readonly tokens: number;
}

export interface InvestmentCreatedBody {
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

export async function createInvestmentTx(
  tx: Prisma.TransactionClient,
  input: CreateInvestmentInput,
): Promise<HandlerResult<InvestmentCreatedBody>> {
  if (!input.accountId) {
    throw new FinancialError(400, "ACCOUNT_REQUIRED", "accountId is required");
  }
  if (!Number.isInteger(input.tokens) || input.tokens <= 0) {
    throw new FinancialError(400, "INVALID_TOKENS", "tokens must be a positive integer");
  }

  const account = await tx.account.findUnique({ where: { id: input.accountId } });
  if (!account) {
    throw new FinancialError(404, "ACCOUNT_NOT_FOUND", `Account ${input.accountId} not found`);
  }
  const property = await tx.property.findUnique({ where: { id: input.propertyId } });
  if (!property) {
    throw new FinancialError(404, "PROPERTY_NOT_FOUND", `Property ${input.propertyId} not found`);
  }

  const amount = input.tokens * property.tokenPrice;

  const reserved = await tx.property.updateMany({
    where: { id: property.id, availableTokens: { gte: input.tokens } },
    data: {
      availableTokens: { decrement: input.tokens },
      inventoryReserved: { increment: input.tokens },
    },
  });
  if (reserved.count !== 1) {
    throw new FinancialError(
      409,
      "INSUFFICIENT_AVAILABLE_TOKENS",
      `Property ${property.id} has fewer than ${input.tokens} tokens available`,
    );
  }

  const investment = await tx.investment.create({
    data: {
      accountId: input.accountId,
      propertyId: property.id,
      tokens: input.tokens,
      tokenPrice: property.tokenPrice,
      amount,
      status: "pending",
    },
  });

  const after = await tx.property.findUniqueOrThrow({ where: { id: property.id } });

  return {
    statusCode: 201,
    body: {
      investmentId: investment.id,
      accountId: input.accountId,
      propertyId: property.id,
      tokens: input.tokens,
      tokenPrice: property.tokenPrice,
      amount,
      status: investment.status,
      availableTokens: after.availableTokens,
      inventoryReserved: after.inventoryReserved,
      inventoryCommitted: after.inventoryCommitted,
    },
  };
}
