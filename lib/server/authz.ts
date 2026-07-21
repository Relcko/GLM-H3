import { AuthorizationError } from "./auth";
import type { AuthenticatedAccount } from "./auth";

const TREASURY_ROLES = new Set(["treasury_manager", "administrator", "super_administrator"]);

export function assertCanInvest(actor: AuthenticatedAccount, targetAccountId: string): void {
  if (actor.id !== targetAccountId) {
    throw new AuthorizationError("You may only invest for yourself");
  }
}

export function assertCanCancel(actor: AuthenticatedAccount, investmentOwnerId: string): void {
  if (actor.id !== investmentOwnerId) {
    throw new AuthorizationError("You may only cancel your own investments");
  }
}

export function assertCanDistribute(actor: AuthenticatedAccount): void {
  if (!TREASURY_ROLES.has(actor.role)) {
    throw new AuthorizationError("Only treasury administrators may distribute");
  }
}
