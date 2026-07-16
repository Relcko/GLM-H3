import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { LeaderboardEntry, NetworkAgent } from "../types";
import { LeaderboardPeriod, LeaderboardMetric } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";

export class LeaderboardEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeSalesLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const sorted = [...agents].sort((a, b) => Number(b.personalSales - a.personalSales));
    return this.buildEntries(sorted, period, LeaderboardMetric.Sales, a => a.personalSales);
  }

  computeVolumeLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const sorted = [...agents].sort((a, b) => Number(b.lifetimeVolume - a.lifetimeVolume));
    return this.buildEntries(sorted, period, LeaderboardMetric.Volume, a => a.lifetimeVolume);
  }

  computeRecruitmentLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const sorted = [...agents].sort((a, b) => b.recruitmentCount - a.recruitmentCount);
    return this.buildEntries(sorted, period, LeaderboardMetric.Recruitment, a => BigInt(a.recruitmentCount));
  }

  computeGrowthLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const withGrowth = agents.map(a => {
      const perf = this.repository.listPerformanceByAgent(a.id);
      const growth = perf.length > 0 ? perf[perf.length - 1].growth : 0;
      return { agent: a, growth };
    });
    const sorted = withGrowth.sort((a, b) => b.growth - a.growth);
    return this.buildEntries(sorted.map(s => s.agent), period, LeaderboardMetric.Growth, a => {
      const perf = this.repository.listPerformanceByAgent(a.id);
      return BigInt(Math.round((perf.length > 0 ? perf[perf.length - 1].growth : 0) * 100));
    });
  }

  computeRetentionLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const withRetention = agents.map(a => {
      const perf = this.repository.listPerformanceByAgent(a.id);
      const retention = perf.length > 0 ? perf[perf.length - 1].retention : 0;
      return { agent: a, retention };
    });
    const sorted = withRetention.sort((a, b) => b.retention - a.retention);
    return this.buildEntries(sorted.map(s => s.agent), period, LeaderboardMetric.Retention, a => {
      const perf = this.repository.listPerformanceByAgent(a.id);
      return BigInt(Math.round((perf.length > 0 ? perf[perf.length - 1].retention : 0) * 100));
    });
  }

  computeCommissionLeaderboard(period: LeaderboardPeriod): LeaderboardEntry[] {
    const agents = this.repository.listActiveAgents();
    const withCommissions = agents.map(a => {
      const commissions = this.repository.listCommissionsByAgent(a.id);
      const total = commissions.reduce((s, c) => s + c.amount.amount, 0n);
      return { agent: a, total };
    });
    const sorted = withCommissions.sort((a, b) => Number(b.total - a.total));
    return this.buildEntries(sorted.map(s => s.agent), period, LeaderboardMetric.Commissions, a => {
      return this.repository.listCommissionsByAgent(a.id).reduce((s, c) => s + c.amount.amount, 0n);
    });
  }

  getLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric, limit?: number): LeaderboardEntry[] {
    return this.repository.listLeaderboard(period, metric, limit);
  }

  getPosition(agentId: EntityId, period: LeaderboardPeriod, metric: LeaderboardMetric): LeaderboardEntry | undefined {
    return this.repository.getLeaderboardPosition(agentId, period, metric);
  }

  private buildEntries(
    agents: NetworkAgent[],
    period: LeaderboardPeriod,
    metric: LeaderboardMetric,
    valueFn: (a: NetworkAgent) => bigint,
  ): LeaderboardEntry[] {
    const now = new Date();
    const entries: LeaderboardEntry[] = agents.slice(0, 100).map((agent, idx) => ({
      id: generateId("lbentry") as EntityId,
      agentId: agent.id,
      agentName: agent.code,
      agentCode: agent.code,
      rank: agent.rank,
      period,
      metric,
      value: valueFn(agent),
      position: idx + 1,
      periodStart: now.toISOString(),
      periodEnd: now.toISOString(),
      createdAt: now.toISOString(),
    }));

    for (const e of entries) {
      this.repository.saveLeaderboardEntry(e);
    }

    return entries;
  }
}
