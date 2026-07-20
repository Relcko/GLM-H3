import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { Proposal, Vote, VoteChoice } from "../types";
import { ProposalStatus } from "../types";
import { GovernanceEventType, publishGovernanceEvent } from "../events";
import { ProposalNotFoundError, DuplicateVoteError, ProposalNotActiveError } from "../errors";

export class VotingEngine {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async castVote(
    actorId: EntityId,
    proposalId: EntityId,
    voterId: EntityId,
    choice: VoteChoice,
    votingPower: bigint,
    reason?: string,
  ): Promise<Vote> {
    const proposal = this.repository.getProposal(proposalId);
    if (!proposal) throw new ProposalNotFoundError(proposalId as string);
    if (proposal.status !== ProposalStatus.Active) {
      throw new ProposalNotActiveError(proposalId as string, proposal.status);
    }

    const existing = this.repository.getVoteByVoter(proposalId, voterId);
    if (existing) {
      throw new DuplicateVoteError(proposalId as string, voterId as string);
    }

    const vote: Vote = {
      id: generateId("vote") as EntityId,
      proposalId,
      voterId,
      choice,
      votingPower,
      reason,
      castAt: new Date().toISOString(),
    };

    this.repository.saveVote(vote);

    const updatedProposal: Proposal = {
      ...proposal,
      forVotes: proposal.forVotes + (choice === "for" ? votingPower : 0n),
      againstVotes: proposal.againstVotes + (choice === "against" ? votingPower : 0n),
      abstainVotes: proposal.abstainVotes + (choice === "abstain" ? votingPower : 0n),
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveProposal(updatedProposal);

    const votePayload: Record<string, string | undefined> = {
      proposalId: proposalId as string,
      voterId: voterId as string,
      choice: choice as string,
      votingPower: votingPower.toString(),
      reason,
    };
    await publishGovernanceEvent(this.events, GovernanceEventType.VoteCast, proposalId, actorId, votePayload as any);

    this.logger?.info("vote cast", { proposalId: proposalId as string, voterId: voterId as string, choice });

    return vote;
  }

  getVote(proposalId: EntityId, voterId: EntityId): Vote | undefined {
    return this.repository.getVoteByVoter(proposalId, voterId);
  }

  listVotesByProposal(proposalId: EntityId): Vote[] {
    return this.repository.listVotesByProposal(proposalId);
  }

  listVotesByVoter(voterId: EntityId): Vote[] {
    return this.repository.listVotesByVoter(voterId);
  }

  getVoteCount(proposalId: EntityId): { for: bigint; against: bigint; abstain: bigint; total: bigint } {
    const votes = this.repository.listVotesByProposal(proposalId);
    let forVotes = 0n;
    let againstVotes = 0n;
    let abstainVotes = 0n;

    for (const vote of votes) {
      switch (vote.choice) {
        case "for":
          forVotes += vote.votingPower;
          break;
        case "against":
          againstVotes += vote.votingPower;
          break;
        case "abstain":
          abstainVotes += vote.votingPower;
          break;
      }
    }

    return { for: forVotes, against: againstVotes, abstain: abstainVotes, total: forVotes + againstVotes + abstainVotes };
  }

  hasVoted(proposalId: EntityId, voterId: EntityId): boolean {
    return this.repository.getVoteByVoter(proposalId, voterId) !== undefined;
  }
}
