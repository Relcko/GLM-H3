import type { EntityId, Json, Metadata, Timestamp } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const NetworkEventType = {
  AgentRegistered: "network.agent_registered",
  AgentActivated: "network.agent_activated",
  AgentSuspended: "network.agent_suspended",
  AgentTerminated: "network.agent_terminated",
  AgentReactivated: "network.agent_reactivated",
  SponsorLinked: "network.sponsor_linked",
  SponsorUnlinked: "network.sponsor_unlinked",
  CustomerAssigned: "network.customer_assigned",
  CustomerReassigned: "network.customer_reassigned",
  RankPromoted: "network.rank_promoted",
  RankDemoted: "network.rank_demoted",
  ActiveStatusChanged: "network.active_status_changed",
  ActiveStatusExpired: "network.active_status_expired",
  ActiveStatusReactivated: "network.active_status_reactivated",
  QualifiedDirectSale: "network.qualified_direct_sale",
  CommissionCalculated: "network.commission_calculated",
  CommissionApproved: "network.commission_approved",
  CommissionPaid: "network.commission_paid",
  CommissionCancelled: "network.commission_cancelled",
  CommissionRecovered: "network.commission_recovered",
  OverrideRouteCreated: "network.override_route_created",
  OverrideRouteExpired: "network.override_route_expired",
  OverrideRouteRecovered: "network.override_route_recovered",
  PersonalCommissionCalculated: "network.personal_commission_calculated",
  OverrideCommissionCalculated: "network.override_commission_calculated",
  ReferralBonusCalculated: "network.referral_bonus_calculated",
  RankBonusCalculated: "network.rank_bonus_calculated",
  CampaignBonusCalculated: "network.campaign_bonus_calculated",
  SpecialIncentiveCalculated: "network.special_incentive_calculated",
  PerformanceSnapshotCreated: "network.performance_snapshot_created",
  LeaderboardUpdated: "network.leaderboard_updated",
  CampaignCreated: "network.campaign_created",
  CampaignStarted: "network.campaign_started",
  CampaignCompleted: "network.campaign_completed",
  CampaignCancelled: "network.campaign_cancelled",
  RewardQualified: "network.reward_qualified",
  RewardDisbursed: "network.reward_disbursed",
  NetworkAnalyticsUpdated: "network.network_analytics_updated",
  PortfolioUpdated: "network.portfolio_updated",
  TeamCreated: "network.team_created",
  TeamMemberAdded: "network.team_member_added",
  TeamMemberRemoved: "network.team_member_removed",
  TeamRoleChanged: "network.team_role_changed",
  TeamMoved: "network.team_moved",
} as const;

export type NetworkEventType = (typeof NetworkEventType)[keyof typeof NetworkEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export async function publishNetworkEvent(
  bus: EventBus,
  type: string,
  aggregateId: EntityId,
  actorId: EntityId,
  payload: Json,
  options: PublishEventOptions = {},
): Promise<void> {
  const envelope = createEnvelope({
    type,
    aggregateId,
    actorId,
    payload,
    source: "relcko.network-engine",
    ...options,
  });
  await bus.publish(envelope);
}

export interface NetworkEventPayload {
  readonly eventType: string;
  readonly aggregateId: EntityId;
  readonly actorId: EntityId;
  readonly payload: Json;
  readonly timestamp: Timestamp;
  readonly source: string;
}
