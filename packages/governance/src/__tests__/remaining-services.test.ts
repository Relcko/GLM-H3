import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { GovernanceTimeline } from "../timeline/service";
import { GovernanceSearch } from "../search/service";
import { GovernanceActivity } from "../activity/service";
import { GovernancePortfolioAdapter } from "../portfolio-adapter/service";
import { GovernanceEventAdapter } from "../event-adapter/service";
import { ExecutionOrchestrator } from "../execution/service";
import { ProposalService } from "../proposal/service";
import { VotingEngine } from "../voting/service";
import { ProposalCategory, ProposalStatus, VoteChoice } from "../types";

describe("GovernanceTimeline", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let timeline: GovernanceTimeline;
  let proposalService: ProposalService;
  const actorId = "actor-1" as never;
  let proposalId: string;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    timeline = new GovernanceTimeline(repository, events);
    proposalService = new ProposalService(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Timeline Test",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    proposalId = proposal.id as string;
  });

  it("adds and lists timeline entries", () => {
    const entry = timeline.addEntry(actorId, proposalId as never, "created", "Proposal created", { key: "value" });

    const entries = timeline.listByProposal(proposalId as never);
    expect(entries).toHaveLength(1);
    expect(entries[0].eventType).toBe("created");
    expect(entries[0].description).toBe("Proposal created");
  });
});

describe("GovernanceSearch", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let search: GovernanceSearch;
  let proposalService: ProposalService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    search = new GovernanceSearch(repository, events);
    proposalService = new ProposalService(repository, events);

    await proposalService.create(actorId, {
      title: "Treasury Fund Request",
      description: "Request for treasury funds",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Treasury,
      startBlock: 100n,
      endBlock: 200n,
    });
  });

  it("searches proposals by keyword", () => {
    const result = search.search(actorId, { query: "Treasury" });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].title).toContain("Treasury");
  });
});

describe("GovernanceActivity", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let activity: GovernanceActivity;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    activity = new GovernanceActivity(repository, events);
  });

  it("records and lists activity", () => {
    const entry = activity.recordActivity(actorId, "vote_cast", "Voted For on proposal", "proposal-1" as never, { power: "500" });

    const list = activity.listByActor(actorId);
    expect(list).toHaveLength(1);
    expect(list[0].activityType).toBe("vote_cast");
  });
});

describe("GovernancePortfolioAdapter", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let portfolio: GovernancePortfolioAdapter;
  let proposalService: ProposalService;
  let votingEngine: VotingEngine;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    portfolio = new GovernancePortfolioAdapter(repository, events);
    proposalService = new ProposalService(repository, events);
    votingEngine = new VotingEngine(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Portfolio Test",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);
    await votingEngine.castVote(actorId, proposal.id, "voter-1" as never, VoteChoice.For, 500n, "portfolio vote");
  });

  it("computes portfolio entry", () => {
    const entries = portfolio.computeEntry(actorId, "voter-1" as never);

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].userVote).toBe(VoteChoice.For);
  });
});

describe("GovernanceEventAdapter", () => {
  let events: EventBus;
  let eventAdapter: GovernanceEventAdapter;
  let executionOrchestrator: ExecutionOrchestrator;
  let repository: InMemoryGovernanceRepository;

  beforeEach(() => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    executionOrchestrator = new ExecutionOrchestrator(repository, events);
    eventAdapter = new GovernanceEventAdapter(events, undefined, executionOrchestrator);
  });

  it("subscribes to external events", () => {
    const unsubscribers = eventAdapter.subscribeToExternalEvents();

    expect(unsubscribers).toHaveLength(3);
    unsubscribers.forEach(fn => expect(typeof fn).toBe("function"));
  });

  it("propagates execution errors to the event bus (retry/DLQ)", async () => {
    const testActor = "actor_gov_fail" as never;
    // Queue execution for a non-existent proposal to trigger an error
    const proposalId = "prop_nonexistent" as never;
    eventAdapter.subscribeToInternalEvents();

    const published = await events.publish({
      type: "governance.proposal_succeeded",
      eventId: "evt_fail" as never,
      aggregateId: proposalId,
      occurredAt: new Date().toISOString(),
      actorId: testActor,
      version: 1 as never,
      correlationId: "corr" as never,
      traceId: "trace" as never,
      idempotencyKey: "ik" as never,
      payload: {},
    });

    expect(published.deadLettered).toBe(true);
    expect(published.subscriberResults.some(r => !r.ok)).toBe(true);
  });
});
