import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNetworkRepository } from "../in-memory-repository";
import { NetworkService } from "../network/service";
import { SponsorService } from "../sponsor/service";
import { QualificationEngine } from "../qualification/service";
import { RankEngine } from "../rank/service";
import { PerformanceEngine } from "../performance/service";
import { TreeTraversalEngine } from "../tree-traversal/service";
import { ActiveStatusEngine } from "../active-status/service";
import { Rank } from "../types";

describe("QualificationEngine", () => {
  let repository: InMemoryNetworkRepository;
  let qualification: QualificationEngine;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    qualification = new QualificationEngine(repository, traversal);

    await networkService.register(actorId, { userId: "u1" as never, code: "AGENT01", currency: Currency.USDT });
  });

  it("qualifies associate rank by default", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const result = qualification.checkRankQualification(agent.id, Rank.Associate);
    expect(result.qualified).toBe(true);
  });

  it("does not qualify senior associate without sales", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const result = qualification.checkRankQualification(agent.id, Rank.SeniorAssociate);
    expect(result.qualified).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe("RankEngine", () => {
  let repository: InMemoryNetworkRepository;
  let qualification: QualificationEngine;
  let rankEngine: RankEngine;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  let performance: PerformanceEngine;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    qualification = new QualificationEngine(repository, traversal);
    rankEngine = new RankEngine(repository, qualification, events);
    performance = new PerformanceEngine(repository, traversal, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "RANK01", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "u2" as never, code: "RANK02", currency: Currency.USDT });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
    await networkService.activate(actorId, repository.getAgentByUserId("u2" as never)!.id);

    // Link u2 under u1 to satisfy minRecruited=1
    const top = repository.getAgentByUserId("u1" as never)!;
    const sub = repository.getAgentByUserId("u2" as never)!;
    const sponsorService = new SponsorService(repository, events);
    await sponsorService.link(actorId, sub.id, top.id);
  });

  it("promotes agent with sufficient sales", async () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    await performance.recordPersonalSale(actorId, {
      agentId: agent.id, amount: 10000n, currency: Currency.USDT, period: "2026-07",
    });

    const promotions = await rankEngine.evaluatePromotion(actorId, agent.id);
    expect(promotions.length).toBeGreaterThanOrEqual(1);
    expect(repository.getAgent(agent.id)!.rank).not.toBe(Rank.Associate);
  });
});

describe("PerformanceEngine", () => {
  let repository: InMemoryNetworkRepository;
  let traversal: TreeTraversalEngine;
  let performance: PerformanceEngine;
  let networkService: NetworkService;
  let sponsorService: SponsorService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    sponsorService = new SponsorService(repository, events);
    traversal = new TreeTraversalEngine(repository);
    performance = new PerformanceEngine(repository, traversal, events);

    await networkService.register(actorId, { userId: "top" as never, code: "PERF_TOP", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "sub" as never, code: "PERF_SUB", currency: Currency.USDT });
    await networkService.activate(actorId, repository.getAgentByUserId("top" as never)!.id);
    await networkService.activate(actorId, repository.getAgentByUserId("sub" as never)!.id);
  });

  it("records personal sale and updates agent metrics", async () => {
    const agent = repository.getAgentByUserId("top" as never)!;
    await performance.recordPersonalSale(actorId, {
      agentId: agent.id, amount: 5000n, currency: Currency.USDT, period: "2026-07",
    });

    const updated = repository.getAgent(agent.id)!;
    expect(updated.personalSales).toBe(5000n);
    expect(updated.monthlyVolume).toBe(5000n);
    expect(updated.lifetimeVolume).toBe(5000n);
  });

  it("propagates volume to upline team sales", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const sub = repository.getAgentByUserId("sub" as never)!;

    await sponsorService.link(actorId, sub.id, top.id);
    await performance.recordPersonalSale(actorId, {
      agentId: sub.id, amount: 3000n, currency: Currency.USDT, period: "2026-07",
    });

    const updatedTop = repository.getAgent(top.id)!;
    expect(updatedTop.teamSales).toBe(3000n);
  });

  it("creates a performance snapshot", async () => {
    const agent = repository.getAgentByUserId("top" as never)!;
    const snapshot = await performance.createSnapshot(actorId, agent.id, "2026-07");
    expect(snapshot.agentId).toBe(agent.id);
    expect(snapshot.period).toBe("2026-07");
  });
});
