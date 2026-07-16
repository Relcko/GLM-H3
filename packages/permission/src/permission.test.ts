import { describe, expect, it } from "vitest";
import { Role, ScopeType } from "@relcko/types";
import { Action, MfaLevel, PermissionResolver } from "@relcko/permission";
import { createDefaultFlagProvider, DEFAULT_FLAGS, InMemoryFlagProvider } from "@relcko/feature-flags";
import { PermissionError } from "@relcko/error";

const baseSubject = (role: Role, id = "user_1") => ({
  id,
  role,
  kycApproved: true,
  mfaLevel: MfaLevel.Hardware,
});

describe("permission resolver", () => {
  const resolver = new PermissionResolver(createDefaultFlagProvider());

  it("allows an investor to invest in their own property", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.Investor), resource: { ownerId: "user_1" } },
      Action.Invest,
    );
    expect(decision.granted).toBe(true);
  });

  it("denies anonymous investment", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.Anonymous), resource: { ownerId: "user_1" } },
      Action.Invest,
    );
    expect(decision.granted).toBe(false);
    expect(decision.reason).toBe("role not permitted");
  });

  it("denies investing another user's scoped resource", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.Investor), resource: { ownerId: "other" } },
      Action.Invest,
    );
    expect(decision.granted).toBe(false);
    expect(decision.reason).toBe("scope not satisfied");
  });

  it("enforces KYC gate when the compliance flag is enabled", () => {
    const flags = new InMemoryFlagProvider();
    for (const d of DEFAULT_FLAGS) flags.define(d);
    flags.set("compliance.kycRequired", true);
    const resolverWithKyc = new PermissionResolver(flags);
    const denied = resolverWithKyc.authorize(
      { subject: { ...baseSubject(Role.Investor, "u2"), kycApproved: false }, resource: { ownerId: "u2" } },
      Action.Invest,
    );
    expect(denied.granted).toBe(false);
    expect(denied.reason).toBe("kyc required");
  });

  it("requires a second approver for treasury movement (two-stage gating)", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.TreasuryManager, "tm"), env: { secondApproverPresent: false } },
      Action.InitiateTreasury,
    );
    expect(decision.granted).toBe(false);
    expect(decision.requiresSecondApprover).toBe(true);

    const withApprover = resolver.authorize(
      { subject: baseSubject(Role.TreasuryManager, "tm"), env: { secondApproverPresent: true } },
      Action.InitiateTreasury,
    );
    expect(withApprover.granted).toBe(true);
  });

  it("blocks treasury action without required MFA level", () => {
    const decision = resolver.authorize(
      { subject: { ...baseSubject(Role.TreasuryManager, "tm"), mfaLevel: MfaLevel.None }, env: { secondApproverPresent: true } },
      Action.InitiateTreasury,
    );
    expect(decision.granted).toBe(false);
    expect(decision.reason).toBe("mfa level insufficient");
  });

  it("lets an Administrator publish a property", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.Administrator, "admin"), resource: { ownerId: "admin" } },
      Action.PublishProperty,
    );
    expect(decision.granted).toBe(true);
  });

  it("denies Admin from assigning Super Admin (reserved)", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.Administrator, "admin") },
      Action.AssignAdmin,
    );
    expect(decision.granted).toBe(false);
  });

  it("throws on assertAuthorized denial", () => {
    expect(() =>
      resolver.assertAuthorized({ subject: baseSubject(Role.Anonymous) }, Action.Invest),
    ).toThrow(PermissionError);
  });

  it("exposes role inheritance (Senior Agent can manage referrals)", () => {
    const decision = resolver.authorize(
      { subject: baseSubject(Role.SeniorAgent, "sa"), resource: { ownerId: "sa" } },
      Action.ManageReferrals,
    );
    expect(decision.granted).toBe(true);
  });
});
