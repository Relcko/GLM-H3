import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { PortfolioExport } from "../export/service";
import { PortfolioService } from "../portfolio/service";
import { ExportFormat, PortfolioAssetType } from "../types";
import { Currency } from "@relcko/types";
import type { PortfolioHolding } from "../types";

describe("PortfolioExport", () => {
  let repository: InMemoryPortfolioRepository;
  let events: EventBus;
  let exportService: PortfolioExport;
  let portfolioService: PortfolioService;
  const actorId = "actor-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    events = new InMemoryEventBus();
    exportService = new PortfolioExport(repository, events);
    portfolioService = new PortfolioService(repository, events);
    portfolioService.create(actorId, investorId);

    const h: PortfolioHolding = {
      id: "h1" as never, investorId, assetType: PortfolioAssetType.Investment,
      assetId: "a1" as never, name: "US Property", quantity: 1n,
      costBasis: { amount: 10000n, currency: Currency.USDC },
      currentValue: { amount: 12000n, currency: Currency.USDC },
      profitLoss: 2000n, returnPercentage: 20, acquiredAt: "2026-01-01",
    };
    repository.saveHolding(h);
  });

  it("generates CSV export", () => {
    const result = exportService.export(actorId, {
      format: ExportFormat.Csv, investorId,
      includeHoldings: true, includeTransactions: false, includePerformance: false,
      includeTax: false,
    });
    expect(result.format).toBe(ExportFormat.Csv);
  });

  it("generates PDF export", () => {
    const result = exportService.export(actorId, {
      format: ExportFormat.Pdf, investorId,
      includeHoldings: true, includeTransactions: false, includePerformance: false,
      includeTax: false,
    });
    expect(result.format).toBe(ExportFormat.Pdf);
  });

  it("generates Excel export", () => {
    const result = exportService.export(actorId, {
      format: ExportFormat.Excel, investorId,
      includeHoldings: true, includeTransactions: false, includePerformance: false,
      includeTax: false,
    });
    expect(result.format).toBe(ExportFormat.Excel);
  });
});
