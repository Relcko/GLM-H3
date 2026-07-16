import { ErrorCategory, RelckoError } from "@relcko/error";

export class GovernanceError extends RelckoError {
  constructor(message: string, code = "GOVERNANCE_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class ProposalNotFoundError extends GovernanceError {
  constructor(id: string) {
    super(`Proposal ${id} not found`, "PROPOSAL_NOT_FOUND", { id });
  }
}

export class VoteNotFoundError extends GovernanceError {
  constructor(id: string) {
    super(`Vote ${id} not found`, "VOTE_NOT_FOUND", { id });
  }
}

export class DelegationNotFoundError extends GovernanceError {
  constructor(id: string) {
    super(`Delegation ${id} not found`, "DELEGATION_NOT_FOUND", { id });
  }
}

export class DuplicateVoteError extends GovernanceError {
  constructor(proposalId: string, voterId: string) {
    super(`Voter ${voterId} already voted on proposal ${proposalId}`, "DUPLICATE_VOTE", { proposalId, voterId });
  }
}

export class ProposalNotActiveError extends GovernanceError {
  constructor(proposalId: string, status: string) {
    super(`Proposal ${proposalId} is not active (status: ${status})`, "PROPOSAL_NOT_ACTIVE", { proposalId, status });
  }
}

export class VotingPeriodEndedError extends GovernanceError {
  constructor(proposalId: string) {
    super(`Voting period has ended for proposal ${proposalId}`, "VOTING_PERIOD_ENDED", { proposalId });
  }
}

export class SelfDelegationError extends GovernanceError {
  constructor() {
    super("Cannot delegate to yourself", "SELF_DELEGATION");
  }
}

export class QuorumNotMetError extends GovernanceError {
  constructor(proposalId: string) {
    super(`Quorum not met for proposal ${proposalId}`, "QUORUM_NOT_MET", { proposalId });
  }
}

export class SnapshotNotFoundError extends GovernanceError {
  constructor(id: string) {
    super(`Snapshot ${id} not found`, "SNAPSHOT_NOT_FOUND", { id });
  }
}

export class ExecutionError extends GovernanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "EXECUTION_ERROR", metadata);
  }
}

export class AnalyticsError extends GovernanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ANALYTICS_ERROR", metadata);
  }
}

export class SearchError extends GovernanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "SEARCH_ERROR", metadata);
  }
}

export class ActivityError extends GovernanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "ACTIVITY_ERROR", metadata);
  }
}

export class PortfolioError extends GovernanceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "PORTFOLIO_ERROR", metadata);
  }
}
