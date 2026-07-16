import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { createGovernanceModule, GovernanceModule } from "../composition-root";
import { ProposalCategory, ProposalStatus, VoteChoice } from "../types";

describe("GovernanceModule (composition root)", () => {
  let govModule: GovernanceModule;
  let events: EventBus;

  beforeEach(() => {
    events = new InMemoryEventBus();
    govModule = createGovernanceModule({ events });
  });

  it("exposes all 14 services", () => {
    expect(govModule.proposalService).toBeDefined();
    expect(govModule.lifecycleEngine).toBeDefined();
    expect(govModule.votingEngine).toBeDefined();
    expect(govModule.delegationEngine).toBeDefined();
    expect(govModule.quorumEngine).toBeDefined();
    expect(govModule.executionOrchestrator).toBeDefined();
    expect(govModule.analytics).toBeDefined();
    expect(govModule.timeline).toBeDefined();
    expect(govModule.search).toBeDefined();
    expect(govModule.activity).toBeDefined();
    expect(govModule.portfolioAdapter).toBeDefined();
    expect(govModule.snapshotEngine).toBeDefined();
    expect(govModule.votingPowerCalculator).toBeDefined();
    expect(govModule.eventAdapter).toBeDefined();
  });

  it("accepts custom repository", () => {
    const customRepo = new InMemoryGovernanceRepository();
    const custom = createGovernanceModule({ events, repository: customRepo });
    expect(custom).toBeDefined();
  });

  it("completes full end-to-end flow", async () => {
    const actorId = "actor-1" as never;

    const proposal = await govModule.proposalService.create(actorId, {
      title: "E2E Proposal",
      description: "Full flow test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Treasury,
      startBlock: 100n,
      endBlock: 200n,
    });

    await govModule.proposalService.submit(actorId, proposal.id);

    await govModule.proposalService.review(actorId, proposal.id, true);
    expect(govModule.proposalService.get(proposal.id)?.status).toBe(ProposalStatus.Active);

    await govModule.votingEngine.castVote(actorId, proposal.id, "voter-1" as never, VoteChoice.For, 10000n, "e2e vote");

    const snapshot = govModule.quorumEngine.checkQuorum(actorId, proposal.id);
    expect(snapshot.quorumMet).toBe(true);

    await govModule.lifecycleEngine.transition(actorId, proposal.id, ProposalStatus.Succeeded);
    expect(govModule.proposalService.get(proposal.id)?.status).toBe(ProposalStatus.Succeeded);

    const execution = govModule.executionOrchestrator.queueExecution(actorId, proposal.id);
    expect(execution.proposalId).toBe(proposal.id);
  });
});
