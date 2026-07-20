export type { GovernanceRepository } from "./repository";
export { InMemoryGovernanceRepository } from "./in-memory-repository";

export { ProposalService } from "./proposal/service";
export type { CreateProposalInput } from "./proposal/service";
export { ProposalLifecycleEngine } from "./lifecycle/service";
export { VotingEngine } from "./voting/service";
export { DelegationEngine } from "./delegation/service";
export { QuorumEngine } from "./quorum/service";
export { ExecutionOrchestrator } from "./execution/service";
export { GovernanceAnalytics } from "./analytics/service";
export { GovernanceTimeline } from "./timeline/service";
export { GovernanceSearch } from "./search/service";
export { GovernanceActivity } from "./activity/service";
export { GovernancePortfolioAdapter } from "./portfolio-adapter/service";
export { GovernanceSnapshotEngine } from "./snapshot/service";
export { VotingPowerCalculator } from "./voting-power/service";
export { GovernanceEventAdapter } from "./event-adapter/service";

export { GovernanceModule, createGovernanceModule } from "./composition-root";
export type { GovernanceModuleOptions } from "./composition-root";

export * from "./types";
export * from "./events";
export * from "./errors";
export { createProposalSchema, castVoteSchema, delegationSchema, governanceSearchSchema } from "./validation";
