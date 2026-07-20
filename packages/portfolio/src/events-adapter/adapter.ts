import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import { PerformanceEventType, publishPerformanceEvent } from "@relcko/performance";

export class PortfolioEventsAdapter {
  constructor(
    private readonly events: EventBus,
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

  subscribeToExternalEvents(): (() => void)[] {
    const unsubInvestment = this.events.subscribe("investment.completed", async (envelope) => {
      this.logger?.info("portfolio adapter received investment.completed event", {
        type: envelope.type,
        aggregateId: envelope.aggregateId,
        investorId: (envelope.payload as Record<string, unknown>)?.investorId,
      });
      this.recordMetric(envelope.type);
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