import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { TimelineEntry } from "../types";
import { PortfolioAssetType } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";

export class PortfolioTimeline {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  addEntry(
    actorId: EntityId,
    portfolioId: EntityId,
    eventType: string,
    description: string,
    amount?: Money,
    assetType?: PortfolioAssetType,
    assetId?: EntityId,
  ): TimelineEntry {
    const entry: TimelineEntry = {
      id: generateId("timeline") as EntityId,
      portfolioId,
      eventType,
      description,
      amount,
      assetType,
      assetId,
      occurredAt: new Date().toISOString(),
    };

    this.repository.saveTimelineEntry(entry);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioTimelineEntryAdded, portfolioId, actorId, {
      entryId: entry.id as string,
      portfolioId: portfolioId as string,
      eventType,
      description,
    });

    this.logger?.info("timeline entry added", { entryId: entry.id, portfolioId, eventType });
    return entry;
  }

  listByPortfolio(portfolioId: EntityId): TimelineEntry[] {
    return this.repository.listTimelineByPortfolio(portfolioId);
  }

  listByInvestor(investorId: EntityId): TimelineEntry[] {
    return this.repository.listTimelineByInvestor(investorId);
  }

  listByDateRange(investorId: EntityId, from: string, to: string): TimelineEntry[] {
    const entries = this.repository.listTimelineByInvestor(investorId);
    return entries.filter(e => e.occurredAt >= from && e.occurredAt <= to);
  }
}
