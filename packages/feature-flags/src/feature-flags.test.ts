import { describe, expect, it } from "vitest";
import { Role } from "@relcko/types";
import { createDefaultFlagProvider, InMemoryFlagProvider, UnknownFlagError } from "@relcko/feature-flags";

describe("feature flags", () => {
  it("returns defaults and overrides", () => {
    const p = createDefaultFlagProvider();
    expect(p.isEnabled("observability.enabled")).toBe(true);
    p.set("observability.enabled", false);
    expect(p.isEnabled("observability.enabled")).toBe(false);
  });

  it("supports role/region targeting", () => {
    const p = new InMemoryFlagProvider();
    p.define({ key: "beta", description: "b", defaultValue: true, targeting: { roles: [Role.SuperAdministrator] } });
    expect(p.isEnabled("beta", { role: Role.Investor })).toBe(false);
    expect(p.isEnabled("beta", { role: Role.SuperAdministrator })).toBe(true);
  });

  it("throws on unknown flags", () => {
    const p = new InMemoryFlagProvider();
    expect(() => p.isEnabled("nope")).toThrow(UnknownFlagError);
  });
});
