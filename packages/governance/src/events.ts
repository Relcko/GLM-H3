import type { EntityId, Json, Metadata, Timestamp } from "@relcko/types";
import { createEnvelope } from "@relcko/events";
import type { EventBus } from "@relcko/events";

export const GovernanceEventType = {
  ProposalCreated: "governance.proposal_created",
  ProposalSubmitted: "governance.proposal_submitted",
  ProposalReviewed: "governance.proposal_reviewed",
  ProposalActivated: "governance.proposal_activated",
  ProposalSucceeded: "governance.proposal_succeeded",
  ProposalDefeated: "governance.proposal_defeated",
  ProposalExecuted: "governance.proposal_executed",
  ProposalCancelled: "governance.proposal_cancelled",
  ProposalExpired: "governance.proposal_expired",
  VoteCast: "governance.vote_cast",
  VoteRevoked: "governance.vote_revoked",
  DelegationCreated: "governance.delegation_created",
  DelegationRevoked: "governance.delegation_revoked",
  DelegationRedelegated: "governance.delegation_redelegated",
  QuorumChecked: "governance.quorum_checked",
  SnapshotCreated: "governance.snapshot_created",
  ExecutionQueued: "governance.execution_queued",
  ExecutionStarted: "governance.execution_started",
  ExecutionCompleted: "governance.execution_completed",
  ExecutionFailed: "governance.execution_failed",
  AnalyticsComputed: "governance.analytics_computed",
  PortfolioUpdated: "governance.portfolio_updated",
} as const;

export type GovernanceEventType = (typeof GovernanceEventType)[keyof typeof GovernanceEventType];

export interface PublishEventOptions {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly idempotencyKey?: string;
  readonly metadata?: Metadata;
}

export async function publishGovernanceEvent(
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
    source: "relcko.governance",
    ...options,
  });
  await bus.publish(envelope);
}
