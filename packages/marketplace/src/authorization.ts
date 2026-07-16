import type { Account } from "@relcko/identity";
import { subjectFromAccount } from "@relcko/identity";
import {
  Action,
  type AuthorizationContext,
  type EnvironmentContext,
  PermissionResolver,
  type ResourceContext,
  type SubjectContext,
} from "@relcko/permission";
import { Role, type EntityId } from "@relcko/types";

/**
 * Authorization for the marketplace. Wraps the shared Permission Engine
 * (`@relcko/permission`) and reuses the identity subject mapping
 * (`subjectFromAccount`). The acting principal is an identity `Account` or an
 * already-mapped `SubjectContext` (e.g. an anonymous browser).
 */
export type Principal = Account | SubjectContext;

/** Normalize any principal into the shared `SubjectContext`. */
export function toSubject(principal: Principal): SubjectContext {
  if ("type" in principal) return subjectFromAccount(principal as Account);
  return principal as SubjectContext;
}

/** Check if a principal is an identity Account with a status field. */
export function isAccount(principal: Principal): principal is Account {
  return "type" in principal && "status" in (principal as Account);
}

/** Extract a stable id (as a branded EntityId) for event attribution. */
export function subjectId(principal: Principal): EntityId {
  return toSubject(principal).id as EntityId;
}

/** Anonymous browser principal (Browse is allowed for all roles). */
export function anonymousSubject(id = "anonymous"): SubjectContext {
  return { id, role: Role.Anonymous };
}

export class MarketplaceAuthorization {
  private readonly resolver: PermissionResolver;

  constructor(resolver?: PermissionResolver) {
    this.resolver = resolver ?? new PermissionResolver();
  }

  assert(
    principal: Principal,
    action: Action,
    resource?: ResourceContext,
    env?: EnvironmentContext,
  ): void {
    const ctx: AuthorizationContext = { subject: toSubject(principal), resource, env };
    this.resolver.assertAuthorized(ctx, action);
  }

  can(
    principal: Principal,
    action: Action,
    resource?: ResourceContext,
    env?: EnvironmentContext,
  ): boolean {
    return this.resolver.can({ subject: toSubject(principal), resource, env }, action);
  }
}
