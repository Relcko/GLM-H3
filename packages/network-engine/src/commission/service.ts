import type { EntityId, Money, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { CommissionRecord, OverrideRoute } from "../types";
import { CommissionType, CommissionStatus, OverrideRouteStatus } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { AgentNotFoundError, CommissionError } from "../errors";
import { TreeTraversalEngine } from "../tree-traversal/service";

export interface CalculateCommissionInput {
  agentId: EntityId;
  amount: Money;
  sourceId: EntityId;
  sourceType: string;
  period: string;
  description?: string;
}

export class CommissionCalculator {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly traversal: TreeTraversalEngine,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  calculatePersonal(actorId: EntityId, input: CalculateCommissionInput): CommissionRecord {
    const agent = this.repository.getAgent(input.agentId);
    if (!agent) throw new AgentNotFoundError(input.agentId as string);

    const commissionAmount = this.computeAmount(input.amount, agent.commissionRate);

    const record: CommissionRecord = {
      id: generateId("commrec") as EntityId,
      agentId: input.agentId,
      type: CommissionType.Personal,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      amount: commissionAmount,
      rate: agent.commissionRate,
      status: CommissionStatus.Pending,
      period: input.period,
      description: input.description,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveCommission(record);

    publishNetworkEvent(this.events, NetworkEventType.PersonalCommissionCalculated, record.id, actorId, {
      commissionId: record.id as string,
      agentId: input.agentId as string,
      amount: commissionAmount.amount.toString(),
      currency: commissionAmount.currency,
    });

    return record;
  }

  calculateOverride(actorId: EntityId, input: CalculateCommissionInput): CommissionRecord[] {
    const records: CommissionRecord[] = [];
    const activeRoutes = this.repository
      .listOverrideRoutesByAgent(input.agentId)
      .filter(r => r.status === OverrideRouteStatus.Active);

    for (const route of activeRoutes) {
      const uplineAgent = this.repository.getAgent(route.uplineAgentId);
      if (!uplineAgent) continue;

      const overrideAmount = this.computeAmount(input.amount, route.commissionRate);

      const record: CommissionRecord = {
        id: generateId("commrec") as EntityId,
        agentId: route.uplineAgentId,
        type: CommissionType.Override,
        sourceId: input.sourceId,
        sourceType: input.sourceType,
        amount: overrideAmount,
        rate: route.commissionRate,
        status: CommissionStatus.Pending,
        period: input.period,
        description: `Override from ${input.agentId}`,
        createdAt: new Date().toISOString(),
      };

      this.repository.saveCommission(record);
      records.push(record);
    }

    if (records.length > 0) {
      publishNetworkEvent(this.events, NetworkEventType.OverrideCommissionCalculated, input.agentId, actorId, {
        agentId: input.agentId as string,
        count: records.length,
        totalAmount: records.reduce((s, r) => s + r.amount.amount, 0n).toString(),
      });
    }

    return records;
  }

  calculateRankBonus(actorId: EntityId, agentId: EntityId, period: string): CommissionRecord | undefined {
    const agent = this.repository.getAgent(agentId);
    if (!agent) return undefined;

    const rankBonusRates: Record<string, number> = {
      bronze: 2, silver: 3, gold: 5, platinum: 7,
      diamond: 10, elite: 12, legend: 15,
    };

    const rate = rankBonusRates[agent.rank];
    if (!rate) return undefined;

    const bonusAmount: Money = {
      amount: (agent.monthlyVolume * BigInt(rate * 100)) / 10000n,
      currency: agent.totalEarnings.currency,
    };

    if (bonusAmount.amount <= 0n) return undefined;

    const record: CommissionRecord = {
      id: generateId("commrec") as EntityId,
      agentId,
      type: CommissionType.RankBonus,
      sourceId: agentId,
      sourceType: "rank_bonus",
      amount: bonusAmount,
      rate,
      status: CommissionStatus.Pending,
      period,
      description: `Rank bonus for ${agent.rank}`,
      rankRequired: agent.rank,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveCommission(record);

    publishNetworkEvent(this.events, NetworkEventType.RankBonusCalculated, record.id, actorId, {
      commissionId: record.id as string,
      agentId: agentId as string,
      amount: bonusAmount.amount.toString(),
      rank: agent.rank,
    });

    return record;
  }

  approve(actorId: EntityId, commissionId: EntityId): CommissionRecord {
    const record = this.repository.getCommission(commissionId);
    if (!record) throw new CommissionError(`Commission ${commissionId} not found`);

    const approved: CommissionRecord = { ...record, status: CommissionStatus.Approved, approvedAt: new Date().toISOString() };
    this.repository.saveCommission(approved);

    publishNetworkEvent(this.events, NetworkEventType.CommissionApproved, commissionId, actorId, {
      commissionId: commissionId as string,
    });

    return approved;
  }

  pay(actorId: EntityId, commissionId: EntityId): CommissionRecord {
    const record = this.repository.getCommission(commissionId);
    if (!record) throw new CommissionError(`Commission ${commissionId} not found`);

    const paid: CommissionRecord = { ...record, status: CommissionStatus.Paid, paidAt: new Date().toISOString() };
    this.repository.saveCommission(paid);

    publishNetworkEvent(this.events, NetworkEventType.CommissionPaid, commissionId, actorId, {
      commissionId: commissionId as string,
    });

    return paid;
  }

  cancel(actorId: EntityId, commissionId: EntityId): CommissionRecord {
    const record = this.repository.getCommission(commissionId);
    if (!record) throw new CommissionError(`Commission ${commissionId} not found`);

    const cancelled: CommissionRecord = { ...record, status: CommissionStatus.Cancelled };
    this.repository.saveCommission(cancelled);

    publishNetworkEvent(this.events, NetworkEventType.CommissionCancelled, commissionId, actorId, {
      commissionId: commissionId as string,
    });

    return cancelled;
  }

  listByAgent(agentId: EntityId): CommissionRecord[] {
    return this.repository.listCommissionsByAgent(agentId);
  }

  listPending(): CommissionRecord[] {
    return this.repository.listPendingCommissions();
  }

  private computeAmount(base: Money, rate: number): Money {
    const amount = (base.amount * BigInt(Math.round(rate * 1e6))) / 100_000_000n;
    return { amount, currency: base.currency };
  }
}
