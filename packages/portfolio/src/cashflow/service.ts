import type { EntityId, Money } from "@relcko/types";
import { Currency } from "@relcko/types";
import { nowIso } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { CashflowProjection, CashflowEntry, PortfolioHolding } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { CashflowError } from "../errors";

export class CashflowProjectionEngine {
  private projectionCache = new Map<string, CashflowProjection>();

  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  projectCashflow(actorId: EntityId, investorId: EntityId, months: number): CashflowProjection {
    if (months <= 0) {
      throw new CashflowError("Projection months must be a positive number");
    }

    const holdings = this.repository.listHoldingsByInvestor(investorId);
    const monthlyIncome = this.projectMonthlyIncome(holdings);
    const monthlyExpenses = this.projectMonthlyExpenses(holdings);

    const entries: CashflowEntry[] = [];
    const now = new Date();
    let totalIncome = 0n;
    let totalExpenses = 0n;

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const netCashflow = monthlyIncome - monthlyExpenses;
      entries.push({
        month,
        projectedIncome: { amount: monthlyIncome, currency: Currency.USDC },
        projectedExpenses: { amount: monthlyExpenses, currency: Currency.USDC },
        netCashflow,
        source: "portfolio_projection",
      });
      totalIncome += monthlyIncome;
      totalExpenses += monthlyExpenses;
    }

    const netTotal = totalIncome - totalExpenses;
    const projection: CashflowProjection = {
      entries,
      totalProjected: { amount: netTotal, currency: Currency.USDC },
      monthlyAverage: { amount: netTotal / BigInt(months), currency: Currency.USDC },
      annualProjected: { amount: (netTotal * 12n) / BigInt(months), currency: Currency.USDC },
      projectionPeriodMonths: months,
    };

    this.projectionCache.set(investorId as string, projection);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioCashflowProjected, investorId, actorId, {
      investorId: investorId as string,
      months,
      totalProjected: netTotal.toString(),
      monthlyAverage: (netTotal / BigInt(months)).toString(),
      annualProjected: ((netTotal * 12n) / BigInt(months)).toString(),
    });

    return projection;
  }

  projectMonthlyIncome(holdings: readonly PortfolioHolding[]): bigint {
    let total = 0n;
    for (const h of holdings) {
      // Estimate 6% annual yield on current value → 0.5% monthly
      total += (h.currentValue.amount * 5n) / 1000n;
    }
    return total;
  }

  projectMonthlyExpenses(holdings: readonly PortfolioHolding[]): bigint {
    let total = 0n;
    for (const h of holdings) {
      // Estimate 1.2% annual expenses on current value → 0.1% monthly
      total += (h.currentValue.amount * 1n) / 1000n;
    }
    return total;
  }

  getProjection(investorId: EntityId): CashflowProjection | undefined {
    return this.projectionCache.get(investorId as string);
  }
}
