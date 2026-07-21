import { Prisma } from "@prisma/client";
import type { HandlerResult } from "../idempotency";
import { FinancialError } from "./errors";
import { assertInventoryInvariant } from "./inventory";

export interface CancelInvestmentInput {
  readonly investmentId: string;
  readonly actorId: string;
}

export interface InvestmentCancelledBody {
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

const EARLY_CANCEL_STATUSES = new Set(["pending", "payment_authorized", "payment_settled"]);
const FULL_CANCEL_STATUSES = new Set(["ledger_posted"]);

export async function cancelInvestmentTx(
  tx: Prisma.TransactionClient,
  input: CancelInvestmentInput,
): Promise<HandlerResult<InvestmentCancelledBody>> {
  const investment = await tx.investment.findUnique({ where: { id: input.investmentId } });
  if (!investment) {
    throw new FinancialError(404, "INVESTMENT_NOT_FOUND", `Investment ${input.investmentId} not found`);
  }

  if (investment.status === "cancelled") {
    const property = await tx.property.findUniqueOrThrow({ where: { id: investment.propertyId } });
    return {
      statusCode: 200,
      body: {
        investmentId: investment.id,
        status: investment.status,
        propertyId: investment.propertyId,
        tokens: investment.tokens,
        availableTokens: property.availableTokens,
        inventoryReserved: property.inventoryReserved,
        inventoryCommitted: property.inventoryCommitted,
        alreadyCancelled: true,
      },
    };
  }

  // State matrix: early cancel (no inventory restore, no ledger reversal)
  // vs. full cancel (restore inventory + reverse ledger)
  if (EARLY_CANCEL_STATUSES.has(investment.status)) {
    const released = await tx.property.updateMany({
      where: { id: investment.propertyId, inventoryReserved: { gte: investment.tokens } },
      data: {
        availableTokens: { increment: investment.tokens },
        inventoryReserved: { decrement: investment.tokens },
      },
    });
    if (released.count !== 1) {
      throw new FinancialError(
        409,
        "INVENTORY_RESTORATION_FAILED",
        `Inventory release affected ${released.count} rows for investment ${investment.id} — cancelling nothing`,
      );
    }

    const cancelled = await tx.investment.updateMany({
      where: { id: investment.id, status: investment.status },
      data: { status: "cancelled" },
    });
    if (cancelled.count !== 1) {
      throw new FinancialError(
        409,
        "CONCURRENT_CANCELLATION",
        `Investment ${investment.id} was cancelled concurrently`,
      );
    }

    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "investment.cancelled",
        resource: "investment",
        resourceId: investment.id,
        details: JSON.stringify({ propertyId: investment.propertyId, tokens: investment.tokens, amount: investment.amount, cancelType: "early" }),
      },
    });

    const after = await tx.property.findUniqueOrThrow({ where: { id: investment.propertyId } });
    assertInventoryInvariant(after);

    return {
      statusCode: 200,
      body: {
        investmentId: investment.id,
        status: "cancelled",
        propertyId: investment.propertyId,
        tokens: investment.tokens,
        availableTokens: after.availableTokens,
        inventoryReserved: after.inventoryReserved,
        inventoryCommitted: after.inventoryCommitted,
        alreadyCancelled: false,
      },
    };
  }

  if (FULL_CANCEL_STATUSES.has(investment.status)) {
    const restored = await tx.property.updateMany({
      where: { id: investment.propertyId, inventoryCommitted: { gte: investment.tokens } },
      data: {
        availableTokens: { increment: investment.tokens },
        inventoryCommitted: { decrement: investment.tokens },
      },
    });
    if (restored.count !== 1) {
      throw new FinancialError(
        409,
        "INVENTORY_RESTORATION_FAILED",
        `Inventory restoration affected ${restored.count} rows for investment ${investment.id} — cancelling nothing`,
      );
    }

    const cancelled = await tx.investment.updateMany({
      where: { id: investment.id, status: investment.status },
      data: { status: "cancelled" },
    });
    if (cancelled.count !== 1) {
      throw new FinancialError(
        409,
        "CONCURRENT_CANCELLATION",
        `Investment ${investment.id} was cancelled concurrently`,
      );
    }

    const reversal = await tx.transaction.create({
      data: {
        investmentId: investment.id,
        accountId: investment.accountId,
        type: "cancellation",
        amount: -investment.amount,
        status: "completed",
        description: `Cancellation reversal for investment ${investment.id} — ${investment.tokens} tokens restored`,
      },
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.actorId,
        action: "investment.cancelled",
        resource: "investment",
        resourceId: investment.id,
        details: JSON.stringify({ propertyId: investment.propertyId, tokens: investment.tokens, amount: investment.amount, cancelType: "full" }),
      },
    });

    const after = await tx.property.findUniqueOrThrow({ where: { id: investment.propertyId } });
    assertInventoryInvariant(after);

    return {
      statusCode: 200,
      body: {
        investmentId: investment.id,
        status: "cancelled",
        propertyId: investment.propertyId,
        tokens: investment.tokens,
        availableTokens: after.availableTokens,
        inventoryReserved: after.inventoryReserved,
        inventoryCommitted: after.inventoryCommitted,
        alreadyCancelled: false,
        reversalTransactionId: reversal.id,
      },
    };
  }

  throw new FinancialError(
    409,
    "INVALID_CANCELLATION_STATE",
    `Cannot cancel investment ${investment.id} from status ${investment.status}`,
  );
}
