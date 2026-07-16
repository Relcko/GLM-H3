import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { NetworkStatsEntry } from "../types";

export class NetworkStatsAdapter {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly logger?: Logger,
  ) {}

  computeStats(actorId: EntityId, investorId: EntityId, networkStats: NetworkStatsEntry): NetworkStatsEntry {
    this.repository.saveNetworkStats(investorId, networkStats);
    this.logger?.info("network stats saved", { investorId, rank: networkStats.rank });
    return networkStats;
  }

  getStats(investorId: EntityId): NetworkStatsEntry | undefined {
    return this.repository.getNetworkStats(investorId);
  }

  getRankDisplay(investorId: EntityId): string {
    const stats = this.repository.getNetworkStats(investorId);
    if (!stats) return "Unranked";
    return stats.rank.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
}
