import { computeCommission, createCommission, CommissionStatus } from "@relcko/domain-core";
import type { Commission } from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { Investment } from "@relcko/domain-core";
import { InvestmentEventType, publishInvestmentEvent } from "../events";

export interface CommissionAdapterOptions {
  events: EventBus;
  logger?: Logger;
  defaultRate?: number;
  defaultAgentId?: EntityId;
}

export class CommissionAdapter {
  private readonly defaultRate: number;
  private readonly defaultAgentId?: EntityId;

  constructor(private readonly options: CommissionAdapterOptions) {
    this.defaultRate = options.defaultRate ?? 5;
    this.defaultAgentId = options.defaultAgentId;
  }

  async calculateAndPublish(
    actorId: EntityId,
    investment: Investment,
    agentId?: EntityId,
    referralId?: EntityId,
    rate?: number,
  ): Promise<Commission | undefined> {
    const effectiveAgentId = agentId ?? this.defaultAgentId;
    if (!effectiveAgentId) {
      this.options.logger?.debug("no agent for commission, skipping", { investmentId: investment.id });
      return undefined;
    }

    const effectiveRate = rate ?? this.defaultRate;
    const referralRef = referralId ?? (generateId("ref") as EntityId);

    const commission = createCommission({
      agentId: effectiveAgentId,
      referralId: referralRef,
      userId: investment.investorId,
      commissionableType: "investment",
      commissionableId: investment.id,
      transactionType: "primary_purchase",
      baseAmount: investment.amount,
      rate: effectiveRate,
    });

    await publishInvestmentEvent(
      this.options.events,
      InvestmentEventType.CommissionCalculated,
      investment.id,
      actorId,
      {
        commissionId: commission.id as string,
        agentId: effectiveAgentId as string,
        amount: commission.amount.amount.toString(),
        currency: commission.amount.currency,
        rate: effectiveRate,
        investmentId: investment.id as string,
        investorId: investment.investorId as string,
      },
    );

    this.options.logger?.info("commission calculated", {
      commissionId: commission.id,
      investmentId: investment.id,
      agentId: effectiveAgentId,
      amount: commission.amount.amount.toString(),
    });

    return commission;
  }
}
