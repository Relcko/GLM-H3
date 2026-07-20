import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type {
  Portfolio,
  PortfolioHolding,
  PortfolioSummary,
  AssetAllocationEntry,
  GeographicAllocationEntry,
  PropertyTypeAllocationEntry,
  PortfolioAssetType,
} from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { PortfolioNotFoundError } from "../errors";

export interface AddHoldingInput {
  readonly assetType: PortfolioAssetType;
  readonly assetId: EntityId;
  readonly name: string;
  readonly quantity: bigint;
  readonly costBasis: { amount: bigint; currency: Currency };
  readonly currentValue: { amount: bigint; currency: Currency };
  readonly acquiredAt: string;
}

export interface PortfolioUpdates {
  readonly totalInvested?: { amount: bigint; currency: Currency };
  readonly currentValue?: { amount: bigint; currency: Currency };
  readonly unrealizedGainLoss?: bigint;
  readonly realizedGainLoss?: bigint;
  readonly totalReturn?: number;
  readonly roi?: number;
  readonly rentalYield?: number;
  readonly expectedAnnualIncome?: { amount: bigint; currency: Currency };
}

export class PortfolioService {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  create(actorId: EntityId, investorId: EntityId): Portfolio {
    const portfolio: Portfolio = {
      id: generateId("portfolio") as EntityId,
      investorId,
      totalInvested: { amount: 0n, currency: Currency.USDT },
      currentValue: { amount: 0n, currency: Currency.USDT },
      unrealizedGainLoss: 0n,
      realizedGainLoss: 0n,
      totalReturn: 0,
      roi: 0,
      rentalYield: 0,
      expectedAnnualIncome: { amount: 0n, currency: Currency.USDT },
      lastComputedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.savePortfolio(portfolio);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioCreated, portfolio.id, actorId, {
      portfolioId: portfolio.id as string,
      investorId: investorId as string,
    });

    this.logger?.info("portfolio created", { portfolioId: portfolio.id, investorId });
    return portfolio;
  }

  get(investorId: EntityId): Portfolio | undefined {
    return this.repository.getPortfolioByInvestor(investorId);
  }

  update(actorId: EntityId, investorId: EntityId, updates: PortfolioUpdates): Portfolio {
    const existing = this.repository.getPortfolioByInvestor(investorId);
    if (!existing) throw new PortfolioNotFoundError(investorId as string);

    const updated: Portfolio = {
      ...existing,
      ...(updates.totalInvested !== undefined && { totalInvested: updates.totalInvested }),
      ...(updates.currentValue !== undefined && { currentValue: updates.currentValue }),
      ...(updates.unrealizedGainLoss !== undefined && { unrealizedGainLoss: updates.unrealizedGainLoss }),
      ...(updates.realizedGainLoss !== undefined && { realizedGainLoss: updates.realizedGainLoss }),
      ...(updates.totalReturn !== undefined && { totalReturn: updates.totalReturn }),
      ...(updates.roi !== undefined && { roi: updates.roi }),
      ...(updates.rentalYield !== undefined && { rentalYield: updates.rentalYield }),
      ...(updates.expectedAnnualIncome !== undefined && { expectedAnnualIncome: updates.expectedAnnualIncome }),
      updatedAt: new Date().toISOString(),
    };

    this.repository.savePortfolio(updated);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioUpdated, updated.id, actorId, {
      portfolioId: updated.id as string,
      investorId: investorId as string,
    });

    return updated;
  }

  delete(actorId: EntityId, investorId: EntityId): void {
    const existing = this.repository.getPortfolioByInvestor(investorId);
    if (!existing) throw new PortfolioNotFoundError(investorId as string);

    const holdings = this.repository.listHoldingsByInvestor(investorId);
    for (const h of holdings) {
      this.repository.removeHolding(h.id);
    }

    const portfolioId = existing.id;
    const snapshots = this.repository.listSnapshotsByInvestor(investorId);
    for (const s of snapshots) {
      this.repository.saveSnapshot({ ...s, createdAt: "" } as any);
    }

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioDeleted, portfolioId, actorId, {
      portfolioId: portfolioId as string,
      investorId: investorId as string,
    });

    this.logger?.info("portfolio deleted", { portfolioId, investorId });
  }

  addHolding(actorId: EntityId, investorId: EntityId, input: AddHoldingInput): PortfolioHolding {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    if (!portfolio) throw new PortfolioNotFoundError(investorId as string);

    const holding: PortfolioHolding = {
      id: generateId("holding") as EntityId,
      investorId,
      assetType: input.assetType,
      assetId: input.assetId,
      name: input.name,
      quantity: input.quantity,
      costBasis: input.costBasis,
      currentValue: input.currentValue,
      profitLoss: input.currentValue.amount - input.costBasis.amount,
      returnPercentage:
        input.costBasis.amount > 0n
          ? Number((input.currentValue.amount - input.costBasis.amount) * 10000n / input.costBasis.amount) / 100
          : 0,
      acquiredAt: input.acquiredAt,
    };

    this.repository.saveHolding(holding);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioHoldingAdded, portfolio.id, actorId, {
      portfolioId: portfolio.id as string,
      holdingId: holding.id as string,
      assetType: input.assetType,
      assetId: input.assetId as string,
    });

    return holding;
  }

  removeHolding(actorId: EntityId, investorId: EntityId, holdingId: EntityId): void {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    if (!portfolio) throw new PortfolioNotFoundError(investorId as string);

    const holding = this.repository.getHolding(holdingId);
    if (!holding) throw new PortfolioNotFoundError(holdingId as string);

    this.repository.removeHolding(holdingId);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioHoldingRemoved, portfolio.id, actorId, {
      portfolioId: portfolio.id as string,
      holdingId: holdingId as string,
    });
  }

  listHoldings(investorId: EntityId): PortfolioHolding[] {
    return this.repository.listHoldingsByInvestor(investorId);
  }

  computeSummary(investorId: EntityId): PortfolioSummary {
    const portfolio = this.repository.getPortfolioByInvestor(investorId);
    const holdings = this.repository.listHoldingsByInvestor(investorId);

    const currency = portfolio?.currentValue.currency ?? Currency.USDT;

    const totalInvested = holdings.reduce((s, h) => s + h.costBasis.amount, 0n);
    const currentMarketValue = holdings.reduce((s, h) => s + h.currentValue.amount, 0n);
    const unrealizedGainLoss = currentMarketValue - totalInvested;
    const realizedGainLoss = portfolio?.realizedGainLoss ?? 0n;

    const totalPortfolioValue = currentMarketValue;
    const roi = totalInvested > 0n
      ? Number((currentMarketValue - totalInvested) * 10000n / totalInvested) / 100
      : 0;
    const rentalYield = portfolio?.rentalYield ?? 0;
    const expectedAnnualIncome = portfolio?.expectedAnnualIncome ?? { amount: 0n, currency };

    const categories = new Map<string, bigint>();
    for (const h of holdings) {
      const cat = h.assetType;
      categories.set(cat, (categories.get(cat) ?? 0n) + h.currentValue.amount);
    }

    const assetAllocation: AssetAllocationEntry[] = Array.from(categories.entries()).map(([category, value]) => ({
      category,
      value: { amount: value, currency },
      percentage: currentMarketValue > 0n
        ? Math.round(Number(value * 10000n / currentMarketValue)) / 100
        : 0,
    }));

    const geographicAllocation: GeographicAllocationEntry[] = [];
    const propertyTypeAllocation: PropertyTypeAllocationEntry[] = [];

    const summary: PortfolioSummary = {
      totalPortfolioValue: { amount: totalPortfolioValue, currency },
      totalInvested: { amount: totalInvested, currency },
      currentMarketValue: { amount: currentMarketValue, currency },
      unrealizedGainLoss,
      realizedGainLoss,
      roi,
      rentalYield,
      expectedAnnualIncome,
      assetAllocation,
      geographicAllocation,
      propertyTypeAllocation,
      computedAt: new Date().toISOString(),
    };

    return summary;
  }
}
