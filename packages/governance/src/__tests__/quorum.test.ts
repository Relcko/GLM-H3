import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { QuorumEngine } from "../quorum/service";
import { ProposalService } from "../proposal/service";
import { VotingEngine } from "../voting/service";
import { ProposalCategory, ProposalStatus, VoteChoice } from "../types";

describe("QuorumEngine", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let quorumEngine: QuorumEngine;
  let proposalService: ProposalService;
  let votingEngine: VotingEngine;
  const actorId = "actor-1" as never;
  let proposalId: string;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    quorumEngine = new QuorumEngine(repository, events);
    proposalService = new ProposalService(repository, events);
    votingEngine = new VotingEngine(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Quorum Test Proposal",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);
    proposalId = proposal.id as string;

    await votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 10000n, "supporting quorum");
  });

  it("checks quorum with votes", () => {
    const snapshot = quorumEngine.checkQuorum(actorId, proposalId as never);

    expect(snapshot.quorumMet).toBe(true);
  });

  it("returns default config", () => {
    const config = quorumEngine.getDefaultConfig();

    expect(config.minQuorum).toBe(10000n);
    expect(config.approvalThreshold).toBe(50);
  });

  it("configures custom quorum", () => {
    quorumEngine.configureQuorum(actorId, {
      minQuorum: 20000n,
      approvalThreshold: 60,
      executionThreshold: 70,
      emergencyQuorum: 10000n,
      emergencyApprovalThreshold: 70,
      timeWindowDays: 14,
    });

    const config = quorumEngine.getQuorumConfig()!;
    expect(config.minQuorum).toBe(20000n);
    expect(config.approvalThreshold).toBe(60);
  });
});
