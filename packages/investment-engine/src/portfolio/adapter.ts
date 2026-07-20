import { computePortfolio, type Ownership } from "@relcko/domain-core";
import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { PortfolioSnapshot, PortfolioHoldingEntry } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";

export interface PortfolioUIAdapter {
  updatePortfolio(investorId: EntityId): Promise<void>;
  getPortfolio(investorId: EntityId): PortfolioSnapshot | undefined;
}

export class PortfolioAdapter implements PortfolioUIAdapter {
  private readonly snapshots = new Map<EntityId, PortfolioSnapshot>();

  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async updatePortfolio(investorId: EntityId): Promise<void> {
    const ownerships = this.repository.listOwnershipsByInvestor(investorId);

    if (ownerships.length === 0) return;

    const holdings: PortfolioHoldingEntry[] = ownerships.map((o: Ownership) => ({
      propertyId: o.propertyId,
      propertyName: o.propertyId,
      quantity: o.quantity,
      value: o.currentValue,
      costBasis: o.avgCostBasis,
      profitLoss: o.profitLoss,
      ownershipPercentage: o.ownershipPercentage,
    }));

    let totalInvested = 0n;
    let totalValue = 0n;
    let totalProfitLoss = 0n;
    const currency = holdings[0]?.costBasis.currency;

    for (const h of holdings) {
      totalInvested += h.costBasis.amount * h.quantity;
      totalValue += h.value.amount;
      totalProfitLoss += h.profitLoss.amount;
    }

    const snapshot: PortfolioSnapshot = {
      investorId,
      totalInvested: { amount: totalInvested, currency },
      totalValue: { amount: totalValue, currency },
      totalProfitLoss: { amount: totalProfitLoss, currency },
      holdings,
      computedAt: new Date().toISOString(),
    };

    this.snapshots.set(investorId, snapshot);

    await publishInvestmentEvent(this.events, InvestmentEventType.PortfolioUpdated, investorId, investorId, {
      totalInvested: snapshot.totalInvested.amount.toString(),
      totalValue: snapshot.totalValue.amount.toString(),
      totalProfitLoss: snapshot.totalProfitLoss.amount.toString(),
      holdingCount: holdings.length,
    });

    this.logger?.info("portfolio updated", {
      investorId,
      holdings: holdings.length,
      totalValue: snapshot.totalValue.amount.toString(),
    });
  }

  getPortfolio(investorId: EntityId): PortfolioSnapshot | undefined {
    return this.snapshots.get(investorId);
  }
}
