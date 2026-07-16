import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus, createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { PortfolioEventsAdapter } from "../events-adapter/adapter";

describe("PortfolioEventsAdapter", () => {
  let events: EventBus;
  let adapter: PortfolioEventsAdapter;

  beforeEach(() => {
    events = new InMemoryEventBus();
    adapter = new PortfolioEventsAdapter(events);
  });

  it("subscribes to external events", () => {
    const unsubs = adapter.subscribeToExternalEvents();
    expect(Array.isArray(unsubs)).toBe(true);
    expect(unsubs.length).toBe(5);
    for (const unsub of unsubs) {
      expect(typeof unsub).toBe("function");
    }
  });

  it("handles investment events", async () => {
    adapter.subscribeToExternalEvents();

    const envelope = createEnvelope({
      type: "investment.created",
      aggregateId: "investor-1" as never,
      actorId: "actor-1" as never,
      payload: { amount: "10000", currency: "USDC", investmentId: "inv-1" },
      source: "test",
    });
    const result = await events.publish(envelope);
    expect(result.delivered).toBe(true);
  });
});
