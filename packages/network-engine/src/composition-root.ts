import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PermissionResolver } from "@relcko/permission";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { NetworkRepository } from "./repository";
import { InMemoryNetworkRepository } from "./in-memory-repository";

import { NetworkService } from "./network/service";
import { SponsorService } from "./sponsor/service";
import { CustomerOwnershipService } from "./customer-ownership/service";
import { AgentRegistry } from "./agent-registry/service";
import { NetworkTreeEngine } from "./network-tree/service";
import { TreeTraversalEngine } from "./tree-traversal/service";
import { ActiveStatusEngine } from "./active-status/service";
import { QualificationEngine } from "./qualification/service";
import { RankEngine } from "./rank/service";
import { PerformanceEngine } from "./performance/service";
import { OverrideRoutingEngine } from "./override-routing/service";
import { CommissionCalculator } from "./commission/service";
import { CommissionLedgerAdapter } from "./commission-ledger/service";
import { CommissionRecoveryEngine } from "./commission-recovery/service";
import { LeaderboardEngine } from "./leaderboard/service";
import { RewardQualificationEngine } from "./reward-qualification/service";
import { CampaignEngine } from "./campaign/service";
import { NetworkAnalytics } from "./network-analytics/service";
import { NetworkPortfolioAdapter } from "./network-portfolio/adapter";
import { TeamService } from "./team/service";

export class NetworkEngine {
  constructor(
    public readonly networkService: NetworkService,
    public readonly sponsorService: SponsorService,
    public readonly customerOwnershipService: CustomerOwnershipService,
    public readonly agentRegistry: AgentRegistry,
    public readonly networkTreeEngine: NetworkTreeEngine,
    public readonly treeTraversalEngine: TreeTraversalEngine,
    public readonly activeStatusEngine: ActiveStatusEngine,
    public readonly qualificationEngine: QualificationEngine,
    public readonly rankEngine: RankEngine,
    public readonly performanceEngine: PerformanceEngine,
    public readonly overrideRoutingEngine: OverrideRoutingEngine,
    public readonly commissionCalculator: CommissionCalculator,
    public readonly commissionLedgerAdapter: CommissionLedgerAdapter,
    public readonly commissionRecoveryEngine: CommissionRecoveryEngine,
    public readonly leaderboardEngine: LeaderboardEngine,
    public readonly rewardQualificationEngine: RewardQualificationEngine,
    public readonly campaignEngine: CampaignEngine,
    public readonly networkAnalytics: NetworkAnalytics,
    public readonly networkPortfolioAdapter: NetworkPortfolioAdapter,
    public readonly teamService: TeamService,
    public readonly events: EventBus,
    public readonly performance?: PerformanceModuleContext,
  ) {}
}

export interface NetworkEngineOptions {
  repository?: NetworkRepository;
  events: EventBus;
  logger?: Logger;
  permission?: PermissionResolver;
  performance?: PerformanceModuleContext;
}

export function createNetworkEngine(options: NetworkEngineOptions): NetworkEngine {
  const repository = options.repository ?? new InMemoryNetworkRepository();
  const { events, logger } = options;

  const treeTraversal = new TreeTraversalEngine(repository, logger);
  const qualification = new QualificationEngine(repository, treeTraversal, logger);
  const activeStatus = new ActiveStatusEngine(repository, events, logger);

  const networkService = new NetworkService(repository, events, logger);
  const sponsorService = new SponsorService(repository, events, logger);
  const customerOwnershipService = new CustomerOwnershipService(repository, events, logger);
  const agentRegistry = new AgentRegistry(repository, events, logger);
  const networkTreeEngine = new NetworkTreeEngine(repository, logger);
  const rankEngine = new RankEngine(repository, qualification, events, logger);
  const performanceEngine = new PerformanceEngine(repository, treeTraversal, events, logger);
  const overrideRoutingEngine = new OverrideRoutingEngine(repository, treeTraversal, events, logger);
  const commissionCalculator = new CommissionCalculator(repository, treeTraversal, events, logger);
  const commissionLedgerAdapter = new CommissionLedgerAdapter(repository, logger);
  const commissionRecoveryEngine = new CommissionRecoveryEngine(repository, events, logger);
  const leaderboardEngine = new LeaderboardEngine(repository, events, logger);
  const rewardQualificationEngine = new RewardQualificationEngine(repository, events, logger);
  const campaignEngine = new CampaignEngine(repository, events, logger);
  const networkAnalytics = new NetworkAnalytics(repository, events, logger);
  const networkPortfolioAdapter = new NetworkPortfolioAdapter(repository, events, logger);
  const teamService = new TeamService(repository, events, logger);

  return new NetworkEngine(
    networkService,
    sponsorService,
    customerOwnershipService,
    agentRegistry,
    networkTreeEngine,
    treeTraversal,
    activeStatus,
    qualification,
    rankEngine,
    performanceEngine,
    overrideRoutingEngine,
    commissionCalculator,
    commissionLedgerAdapter,
    commissionRecoveryEngine,
    leaderboardEngine,
    rewardQualificationEngine,
    campaignEngine,
    networkAnalytics,
    networkPortfolioAdapter,
    teamService,
    events,
    options.performance,
  );
}
