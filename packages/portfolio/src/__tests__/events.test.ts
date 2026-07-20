import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { PortfolioEventsAdapter } from "../events-adapter/adapter";
import { PortfolioService } from "../portfolio/service";
import { InMemoryPortfolioRepository } from "../in-memory-repository";

describe("PortfolioEventsAdapter", () => {
  let events: EventBus;
  let adapter: PortfolioEventsAdapter;

  beforeEach(() => {
    events = new InMemoryEventBus();
    const repo = new InMemoryPortfolioRepository();
    const service = new PortfolioService(repo, events);
    adapter = new PortfolioEventsAdapter(events, service);
  });

  it("subscribes to external events", () => {
    const unsubs = adapter.subscribeToExternalEvents();
    expect(Array.isArray(unsubs)).toBe(true);
    expect(unsubs.length).toBe(5);
    for (const unsub of unsubs) {
      expect(typeof unsub).toBe("function");
    }
  });
});
