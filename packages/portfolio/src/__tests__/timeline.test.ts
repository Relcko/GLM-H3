import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioTimeline } from "../timeline/service";
import { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";

describe("PortfolioTimeline", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let timeline: PortfolioTimeline;
  let portfolioService: PortfolioService;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;
  let portfolioId: string;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    timeline = new PortfolioTimeline(repository, events);
    portfolioService = new PortfolioService(repository, events);
    const portfolio = portfolioService.create(actorId, investorId);
    portfolioId = portfolio.id as string;
  });

  it("adds timeline entry", () => {
    const entry = timeline.addEntry(actorId, portfolioId as never, "investment.purchased", "Purchased a property");
    expect(entry.eventType).toBe("investment.purchased");
    expect(entry.portfolioId).toBe(portfolioId as never);
  });

  it("lists by portfolio", () => {
    timeline.addEntry(actorId, portfolioId as never, "type.a", "Entry A");
    timeline.addEntry(actorId, portfolioId as never, "type.b", "Entry B");

    const entries = timeline.listByPortfolio(portfolioId as never);
    expect(entries.length).toBe(2);
  });

  it("lists by investor", () => {
    timeline.addEntry(actorId, portfolioId as never, "type.a", "Entry A");
    timeline.addEntry(actorId, portfolioId as never, "type.b", "Entry B");

    const entries = timeline.listByInvestor(investorId as never);
    expect(entries.length).toBe(2);
  });

  it("filters by date range", () => {
    timeline.addEntry(actorId, portfolioId as never, "type.a", "Entry A");
    timeline.addEntry(actorId, portfolioId as never, "type.b", "Entry B");

    const from = new Date(Date.now() - 86400000).toISOString();
    const to = new Date(Date.now() + 86400000).toISOString();
    const entries = timeline.listByDateRange(investorId as never, from, to);
    expect(entries.length).toBe(2);
  });
});
