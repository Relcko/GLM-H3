import type { EntityId } from "@relcko/types";
import type { GovernanceRepository } from "./repository";
import type {
  Proposal, Vote, Delegation, DelegationHistoryEntry,
  QuorumConfig, GovernanceSnapshot, ExecutionRequest,
  GovernanceAnalyticsEntry, TimelineEntry, GovernanceActivityEntry,
  GovernancePortfolioEntry, ProposalCategory, VoteChoice,
} from "./types";
import { ProposalStatus } from "./types";

export class InMemoryGovernanceRepository implements GovernanceRepository {
  private readonly proposals = new Map<EntityId, Proposal>();
  private readonly votes = new Map<EntityId, Vote>();
  private readonly votesByProposal = new Map<EntityId, Map<EntityId, Vote>>();
  private readonly delegations = new Map<EntityId, Delegation>();
  private readonly activeDelegations = new Map<EntityId, EntityId>();
  private readonly delegationHistory: DelegationHistoryEntry[] = [];
  private quorumConfig?: QuorumConfig;
  private readonly snapshots = new Map<EntityId, GovernanceSnapshot>();
  private readonly snapshotsByProposal = new Map<EntityId, EntityId>();
  private readonly executionRequests = new Map<EntityId, ExecutionRequest>();
  private readonly analytics = new Map<string, GovernanceAnalyticsEntry>();
  private readonly timeline: TimelineEntry[] = [];
  private readonly activity: GovernanceActivityEntry[] = [];
  private readonly portfolioEntries = new Map<EntityId, GovernancePortfolioEntry[]>();
  private readonly processedEvents = new Set<string>();

  saveProposal(p: Proposal): void { this.proposals.set(p.id, p); }
  getProposal(id: EntityId): Proposal | undefined { return this.proposals.get(id); }
  listProposalsByProposer(proposerId: EntityId): Proposal[] {
    return Array.from(this.proposals.values()).filter(p => p.proposerId === proposerId);
  }
  listProposalsByStatus(status: ProposalStatus): Proposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === status);
  }
  listProposalsByCategory(category: ProposalCategory): Proposal[] {
    return Array.from(this.proposals.values()).filter(p => p.category === category);
  }
  listActiveProposals(): Proposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === ProposalStatus.Active);
  }
  listAllProposals(): Proposal[] { return Array.from(this.proposals.values()); }

  saveVote(v: Vote): void {
    this.votes.set(v.id, v);
    let byProposal = this.votesByProposal.get(v.proposalId);
    if (!byProposal) { byProposal = new Map(); this.votesByProposal.set(v.proposalId, byProposal); }
    byProposal.set(v.voterId, v);
  }
  getVote(id: EntityId): Vote | undefined { return this.votes.get(id); }
  getVoteByVoter(proposalId: EntityId, voterId: EntityId): Vote | undefined {
    return this.votesByProposal.get(proposalId)?.get(voterId);
  }
  listVotesByProposal(proposalId: EntityId): Vote[] {
    const byProposal = this.votesByProposal.get(proposalId);
    return byProposal ? Array.from(byProposal.values()) : [];
  }
  listVotesByVoter(voterId: EntityId): Vote[] {
    return Array.from(this.votes.values()).filter(v => v.voterId === voterId);
  }

  saveDelegation(d: Delegation): void {
    this.delegations.set(d.id, d);
    if (d.active) this.activeDelegations.set(d.delegatorId, d.id);
    else this.activeDelegations.delete(d.delegatorId);
  }
  getDelegation(id: EntityId): Delegation | undefined { return this.delegations.get(id); }
  getActiveDelegation(delegatorId: EntityId): Delegation | undefined {
    const id = this.activeDelegations.get(delegatorId);
    return id ? this.delegations.get(id) : undefined;
  }
  listDelegationsByDelegate(delegateId: EntityId): Delegation[] {
    return Array.from(this.delegations.values()).filter(d => d.delegateId === delegateId && d.active);
  }
  listAllActiveDelegations(): Delegation[] {
    return Array.from(this.delegations.values()).filter(d => d.active);
  }

  saveDelegationHistory(e: DelegationHistoryEntry): void { this.delegationHistory.push(e); }
  listDelegationHistory(delegatorId: EntityId): DelegationHistoryEntry[] {
    return this.delegationHistory.filter(e => e.delegatorId === delegatorId);
  }

  saveQuorumConfig(c: QuorumConfig): void { this.quorumConfig = c; }
  getQuorumConfig(): QuorumConfig | undefined { return this.quorumConfig; }

  saveSnapshot(s: GovernanceSnapshot): void {
    this.snapshots.set(s.id, s);
    this.snapshotsByProposal.set(s.proposalId, s.id);
  }
  getSnapshot(id: EntityId): GovernanceSnapshot | undefined { return this.snapshots.get(id); }
  getSnapshotByProposal(proposalId: EntityId): GovernanceSnapshot | undefined {
    const id = this.snapshotsByProposal.get(proposalId);
    return id ? this.snapshots.get(id) : undefined;
  }

  saveExecutionRequest(e: ExecutionRequest): void { this.executionRequests.set(e.id, e); }
  getExecutionRequest(id: EntityId): ExecutionRequest | undefined { return this.executionRequests.get(id); }
  getExecutionRequestByProposal(proposalId: EntityId): ExecutionRequest | undefined {
    return Array.from(this.executionRequests.values()).find(e => e.proposalId === proposalId);
  }
  listPendingExecutions(): ExecutionRequest[] {
    return Array.from(this.executionRequests.values()).filter(e => e.status === "pending" || e.status === "queued");
  }

  saveAnalytics(a: GovernanceAnalyticsEntry): void { this.analytics.set(a.period, a); }
  getLatestAnalytics(): GovernanceAnalyticsEntry | undefined {
    const entries = Array.from(this.analytics.values());
    return entries.length > 0 ? entries[entries.length - 1] : undefined;
  }
  listAnalyticsByPeriod(period: string): GovernanceAnalyticsEntry[] {
    return Array.from(this.analytics.values()).filter(a => a.period === period);
  }

  saveTimelineEntry(e: TimelineEntry): void { this.timeline.push(e); }
  listTimelineByProposal(proposalId: EntityId): TimelineEntry[] {
    return this.timeline.filter(t => t.proposalId === proposalId);
  }
  listAllTimeline(): TimelineEntry[] { return [...this.timeline]; }

  saveActivityEntry(e: GovernanceActivityEntry): void { this.activity.push(e); }
  listActivityByActor(actorId: EntityId): GovernanceActivityEntry[] {
    return this.activity.filter(a => a.actorId === actorId);
  }
  listAllActivity(): GovernanceActivityEntry[] { return [...this.activity]; }

  savePortfolioEntry(e: GovernancePortfolioEntry): void {
    const existing = this.portfolioEntries.get(e.proposalId) ?? [];
    existing.push(e);
    this.portfolioEntries.set(e.proposalId, existing);
  }
  listPortfolioByVoter(voterId: EntityId): GovernancePortfolioEntry[] {
    return Array.from(this.portfolioEntries.values()).flat();
  }

  isEventProcessed(eventId: string): boolean { return this.processedEvents.has(eventId); }
  markEventProcessed(eventId: string): void { this.processedEvents.add(eventId); }
}
