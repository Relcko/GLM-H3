import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { GovernancePortfolioEntry, Vote, Proposal } from "../types";
import { GovernanceEventType, publishGovernanceEvent } from "../events";

export class GovernancePortfolioAdapter {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeEntry(actorId: EntityId, voterId: EntityId): GovernancePortfolioEntry[] {
    const votes = this.repository.listVotesByVoter(voterId);
    const entries: GovernancePortfolioEntry[] = [];

    for (const vote of votes) {
      const proposal = this.repository.getProposal(vote.proposalId);
      if (!proposal) continue;

      const snapshot = this.repository.getSnapshotByProposal(proposal.id);
      const delegations = this.repository.listDelegationsByDelegate(voterId);
      const delegatedVotingPower = delegations.reduce((sum, d) => sum + d.amount, 0n);

      const entry: GovernancePortfolioEntry = {
        proposalId: proposal.id,
        title: proposal.title,
        category: proposal.category,
        status: proposal.status,
        userVote: vote.choice,
        userVotingPower: vote.votingPower,
        delegatedVotingPower,
        forVotes: proposal.forVotes,
        againstVotes: proposal.againstVotes,
        abstainVotes: proposal.abstainVotes,
        quorumMet: snapshot?.quorumMet ?? false,
        endBlock: proposal.endBlock,
        createdAt: proposal.createdAt,
      };

      this.repository.savePortfolioEntry(entry);
      entries.push(entry);
    }

    publishGovernanceEvent(this.events, GovernanceEventType.PortfolioUpdated, voterId, actorId, {
      voterId: voterId as string,
      entryCount: entries.length,
    });

    this.logger?.info("portfolio computed", { voterId, entryCount: entries.length });

    return entries;
  }

  listByVoter(voterId: EntityId): GovernancePortfolioEntry[] {
    return this.repository.listPortfolioByVoter(voterId);
  }

  getProposalEntry(proposalId: EntityId, voterId: EntityId): GovernancePortfolioEntry | undefined {
    const portfolio = this.repository.listPortfolioByVoter(voterId);
    return portfolio.find(e => e.proposalId === proposalId);
  }
}
