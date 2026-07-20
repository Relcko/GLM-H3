import type { EntityId, Money } from "@relcko/types";
import type { NetworkRepository } from "./repository";
import type {
  NetworkAgent,
  SponsorRelationship,
  CustomerOwnership,
  ActiveStatusRecord,
  RankRecord,
  PerformanceSnapshot,
  OverrideRoute,
  CommissionRecord,
  CommissionLedgerEntry,
  CommissionRecovery,
  LeaderboardEntry,
  Campaign,
  RewardQualification,
  NetworkAnalyticsEntry,
  NetworkPortfolioEntry,
  Rank,
  ActiveStatusValue,
  CommissionStatus,
  LeaderboardPeriod,
  LeaderboardMetric,
} from "./types";

export class InMemoryNetworkRepository implements NetworkRepository {
  private readonly agents = new Map<EntityId, NetworkAgent>();
  private readonly agentsByUserId = new Map<EntityId, EntityId>();
  private readonly agentsByCode = new Map<string, EntityId>();
  private readonly sponsors = new Map<EntityId, SponsorRelationship>();
  private readonly sponsorsByAgent = new Map<EntityId, EntityId>();
  private readonly customers = new Map<EntityId, CustomerOwnership>();
  private readonly customersByAgent = new Map<EntityId, CustomerOwnership[]>();
  private readonly activeStatuses = new Map<EntityId, ActiveStatusRecord>();
  private readonly rankRecords = new Map<EntityId, RankRecord>();
  private readonly performances = new Map<EntityId, PerformanceSnapshot[]>();
  private readonly overrideRoutes = new Map<EntityId, OverrideRoute>();
  private readonly commissions = new Map<EntityId, CommissionRecord>();
  private readonly ledgerEntries = new Map<EntityId, CommissionLedgerEntry[]>();
  private readonly recoveries = new Map<EntityId, CommissionRecovery[]>();
  private readonly leaderboardEntries = new Map<string, LeaderboardEntry[]>();
  private readonly campaigns = new Map<EntityId, Campaign>();
  private readonly rewards = new Map<EntityId, RewardQualification[]>();
  private readonly analytics: NetworkAnalyticsEntry[] = [];
  private readonly portfolioEntries = new Map<EntityId, NetworkPortfolioEntry>();
  private readonly processedEvents = new Set<string>();

  saveAgent(a: NetworkAgent): void {
    this.agents.set(a.id, a);
    this.agentsByUserId.set(a.userId, a.id);
    this.agentsByCode.set(a.code, a.id);
  }

  getAgent(id: EntityId): NetworkAgent | undefined {
    return this.agents.get(id);
  }

  getAgentByUserId(userId: EntityId): NetworkAgent | undefined {
    const id = this.agentsByUserId.get(userId);
    return id ? this.agents.get(id) : undefined;
  }

  getAgentByCode(code: string): NetworkAgent | undefined {
    const id = this.agentsByCode.get(code);
    return id ? this.agents.get(id) : undefined;
  }

  listActiveAgents(): NetworkAgent[] {
    return [...this.agents.values()].filter(a => a.status === "active");
  }

  listAgentsByRank(rank: Rank): NetworkAgent[] {
    return [...this.agents.values()].filter(a => a.rank === rank);
  }

  listAgentsBySponsor(sponsorId: EntityId): NetworkAgent[] {
    return [...this.agents.values()].filter(a => a.sponsorId === sponsorId);
  }

  listAgentsByStatus(status: ActiveStatusValue): NetworkAgent[] {
    return [...this.agents.values()].filter(a => a.activeStatus === status);
  }

  saveSponsor(s: SponsorRelationship): void {
    this.sponsors.set(s.id, s);
    this.sponsorsByAgent.set(s.agentId, s.id);
  }

  getSponsor(id: EntityId): SponsorRelationship | undefined {
    return this.sponsors.get(id);
  }

  getSponsorByAgent(agentId: EntityId): SponsorRelationship | undefined {
    const id = this.sponsorsByAgent.get(agentId);
    return id ? this.sponsors.get(id) : undefined;
  }

  listSponsorsBySponsor(sponsorId: EntityId): SponsorRelationship[] {
    return [...this.sponsors.values()].filter(s => s.sponsorId === sponsorId);
  }

  listDownline(agentId: EntityId): SponsorRelationship[] {
    const direct = this.listSponsorsBySponsor(agentId);
    const result: SponsorRelationship[] = [...direct];
    for (const d of direct) {
      result.push(...this.listDownline(d.agentId));
    }
    return result;
  }

  saveCustomerOwnership(c: CustomerOwnership): void {
    this.customers.set(c.investorId, c);
    const list = this.customersByAgent.get(c.agentId) ?? [];
    list.push(c);
    this.customersByAgent.set(c.agentId, list);
  }

  getCustomerOwnership(investorId: EntityId): CustomerOwnership | undefined {
    return this.customers.get(investorId);
  }

  listCustomersByAgent(agentId: EntityId): CustomerOwnership[] {
    return [...(this.customersByAgent.get(agentId) ?? [])];
  }

  saveActiveStatus(s: ActiveStatusRecord): void {
    this.activeStatuses.set(s.agentId, s);
  }

  getActiveStatus(agentId: EntityId): ActiveStatusRecord | undefined {
    return this.activeStatuses.get(agentId);
  }

  saveRankRecord(r: RankRecord): void {
    this.rankRecords.set(r.agentId, r);
  }

  getRankRecord(agentId: EntityId): RankRecord | undefined {
    return this.rankRecords.get(agentId);
  }

  listRankRecordsByRank(rank: Rank): RankRecord[] {
    return [...this.rankRecords.values()].filter(r => r.rank === rank);
  }

  savePerformance(s: PerformanceSnapshot): void {
    const list = this.performances.get(s.agentId) ?? [];
    list.push(s);
    this.performances.set(s.agentId, list);
  }

  listPerformanceByAgent(agentId: EntityId): PerformanceSnapshot[] {
    return [...(this.performances.get(agentId) ?? [])];
  }

  saveOverrideRoute(r: OverrideRoute): void {
    this.overrideRoutes.set(r.id, r);
  }

  getOverrideRoute(id: EntityId): OverrideRoute | undefined {
    return this.overrideRoutes.get(id);
  }

  listOverrideRoutesByAgent(agentId: EntityId): OverrideRoute[] {
    return [...this.overrideRoutes.values()].filter(r => r.agentId === agentId || r.fromAgentId === agentId);
  }

  listOverrideRoutesByUpline(agentId: EntityId): OverrideRoute[] {
    return [...this.overrideRoutes.values()].filter(r => r.uplineAgentId === agentId);
  }

  listActiveOverrideRoutes(): OverrideRoute[] {
    return [...this.overrideRoutes.values()].filter(r => r.status === "active");
  }

  saveCommission(c: CommissionRecord): void {
    this.commissions.set(c.id, c);
  }

  getCommission(id: EntityId): CommissionRecord | undefined {
    return this.commissions.get(id);
  }

  listCommissionsByAgent(agentId: EntityId): CommissionRecord[] {
    return [...this.commissions.values()].filter(c => c.agentId === agentId);
  }

  listCommissionsByStatus(status: CommissionStatus): CommissionRecord[] {
    return [...this.commissions.values()].filter(c => c.status === status);
  }

  listCommissionsByPeriod(period: string): CommissionRecord[] {
    return [...this.commissions.values()].filter(c => c.period === period);
  }

  listPendingCommissions(): CommissionRecord[] {
    return [...this.commissions.values()].filter(c => c.status === "pending");
  }

  saveLedgerEntry(e: CommissionLedgerEntry): void {
    const list = this.ledgerEntries.get(e.agentId) ?? [];
    list.push(e);
    this.ledgerEntries.set(e.agentId, list);
  }

  listLedgerByAgent(agentId: EntityId): CommissionLedgerEntry[] {
    return [...(this.ledgerEntries.get(agentId) ?? [])];
  }

  saveRecovery(r: CommissionRecovery): void {
    const list = this.recoveries.get(r.commissionId) ?? [];
    list.push(r);
    this.recoveries.set(r.commissionId, list);
  }

  listRecoveriesByAgent(agentId: EntityId): CommissionRecovery[] {
    return [...this.recoveries.values()].flat().filter(r => r.agentId === agentId);
  }

  listRecoveriesByCommission(commissionId: EntityId): CommissionRecovery[] {
    return [...(this.recoveries.get(commissionId) ?? [])];
  }

  saveLeaderboardEntry(e: LeaderboardEntry): void {
    const key = `${e.period}:${e.metric}`;
    const list = this.leaderboardEntries.get(key) ?? [];
    list.push(e);
    list.sort((a, b) => a.position - b.position);
    this.leaderboardEntries.set(key, list);
  }

  listLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric, limit?: number): LeaderboardEntry[] {
    const key = `${period}:${metric}`;
    const entries = this.leaderboardEntries.get(key) ?? [];
    return limit ? entries.slice(0, limit) : entries;
  }

  getLeaderboardPosition(agentId: EntityId, period: LeaderboardPeriod, metric: LeaderboardMetric): LeaderboardEntry | undefined {
    const key = `${period}:${metric}`;
    return (this.leaderboardEntries.get(key) ?? []).find(e => e.agentId === agentId);
  }

  saveCampaign(c: Campaign): void {
    this.campaigns.set(c.id, c);
  }

  getCampaign(id: EntityId): Campaign | undefined {
    return this.campaigns.get(id);
  }

  listActiveCampaigns(): Campaign[] {
    return [...this.campaigns.values()].filter(c => c.status === "active");
  }

  listCampaignsByRewardType(rewardType: string): Campaign[] {
    return [...this.campaigns.values()].filter(c => c.rewardType === rewardType);
  }

  saveRewardQualification(r: RewardQualification): void {
    const list = this.rewards.get(r.agentId) ?? [];
    list.push(r);
    this.rewards.set(r.agentId, list);
  }

  listRewardsByAgent(agentId: EntityId): RewardQualification[] {
    return [...(this.rewards.get(agentId) ?? [])];
  }

  listRewardsByStatus(status: string): RewardQualification[] {
    return [...this.rewards.values()].flat().filter(r => r.status === status);
  }

  saveAnalytics(a: NetworkAnalyticsEntry): void {
    this.analytics.push(a);
  }

  getLatestAnalytics(): NetworkAnalyticsEntry | undefined {
    return this.analytics.length > 0 ? this.analytics[this.analytics.length - 1] : undefined;
  }

  savePortfolioEntry(p: NetworkPortfolioEntry): void {
    this.portfolioEntries.set(p.agentId, p);
  }

  getPortfolioEntry(agentId: EntityId): NetworkPortfolioEntry | undefined {
    return this.portfolioEntries.get(agentId);
  }

  isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }
}

export function createInMemoryNetworkRepository(): NetworkRepository {
  return new InMemoryNetworkRepository();
}
