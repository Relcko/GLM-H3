import type { EntityId, Money } from "@relcko/types";
import { nowIso } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { PortfolioPerformanceEntry } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { PerformanceError } from "../errors";

export class PerformanceEngine {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computePerformance(
    actorId: EntityId,
    investorId: EntityId,
    period: string,
    startValue: Money,
    endValue: Money,
    netContribution: Money,
  ): PortfolioPerformanceEntry {
    if (startValue.currency !== endValue.currency) {
      throw new PerformanceError("Currency mismatch between start and end value");
    }

    const gainLoss = endValue.amount - startValue.amount;
    const returnPercentage = this.calculateReturnRate(startValue, endValue, netContribution);

    const entry: PortfolioPerformanceEntry = {
      period,
      startValue,
      endValue,
      netContribution,
      gainLoss,
      returnPercentage,
      computedAt: nowIso(),
    };

    this.repository.savePerformanceEntry(entry);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioPerformanceComputed, investorId, actorId, {
      investorId: investorId as string,
      period,
      gainLoss: gainLoss.toString(),
      returnPercentage,
    });

    return entry;
  }

  getPerformance(investorId: EntityId, period: string): PortfolioPerformanceEntry | undefined {
    return this.repository.listPerformanceByPeriod(investorId, period);
  }

  listPerformance(investorId: EntityId): PortfolioPerformanceEntry[] {
    return this.repository.listPerformanceByInvestor(investorId);
  }

  calculateReturnRate(startValue: Money, endValue: Money, netContribution: Money): number {
    const numerator = endValue.amount - startValue.amount - netContribution.amount;
    const denominator = startValue.amount + netContribution.amount;
    if (denominator <= 0n) return 0;
    return Number((numerator * 10000n) / denominator) / 100;
  }
}
