import type { EntityId, Money, Currency, Timestamp } from "@relcko/types";
import type { AgentStatus } from "@relcko/domain-core";

export enum Rank {
  Associate = "associate",
  SeniorAssociate = "senior_associate",
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
  Platinum = "platinum",
  Diamond = "diamond",
  Elite = "elite",
  Legend = "legend",
}

export const RANK_ORDER: readonly Rank[] = [
  Rank.Associate,
  Rank.SeniorAssociate,
  Rank.Bronze,
  Rank.Silver,
  Rank.Gold,
  Rank.Platinum,
  Rank.Diamond,
  Rank.Elite,
  Rank.Legend,
];

export function rankIndex(r: Rank): number {
  return RANK_ORDER.indexOf(r);
}

export enum ActiveStatusValue {
  Qualified = "qualified",
  AtRisk = "at_risk",
  Lapsed = "lapsed",
}

export enum CommissionType {
  Personal = "personal",
  Override = "override",
  ReferralBonus = "referral_bonus",
  RankBonus = "rank_bonus",
  CampaignBonus = "campaign_bonus",
  SpecialIncentive = "special_incentive",
}

export enum CommissionStatus {
  Pending = "pending",
  Approved = "approved",
  Paid = "paid",
  Cancelled = "cancelled",
  Recovered = "recovered",
}

export enum OverrideRouteStatus {
  Active = "active",
  Expired = "expired",
  Recovered = "recovered",
  Lost = "lost",
}

export enum LeaderboardPeriod {
  Weekly = "weekly",
  Monthly = "monthly",
  Quarterly = "quarterly",
  Lifetime = "lifetime",
}

export enum LeaderboardMetric {
  Sales = "sales",
  Volume = "volume",
  Growth = "growth",
  Recruitment = "recruitment",
  Retention = "retention",
  Commissions = "commissions",
}

export enum CampaignStatus {
  Draft = "draft",
  Active = "active",
  Paused = "paused",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum RewardType {
  MonthlyBonus = "monthly_bonus",
  QuarterlyBonus = "quarterly_bonus",
  LuxuryRewards = "luxury_rewards",
  RLKOReward = "rlko_reward",
  NFTBadge = "nft_badge",
  FeeDiscount = "fee_discount",
  PropertyAllocation = "property_allocation",
  LeadershipReward = "leadership_reward",
}

export enum RewardStatus {
  Qualified = "qualified",
  Disbursed = "disbursed",
  Expired = "expired",
}

export interface NetworkAgent {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly code: string;
  readonly status: AgentStatus;
  readonly sponsorId?: EntityId;
  readonly rank: Rank;
  readonly activeStatus: ActiveStatusValue;
  readonly commissionRate: number;
  readonly totalEarnings: Money;
  readonly withdrawnEarnings: Money;
  readonly personalSales: bigint;
  readonly teamSales: bigint;
  readonly monthlyVolume: bigint;
  readonly lifetimeVolume: bigint;
  readonly recruitmentCount: number;
  readonly joinedAt: Timestamp;
  readonly lastActiveAt: Timestamp;
  readonly activeWindowStart?: Timestamp;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface SponsorRelationship {
  readonly id: EntityId;
  readonly sponsorId: EntityId;
  readonly agentId: EntityId;
  readonly depth: number;
  readonly active: boolean;
  readonly createdAt: Timestamp;
}

export interface CustomerOwnership {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly agentId: EntityId;
  readonly permanent: boolean;
  readonly assignedAt: Timestamp;
  readonly modifiedAt?: Timestamp;
  readonly modifiedBy?: EntityId;
}

export interface NetworkTreeNode {
  readonly agentId: EntityId;
  readonly sponsorId?: EntityId;
  readonly depth: number;
  readonly rank: Rank;
  readonly activeStatus: ActiveStatusValue;
  readonly children: readonly NetworkTreeNode[];
  readonly branchSize: number;
  readonly activeBranchCount: number;
  readonly inactiveBranchCount: number;
}

export interface ActiveStatusRecord {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly status: ActiveStatusValue;
  readonly qualifiedDirectSales: bigint;
  readonly rollingWindowStart: Timestamp;
  readonly rollingWindowEnd: Timestamp;
  readonly personalEligible: boolean;
  readonly teamEligible: boolean;
  readonly lastCheckAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export interface RankRecord {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly rank: Rank;
  readonly promotedAt: Timestamp;
  readonly personalSalesRequired: bigint;
  readonly teamSalesRequired: bigint;
  readonly recruitedRequired: number;
  readonly activeLegsRequired: number;
  readonly achieved: boolean;
  readonly createdAt: Timestamp;
}

export interface PerformanceSnapshot {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly period: string;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
  readonly personalSales: bigint;
  readonly teamSales: bigint;
  readonly monthlyVolume: bigint;
  readonly lifetimeVolume: bigint;
  readonly growth: number;
  readonly retention: number;
  readonly recruitmentCount: number;
  readonly qualifiedDirectSales: bigint;
  readonly activeTeamSize: number;
  readonly totalTeamSize: number;
  readonly createdAt: Timestamp;
}

export interface OverrideRoute {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly fromAgentId: EntityId;
  readonly uplineAgentId: EntityId;
  readonly routeLevel: number;
  readonly status: OverrideRouteStatus;
  readonly commissionRate: number;
  readonly activeAt: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly recoveredAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export interface CommissionRecord {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly type: CommissionType;
  readonly sourceId: EntityId;
  readonly sourceType: string;
  readonly amount: Money;
  readonly rate: number;
  readonly status: CommissionStatus;
  readonly period: string;
  readonly description?: string;
  readonly campaignId?: EntityId;
  readonly rankRequired?: Rank;
  readonly recoveredFrom?: EntityId;
  readonly approvedAt?: Timestamp;
  readonly paidAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export interface CommissionLedgerEntry {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly commissionId: EntityId;
  readonly amount: Money;
  readonly entryType: "earned" | "paid" | "recovered" | "cancelled";
  readonly balanceBefore: Money;
  readonly balanceAfter: Money;
  readonly period: string;
  readonly createdAt: Timestamp;
}

export interface CommissionRecovery {
  readonly id: EntityId;
  readonly commissionId: EntityId;
  readonly agentId: EntityId;
  readonly amount: Money;
  readonly reason: string;
  readonly reversed: boolean;
  readonly reversedAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export interface LeaderboardEntry {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly agentName: string;
  readonly agentCode: string;
  readonly rank: Rank;
  readonly period: LeaderboardPeriod;
  readonly metric: LeaderboardMetric;
  readonly value: bigint;
  readonly position: number;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
  readonly createdAt: Timestamp;
}

export interface Campaign {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly rewardType: RewardType;
  readonly status: CampaignStatus;
  readonly qualificationCriteria: Record<string, unknown>;
  readonly rewardValue: Money;
  readonly maxParticipants: number;
  readonly currentParticipants: number;
  readonly startAt: Timestamp;
  readonly endAt: Timestamp;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export interface RewardQualification {
  readonly id: EntityId;
  readonly agentId: EntityId;
  readonly rewardType: RewardType;
  readonly campaignId?: EntityId;
  readonly status: RewardStatus;
  readonly qualifiedAt: Timestamp;
  readonly disbursedAt?: Timestamp;
  readonly amount?: Money;
  readonly description?: string;
  readonly createdAt: Timestamp;
}

export interface NetworkAnalyticsEntry {
  readonly id: EntityId;
  readonly totalAgents: number;
  readonly activeAgents: number;
  readonly totalSponsorships: number;
  readonly totalCustomers: number;
  readonly totalCommissionVolume: Money;
  readonly totalPaidCommissions: Money;
  readonly averageDepth: number;
  readonly period: string;
  readonly periodStart: Timestamp;
  readonly periodEnd: Timestamp;
  readonly createdAt: Timestamp;
}

export interface NetworkPortfolioEntry {
  readonly agentId: EntityId;
  readonly rank: Rank;
  readonly activeStatus: ActiveStatusValue;
  readonly totalEarnings: Money;
  readonly pendingCommissions: Money;
  readonly teamSize: number;
  readonly customerCount: number;
  readonly performanceScore: number;
  readonly computedAt: Timestamp;
}

export interface RankQualification {
  readonly rank: Rank;
  readonly minPersonalSales: bigint;
  readonly minTeamSales: bigint;
  readonly minRecruited: number;
  readonly minActiveLegs: number;
}

export const RANK_QUALIFICATIONS: readonly RankQualification[] = [
  { rank: Rank.Associate, minPersonalSales: 0n, minTeamSales: 0n, minRecruited: 0, minActiveLegs: 0 },
  { rank: Rank.SeniorAssociate, minPersonalSales: 5000n, minTeamSales: 0n, minRecruited: 1, minActiveLegs: 0 },
  { rank: Rank.Bronze, minPersonalSales: 10000n, minTeamSales: 25000n, minRecruited: 3, minActiveLegs: 1 },
  { rank: Rank.Silver, minPersonalSales: 25000n, minTeamSales: 100000n, minRecruited: 5, minActiveLegs: 2 },
  { rank: Rank.Gold, minPersonalSales: 50000n, minTeamSales: 250000n, minRecruited: 7, minActiveLegs: 3 },
  { rank: Rank.Platinum, minPersonalSales: 100000n, minTeamSales: 500000n, minRecruited: 10, minActiveLegs: 4 },
  { rank: Rank.Diamond, minPersonalSales: 250000n, minTeamSales: 1000000n, minRecruited: 15, minActiveLegs: 5 },
  { rank: Rank.Elite, minPersonalSales: 500000n, minTeamSales: 2500000n, minRecruited: 20, minActiveLegs: 6 },
  { rank: Rank.Legend, minPersonalSales: 1000000n, minTeamSales: 5000000n, minRecruited: 30, minActiveLegs: 7 },
];
