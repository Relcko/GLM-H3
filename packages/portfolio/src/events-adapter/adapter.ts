import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import { PerformanceEventType, publishPerformanceEvent } from "@relcko/performance";
import type { EntityId } from "@relcko/types";
import { Currency } from "@relcko/types";
import type { PortfolioService } from "../portfolio/service";
import { PortfolioAssetType } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";

export class PortfolioEventsAdapter {
  constructor(
    private readonly events: EventBus,
    private readonly portfolioService: PortfolioService,
    private readonly logger?: Logger,
    private readonly performance?: PerformanceModuleContext,
  ) {}

  private recordMetric(source: string): void {
    if (!this.performance) return;
    try {
      this.performance.performance.analytics.recordMetric("portfolio.external_event", 1, "event", "event_throughput");
      void publishPerformanceEvent(this.events, PerformanceEventType.MetricRecorded, {
        name: "portfolio.external_event", value: 1, unit: "event", source,
      });
    } catch {
      // Telemetry must never break the integration path.
    }
  }

  private async handleInvestmentCompleted(payload: Record<string, unknown>, aggregateId: string): Promise<void> {
    const investorId = payload.investorId as EntityId | undefined;
    const propertyId = (payload.propertyId as string) ?? aggregateId;
    const tokensStr = payload.tokens as string | undefined;
    const amountStr = payload.amount as string | undefined;
    const currency = (payload.currency as Currency) ?? Currency.USDT;

    if (!investorId) {
      this.logger?.warn("portfolio adapter: investment event missing investorId", { aggregateId });
      return;
    }

    const tokens = tokensStr ? BigInt(tokensStr) : 0n;
    const amount = amountStr ? BigInt(amountStr) : 0n;

    try {
      let portfolio = this.portfolioService.get(investorId);
      if (!portfolio) {
        portfolio = this.portfolioService.create(investorId as EntityId, investorId);
      }

      const existingHoldings = this.portfolioService.listHoldings(investorId);
      const existing = existingHoldings.find(h => h.assetId === (propertyId as EntityId));

      if (existing) {
        const newQty = existing.quantity + tokens;
        const totalInvestedIncrement = amount;

        this.portfolioService.update(investorId as EntityId, investorId, {
          totalInvested: { amount: (portfolio.totalInvested.amount + totalInvestedIncrement), currency },
          currentValue: { amount: (portfolio.currentValue.amount + totalInvestedIncrement), currency },
        });
      } else {
        this.portfolioService.addHolding(investorId as EntityId, investorId, {
          assetType: PortfolioAssetType.Investment,
          assetId: propertyId as EntityId,
          name: `Property ${propertyId}`,
          quantity: tokens,
          costBasis: { amount, currency },
          currentValue: { amount, currency },
          acquiredAt: new Date().toISOString(),
        });

        this.portfolioService.update(investorId as EntityId, investorId, {
          totalInvested: { amount: (portfolio.totalInvested.amount + amount), currency },
          currentValue: { amount: (portfolio.currentValue.amount + amount), currency },
        });
      }

      await publishPortfolioEvent(
        this.events,
        PortfolioEventType.PortfolioRecomputed,
        portfolio.id,
        investorId as EntityId,
        {
          investorId: investorId as string,
          totalInvested: portfolio.totalInvested.amount.toString(),
          totalValue: portfolio.currentValue.amount.toString(),
          currency: portfolio.currentValue.currency,
        },
      );

      this.logger?.info("portfolio recomputed from investment event", {
        investorId,
        propertyId,
        tokens: tokens.toString(),
      });
    } catch (err) {
      this.logger?.error("portfolio adapter failed to process investment event", {
        error: (err as Error).message,
        investorId,
        propertyId,
      });
    }
  }

  subscribeToExternalEvents(): (() => void)[] {
    const unsubInvestment = this.events.subscribe("investment.completed", async (envelope) => {
      const payload = envelope.payload as Record<string, unknown>;
      this.logger?.info("portfolio adapter received investment.completed event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
        investorId: payload.investorId,
      });
      this.recordMetric(envelope.type);
      await this.handleInvestmentCompleted(payload, envelope.aggregateId as string);
    });

    const unsubSettlement = this.events.subscribe("investment.settlement_completed", async (envelope) => {
      this.logger?.info("portfolio adapter received investment.settlement_completed event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
      });
      this.recordMetric(envelope.type);
    });

    const unsubNftTransfer = this.events.subscribe("nft.transferred", async (envelope) => {
      this.logger?.info("portfolio adapter received nft.transferred event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
      });
      this.recordMetric(envelope.type);
    });

    const unsubNftMint = this.events.subscribe("nft.mint_completed", async (envelope) => {
      this.logger?.info("portfolio adapter received nft.mint_completed event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
      });
      this.recordMetric(envelope.type);
    });

    const unsubCommissionPaid = this.events.subscribe("network.commission_paid", async (envelope) => {
      this.logger?.info("portfolio adapter received network.commission_paid event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
      });
      this.recordMetric(envelope.type);
    });

    return [unsubInvestment, unsubSettlement, unsubNftTransfer, unsubNftMint, unsubCommissionPaid];
  }
}