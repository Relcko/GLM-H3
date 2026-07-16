import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { GovernanceAnalytics } from "../analytics/service";
import { ProposalService } from "../proposal/service";
import { ProposalLifecycleEngine } from "../lifecycle/service";
import { ProposalCategory, ProposalStatus, VoteChoice } from "../types";

describe("GovernanceAnalytics", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let analytics: GovernanceAnalytics;
  let proposalService: ProposalService;
  let lifecycleEngine: ProposalLifecycleEngine;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    analytics = new GovernanceAnalytics(repository, events);
    proposalService = new ProposalService(repository, events);
    lifecycleEngine = new ProposalLifecycleEngine(repository, events);

    const proposal1 = await proposalService.create(actorId, {
      title: "Analytics Proposal 1",
      description: "First proposal",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal1.id);
    await proposalService.review(actorId, proposal1.id, true);

    const proposal2 = await proposalService.create(actorId, {
      title: "Analytics Proposal 2",
      description: "Second proposal",
      proposerId: "proposer-2" as never,
      category: ProposalCategory.Treasury,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal2.id);
    await proposalService.review(actorId, proposal2.id, true);

    await lifecycleEngine.transition(actorId, proposal1.id, ProposalStatus.Succeeded);
  });

  it("computes analytics", () => {
    const entry = analytics.computeAnalytics(actorId, "2026-07");

    expect(entry.totalProposals).toBeGreaterThan(0);
    expect(entry.period).toBe("2026-07");
  });

  it("participation rate is calculated", () => {
    const entry = analytics.computeAnalytics(actorId, "2026-07");

    expect(entry.participationRate).toBeGreaterThanOrEqual(0);
    expect(entry.participationRate).toBeLessThanOrEqual(100);
  });
});
