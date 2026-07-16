import type { EntityId, Money, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { PerformanceSnapshot, NetworkAgent } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, PerformanceError } from "../errors";
import { TreeTraversalEngine } from "../tree-traversal/service";

export interface RecordSaleInput {
  agentId: EntityId;
  amount: bigint;
  currency: Currency;
  period: string;
}

export class PerformanceEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly traversal: TreeTraversalEngine,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  recordPersonalSale(actorId: EntityId, input: RecordSaleInput): NetworkAgent {
    const agent = this.repository.getAgent(input.agentId);
    if (!agent) throw new AgentNotFoundError(input.agentId as string);

    const updated: NetworkAgent = {
      ...agent,
      personalSales: agent.personalSales + input.amount,
      monthlyVolume: agent.monthlyVolume + input.amount,
      lifetimeVolume: agent.lifetimeVolume + input.amount,
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveAgent(updated);

    const upline = this.traversal.getUpline(input.agentId);
    for (const u of upline) {
      const uplineAgent = this.repository.getAgent(u.agentId);
      if (uplineAgent) {
        const updatedUpline: NetworkAgent = {
          ...uplineAgent,
          teamSales: uplineAgent.teamSales + input.amount,
          monthlyVolume: uplineAgent.monthlyVolume + input.amount,
          lifetimeVolume: uplineAgent.lifetimeVolume + input.amount,
          updatedAt: new Date().toISOString(),
        };
        this.repository.saveAgent(updatedUpline);
      }
    }

    return updated;
  }

  createSnapshot(actorId: EntityId, agentId: EntityId, period: string): PerformanceSnapshot {
    const agent = this.repository.getAgent(agentId);
    if (!agent) throw new AgentNotFoundError(agentId as string);

    const downline = this.traversal.getDownline(agentId);
    const activeTeam = downline.filter(d => d.active);
    const teamSales = downline.reduce((sum, d) => sum + d.teamSales, 0n);
    const prevSnapshot = this.repository.listPerformanceByAgent(agentId).pop();

    const growth = prevSnapshot
      ? Number(agent.monthlyVolume - prevSnapshot.monthlyVolume) / Math.max(Number(prevSnapshot.monthlyVolume), 1)
      : 0;

    const activeNow = agent.activeStatus === "qualified" ? 1 : 0;
    const retention = prevSnapshot
      ? (prevSnapshot.activeTeamSize > 0 ? activeNow / prevSnapshot.activeTeamSize : 0)
      : 0;

    const snapshot: PerformanceSnapshot = {
      id: generateId("perfsnap") as EntityId,
      agentId,
      period,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      personalSales: agent.personalSales,
      teamSales,
      monthlyVolume: agent.monthlyVolume,
      lifetimeVolume: agent.lifetimeVolume,
      growth,
      retention,
      recruitmentCount: agent.recruitmentCount,
      qualifiedDirectSales: agent.personalSales,
      activeTeamSize: activeTeam.length,
      totalTeamSize: downline.length,
      createdAt: new Date().toISOString(),
    };

    this.repository.savePerformance(snapshot);

    publishNetworkEvent(this.events, NetworkEventType.PerformanceSnapshotCreated, agentId, actorId, {
      agentId: agentId as string,
      period,
    });

    return snapshot;
  }

  listSnapshots(agentId: EntityId): PerformanceSnapshot[] {
    return this.repository.listPerformanceByAgent(agentId);
  }
}
