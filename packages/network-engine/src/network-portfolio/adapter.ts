import type { EntityId, Money, Currency } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { NetworkPortfolioEntry } from "../types";
import { ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError } from "../errors";

export class NetworkPortfolioAdapter {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeEntry(actorId: EntityId, agentId: EntityId): NetworkPortfolioEntry {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const downline = this.getDownlineCount(agentId);
    const customers = this.repository.listCustomersByAgent(agentId);
    const pendingCommissions = this.repository
      .listCommissionsByAgent(agentId)
      .filter(c => c.status === "pending")
      .reduce((s, c) => s + c.amount.amount, 0n);

    const perfSnapshots = this.repository.listPerformanceByAgent(agentId);
    const avgGrowth = perfSnapshots.length > 0
      ? perfSnapshots.reduce((s, p) => s + p.growth, 0) / perfSnapshots.length
      : 0;

    const performanceScore = this.calculateScore(agent, avgGrowth);

    const entry: NetworkPortfolioEntry = {
      agentId,
      rank: agent.rank,
      activeStatus: agent.activeStatus,
      totalEarnings: agent.totalEarnings,
      pendingCommissions: { amount: pendingCommissions, currency: agent.totalEarnings.currency },
      teamSize: downline,
      customerCount: customers.length,
      performanceScore,
      computedAt: new Date().toISOString(),
    };

    this.repository.savePortfolioEntry(entry);

    publishNetworkEvent(this.events, NetworkEventType.PortfolioUpdated, agentId, actorId, {
      agentId: agentId as string,
      performanceScore,
    });

    this.logger?.info("portfolio entry computed", { agentId, performanceScore });

    return entry;
  }

  getEntry(agentId: EntityId): NetworkPortfolioEntry | undefined {
    return this.repository.getPortfolioEntry(agentId);
  }

  private getDownlineCount(agentId: EntityId): number {
    const direct = this.repository.listSponsorsBySponsor(agentId);
    let count = direct.length;
    for (const d of direct) {
      count += this.getDownlineCount(d.agentId);
    }
    return count;
  }

  private calculateScore(agent: { activeStatus: string; rank: string; personalSales: bigint; recruitmentCount: number }, avgGrowth: number): number {
    let score = 0;
    if (agent.activeStatus === ActiveStatusValue.Qualified) score += 20;
    score += Math.min(Number(agent.personalSales) / 10000, 30);
    score += Math.min(agent.recruitmentCount * 5, 20);
    score += Math.min(avgGrowth * 100, 20);
    score += agent.rank !== "associate" ? 10 : 0;
    return Math.min(Math.round(score), 100);
  }
}
