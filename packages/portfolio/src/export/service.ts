import type { EntityId, Money } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type { ExportRequest, ExportResult } from "../types";
import { ExportFormat } from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { ExportError } from "../errors";

export class PortfolioExport {
  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  export(actorId: EntityId, request: ExportRequest): ExportResult {
    const portfolio = this.repository.getPortfolioByInvestor(request.investorId);
    if (!portfolio) throw new ExportError(`Portfolio not found for investor ${request.investorId}`);

    let url: string;

    switch (request.format) {
      case ExportFormat.Csv:
        url = this.generateCsv(request.investorId, request.includeHoldings, request.includeTransactions, request.includePerformance);
        break;
      case ExportFormat.Pdf:
        url = this.generatePdf(request.investorId, request.includeHoldings, request.includeTransactions, request.includePerformance);
        break;
      case ExportFormat.Excel:
        url = this.generateExcel(request.investorId, request.includeHoldings, request.includeTransactions, request.includePerformance);
        break;
      case ExportFormat.Tax:
        url = this.generatePdf(request.investorId, request.includeHoldings, request.includeTransactions, true);
        break;
      default:
        throw new ExportError(`Unsupported export format: ${request.format}`);
    }

    const result: ExportResult = {
      id: generateId("export") as EntityId,
      format: request.format,
      url,
      size: url.length,
      generatedAt: new Date().toISOString(),
    };

    this.repository.saveExportResult(result);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioExportGenerated, portfolio.id, actorId, {
      exportId: result.id as string,
      format: request.format,
      investorId: request.investorId as string,
    });

    this.logger?.info("portfolio export generated", { exportId: result.id, format: request.format });
    return result;
  }

  generateCsv(investorId: EntityId, includeHoldings: boolean, includeTransactions: boolean, includePerformance: boolean): string {
    const lines: string[] = [];

    if (includeHoldings) {
      lines.push("type,name,quantity,cost_basis,current_value,return_pct");
      const holdings = this.repository.listHoldingsByInvestor(investorId);
      for (const h of holdings) {
        lines.push(`${h.assetType},${h.name},${h.quantity},${h.costBasis.amount},${h.currentValue.amount},${h.returnPercentage}`);
      }
    }

    if (includeTransactions) {
      if (lines.length > 0) lines.push("");
      lines.push("event_type,description,occurred_at");
      const timeline = this.repository.listTimelineByInvestor(investorId);
      for (const t of timeline) {
        lines.push(`${t.eventType},${t.description},${t.occurredAt}`);
      }
    }

    if (includePerformance) {
      if (lines.length > 0) lines.push("");
      lines.push("period,return_pct,gain_loss");
      const performance = this.repository.listPerformanceByInvestor(investorId);
      for (const p of performance) {
        lines.push(`${p.period},${p.returnPercentage},${p.gainLoss}`);
      }
    }

    return lines.join("\n");
  }

  generatePdf(investorId: EntityId, includeHoldings: boolean, includeTransactions: boolean, includePerformance: boolean): string {
    return `https://exports.relcko.com/portfolio/${investorId}/report.pdf`;
  }

  generateExcel(investorId: EntityId, includeHoldings: boolean, includeTransactions: boolean, includePerformance: boolean): string {
    return `https://exports.relcko.com/portfolio/${investorId}/report.xlsx`;
  }

  listExports(investorId: EntityId): ExportResult[] {
    return this.repository.listExportResults(investorId);
  }
}
