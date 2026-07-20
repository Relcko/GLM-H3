import { PermissionError } from "@relcko/error";
import type { FlagProvider } from "@relcko/feature-flags";
import { createDefaultFlagProvider } from "@relcko/feature-flags";
import type { AuthorizationContext } from "./context";
import { hasAnyRole } from "./roles";
import { Action, type MfaLevel, MfaLevel as Mfa, POLICIES } from "./policies";
import { evaluateScope } from "./scope";

export interface AuthorizationDecision {
  readonly granted: boolean;
  readonly reason?: string;
  readonly requiresSecondApprover: boolean;
  readonly policy: (typeof POLICIES)[Action];
}

const MFA_RANK: Record<MfaLevel, number> = {
  [Mfa.None]: 0,
  [Mfa.Totp]: 1,
  [Mfa.Hardware]: 2,
};

const KYC_FLAG = "compliance.kycRequired";

export class PermissionResolver {
  constructor(private readonly flags: FlagProvider = createDefaultFlagProvider()) {}

  /** Full decision with reason; never throws. */
  authorize(ctx: AuthorizationContext, action: Action): AuthorizationDecision {
    const policy = POLICIES[action];
    if (!policy) {
      return { granted: false, reason: `unknown action: ${action}`, requiresSecondApprover: false, policy: undefined as never };
    }
    const { subject, resource, env = {} } = ctx;

    if (!hasAnyRole(subject.role, policy.requiredRoles)) {
      return { granted: false, reason: "role not permitted", requiresSecondApprover: false, policy };
    }

    if (!evaluateScope(policy.scope, subject, resource, env)) {
      return { granted: false, reason: "scope not satisfied", requiresSecondApprover: false, policy };
    }

    if (policy.requiresKyc && this.flags.isEnabled(KYC_FLAG) && !subject.kycApproved) {
      return { granted: false, reason: "kyc required", requiresSecondApprover: false, policy };
    }

    if (policy.requiresMfa) {
      const have = subject.mfaLevel ? MFA_RANK[subject.mfaLevel] : 0;
      if (have < MFA_RANK[policy.requiresMfa]) {
        return { granted: false, reason: "mfa level insufficient", requiresSecondApprover: false, policy };
      }
    }

    if (policy.maxRiskScore !== undefined && subject.riskScore !== undefined && subject.riskScore > policy.maxRiskScore) {
      return { granted: false, reason: "risk score too high", requiresSecondApprover: false, policy };
    }

    if (policy.requiresSecondApprover && !env.secondApproverPresent) {
      return { granted: false, reason: "second approver required", requiresSecondApprover: true, policy };
    }

    return { granted: true, requiresSecondApprover: false, policy };
  }

  can(ctx: AuthorizationContext, action: Action): boolean {
    return this.authorize(ctx, action).granted;
  }

  assertAuthorized(ctx: AuthorizationContext, action: Action): void {
    const decision = this.authorize(ctx, action);
    if (!decision.granted) {
      throw new PermissionError(
        `Not authorized to ${action}: ${decision.reason}`,
        "PERMISSION_DENIED",
        { action, reason: decision.reason, requiresSecondApprover: decision.requiresSecondApprover },
      );
    }
  }
}

export function createPermissionResolver(flags?: FlagProvider): PermissionResolver {
  return new PermissionResolver(flags);
}
