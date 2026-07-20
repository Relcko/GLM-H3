import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { VotingEngine } from "../voting/service";
import { ProposalService } from "../proposal/service";
import { ProposalLifecycleEngine } from "../lifecycle/service";
import { ProposalCategory, ProposalStatus, VoteChoice } from "../types";
import { DuplicateVoteError, ProposalNotActiveError } from "../errors";

describe("VotingEngine", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let votingEngine: VotingEngine;
  let proposalService: ProposalService;
  let lifecycleEngine: ProposalLifecycleEngine;
  const actorId = "actor-1" as never;
  let proposalId: string;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    votingEngine = new VotingEngine(repository, events);
    proposalService = new ProposalService(repository, events);
    lifecycleEngine = new ProposalLifecycleEngine(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Voting Test Proposal",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);
    proposalId = proposal.id as string;
  });

  it("casts a For vote", async () => {
    const vote = await votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "reason");

    expect(vote.choice).toBe(VoteChoice.For);
    expect(vote.votingPower).toBe(500n);
  });

  it("casts Against and Abstain votes", async () => {
    await votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "for reason");
    await votingEngine.castVote(actorId, proposalId as never, "voter-2" as never, VoteChoice.Against, 300n, "against reason");
    await votingEngine.castVote(actorId, proposalId as never, "voter-3" as never, VoteChoice.Abstain, 200n, "abstain reason");

    const counts = votingEngine.getVoteCount(proposalId as never);
    expect(counts.for).toBe(500n);
    expect(counts.against).toBe(300n);
    expect(counts.abstain).toBe(200n);
    expect(counts.total).toBe(1000n);
  });

  it("prevents duplicate votes", async () => {
    await votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "reason");

    await expect(
      votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "reason"),
    ).rejects.toThrow(DuplicateVoteError);
  });

  it("rejects votes on non-active proposals", async () => {
    await lifecycleEngine.transition(actorId, proposalId as never, ProposalStatus.Succeeded);

    await expect(
      votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "reason"),
    ).rejects.toThrow(ProposalNotActiveError);
  });

  it("lists votes by proposal", async () => {
    await votingEngine.castVote(actorId, proposalId as never, "voter-1" as never, VoteChoice.For, 500n, "reason");
    await votingEngine.castVote(actorId, proposalId as never, "voter-2" as never, VoteChoice.Against, 300n, "reason");

    const votes = votingEngine.listVotesByProposal(proposalId as never);
    expect(votes).toHaveLength(2);
  });
});
