import type { EntityId, Money } from "@relcko/types";
import { nowIso } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { ROIResult } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { RoiError } from "../errors";

export class ROIEngine {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeROI(
    actorId: EntityId,
    investorId: EntityId,
    investmentAmount: Money,
    currentValue: Money,
    cashflowReceived: Money,
    acquiredAt: string,
  ): ROIResult {
    if (investmentAmount.currency !== currentValue.currency) {
      throw new RoiError("Currency mismatch between investment amount and current value");
    }

    const totalReturn = currentValue.amount - investmentAmount.amount + cashflowReceived.amount;
    const roi = this.calculateROI(investmentAmount, currentValue);
    const holdingPeriod = this.calculateHoldingPeriodDays(acquiredAt);
    const annualizedRoi = this.calculateAnnualizedROI(roi, holdingPeriod);

    const result: ROIResult = {
      roi,
      annualizedRoi,
      totalReturn,
      holdingPeriod,
      investmentAmount,
      currentValue,
      cashflowReceived,
    };

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioRoiComputed, investorId, actorId, {
      investorId: investorId as string,
      roi,
      annualizedRoi,
      totalReturn: totalReturn.toString(),
      holdingPeriod,
    });

    return result;
  }

  calculateROI(investment: Money, current: Money): number {
    if (investment.amount <= 0n) return 0;
    return Number(((current.amount - investment.amount) * 10000n) / investment.amount) / 100;
  }

  calculateAnnualizedROI(totalReturn: number, holdingPeriodDays: number): number {
    if (holdingPeriodDays <= 0) return totalReturn;
    const rate = totalReturn / 100;
    return (Math.pow(1 + rate, 365 / holdingPeriodDays) - 1) * 100;
  }

  calculateHoldingPeriodDays(acquiredAt: string): number {
    const acquired = new Date(acquiredAt);
    const now = new Date();
    return Math.floor((now.getTime() - acquired.getTime()) / (1000 * 60 * 60 * 24));
  }
}
