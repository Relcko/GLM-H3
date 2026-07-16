import type { EntityId, Money } from "@relcko/types";
import type {
  NetworkAgent,
  SponsorRelationship,
  CustomerOwnership,
  NetworkTreeNode,
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
  CommissionType,
  CommissionStatus,
  LeaderboardPeriod,
  LeaderboardMetric,
} from "./types";

export interface NetworkRepository {
  saveAgent(a: NetworkAgent): void;
  getAgent(id: EntityId): NetworkAgent | undefined;
  getAgentByUserId(userId: EntityId): NetworkAgent | undefined;
  getAgentByCode(code: string): NetworkAgent | undefined;
  listActiveAgents(): NetworkAgent[];
  listAgentsByRank(rank: Rank): NetworkAgent[];
  listAgentsBySponsor(sponsorId: EntityId): NetworkAgent[];
  listAgentsByStatus(status: ActiveStatusValue): NetworkAgent[];

  saveSponsor(s: SponsorRelationship): void;
  getSponsor(id: EntityId): SponsorRelationship | undefined;
  getSponsorByAgent(agentId: EntityId): SponsorRelationship | undefined;
  listSponsorsBySponsor(sponsorId: EntityId): SponsorRelationship[];
  listDownline(agentId: EntityId): SponsorRelationship[];

  saveCustomerOwnership(c: CustomerOwnership): void;
  getCustomerOwnership(investorId: EntityId): CustomerOwnership | undefined;
  listCustomersByAgent(agentId: EntityId): CustomerOwnership[];

  saveActiveStatus(s: ActiveStatusRecord): void;
  getActiveStatus(agentId: EntityId): ActiveStatusRecord | undefined;

  saveRankRecord(r: RankRecord): void;
  getRankRecord(agentId: EntityId): RankRecord | undefined;
  listRankRecordsByRank(rank: Rank): RankRecord[];

  savePerformance(s: PerformanceSnapshot): void;
  listPerformanceByAgent(agentId: EntityId): PerformanceSnapshot[];

  saveOverrideRoute(r: OverrideRoute): void;
  getOverrideRoute(id: EntityId): OverrideRoute | undefined;
  listOverrideRoutesByAgent(agentId: EntityId): OverrideRoute[];
  listOverrideRoutesByUpline(agentId: EntityId): OverrideRoute[];
  listActiveOverrideRoutes(): OverrideRoute[];

  saveCommission(c: CommissionRecord): void;
  getCommission(id: EntityId): CommissionRecord | undefined;
  listCommissionsByAgent(agentId: EntityId): CommissionRecord[];
  listCommissionsByStatus(status: CommissionStatus): CommissionRecord[];
  listCommissionsByPeriod(period: string): CommissionRecord[];
  listPendingCommissions(): CommissionRecord[];

  saveLedgerEntry(e: CommissionLedgerEntry): void;
  listLedgerByAgent(agentId: EntityId): CommissionLedgerEntry[];

  saveRecovery(r: CommissionRecovery): void;
  listRecoveriesByAgent(agentId: EntityId): CommissionRecovery[];
  listRecoveriesByCommission(commissionId: EntityId): CommissionRecovery[];

  saveLeaderboardEntry(e: LeaderboardEntry): void;
  listLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric, limit?: number): LeaderboardEntry[];
  getLeaderboardPosition(agentId: EntityId, period: LeaderboardPeriod, metric: LeaderboardMetric): LeaderboardEntry | undefined;

  saveCampaign(c: Campaign): void;
  getCampaign(id: EntityId): Campaign | undefined;
  listActiveCampaigns(): Campaign[];
  listCampaignsByRewardType(rewardType: string): Campaign[];

  saveRewardQualification(r: RewardQualification): void;
  listRewardsByAgent(agentId: EntityId): RewardQualification[];
  listRewardsByStatus(status: string): RewardQualification[];

  saveAnalytics(a: NetworkAnalyticsEntry): void;
  getLatestAnalytics(): NetworkAnalyticsEntry | undefined;

  savePortfolioEntry(p: NetworkPortfolioEntry): void;
  getPortfolioEntry(agentId: EntityId): NetworkPortfolioEntry | undefined;

  isEventProcessed(eventId: string): boolean;
  markEventProcessed(eventId: string): void;
}
