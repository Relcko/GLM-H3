import { ErrorCategory, RelckoError } from "@relcko/error";

export class NetworkEngineError extends RelckoError {
  constructor(message: string, code = "NETWORK_ENGINE_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class AgentNotFoundError extends NetworkEngineError {
  constructor(id: string) {
    super(`Agent ${id} not found`, "AGENT_NOT_FOUND", { id });
  }
}

export class SponsorNotFoundError extends NetworkEngineError {
  constructor(id: string) {
    super(`Sponsor ${id} not found`, "SPONSOR_NOT_FOUND", { id });
  }
}

export class CustomerNotFoundError extends NetworkEngineError {
  constructor(id: string) {
    super(`Customer ${id} not found`, "CUSTOMER_NOT_FOUND", { id });
  }
}

export class CustomerAlreadyOwnedError extends NetworkEngineError {
  constructor(investorId: string) {
    super(`Investor ${investorId} already has an owning agent`, "CUSTOMER_ALREADY_OWNED", { investorId });
  }
}

export class TreeTraversalError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "TREE_TRAVERSAL_ERROR", metadata);
  }
}

export class CompressionError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "COMPRESSION_ERROR", metadata);
  }
}

export class ActiveStatusError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ACTIVE_STATUS_ERROR", metadata);
  }
}

export class RankError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "RANK_ERROR", metadata);
  }
}

export class QualificationError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "QUALIFICATION_ERROR", metadata);
  }
}

export class PerformanceError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "PERFORMANCE_ERROR", metadata);
  }
}

export class OverrideRoutingError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "OVERRIDE_ROUTING_ERROR", metadata);
  }
}

export class CommissionError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "COMMISSION_ERROR", metadata);
  }
}

export class CommissionLedgerError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "COMMISSION_LEDGER_ERROR", metadata);
  }
}

export class CommissionRecoveryError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "COMMISSION_RECOVERY_ERROR", metadata);
  }
}

export class LeaderboardError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "LEADERBOARD_ERROR", metadata);
  }
}

export class RewardError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "REWARD_ERROR", metadata);
  }
}

export class CampaignError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "CAMPAIGN_ERROR", metadata);
  }
}

export class NetworkAnalyticsError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "NETWORK_ANALYTICS_ERROR", metadata);
  }
}

export class NetworkPortfolioError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "NETWORK_PORTFOLIO_ERROR", metadata);
  }
}

export class AgentNotActiveError extends NetworkEngineError {
  constructor(agentId: string) {
    super(`Agent ${agentId} is not active`, "AGENT_NOT_ACTIVE", { agentId });
  }
}

export class AgentNotQualifiedError extends NetworkEngineError {
  constructor(agentId: string, reason: string) {
    super(`Agent ${agentId} not qualified: ${reason}`, "AGENT_NOT_QUALIFIED", { agentId, reason });
  }
}

export class DuplicateSponsorError extends NetworkEngineError {
  constructor(agentId: string) {
    super(`Agent ${agentId} already has a sponsor`, "DUPLICATE_SPONSOR", { agentId });
  }
}

export class SelfSponsorError extends NetworkEngineError {
  constructor() {
    super("Agent cannot sponsor themselves", "SELF_SPONSOR");
  }
}

export class CircularSponsorError extends NetworkEngineError {
  constructor() {
    super("Circular sponsorship detected", "CIRCULAR_SPONSOR");
  }
}

export class TeamError extends NetworkEngineError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "TEAM_ERROR", metadata);
  }
}

export class TeamNotFoundError extends NetworkEngineError {
  constructor(id: string) {
    super(`Team ${id} not found`, "TEAM_NOT_FOUND", { id });
  }
}

export class TeamMemberNotFoundError extends NetworkEngineError {
  constructor(id: string) {
    super(`Team member ${id} not found`, "TEAM_MEMBER_NOT_FOUND", { id });
  }
}

export class DuplicateTeamMembershipError extends NetworkEngineError {
  constructor(memberId: string, teamId: string) {
    super(`Member ${memberId} already belongs to team ${teamId}`, "DUPLICATE_TEAM_MEMBERSHIP", { memberId, teamId });
  }
}

export class CircularTeamHierarchyError extends NetworkEngineError {
  constructor(teamId: string, parentId: string) {
    super(`Moving team ${teamId} under ${parentId} would create a cycle`, "CIRCULAR_TEAM_HIERARCHY", { teamId, parentId });
  }
}

export class InactiveTeamMemberError extends NetworkEngineError {
  constructor(memberId: string) {
    super(`Member ${memberId} is inactive and cannot perform management actions`, "INACTIVE_TEAM_MEMBER", { memberId });
  }
}

export class TeamOwnerInactiveError extends NetworkEngineError {
  constructor(teamId: string, ownerId: string) {
    super(`Team ${teamId} owner ${ownerId} is inactive`, "TEAM_OWNER_INACTIVE", { teamId, ownerId });
  }
}

export class ParentTeamNotFoundError extends NetworkEngineError {
  constructor(parentId: string) {
    super(`Parent team ${parentId} not found`, "PARENT_TEAM_NOT_FOUND", { parentId });
  }
}
