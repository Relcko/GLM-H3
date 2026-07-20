import { describe, it, expect } from "vitest";
import { Role } from "@relcko/types";
import { MfaLevel } from "@relcko/permission";
import type { KycStatus } from "@relcko/domain-core";
import { createDefaultFlagProvider } from "@relcko/feature-flags";
import { createAccount } from "./account";
import { AccountType } from "./types";
import { IdentityAuthorization, subjectFromAccount, Action } from "./authorization";
import { AccountLockedError, MfaError } from "./errors";
import { PermissionError } from "@relcko/error";

function account(over: Partial<Parameters<typeof createAccount>[0]> = {}) {
  return createAccount({ type: AccountType.Individual, ...over });
}

describe("subjectFromAccount", () => {
  it("maps role, kyc, mfa and wallet signals", () => {
    const acc = account({
      role: Role.SuperAdministrator,
      kycStatus: "approved" as KycStatus,
      mfaLevel: MfaLevel.Hardware,
    });
    const subject = subjectFromAccount({ ...acc, walletIds: ["w1" as never] });
    expect(subject.role).toBe(Role.SuperAdministrator);
    expect(subject.kycApproved).toBe(true);
    expect(subject.mfaLevel).toBe(MfaLevel.Hardware);
    expect(subject.walletVerified).toBe(true);
  });
});

describe("Permission resolution", () => {
  it("grants ManageUsers to a super admin and denies it to an investor", () => {
    const authz = new IdentityAuthorization();
    const admin = account({ role: Role.SuperAdministrator });
    const investor = account({ role: Role.Investor });
    expect(authz.can(admin, Action.ManageUsers)).toBe(true);
    expect(authz.can(investor, Action.ManageUsers)).toBe(false);
  });

  it("respects the compliance.kycRequired flag for investing", () => {
    const flags = createDefaultFlagProvider();
    flags.set("compliance.kycRequired", true);
    const authz = new IdentityAuthorization(undefined, flags);
    const kycInvestor = account({ role: Role.Investor, kycStatus: "approved" as KycStatus });
    const noKycInvestor = account({ role: Role.Investor, kycStatus: "submitted" as KycStatus });
    expect(authz.can(kycInvestor, Action.Invest, { ownerId: kycInvestor.id })).toBe(true);
    expect(authz.can(noKycInvestor, Action.Invest, { ownerId: noKycInvestor.id })).toBe(false);
  });

  it("assert throws MfaError when denied and AccountLockedError when suspended", () => {
    const authz = new IdentityAuthorization();
    const investor = account({ role: Role.Investor });
    expect(() => authz.assert(investor, Action.ManageUsers)).toThrow(PermissionError);
    const suspended = account({ role: Role.Investor, status: "suspended" as never });
    expect(() => authz.assert(suspended, Action.ManageUsers)).toThrow(AccountLockedError);
  });
});

describe("MFA enforcement", () => {
  it("enforces a minimum MFA level", () => {
    const authz = new IdentityAuthorization();
    const none = account({ mfaLevel: MfaLevel.None });
    const hardware = account({ mfaLevel: MfaLevel.Hardware });
    expect(() => authz.enforceMfa(none, MfaLevel.Hardware)).toThrow(MfaError);
    expect(() => authz.enforceMfa(hardware, MfaLevel.Hardware)).not.toThrow();
  });
});

describe("Ownership evaluation", () => {
  it("matches owner id", () => {
    const authz = new IdentityAuthorization();
    const acc = account();
    expect(authz.evaluateOwnership(acc, acc.id)).toBe(true);
    expect(authz.evaluateOwnership(acc, "other" as never)).toBe(false);
  });
});
