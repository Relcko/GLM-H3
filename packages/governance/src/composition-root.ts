import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { GovernanceRepository } from "./repository";
import { InMemoryGovernanceRepository } from "./in-memory-repository";

import { ProposalService } from "./proposal/service";
import { ProposalLifecycleEngine } from "./lifecycle/service";
import { VotingEngine } from "./voting/service";
import { DelegationEngine } from "./delegation/service";
import { QuorumEngine } from "./quorum/service";
import { ExecutionOrchestrator } from "./execution/service";
import { GovernanceAnalytics } from "./analytics/service";
import { GovernanceTimeline } from "./timeline/service";
import { GovernanceSearch } from "./search/service";
import { GovernanceActivity } from "./activity/service";
import { GovernancePortfolioAdapter } from "./portfolio-adapter/service";
import { GovernanceSnapshotEngine } from "./snapshot/service";
import { VotingPowerCalculator } from "./voting-power/service";
import { GovernanceEventAdapter } from "./event-adapter/service";

export class GovernanceModule {
  constructor(
    public readonly proposalService: ProposalService,
    public readonly lifecycleEngine: ProposalLifecycleEngine,
    public readonly votingEngine: VotingEngine,
    public readonly delegationEngine: DelegationEngine,
    public readonly quorumEngine: QuorumEngine,
    public readonly executionOrchestrator: ExecutionOrchestrator,
    public readonly analytics: GovernanceAnalytics,
    public readonly timeline: GovernanceTimeline,
    public readonly search: GovernanceSearch,
    public readonly activity: GovernanceActivity,
    public readonly portfolioAdapter: GovernancePortfolioAdapter,
    public readonly snapshotEngine: GovernanceSnapshotEngine,
    public readonly votingPowerCalculator: VotingPowerCalculator,
    public readonly eventAdapter: GovernanceEventAdapter,
    public readonly events: EventBus,
    public readonly performance?: PerformanceModuleContext,
  ) {}
}

export interface GovernanceModuleOptions {
  repository?: GovernanceRepository;
  events: EventBus;
  logger?: Logger;
  autoSubscribe?: boolean;
  performance?: PerformanceModuleContext;
}

export function createGovernanceModule(options: GovernanceModuleOptions): GovernanceModule {
  const repository = options.repository ?? new InMemoryGovernanceRepository();
  const { events, logger } = options;
  const performance = options.performance;

  const proposalService = new ProposalService(repository, events, logger);
  const lifecycleEngine = new ProposalLifecycleEngine(repository, events, logger);
  const votingEngine = new VotingEngine(repository, events, logger);
  const delegationEngine = new DelegationEngine(repository, events, logger);
  const quorumEngine = new QuorumEngine(repository, events, logger);
  const executionOrchestrator = new ExecutionOrchestrator(repository, events, logger);
  const analytics = new GovernanceAnalytics(repository, events, logger);
  const timeline = new GovernanceTimeline(repository, events, logger);
  const search = new GovernanceSearch(repository, events, logger);
  const activity = new GovernanceActivity(repository, events, logger);
  const portfolioAdapter = new GovernancePortfolioAdapter(repository, events, logger);
  const snapshotEngine = new GovernanceSnapshotEngine(repository, events, logger);
  const votingPowerCalculator = new VotingPowerCalculator(repository, logger);
  const eventAdapter = new GovernanceEventAdapter(events, logger, executionOrchestrator, performance);

  if (options.autoSubscribe !== false) {
    eventAdapter.subscribeToExternalEvents();
    eventAdapter.subscribeToInternalEvents();
  }

  return new GovernanceModule(
    proposalService, lifecycleEngine, votingEngine, delegationEngine,
    quorumEngine, executionOrchestrator, analytics, timeline,
    search, activity, portfolioAdapter, snapshotEngine,
    votingPowerCalculator, eventAdapter, events, performance,
  );
}
