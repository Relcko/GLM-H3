import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type {
  SearchQuery,
  SearchResult,
  SearchResultItem,
  PortfolioHolding,
  TimelineEntry,
} from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { SearchError } from "../errors";

export class PortfolioSearch {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  search(actorId: EntityId, query: SearchQuery): SearchResult {
    const portfolio = this.repository.getPortfolioByInvestor(actorId);
    if (!portfolio) throw new SearchError(`Portfolio not found for investor ${actorId}`);

    const holdings = this.repository.listHoldingsByInvestor(actorId);
    const timeline = this.repository.listTimelineByInvestor(actorId);

    let items: SearchResultItem[] = [];

    if (query.query) {
      items = this.searchByKeyword(query.query, holdings, timeline);
    }

    if (query.dateFrom && query.dateTo) {
      const dateResults = this.searchByDateRange(query.dateFrom, query.dateTo, holdings, timeline);
      items = items.length > 0 ? items.filter(i => dateResults.some(d => d.id === i.id)) : dateResults;
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      const amountResults = this.searchByAmount(query.minAmount ?? 0n, query.maxAmount ?? BigInt(Number.MAX_SAFE_INTEGER), holdings);
      items = items.length > 0 ? items.filter(i => amountResults.some(a => a.id === i.id)) : amountResults;
    }

    if (query.assetType) {
      items = items.filter(i => i.type === query.assetType);
    }

    const sort = query.sort ?? "date_desc";
    items = [...items].sort((a, b) => {
      switch (sort) {
        case "date_asc": return a.date.localeCompare(b.date);
        case "date_desc": return b.date.localeCompare(a.date);
        case "amount_asc": return Number((a.amount?.amount ?? 0n) - (b.amount?.amount ?? 0n));
        case "amount_desc": return Number((b.amount?.amount ?? 0n) - (a.amount?.amount ?? 0n));
        default: return b.date.localeCompare(a.date);
      }
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const result: SearchResult = {
      items: paged,
      total: items.length,
      page,
      pageSize,
    };

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioSearchExecuted, actorId, actorId, {
      query: query.query ?? "",
      total: result.total,
    });

    this.logger?.info("portfolio search executed", { query: query.query, total: result.total });
    return result;
  }

  searchByKeyword(keyword: string, holdings: PortfolioHolding[], timeline: TimelineEntry[]): SearchResultItem[] {
    const lower = keyword.toLowerCase();
    const results: SearchResultItem[] = [];

    for (const h of holdings) {
      if (h.name.toLowerCase().includes(lower) || h.assetType.toLowerCase().includes(lower)) {
        results.push({
          id: h.id,
          type: h.assetType === "nft" ? "nft" : "investment",
          title: h.name,
          subtitle: `${h.assetType}`,
          amount: h.currentValue,
          date: h.acquiredAt,
          status: h.returnPercentage >= 0 ? "profitable" : "loss",
        });
      }
    }

    for (const t of timeline) {
      if (t.description.toLowerCase().includes(lower) || t.eventType.toLowerCase().includes(lower)) {
        results.push({
          id: t.id,
          type: "transaction",
          title: t.eventType,
          subtitle: t.description,
          amount: t.amount,
          date: t.occurredAt,
          status: "completed",
        });
      }
    }

    return results;
  }

  searchByDateRange(from: string, to: string, holdings: PortfolioHolding[], timeline: TimelineEntry[]): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    for (const h of holdings) {
      if (h.acquiredAt >= from && h.acquiredAt <= to) {
        results.push({
          id: h.id,
          type: h.assetType === "nft" ? "nft" : "investment",
          title: h.name,
          subtitle: `${h.assetType}`,
          amount: h.currentValue,
          date: h.acquiredAt,
          status: h.returnPercentage >= 0 ? "profitable" : "loss",
        });
      }
    }

    for (const t of timeline) {
      if (t.occurredAt >= from && t.occurredAt <= to) {
        results.push({
          id: t.id,
          type: "transaction",
          title: t.eventType,
          subtitle: t.description,
          amount: t.amount,
          date: t.occurredAt,
          status: "completed",
        });
      }
    }

    return results;
  }

  searchByAmount(min: bigint, max: bigint, holdings: PortfolioHolding[]): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    for (const h of holdings) {
      const amount = h.currentValue.amount;
      if (amount >= min && amount <= max) {
        results.push({
          id: h.id,
          type: h.assetType === "nft" ? "nft" : "investment",
          title: h.name,
          subtitle: `${h.assetType}`,
          amount: h.currentValue,
          date: h.acquiredAt,
          status: h.returnPercentage >= 0 ? "profitable" : "loss",
        });
      }
    }

    return results;
  }
}
