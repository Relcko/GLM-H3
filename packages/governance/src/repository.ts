import type { EntityId } from "@relcko/types";
import type {
  Proposal,
  Vote,
  Delegation,
  DelegationHistoryEntry,
  QuorumConfig,
  GovernanceSnapshot,
  ExecutionRequest,
  GovernanceAnalyticsEntry,
  TimelineEntry,
  GovernanceActivityEntry,
  GovernancePortfolioEntry,
  ProposalCategory,
  ProposalStatus,
  VoteChoice,
} from "./types";

export interface GovernanceRepository {
  saveProposal(p: Proposal): void;
  getProposal(id: EntityId): Proposal | undefined;
  listProposalsByProposer(proposerId: EntityId): Proposal[];
  listProposalsByStatus(status: ProposalStatus): Proposal[];
  listProposalsByCategory(category: ProposalCategory): Proposal[];
  listActiveProposals(): Proposal[];
  listAllProposals(): Proposal[];

  saveVote(v: Vote): void;
  getVote(id: EntityId): Vote | undefined;
  getVoteByVoter(proposalId: EntityId, voterId: EntityId): Vote | undefined;
  listVotesByProposal(proposalId: EntityId): Vote[];
  listVotesByVoter(voterId: EntityId): Vote[];

  saveDelegation(d: Delegation): void;
  getDelegation(id: EntityId): Delegation | undefined;
  getActiveDelegation(delegatorId: EntityId): Delegation | undefined;
  listDelegationsByDelegate(delegateId: EntityId): Delegation[];
  listAllActiveDelegations(): Delegation[];

  saveDelegationHistory(e: DelegationHistoryEntry): void;
  listDelegationHistory(delegatorId: EntityId): DelegationHistoryEntry[];

  saveQuorumConfig(c: QuorumConfig): void;
  getQuorumConfig(): QuorumConfig | undefined;

  saveSnapshot(s: GovernanceSnapshot): void;
  getSnapshot(id: EntityId): GovernanceSnapshot | undefined;
  getSnapshotByProposal(proposalId: EntityId): GovernanceSnapshot | undefined;

  saveExecutionRequest(e: ExecutionRequest): void;
  getExecutionRequest(id: EntityId): ExecutionRequest | undefined;
  getExecutionRequestByProposal(proposalId: EntityId): ExecutionRequest | undefined;
  listPendingExecutions(): ExecutionRequest[];

  saveAnalytics(a: GovernanceAnalyticsEntry): void;
  getLatestAnalytics(): GovernanceAnalyticsEntry | undefined;
  listAnalyticsByPeriod(period: string): GovernanceAnalyticsEntry[];

  saveTimelineEntry(e: TimelineEntry): void;
  listTimelineByProposal(proposalId: EntityId): TimelineEntry[];
  listAllTimeline(): TimelineEntry[];

  saveActivityEntry(e: GovernanceActivityEntry): void;
  listActivityByActor(actorId: EntityId): GovernanceActivityEntry[];
  listAllActivity(): GovernanceActivityEntry[];

  savePortfolioEntry(e: GovernancePortfolioEntry): void;
  listPortfolioByVoter(voterId: EntityId): GovernancePortfolioEntry[];

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
