import { describe, it, expect } from "vitest";
import { createTestIdentity } from "./testkit";
import { AccountType } from "./types";
import { IdentityError } from "./errors";

describe("IdentityService — registration & profiles", () => {
  it("registers an institutional account with an organization", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerInstitutional({
      accountId: "acc_org" as never,
      legalName: "Acme Capital",
      jurisdiction: "us",
      kind: AccountType.Institutional,
    });
    expect(account.type).toBe(AccountType.Institutional);
    const resolved = await t.identity.getResolvedIdentity(account.id);
    expect(resolved.organization?.legalName).toBe("Acme Capital");
    expect(resolved.organization?.kind).toBe(AccountType.Institutional);
  });

  it("registers a corporate account", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerCorporate({
      accountId: "acc_corp" as never,
      legalName: "BlockCorp",
      jurisdiction: "eu",
      kind: AccountType.Corporate,
    });
    expect(account.type).toBe(AccountType.Corporate);
  });

  it("updates a profile and publishes ProfileUpdated", async () => {
    const t = createTestIdentity();
    const account = await t.identity.registerIndividual();
    const updated = await t.identity.updateProfile(account.id, { email: "new@example.com" });
    expect(updated.email).toBe("new@example.com");
    expect(t.bus.publishedOfType("identity.profile.updated")).toHaveLength(1);
  });
});

describe("IdentityService — guardian recovery", () => {
  it("completes recovery after guardian approval", async () => {
    const t = createTestIdentity();
    const owner = await t.identity.registerIndividual();
    const guardianAccount = await t.identity.registerIndividual();
    const guardian = await t.identity.addGuardian(owner.id, guardianAccount.id);
    await t.identity.approveGuardian(guardian.id);

    await t.identity.initiateRecovery(owner.id);
    const approvals = await t.identity.approveRecovery(owner.id, guardian.id);
    expect(approvals).toBe(1);

    const recovered = await t.identity.completeRecovery(owner.id, 1, {
      email: "recovered@example.com",
      passwordHash: "newhash",
    });
    expect(recovered.email).toBe("recovered@example.com");
    expect(recovered.passwordHash).toBe("newhash");
  });

  it("blocks recovery without enough approvals", async () => {
    const t = createTestIdentity();
    const owner = await t.identity.registerIndividual();
    const g = await t.identity.registerIndividual();
    const guardian = await t.identity.addGuardian(owner.id, g.id);
    await t.identity.approveGuardian(guardian.id);
    await t.identity.initiateRecovery(owner.id);
    // No approvals yet.
    await expect(t.identity.completeRecovery(owner.id, 1)).rejects.toBeInstanceOf(IdentityError);
  });

  it("blocks recovery when no guardians are enrolled", async () => {
    const t = createTestIdentity();
    const owner = await t.identity.registerIndividual();
    await expect(t.identity.initiateRecovery(owner.id)).rejects.toBeInstanceOf(IdentityError);
  });
});
