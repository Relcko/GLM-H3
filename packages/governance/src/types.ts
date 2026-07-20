import type { EntityId, Money, Timestamp } from "@relcko/types";

export enum ProposalCategory {
  Treasury = "treasury",
  Marketplace = "marketplace",
  Protocol = "protocol",
  Governance = "governance",
  Emergency = "emergency",
  Grant = "grant",
  ParameterChange = "parameter_change",
  Community = "community",
}

export enum ProposalStatus {
  Draft = "draft",
  Review = "review",
  Active = "active",
  Succeeded = "succeeded",
  Defeated = "defeated",
  Executed = "executed",
  Cancelled = "cancelled",
  Expired = "expired",
}

export enum VoteChoice {
  For = "for",
  Against = "against",
  Abstain = "abstain",
}

export enum DelegationType {
  Full = "full",
  Category = "category",
  Proposal = "proposal",
}

export interface Proposal {
  readonly id: EntityId;
  readonly title: string;
  readonly description: string;
  readonly proposerId: EntityId;
  readonly category: ProposalCategory;
  readonly status: ProposalStatus;
  readonly targetAddress?: string;
  readonly calldata?: string;
  readonly value?: Money;
  readonly startBlock: bigint;
  readonly endBlock: bigint;
  readonly snapshotId?: string;
  readonly quorum: bigint;
  readonly approvalThreshold: bigint;
  readonly forVotes: bigint;
  readonly againstVotes: bigint;
  readonly abstainVotes: bigint;
  readonly executionDelay: number;
  readonly executedAt?: Timestamp;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface Vote {
  readonly id: EntityId;
  readonly proposalId: EntityId;
  readonly voterId: EntityId;
  readonly choice: VoteChoice;
  readonly votingPower: bigint;
  readonly reason?: string;
  readonly delegatedFrom?: EntityId;
  readonly castAt: Timestamp;
}

export interface Delegation {
  readonly id: EntityId;
  readonly delegatorId: EntityId;
  readonly delegateId: EntityId;
  readonly delegationType: DelegationType;
  readonly category?: ProposalCategory;
  readonly amount: bigint;
  readonly active: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface DelegationHistoryEntry {
  readonly id: EntityId;
  readonly delegatorId: EntityId;
  readonly delegateId: EntityId;
  readonly action: "delegate" | "revoke" | "redelegate";
  readonly amount: bigint;
  readonly previousDelegateId?: EntityId;
  readonly occurredAt: Timestamp;
}

export interface QuorumConfig {
  readonly minQuorum: bigint;
  readonly approvalThreshold: number;
  readonly executionThreshold: number;
  readonly emergencyQuorum: bigint;
  readonly emergencyApprovalThreshold: number;
  readonly timeWindowDays: number;
}

export interface GovernanceSnapshot {
  readonly id: EntityId;
  readonly proposalId: EntityId;
  readonly totalVotingPower: bigint;
  readonly forVotes: bigint;
  readonly againstVotes: bigint;
  readonly abstainVotes: bigint;
  readonly quorumMet: boolean;
  readonly approvalMet: boolean;
  readonly participationRate: number;
  readonly snapshotAt: Timestamp;
}

export interface ExecutionRequest {
  readonly id: EntityId;
  readonly proposalId: EntityId;
  readonly executorId: EntityId;
  readonly targetAddress: string;
  readonly calldata: string;
  readonly value: Money;
  readonly status: ExecutionStatus;
  readonly executedAt?: Timestamp;
  readonly txHash?: string;
  readonly error?: string;
  readonly createdAt: Timestamp;
}

export enum ExecutionStatus {
  Pending = "pending",
  Queued = "queued",
  Executing = "executing",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export interface GovernanceAnalyticsEntry {
  readonly id: EntityId;
  readonly period: string;
  readonly totalProposals: number;
  readonly succeededProposals: number;
  readonly defeatedProposals: number;
  readonly totalVotes: number;
  readonly participationRate: number;
  readonly averageTurnout: number;
  readonly proposalSuccessRate: number;
  readonly delegateCount: number;
  readonly activeDelegates: number;
  readonly votingDistribution: Record<string, number>;
  readonly computedAt: Timestamp;
}

export interface TimelineEntry {
  readonly id: EntityId;
  readonly proposalId: EntityId;
  readonly eventType: string;
  readonly description: string;
  readonly actorId: EntityId;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: Timestamp;
}

export interface GovernanceSearchQuery {
  readonly query?: string;
  readonly category?: ProposalCategory;
  readonly status?: ProposalStatus;
  readonly proposerId?: EntityId;
  readonly dateFrom?: Timestamp;
  readonly dateTo?: Timestamp;
  readonly sort?: "recent" | "oldest" | "votes_desc" | "votes_asc";
  readonly page?: number;
  readonly pageSize?: number;
}

export interface GovernanceSearchResult {
  readonly items: readonly Proposal[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface GovernanceActivityEntry {
  readonly id: EntityId;
  readonly actorId: EntityId;
  readonly activityType: string;
  readonly proposalId?: EntityId;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: Timestamp;
}

export interface GovernancePortfolioEntry {
  readonly proposalId: EntityId;
  readonly title: string;
  readonly category: ProposalCategory;
  readonly status: ProposalStatus;
  readonly userVote?: VoteChoice;
  readonly userVotingPower: bigint;
  readonly delegatedVotingPower: bigint;
  readonly forVotes: bigint;
  readonly againstVotes: bigint;
  readonly abstainVotes: bigint;
  readonly quorumMet: boolean;
  readonly endBlock: bigint;
  readonly createdAt: Timestamp;
}

export interface VotingPowerResult {
  readonly totalPower: bigint;
  readonly rlkoPower: bigint;
  readonly nftPower: bigint;
  readonly delegatedPower: bigint;
  readonly reputationPower: bigint;
  readonly breakdown: Record<string, bigint>;
}
