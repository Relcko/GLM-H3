import type { Prisma, PrismaClient } from "@prisma/client";
import { FinancialError } from "./errors";

export interface InventoryState {
  readonly totalTokens: number;
  readonly availableTokens: number;
  readonly inventoryReserved: number;
  readonly inventoryCommitted: number;
}

export interface InventoryPatch {
  readonly totalTokens?: number;
  readonly availableTokens?: number;
  readonly inventoryReserved?: number;
  readonly inventoryCommitted?: number;
}

export function assertInventoryInvariant(state: InventoryState): void {
  for (const key of ["totalTokens", "availableTokens", "inventoryReserved", "inventoryCommitted"] as const) {
    if (!Number.isInteger(state[key])) {
      throw new FinancialError(422, "INVENTORY_INVARIANT_VIOLATION", `Token count ${key} must be an integer`, state);
    }
  }
  if (state.totalTokens <= 0 || state.availableTokens < 0 || state.inventoryReserved < 0 || state.inventoryCommitted < 0) {
    throw new FinancialError(422, "INVENTORY_INVARIANT_VIOLATION", "Token counts out of range", state);
  }
  if (state.availableTokens + state.inventoryReserved + state.inventoryCommitted !== state.totalTokens) {
    throw new FinancialError(
      422,
      "INVENTORY_INVARIANT_VIOLATION",
      "availableTokens + inventoryReserved + inventoryCommitted must equal totalTokens",
      state,
    );
  }
}

export async function updatePropertyInventory(
  db: PrismaClient,
  propertyId: string,
  patch: InventoryPatch,
): Promise<InventoryState> {
  const current = await db.property.findUnique({ where: { id: propertyId } });
  if (!current) {
    throw new FinancialError(404, "PROPERTY_NOT_FOUND", `Property ${propertyId} not found`);
  }

  const next: InventoryState = {
    totalTokens: patch.totalTokens ?? current.totalTokens,
    availableTokens: patch.availableTokens ?? current.availableTokens,
    inventoryReserved: patch.inventoryReserved ?? current.inventoryReserved,
    inventoryCommitted: patch.inventoryCommitted ?? current.inventoryCommitted,
  };
  assertInventoryInvariant(next);

  const updated = await db.$executeRaw`
    UPDATE "Property"
    SET "totalTokens" = ${next.totalTokens},
        "availableTokens" = ${next.availableTokens},
        "inventoryReserved" = ${next.inventoryReserved},
        "inventoryCommitted" = ${next.inventoryCommitted},
        "updatedAt" = ${new Date()}
    WHERE "id" = ${propertyId}
      AND "totalTokens" = ${current.totalTokens}
      AND "availableTokens" = ${current.availableTokens}
      AND "inventoryReserved" = ${current.inventoryReserved}
      AND "inventoryCommitted" = ${current.inventoryCommitted}`;
  if (updated !== 1) {
    throw new FinancialError(
      409,
      "CONCURRENT_INVENTORY_UPDATE",
      "Property inventory changed concurrently — reload and retry",
    );
  }
  return next;
}

export async function findInventoryViolations(db: PrismaClient): Promise<string[]> {
  const properties = await db.property.findMany({
    select: { id: true, totalTokens: true, availableTokens: true, inventoryReserved: true, inventoryCommitted: true },
  });
  return properties
    .filter((p) => p.availableTokens + p.inventoryReserved + p.inventoryCommitted !== p.totalTokens)
    .map((p) => p.id);
}

export type InventoryTx = Prisma.TransactionClient;
