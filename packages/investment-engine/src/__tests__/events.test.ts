import { describe, it, expect } from "vitest";
import { createMockEventBus, mockEnvelope } from "@relcko/testing";
import { InvestmentEventType, publishInvestmentEvent } from "../events";

describe("Investment Events", () => {
  it("has all canonical event types defined", () => {
    const events = Object.values(InvestmentEventType);
    expect(events.length).toBeGreaterThan(20);
    expect(events).toContain("investment.requested");
    expect(events).toContain("investment.eligibility_passed");
    expect(events).toContain("investment.reserved");
    expect(events).toContain("investment.transaction_submitted");
    expect(events).toContain("investment.transaction_confirmed");
    expect(events).toContain("investment.settlement_completed");
    expect(events).toContain("investment.ownership_allocated");
    expect(events).toContain("investment.ledger_recorded");
    expect(events).toContain("investment.completed");
    expect(events).toContain("investment.portfolio_updated");
  });

  it("publishes investment events through the bus", async () => {
    const bus = createMockEventBus();
    await publishInvestmentEvent(bus, InvestmentEventType.InvestmentRequested, "agg_1" as any, "actor_1" as any, {
      propertyId: "prop_1",
      amount: "1000",
    });

    const published = bus.publishedOfType("investment.requested");
    expect(published.length).toBe(1);
    expect(published[0].payload).toEqual({ propertyId: "prop_1", amount: "1000" });
  });

  it("sets source to relcko.investment-engine", async () => {
    const bus = createMockEventBus();
    await publishInvestmentEvent(bus, InvestmentEventType.InvestmentReserved, "agg_1" as any, "actor_1" as any, {});

    const published = bus.publishedOfType("investment.reserved");
    expect(published[0].source).toBe("relcko.investment-engine");
  });
});
