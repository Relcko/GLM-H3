import { describe, expect, it } from "vitest";
import { Role } from "@relcko/types";
import { Action } from "@relcko/permission";
import {
  aProperty,
  createMockEventBus,
  createMockPermissionResolver,
  fixtureInvestor,
  fixtureProperty,
  mockEnvelope,
} from "@relcko/testing";

describe("testing kit", () => {
  it("builders produce valid domain entities", () => {
    const p = aProperty().with({ totalTokens: 500n }).build();
    expect(p.totalTokens).toBe(500n);
    expect(fixtureProperty().status).toBeDefined();
    expect(fixtureInvestor({ kycApproved: true }).kycStatus).toBe("approved");
  });

  it("mock event bus records history", async () => {
    const bus = createMockEventBus();
    await bus.publish(mockEnvelope("Ping", "agg_1"));
    expect(bus.history).toHaveLength(1);
    expect(bus.publishedOfType("Ping")).toHaveLength(1);
  });

  it("mock permissions allow/deny by configuration", () => {
    const allowAll = createMockPermissionResolver();
    expect(allowAll.can({ subject: { id: "x", role: Role.Anonymous } }, Action.Invest)).toBe(true);

    const denyAll = createMockPermissionResolver({ denyAll: true });
    expect(denyAll.can({ subject: { id: "x", role: Role.SuperAdministrator } }, Action.EmergencyPause)).toBe(false);

    const onlyBrowse = createMockPermissionResolver({ allowed: [Action.Browse] });
    expect(onlyBrowse.can({ subject: { id: "x", role: Role.Investor } }, Action.Browse)).toBe(true);
    expect(onlyBrowse.can({ subject: { id: "x", role: Role.Investor } }, Action.Invest)).toBe(false);
  });
});
