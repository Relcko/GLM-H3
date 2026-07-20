import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { TreasuryReport, StatementLine, FinancialStatement } from "../types";
import { TreasuryAccountType, TreasuryReportType, MovementStatus } from "../types";
import { ReportingError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class ReportingService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async generateReport(actorId: EntityId, type: TreasuryReportType, period: string): Promise<TreasuryReport> {
    let data: Record<string, unknown>;

    switch (type) {
      case TreasuryReportType.IncomeStatement:
        data = this.generateIncomeStatementData(period);
        break;
      case TreasuryReportType.BalanceSheet:
        data = this.generateBalanceSheetData(period);
        break;
      case TreasuryReportType.CashFlow:
        data = this.generateCashFlowData(period);
        break;
      case TreasuryReportType.Treasury:
        data = this.generateTreasuryData(period);
        break;
      case TreasuryReportType.Reserve:
        data = this.generateReserveData(period);
        break;
      case TreasuryReportType.Dividend:
        data = this.generateDividendData(period);
        break;
      case TreasuryReportType.Commission:
        data = this.generateCommissionData(period);
        break;
      case TreasuryReportType.Audit:
        data = this.generateAuditData(period);
        break;
      default:
        throw new ReportingError(`Unknown report type: ${type}`);
    }

    const report: TreasuryReport = {
      id: generateId(),
      reportType: type,
      period,
      generatedAt: new Date().toISOString(),
      data,
    };

    this.repository.saveReport(report);

    await publishTreasuryEvent(this.events, TreasuryEventType.ReportGenerated, report.id, actorId, {
      reportId: report.id as string,
      reportType: type,
      period,
    });

    this.logger?.info("report generated", { reportType: type, period });

    return report;
  }

  listByType(type: TreasuryReportType): TreasuryReport[] {
    return this.repository.listReportsByType(type);
  }

  listByPeriod(period: string): TreasuryReport[] {
    return this.repository.listReportsByPeriod(period);
  }

  private generateIncomeStatementData(period: string): Record<string, unknown> {
    const revenueAccounts = this.repository.listAccountsByType(TreasuryAccountType.Revenue);
    const expenseAccounts = this.repository.listAccountsByType(TreasuryAccountType.Expense);

    const revenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const expenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const netIncome = revenue - expenses;

    const lines: StatementLine[] = [
      ...revenueAccounts.map(a => ({
        accountId: a.id,
        accountName: a.name,
        amount: a.balance,
        category: "revenue",
      })),
      ...expenseAccounts.map(a => ({
        accountId: a.id,
        accountName: a.name,
        amount: a.balance,
        category: "expense",
      })),
    ];

    return { revenue: revenue.toString(), expenses: expenses.toString(), netIncome: netIncome.toString(), lines };
  }

  private generateBalanceSheetData(period: string): Record<string, unknown> {
    const assetAccounts = this.repository.listAccountsByType(TreasuryAccountType.Asset);
    const liabilityAccounts = this.repository.listAccountsByType(TreasuryAccountType.Liability);
    const equityAccounts = this.repository.listAccountsByType(TreasuryAccountType.Equity);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0n);

    const lines: StatementLine[] = [
      ...assetAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "asset" })),
      ...liabilityAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "liability" })),
      ...equityAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "equity" })),
    ];

    return {
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      totalEquity: totalEquity.toString(),
      lines,
    };
  }

  private generateCashFlowData(period: string): Record<string, unknown> {
    const allAccounts = this.repository.listAllAccounts();
    let operatingCashflow = 0n;
    let investingCashflow = 0n;
    let financingCashflow = 0n;

    for (const account of allAccounts) {
      const entries = this.repository.listLedgerByPeriod(account.id, period);
      const netChange = entries.reduce((sum, e) => sum + (e.entryType === "credit" ? e.amount : -e.amount), 0n);

      if (account.accountType === TreasuryAccountType.Revenue || account.accountType === TreasuryAccountType.Expense) {
        operatingCashflow += netChange;
      } else if (account.accountType === TreasuryAccountType.Asset) {
        investingCashflow += netChange;
      } else {
        financingCashflow += netChange;
      }
    }

    const netCashflow = operatingCashflow + investingCashflow + financingCashflow;

    return {
      operatingCashflow: operatingCashflow.toString(),
      investingCashflow: investingCashflow.toString(),
      financingCashflow: financingCashflow.toString(),
      netCashflow: netCashflow.toString(),
    };
  }

  private generateTreasuryData(period: string): Record<string, unknown> {
    const accounts = this.repository.listAllAccounts();
    const accountData = accounts.map(a => ({
      id: a.id as string,
      name: a.name,
      type: a.accountType,
      balance: a.balance.toString(),
      availableBalance: a.availableBalance.toString(),
      reservedBalance: a.reservedBalance.toString(),
      currency: a.currency,
    }));

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0n);

    return { accounts: accountData, totalBalance: totalBalance.toString(), period };
  }

  private generateReserveData(period: string): Record<string, unknown> {
    const reserveTypes = [
      TreasuryAccountType.EmergencyReserve,
      TreasuryAccountType.InsuranceReserve,
      TreasuryAccountType.PlatformReserve,
      TreasuryAccountType.BuybackReserve,
    ];

    const reserveAccounts = reserveTypes.flatMap(t => this.repository.listAccountsByType(t));
    const configs = this.repository.listReserveConfigs();

    const reserveData = reserveAccounts.map(a => {
      const config = configs.find(c => c.accountId === a.id);
      return {
        accountId: a.id as string,
        accountName: a.name,
        balance: a.balance.toString(),
        targetAmount: config?.targetAmount.toString() ?? "0",
        minThreshold: config?.minThreshold.toString() ?? "0",
        maxThreshold: config?.maxThreshold.toString() ?? "0",
      };
    });

    const totalReserves = reserveAccounts.reduce((sum, a) => sum + a.balance, 0n);

    return { reserves: reserveData, totalReserves: totalReserves.toString(), period };
  }

  private generateDividendData(period: string): Record<string, unknown> {
    const proposals = this.repository.listDividendProposalsByPeriod(period);
    const proposalData = proposals.map(p => ({
      id: p.id as string,
      totalAmount: p.totalAmount.amount.toString(),
      perUnitAmount: p.perUnitAmount.amount.toString(),
      eligibleUnits: p.eligibleUnits.toString(),
      status: p.status,
      totalDistributed: p.totalDistributed.amount.toString(),
    }));

    return { proposals: proposalData, count: proposals.length, period };
  }

  private generateCommissionData(period: string): Record<string, unknown> {
    const commissionAccounts = this.repository.listAccountsByType(TreasuryAccountType.Commission);
    const totalCommissions = commissionAccounts.reduce((sum, a) => sum + a.balance, 0n);

    const accountData = commissionAccounts.map(a => ({
      id: a.id as string,
      name: a.name,
      balance: a.balance.toString(),
    }));

    return { accounts: accountData, totalCommissions: totalCommissions.toString(), period };
  }

  private generateAuditData(period: string): Record<string, unknown> {
    const allAccounts = this.repository.listAllAccounts();
    const allJournals = this.repository.listJournalsByStatus("posted");
    const allConfigs = this.repository.listReserveConfigs();
    const allMovements = this.repository.listMovementsByStatus(MovementStatus.Completed);
    const allProposals = this.repository.listDividendProposalsByPeriod(period);
    const allBuybacks = Array.from({ length: 0 });

    const totalBalance = allAccounts.reduce((sum, a) => sum + a.balance, 0n);

    return {
      accounts: allAccounts.map(a => ({ id: a.id as string, name: a.name, type: a.accountType, balance: a.balance.toString() })),
      journalsCount: allJournals.length,
      reserveConfigs: allConfigs.map(c => ({ accountId: c.accountId as string, targetAmount: c.targetAmount.toString(), currentAmount: c.currentAmount.toString() })),
      movementsCount: allMovements.length,
      dividendProposalsCount: allProposals.length,
      totalBalance: totalBalance.toString(),
      period,
    };
  }
}
