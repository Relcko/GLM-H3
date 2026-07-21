import type { EntityId, Money } from "@relcko/types";
import { Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import { PortfolioEventType, publishPortfolioEvent } from "../events";

export interface ProjectionScenario {
  readonly name: string;
  readonly annualGrowthRate: number;
  readonly annualIncomeYield: number;
  readonly monthlyContribution: bigint;
}

export interface ProjectionEntry {
  readonly month: number;
  readonly projectedValue: Money;
  readonly cumulativeContributions: Money;
  readonly cumulativeIncome: Money;
}

export interface PortfolioProjection {
  readonly id: EntityId;
  readonly investorId: EntityId;
  readonly projectionMonths: number;
  readonly scenario: ProjectionScenario;
  readonly entries: readonly ProjectionEntry[];
  readonly startValue: Money;
  readonly endValue: Money;
  readonly totalReturn: number;
  readonly annualizedReturn: number;
  readonly computedAt: string;
}

const DEFAULT_SCENARIOS: Record<string, ProjectionScenario> = {
  conservative: { name: "conservative", annualGrowthRate: 0.04, annualIncomeYield: 0.04, monthlyContribution: 0n },
  moderate: { name: "moderate", annualGrowthRate: 0.07, annualIncomeYield: 0.05, monthlyContribution: 0n },
  aggressive: { name: "aggressive", annualGrowthRate: 0.10, annualIncomeYield: 0.06, monthlyContribution: 0n },
};

export class ProjectionService {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeProjection(
    actorId: EntityId,
    investorId: EntityId,
    projectionMonths: number = 12,
    scenario?: Partial<ProjectionScenario>,
  ): PortfolioProjection {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    const holdings = this.repository.listHoldingsByInvestor(investorId);

    const currentValue = portfolio?.currentValue.amount ?? holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const currency = portfolio?.currentValue.currency ?? holdings[0]?.currentValue.currency ?? Currency.USDT;

    const effectiveScenario: ProjectionScenario = {
      ...DEFAULT_SCENARIOS.moderate,
      ...scenario,
    };

    const monthlyGrowthRate = effectiveScenario.annualGrowthRate / 12;
    const monthlyIncomeRate = effectiveScenario.annualIncomeYield / 12;

    const entries: ProjectionEntry[] = [];
    let currentBalance = currentValue;
    let cumulativeContributions = 0n;
    let cumulativeIncome = 0n;

    for (let month = 1; month <= projectionMonths; month++) {
      currentBalance += effectiveScenario.monthlyContribution;
      cumulativeContributions += effectiveScenario.monthlyContribution;

      const incomeThisMonth = (currentBalance * BigInt(Math.round(monthlyIncomeRate * 1e6))) / 100_000_000n;
      cumulativeIncome += incomeThisMonth;
      currentBalance += incomeThisMonth;

      const growthThisMonth = (currentBalance * BigInt(Math.round(monthlyGrowthRate * 1e6))) / 100_000_000n;
      currentBalance += growthThisMonth;

      entries.push({
        month,
        projectedValue: { amount: currentBalance, currency },
        cumulativeContributions: { amount: cumulativeContributions, currency },
        cumulativeIncome: { amount: cumulativeIncome, currency },
      });
    }

    const endValue = entries[entries.length - 1].projectedValue;
    const totalReturn = currentValue > 0n
      ? Number(BigInt(Math.round(((Number(endValue.amount) / Number(currentValue)) - 1) * 1e6))) / 1e6
      : 0;
    const annualizedReturn = totalReturn / (projectionMonths / 12);

    const projection: PortfolioProjection = {
      id: generateId("proj") as EntityId,
      investorId,
      projectionMonths,
      scenario: effectiveScenario,
      entries,
      startValue: { amount: currentValue, currency },
      endValue,
      totalReturn: Math.round(totalReturn * 10000) / 100,
      annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
      computedAt: new Date().toISOString(),
    };

    publishPortfolioEvent(
      this.events,
      PortfolioEventType.PortfolioRecomputed,
      portfolio?.id ?? (investorId as EntityId),
      actorId,
      {
        projectionId: projection.id as string,
        investorId: investorId as string,
        projectionMonths,
        scenario: effectiveScenario.name,
        startValue: currentValue.toString(),
        endValue: endValue.amount.toString(),
        annualizedReturn: projection.annualizedReturn,
      },
    );

    this.logger?.info("portfolio projection computed", {
      investorId,
      projectionMonths,
      scenario: effectiveScenario.name,
      startValue: currentValue.toString(),
      endValue: endValue.amount.toString(),
    });

    return projection;
  }

  computeMultipleScenarios(
    actorId: EntityId,
    investorId: EntityId,
    projectionMonths: number = 12,
  ): PortfolioProjection[] {
    return Object.values(DEFAULT_SCENARIOS).map((scenario) =>
      this.computeProjection(actorId, investorId, projectionMonths, scenario),
    );
  }
}
