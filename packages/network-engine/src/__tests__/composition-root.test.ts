import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { createNetworkEngine, NetworkEngine } from "../composition-root";
import { InMemoryNetworkRepository } from "../in-memory-repository";

describe("NetworkEngine (composition root)", () => {
  let engine: NetworkEngine;
  let events: EventBus;

  beforeEach(() => {
    events = new InMemoryEventBus();
    engine = createNetworkEngine({ events });
  });

  it("exposes all 19 services", () => {
    expect(engine.networkService).toBeDefined();
    expect(engine.sponsorService).toBeDefined();
    expect(engine.customerOwnershipService).toBeDefined();
    expect(engine.agentRegistry).toBeDefined();
    expect(engine.networkTreeEngine).toBeDefined();
    expect(engine.treeTraversalEngine).toBeDefined();
    expect(engine.activeStatusEngine).toBeDefined();
    expect(engine.qualificationEngine).toBeDefined();
    expect(engine.rankEngine).toBeDefined();
    expect(engine.performanceEngine).toBeDefined();
    expect(engine.overrideRoutingEngine).toBeDefined();
    expect(engine.commissionCalculator).toBeDefined();
    expect(engine.commissionLedgerAdapter).toBeDefined();
    expect(engine.commissionRecoveryEngine).toBeDefined();
    expect(engine.leaderboardEngine).toBeDefined();
    expect(engine.rewardQualificationEngine).toBeDefined();
    expect(engine.campaignEngine).toBeDefined();
    expect(engine.networkAnalytics).toBeDefined();
    expect(engine.networkPortfolioAdapter).toBeDefined();
  });

  it("accepts a custom repository", () => {
    const customRepo = new InMemoryNetworkRepository();
    const custom = createNetworkEngine({ events, repository: customRepo });
    expect(custom).toBeDefined();
  });

  it("completes a full end-to-end flow", async () => {
    const actorId = "actor-1" as never;
    const investorId = "investor-1" as never;

    const agent = await engine.networkService.register(actorId, {
      userId: "user-1" as never,
      code: "E2EAGENT",
      currency: Currency.USDT,
      commissionRate: 10,
    });

    await engine.networkService.activate(actorId, agent.id);

    await engine.customerOwnershipService.assign(actorId, investorId, agent.id);

    const commission = engine.commissionCalculator.calculatePersonal(actorId, {
      agentId: agent.id,
      amount: { amount: 10000n, currency: Currency.USDT },
      sourceId: "inv-1" as never,
      sourceType: "investment",
      period: "2026-07",
    });

    expect(commission.amount.amount).toBe(1000n);
    expect(engine.customerOwnershipService.getOwnership(investorId)?.agentId).toBe(agent.id);
  });
});
