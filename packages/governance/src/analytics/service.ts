import type { EntityId, Timestamp } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { GovernanceAnalyticsEntry, Proposal, Vote } from "../types";
import { ProposalStatus } from "../types";
import { AnalyticsError } from "../errors";
import { GovernanceEventType, publishGovernanceEvent } from "../events";

export class GovernanceAnalytics {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeAnalytics(actorId: EntityId, period: string): GovernanceAnalyticsEntry {
    const allProposals = this.repository.listAllProposals();
    const allVotes = allProposals.flatMap(p => this.repository.listVotesByProposal(p.id));
    const allDelegations = this.repository.listAllActiveDelegations();

    const totalProposals = allProposals.length;
    const succeededProposals = allProposals.filter(p => p.status === ProposalStatus.Succeeded || p.status === ProposalStatus.Executed).length;
    const defeatedProposals = allProposals.filter(p => p.status === ProposalStatus.Defeated).length;
    const totalVotes = allVotes.length;

    const uniqueVoters = new Set(allVotes.map(v => v.voterId)).size;
    const totalVotingPower = allVotes.reduce((sum, v) => sum + v.votingPower, 0n);
    const participationRate = this.calculateParticipationRate(totalVotes, Math.max(Number(totalVotingPower), 1));

    const proposalsWithVotes = allProposals.filter(p => {
      const votes = this.repository.listVotesByProposal(p.id);
      return votes.length > 0;
    });
    const averageTurnout = proposalsWithVotes.length > 0
      ? allProposals.reduce((sum, p) => {
          const votes = this.repository.listVotesByProposal(p.id);
          return sum + votes.length;
        }, 0) / proposalsWithVotes.length
      : 0;

    const proposalSuccessRate = totalProposals > 0 ? succeededProposals / totalProposals : 0;

    const delegateIds = new Set(allDelegations.map(d => d.delegateId));
    const delegateCount = delegateIds.size;
    const activeDelegates = allDelegations.filter(d => d.active).length;

    const votingDistribution: Record<string, number> = {};
    for (const v of allVotes) {
      votingDistribution[v.choice] = (votingDistribution[v.choice] ?? 0) + 1;
    }

    const entry: GovernanceAnalyticsEntry = {
      id: generateId("govanalytics") as EntityId,
      period,
      totalProposals,
      succeededProposals,
      defeatedProposals,
      totalVotes,
      participationRate,
      averageTurnout,
      proposalSuccessRate,
      delegateCount,
      activeDelegates,
      votingDistribution,
      computedAt: new Date().toISOString() as Timestamp,
    };

    this.repository.saveAnalytics(entry);

    publishGovernanceEvent(this.events, GovernanceEventType.AnalyticsComputed, entry.id, actorId, {
      entryId: entry.id as string,
      period,
      totalProposals,
    });

    this.logger?.info("governance analytics computed", { period, totalProposals });

    return entry;
  }

  getLatestAnalytics(): GovernanceAnalyticsEntry | undefined {
    return this.repository.getLatestAnalytics();
  }

  listByPeriod(period: string): GovernanceAnalyticsEntry[] {
    return this.repository.listAnalyticsByPeriod(period);
  }

  calculateParticipationRate(votes: number, totalVotingPower: number): number {
    if (totalVotingPower <= 0) return 0;
    return votes / totalVotingPower;
  }
}
