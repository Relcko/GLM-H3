import type { EntityId, Money, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { NetworkAnalyticsEntry } from "../types";
import { ActiveStatusValue } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";

export class NetworkAnalytics {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeSnapshot(actorId: EntityId, period: string): NetworkAnalyticsEntry {
    const allAgents = this.repository.listActiveAgents();
    const qualifiedAgents = allAgents.filter(a => a.activeStatus === ActiveStatusValue.Qualified);
    const totalSponsorships = this.repository.listActiveAgents().filter(a => a.sponsorId).length;

    const customers = new Set<EntityId>();
    for (const agent of allAgents) {
      const owned = this.repository.listCustomersByAgent(agent.id);
      for (const c of owned) customers.add(c.investorId);
    }

    const allCommissions = allAgents.flatMap(a => this.repository.listCommissionsByAgent(a.id));
    const totalVolume = allCommissions.reduce((s, c) => s + c.amount.amount, 0n);
    const totalPaid = allCommissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount.amount, 0n);

    const depths = allAgents.map(a => {
      const rel = this.repository.getSponsorByAgent(a.id);
      return rel?.depth ?? 0;
    });
    const avgDepth = depths.length > 0 ? depths.reduce((s, d) => s + d, 0) / depths.length : 0;

    const entry: NetworkAnalyticsEntry = {
      id: generateId("netanalytics") as EntityId,
      totalAgents: allAgents.length,
      activeAgents: qualifiedAgents.length,
      totalSponsorships,
      totalCustomers: customers.size,
      totalCommissionVolume: { amount: totalVolume, currency: "USDT" as Currency },
      totalPaidCommissions: { amount: totalPaid, currency: "USDT" as Currency },
      averageDepth: avgDepth,
      period,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveAnalytics(entry);

    publishNetworkEvent(this.events, NetworkEventType.NetworkAnalyticsUpdated, actorId, actorId, {
      entryId: entry.id as string,
      period,
      totalAgents: entry.totalAgents,
    });

    this.logger?.info("network analytics computed", { period, totalAgents: entry.totalAgents });

    return entry;
  }

  getLatest(): NetworkAnalyticsEntry | undefined {
    return this.repository.getLatestAnalytics();
  }
}
