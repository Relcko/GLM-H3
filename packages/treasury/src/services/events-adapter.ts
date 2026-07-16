import type { EventBus, EventHandler, RelckoEventEnvelope } from "@relcko/events";
import { createEnvelope } from "@relcko/events";
import type { EntityId } from "@relcko/types";
import type { TreasuryRepository } from "../repository";
import { TreasuryAccountType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { PerformanceEventType, publishPerformanceEvent } from "@relcko/performance";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";

export interface EventsAdapterServices {
  readonly ledgerService?: {
    postJournal(actorId: EntityId, params: {
      description: string;
      entries: { accountId: EntityId; entryType: string; amount: bigint; currency: string; description: string }[];
      reference: string;
      referenceId: EntityId;
    }): Promise<unknown>;
  };
  readonly movementService?: {
    createMovement(actorId: EntityId, params: Record<string, unknown>): Promise<unknown>;
  };
}

export class EventsAdapter {
  private unsubscribers: (() => void)[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly repository: TreasuryRepository,
    private readonly services: EventsAdapterServices,
    private readonly logger?: Logger,
    private readonly performance?: PerformanceModuleContext,
  ) {}

  subscribe(): void {
    // Governance events
    this.unsubscribers.push(this.eventBus.subscribe("governance.proposal_succeeded", this.handler));
    this.unsubscribers.push(this.eventBus.subscribe("governance.proposal_executed", this.handler));
    this.unsubscribers.push(this.eventBus.subscribe("governance.proposal_cancelled", this.handler));

    // Investment events
    this.unsubscribers.push(this.eventBus.subscribe("investment.completed", this.handler));
    this.unsubscribers.push(this.eventBus.subscribe("investment.settlement_completed", this.handler));

    // Portfolio events
    this.unsubscribers.push(this.eventBus.subscribe("portfolio.holding_added", this.handler));
    this.unsubscribers.push(this.eventBus.subscribe("portfolio.holding_removed", this.handler));

    // Network events
    this.unsubscribers.push(this.eventBus.subscribe("network.commission_paid", this.handler));

    // NFT events
    this.unsubscribers.push(this.eventBus.subscribe("nft.royalty_paid", this.handler));
  }

  private handler: EventHandler = (envelope: RelckoEventEnvelope) => {
    this.handleEvent(envelope);
  };

  unsubscribe(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private async handleEvent(envelope: RelckoEventEnvelope): Promise<void> {
    if (this.repository.isEventProcessed(envelope.eventId)) return;

    try {
      switch (envelope.type) {
        case "governance.proposal_succeeded":
        case "governance.proposal_executed":
          this.logger?.info("governance event received for treasury", {
            type: envelope.type,
            proposalId: envelope.aggregateId,
          });
          break;

        case "governance.proposal_cancelled":
          this.logger?.info("governance proposal cancelled", {
            proposalId: envelope.aggregateId,
          });
          break;

        case "investment.completed":
        case "investment.settlement_completed":
          this.logger?.info("investment event received for treasury", {
            type: envelope.type,
            investmentId: envelope.aggregateId,
          });
          await this.handleInvestmentSettled(envelope);
          break;

        case "portfolio.holding_added":
        case "portfolio.holding_removed":
          this.logger?.info("portfolio event received for treasury", {
            type: envelope.type,
            portfolioId: envelope.aggregateId,
          });
          break;

        case "network.commission_paid":
          this.logger?.info("network commission paid, posting treasury journal", {
            commissionId: envelope.aggregateId,
          });
          await this.handleCommissionPaid(envelope);
          break;

        case "nft.royalty_paid":
          this.logger?.info("nft royalty paid, posting treasury journal", {
            royaltyId: envelope.aggregateId,
          });
          await this.handleRoyaltyPaid(envelope);
          break;
      }

      this.repository.markEventProcessed(envelope.eventId);

      const ack = createEnvelope({
        type: "treasury.external_event_processed",
        aggregateId: envelope.aggregateId,
        actorId: envelope.actorId,
        payload: { originalEventId: envelope.eventId, originalType: envelope.type },
        correlationId: envelope.correlationId,
        traceId: envelope.traceId,
      });

      await this.eventBus.publish(ack);
    } catch (error) {
      this.logger?.error("treasury event adapter handler failed", {
        eventType: envelope.type,
        error: String(error),
      });
    }
  }

  private async handleInvestmentSettled(envelope: RelckoEventEnvelope): Promise<void> {
    const payload = envelope.payload as Record<string, unknown>;
    const amount = typeof payload?.amount === "string" ? BigInt(payload.amount) : 0n;
    const currency = (payload?.currency as string) ?? "USDT";
    const investmentId = envelope.aggregateId;
    const actorId = envelope.actorId;

    if (amount > 0n && this.services.ledgerService) {
      const settlementAccount = this.repository.listAccountsByType(TreasuryAccountType.Revenue)?.[0];
      const operatingAccount = this.repository.listAccountsByType(TreasuryAccountType.Operating)?.[0];

      if (settlementAccount && operatingAccount) {
        await this.services.ledgerService.postJournal(actorId, {
          description: `Investment settlement: ${investmentId}`,
          entries: [
            { accountId: settlementAccount.id, entryType: "debit", amount, currency, description: "Investment settled" },
            { accountId: operatingAccount.id, entryType: "credit", amount, currency, description: "Settlement received" },
          ],
          reference: "investment_settlement",
          referenceId: investmentId,
        });
      }
    }

    this.recordMetric("treasury.investment_settled", 1, "event", envelope.type);
  }

  /**
   * Record a performance metric for a handled cross-domain event. Purely
   * observational — never throws and never mutates domain state.
   */
  private recordMetric(name: string, value: number, unit: string, source?: string): void {
    if (!this.performance) return;
    try {
      this.performance.performance.analytics.recordMetric(name, value, unit, "event_throughput");
      if (source) {
        void publishPerformanceEvent(this.eventBus, PerformanceEventType.MetricRecorded, {
          name, value, unit, source,
        });
      }
    } catch {
      // Telemetry must never break the integration path.
    }
  }

  private async handleCommissionPaid(envelope: RelckoEventEnvelope): Promise<void> {
    const payload = envelope.payload as Record<string, unknown>;
    const amount = typeof payload?.amount === "string" ? BigInt(payload.amount) : 0n;
    const currency = (payload?.currency as string) ?? "USDT";
    const commissionId = envelope.aggregateId;
    const actorId = envelope.actorId;

    if (amount > 0n && this.services.ledgerService) {
      const commissionAccount = this.repository.listAccountsByType(TreasuryAccountType.Commission)?.[0];
      const operatingAccount = this.repository.listAccountsByType(TreasuryAccountType.Operating)?.[0];

      if (commissionAccount && operatingAccount) {
        await this.services.ledgerService.postJournal(actorId, {
          description: `Commission payment: ${commissionId}`,
          entries: [
            { accountId: commissionAccount.id, entryType: "debit", amount, currency, description: "Commission paid" },
            { accountId: operatingAccount.id, entryType: "credit", amount, currency, description: "Commission payout" },
          ],
          reference: "commission_payment",
          referenceId: commissionId,
        });
      }
    }
  }

  private async handleRoyaltyPaid(envelope: RelckoEventEnvelope): Promise<void> {
    const payload = envelope.payload as Record<string, unknown>;
    const amount = typeof payload?.amount === "string" ? BigInt(payload.amount) : 0n;
    const currency = (payload?.currency as string) ?? "USDT";
    const royaltyId = envelope.aggregateId;
    const actorId = envelope.actorId;

    if (amount > 0n && this.services.ledgerService) {
      const revenueAccount = this.repository.listAccountsByType(TreasuryAccountType.Revenue)?.[0];
      const operatingAccount = this.repository.listAccountsByType(TreasuryAccountType.Operating)?.[0];

      if (revenueAccount && operatingAccount) {
        await this.services.ledgerService.postJournal(actorId, {
          description: `Royalty payout: ${royaltyId}`,
          entries: [
            { accountId: revenueAccount.id, entryType: "debit", amount, currency, description: "Royalty earned" },
            { accountId: operatingAccount.id, entryType: "credit", amount, currency, description: "Royalty payout" },
          ],
          reference: "royalty_payment",
          referenceId: royaltyId,
        });
      }
    }
  }
}

export default EventsAdapter;