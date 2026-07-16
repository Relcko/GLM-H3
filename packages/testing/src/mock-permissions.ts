import { PermissionError } from "@relcko/error";
import type { AuthorizationContext } from "@relcko/permission";
import { Action, type AuthorizationDecision, POLICIES } from "@relcko/permission";

export interface MockPermissionOptions {
  /** Actions that are always allowed. Defaults to allowing everything. */
  readonly allowed?: readonly Action[];
  /** When true, deny everything. */
  readonly denyAll?: boolean;
}

/**
 * Test double for the permission engine. By default allows all actions; can be
 * configured to allow a fixed set, or deny all. Mirrors the PermissionResolver
 * surface (authorize / can / assertAuthorized) so it can be swapped in tests.
 */
export class MockPermissionResolver {
  private readonly allowed: ReadonlySet<Action> | null;
  private readonly denyAll: boolean;

  constructor(options: MockPermissionOptions = {}) {
    this.allowed = options.allowed ? new Set(options.allowed) : null;
    this.denyAll = options.denyAll ?? false;
  }

  authorize(_ctx: AuthorizationContext, action: Action): AuthorizationDecision {
    const granted = this.denyAll ? false : this.allowed ? this.allowed.has(action) : true;
    return {
      granted,
      reason: granted ? undefined : "mock denied",
      requiresSecondApprover: false,
      policy: POLICIES[action],
    };
  }

  can(ctx: AuthorizationContext, action: Action): boolean {
    return this.authorize(ctx, action).granted;
  }

  assertAuthorized(ctx: AuthorizationContext, action: Action): void {
    if (!this.authorize(ctx, action).granted) {
      throw new PermissionError(`Mock denied: ${action}`, "MOCK_DENIED");
    }
  }
}

export function createMockPermissionResolver(options?: MockPermissionOptions): MockPermissionResolver {
  return new MockPermissionResolver(options);
}
