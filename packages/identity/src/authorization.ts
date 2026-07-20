import type { EntityId } from "@relcko/types";
import { MfaLevel } from "@relcko/permission";
import {
  Action,
  AuthorizationContext,
  createPermissionResolver,
  effectiveRoles,
  evaluateScope,
  PermissionResolver,
  SubjectContext,
  type ResourceContext,
  type EnvironmentContext,
} from "@relcko/permission";
import type { FlagProvider } from "@relcko/feature-flags";
import { createDefaultFlagProvider } from "@relcko/feature-flags";
import type { Account } from "./types";
import { VerificationStatus } from "./types";
import { AccountLockedError, MfaError } from "./errors";
import { PermissionError } from "@relcko/error";

export { Action, effectiveRoles, evaluateScope };
export type { AuthorizationContext, SubjectContext, ResourceContext, EnvironmentContext };

const MFA_RANK: Record<MfaLevel, number> = {
  [MfaLevel.None]: 0,
  [MfaLevel.Totp]: 1,
  [MfaLevel.Hardware]: 2,
};

/** Map an account into the shared permission `SubjectContext`. */
export function subjectFromAccount(account: Account): SubjectContext {
  return {
    id: account.id,
    role: account.role,
    kycApproved: account.kycStatus === "approved",
    mfaLevel: account.mfaLevel,
    walletVerified: account.walletIds.length > 0,
    identityVerified: account.verification === VerificationStatus.Verified,
  };
}

/**
 * Identity authorization: wraps the shared Permission Engine and adds the
 * identity-specific subject mapping, MFA enforcement and ownership evaluation.
 * Feature flags (e.g. compliance.kycRequired) flow through the resolver.
 */
export class IdentityAuthorization {
  private readonly resolver: PermissionResolver;
  private readonly flags: FlagProvider;

  constructor(resolver?: PermissionResolver, flags?: FlagProvider) {
    this.resolver = resolver ?? createPermissionResolver(flags ?? createDefaultFlagProvider());
    this.flags = flags ?? createDefaultFlagProvider();
  }

  authorize(account: Account, action: Action, resource?: ResourceContext, env?: EnvironmentContext) {
    const ctx: AuthorizationContext = { subject: subjectFromAccount(account), resource, env };
    return this.resolver.authorize(ctx, action);
  }

  can(account: Account, action: Action, resource?: ResourceContext, env?: EnvironmentContext): boolean {
    return this.authorize(account, action, resource, env).granted;
  }

  assert(account: Account, action: Action, resource?: ResourceContext, env?: EnvironmentContext): void {
    const decision = this.authorize(account, action, resource, env);
    if (!decision.granted) {
      if (account.status === "suspended" || account.status === "closed") {
        throw new AccountLockedError(`Account ${account.status}`, "ACCOUNT_LOCKED", { accountId: account.id });
      }
      if (decision.reason?.toLowerCase().includes("mfa") || decision.reason?.toLowerCase().includes("multi-factor")) {
        throw new MfaError(`Not authorized to ${action}: ${decision.reason}`, "AUTHZ_DENIED", {
          action,
          reason: decision.reason,
        });
      }
      throw new PermissionError(`Not authorized to ${action}: ${decision.reason}`, "AUTHZ_DENIED", {
        action,
        reason: decision.reason,
        accountId: account.id,
      });
    }
  }

  /** Enforce a minimum MFA level for a sensitive identity action. */
  enforceMfa(account: Account, required: MfaLevel): void {
    const have = account.mfaLevel ? MFA_RANK[account.mfaLevel] : 0;
    if (have < MFA_RANK[required]) {
      throw new MfaError(`MFA level ${required} required`, "MFA_INSUFFICIENT", {
        required,
        have: account.mfaLevel,
      });
    }
  }

  /** Ownership evaluation for scope=Own checks. */
  evaluateOwnership(account: Account, resourceOwnerId: EntityId): boolean {
    return account.id === resourceOwnerId;
  }

  isKycRequired(): boolean {
    return this.flags.isEnabled("compliance.kycRequired");
  }
}

// ---- MFA (TOTP-style, pluggable verifier) ---------------------------------

export interface MfaVerifier {
  verify(accountId: EntityId, code: string): boolean | Promise<boolean>;
}

/** Generate a 6-digit, time-step-bound code from a shared secret (demo TOTP). */
export function generateMfaCode(secret: string, at: Date = new Date()): string {
  const step = Math.floor(at.getTime() / 1000 / 30);
  let h = 0;
  const data = `${secret}:${step}`;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) >>> 0;
  }
  return String(h % 1_000_000).padStart(6, "0");
}

export class TimeBasedMfaVerifier implements MfaVerifier {
  constructor(private readonly secretResolver: (accountId: EntityId) => string | undefined) {}
  verify(accountId: EntityId, code: string): boolean {
    const secret = this.secretResolver(accountId);
    if (!secret) return false;
    const now = Date.now();
    return [-1, 0, 1].some((offset) => generateMfaCode(secret, new Date(now + offset * 30_000)) === code);
  }
}

/** Future hook: hardware-key MFA delegates to an external attestation service. */
export class HardwareMfaVerifier implements MfaVerifier {
  verify(_accountId: EntityId, _code: string): boolean {
    throw new MfaError("Hardware MFA verifier not configured", "MFA_HW_UNCONFIGURED");
  }
}

export class MfaService {
  constructor(private readonly verifier: MfaVerifier) {}
  async verify(accountId: EntityId, code: string): Promise<boolean> {
    return this.verifier.verify(accountId, code);
  }
}
