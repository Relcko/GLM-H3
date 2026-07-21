import { Prisma } from "@prisma/client";
import type { HandlerResult } from "../idempotency";
import { FinancialError } from "./errors";
import { assertInventoryInvariant } from "./inventory";
import { validateAndConsumePaymentReference } from "./payment";

export interface SettlementBody {
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

const LIFECYCLE: Record<string, string> = {
  pending: "payment_authorized",
  payment_authorized: "payment_settled",
  payment_settled: "confirmed",
  confirmed: "ledger_posted",
};

export async function settleInvestmentTx(
  tx: Prisma.TransactionClient,
  investmentId: string,
): Promise<HandlerResult<SettlementBody>> {
  const investment = await tx.investment.findUnique({ where: { id: investmentId } });
  if (!investment) {
    throw new FinancialError(404, "INVESTMENT_NOT_FOUND", `Investment ${investmentId} not found`);
  }

  const nextStatus = LIFECYCLE[investment.status];
  if (!nextStatus) {
    if (investment.status === "ledger_posted") {
      const property = await tx.property.findUniqueOrThrow({ where: { id: investment.propertyId } });
      return {
        statusCode: 200,
        body: {
          investmentId: investment.id,
          status: investment.status,
          propertyId: investment.propertyId,
          tokens: investment.tokens,
          amount: investment.amount,
          availableTokens: property.availableTokens,
          inventoryReserved: property.inventoryReserved,
          inventoryCommitted: property.inventoryCommitted,
        },
      };
    }
    throw new FinancialError(409, "INVALID_SETTLEMENT_STATE", `Cannot settle investment from status ${investment.status}`);
  }

  const now = new Date();
  const updateData: Record<string, unknown> = { status: nextStatus };

  let transactionId: string | undefined;
  let paymentReferenceId: string | undefined;

  if (nextStatus === "confirmed") {
    const moved = await tx.property.updateMany({
      where: { id: investment.propertyId, inventoryReserved: { gte: investment.tokens } },
      data: {
        inventoryReserved: { decrement: investment.tokens },
        inventoryCommitted: { increment: investment.tokens },
      },
    });
    if (moved.count !== 1) {
      throw new FinancialError(
        409,
        "CONCURRENT_MODIFICATION",
        `Property ${investment.propertyId} inventory changed concurrently — cannot confirm`,
      );
    }
    updateData.confirmedAt = now;
    updateData.settledAt = now;
  }

  if (nextStatus === "payment_settled") {
    const payment = await validateAndConsumePaymentReference(tx, {
      investmentId: investment.id,
      expectedAmount: investment.amount,
    });
    paymentReferenceId = payment.paymentReferenceId;
  }

  const cas = await tx.investment.updateMany({
    where: { id: investment.id, status: investment.status },
    data: updateData,
  });
  if (cas.count !== 1) {
    throw new FinancialError(
      409,
      "CONCURRENT_MODIFICATION",
      `Investment ${investment.id} status changed concurrently — expected ${investment.status}`,
    );
  }

  if (nextStatus === "ledger_posted") {
    const txn = await tx.transaction.create({
      data: {
        investmentId: investment.id,
        accountId: investment.accountId,
        type: "investment",
        amount: investment.amount,
        status: "completed",
        description: `Investment ${investment.id} settled — ${investment.tokens} tokens of property ${investment.propertyId}`,
      },
    }).catch((e: unknown) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new FinancialError(
          409,
          "DUPLICATE_LEDGER_ENTRY",
          `Ledger entry for investment ${investment.id} already exists`,
        );
      }
      throw e;
    });
    transactionId = txn.id;
  }

  await tx.auditEvent.create({
    data: {
      actorId: "internal",
      action: `investment.${nextStatus}`,
      resource: "investment",
      resourceId: investment.id,
      details: JSON.stringify({ propertyId: investment.propertyId, tokens: investment.tokens, amount: investment.amount }),
    },
  });

  const after = await tx.property.findUniqueOrThrow({ where: { id: investment.propertyId } });
  assertInventoryInvariant(after);

  return {
    statusCode: 200,
    body: {
      investmentId: investment.id,
      status: nextStatus,
      transactionId,
      paymentReferenceId,
      propertyId: investment.propertyId,
      tokens: investment.tokens,
      amount: investment.amount,
      availableTokens: after.availableTokens,
      inventoryReserved: after.inventoryReserved,
      inventoryCommitted: after.inventoryCommitted,
    },
  };
}