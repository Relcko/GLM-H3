import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNetworkRepository } from "../in-memory-repository";
import { NetworkService } from "../network/service";
import { SponsorService } from "../sponsor/service";
import { ActiveStatusEngine } from "../active-status/service";
import { OverrideRoutingEngine } from "../override-routing/service";
import { LeaderboardEngine } from "../leaderboard/service";
import { RewardQualificationEngine } from "../reward-qualification/service";
import { CampaignEngine } from "../campaign/service";
import { NetworkAnalytics } from "../network-analytics/service";
import { NetworkPortfolioAdapter } from "../network-portfolio/adapter";
import { TreeTraversalEngine } from "../tree-traversal/service";
import { ActiveStatusValue, RewardType, CampaignStatus, LeaderboardMetric, LeaderboardPeriod, Rank } from "../types";
import { AgentStatus } from "@relcko/domain-core";

describe("ActiveStatusEngine", () => {
  let repository: InMemoryNetworkRepository;
  let engine: ActiveStatusEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    engine = new ActiveStatusEngine(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "ACTIVE01", currency: Currency.USDT });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
  });

  it("evaluates lapsed status for new agent with no sales", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const record = engine.evaluate(actorId, agent.id);
    expect(record.status).toBe(ActiveStatusValue.Lapsed);
  });

  it("evaluates qualified status after sales", async () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const updated: typeof agent = { ...agent, personalSales: 100n };
    repository.saveAgent(updated);

    const record = engine.evaluate(actorId, agent.id);
    expect(record.status).toBe(ActiveStatusValue.Qualified);
  });
});

describe("OverrideRoutingEngine", () => {
  let repository: InMemoryNetworkRepository;
  let routing: OverrideRoutingEngine;
  let networkService: NetworkService;
  let sponsorService: any;
  let traversal: TreeTraversalEngine;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    traversal = new TreeTraversalEngine(repository);
    routing = new OverrideRoutingEngine(repository, traversal, events);
    networkService = new NetworkService(repository, events);
    sponsorService = new SponsorService(repository, events);

    await networkService.register(actorId, { userId: "top" as never, code: "OVR_TOP", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "bot" as never, code: "OVR_BOT", currency: Currency.USDT });

    const top = repository.getAgentByUserId("top" as never)!;
    await networkService.activate(actorId, top.id);
    repository.saveAgent({ ...top, activeStatus: ActiveStatusValue.Qualified });
  });

  it("resolves override route to nearest active upline", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;
    await sponsorService.link(actorId, bot.id, top.id);

    const route = routing.resolveOverrideRoute(actorId, bot.id, 5);
    expect(route.uplineAgentId).toBe(top.id);
    expect(route.commissionRate).toBe(5);
    expect(route.status).toBe("active");
  });
});

describe("LeaderboardEngine", () => {
  let repository: InMemoryNetworkRepository;
  let leaderboard: LeaderboardEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    leaderboard = new LeaderboardEngine(repository, events);
    networkService = new NetworkService(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "LB01", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "u2" as never, code: "LB02", currency: Currency.USDT });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
    await networkService.activate(actorId, repository.getAgentByUserId("u2" as never)!.id);
  });

  it("computes sales leaderboard", () => {
    const entries = leaderboard.computeSalesLeaderboard(LeaderboardPeriod.Weekly);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].metric).toBe(LeaderboardMetric.Sales);
  });

  it("gets leaderboard from repository", () => {
    leaderboard.computeSalesLeaderboard(LeaderboardPeriod.Weekly);
    const entries = leaderboard.getLeaderboard(LeaderboardPeriod.Weekly, LeaderboardMetric.Sales);
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe("RewardQualificationEngine", () => {
  let repository: InMemoryNetworkRepository;
  let rewards: RewardQualificationEngine;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    rewards = new RewardQualificationEngine(repository, events);
    networkService = new NetworkService(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "REW01", currency: Currency.USDT });
  });

  it("agent qualifies for NFT badge with sufficient recruitment", async () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const updated: typeof agent = { ...agent, recruitmentCount: 10 };
    repository.saveAgent(updated);

    const qual = rewards.checkQualification(actorId, agent.id, RewardType.NFTBadge);
    expect(qual.rewardType).toBe(RewardType.NFTBadge);
    expect(qual.status).toBe("qualified");
  });

  it("agent does not qualify for monthly bonus without volume", () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    expect(() => rewards.checkQualification(actorId, agent.id, RewardType.MonthlyBonus)).toThrow("does not qualify");
  });
});

describe("CampaignEngine", () => {
  let repository: InMemoryNetworkRepository;
  let campaign: CampaignEngine;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryNetworkRepository();
    campaign = new CampaignEngine(repository, events);
  });

  it("creates and starts a campaign", async () => {
    const c = await campaign.create(actorId, {
      name: "Test Campaign",
      description: "A test campaign",
      rewardType: RewardType.MonthlyBonus,
      rewardValue: { amount: 1000n, currency: Currency.USDT },
      maxParticipants: 100,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(c.status).toBe(CampaignStatus.Draft);

    const started = await campaign.start(actorId, c.id);
    expect(started.status).toBe(CampaignStatus.Active);
  });

  it("registers participants", async () => {
    const c = await campaign.create(actorId, {
      name: "Participant Test", description: "Test", rewardType: RewardType.MonthlyBonus,
      rewardValue: { amount: 1000n, currency: Currency.USDT }, maxParticipants: 10,
      startAt: new Date().toISOString(), endAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const updated = campaign.registerParticipant(c.id);
    expect(updated.currentParticipants).toBe(1);
  });
});

describe("NetworkAnalytics", () => {
  let repository: InMemoryNetworkRepository;
  let analytics: NetworkAnalytics;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    analytics = new NetworkAnalytics(repository, events);
    networkService = new NetworkService(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "AN01", currency: Currency.USDT });
    await networkService.activate(actorId, repository.getAgentByUserId("u1" as never)!.id);
  });

  it("computes network analytics snapshot", async () => {
    const entry = analytics.computeSnapshot(actorId, "2026-07");
    expect(entry.totalAgents).toBe(1);
    expect(entry.period).toBe("2026-07");
  });
});

describe("NetworkPortfolioAdapter", () => {
  let repository: InMemoryNetworkRepository;
  let portfolio: NetworkPortfolioAdapter;
  let networkService: NetworkService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    portfolio = new NetworkPortfolioAdapter(repository, events);
    networkService = new NetworkService(repository, events);

    await networkService.register(actorId, { userId: "u1" as never, code: "PF01", currency: Currency.USDT });
  });

  it("computes portfolio entry for an agent", async () => {
    const agent = repository.getAgentByUserId("u1" as never)!;
    const entry = portfolio.computeEntry(actorId, agent.id);
    expect(entry.agentId).toBe(agent.id);
    expect(entry.performanceScore).toBeGreaterThanOrEqual(0);
  });
});
