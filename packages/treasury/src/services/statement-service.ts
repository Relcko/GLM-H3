import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { FinancialStatement, StatementLine } from "../types";
import { TreasuryAccountType, TreasuryReportType } from "../types";
import { TreasuryError } from "../errors";
import { ReportingError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class StatementService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async generateIncomeStatement(actorId: EntityId, period: string): Promise<FinancialStatement> {
    const revenueAccounts = this.repository.listAccountsByType(TreasuryAccountType.Revenue);
    const expenseAccounts = this.repository.listAccountsByType(TreasuryAccountType.Expense);

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const netIncome = totalRevenue - totalExpenses;

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

    const statement = this.createStatement(TreasuryReportType.IncomeStatement, period, lines, netIncome);
    this.repository.saveFinancialStatement(statement);

    await publishTreasuryEvent(this.events, TreasuryEventType.StatementGenerated, statement.id, actorId, {
      statementId: statement.id as string,
      statementType: TreasuryReportType.IncomeStatement,
      period,
      totalRevenue: totalRevenue.toString(),
      totalExpenses: totalExpenses.toString(),
      netIncome: netIncome.toString(),
    });

    this.logger?.info("income statement generated", { period, netIncome: netIncome.toString() });

    return statement;
  }

  async generateBalanceSheet(actorId: EntityId, period: string): Promise<FinancialStatement> {
    const assetAccounts = this.repository.listAccountsByType(TreasuryAccountType.Asset);
    const liabilityAccounts = this.repository.listAccountsByType(TreasuryAccountType.Liability);
    const equityAccounts = this.repository.listAccountsByType(TreasuryAccountType.Equity);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0n);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0n);

    if (totalAssets !== totalLiabilities + totalEquity) {
      throw new ReportingError(
        `Balance sheet validation failed: Assets (${totalAssets}) !== Liabilities (${totalLiabilities}) + Equity (${totalEquity})`,
      );
    }

    const lines: StatementLine[] = [
      ...assetAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "asset" })),
      ...liabilityAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "liability" })),
      ...equityAccounts.map(a => ({ accountId: a.id, accountName: a.name, amount: a.balance, category: "equity" })),
    ];

    const statement = this.createStatement(TreasuryReportType.BalanceSheet, period, lines, 0n, totalAssets, totalLiabilities, totalEquity);
    this.repository.saveFinancialStatement(statement);

    await publishTreasuryEvent(this.events, TreasuryEventType.StatementGenerated, statement.id, actorId, {
      statementId: statement.id as string,
      statementType: TreasuryReportType.BalanceSheet,
      period,
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      totalEquity: totalEquity.toString(),
    });

    this.logger?.info("balance sheet generated", { period, totalAssets: totalAssets.toString() });

    return statement;
  }

  async generateCashFlowStatement(actorId: EntityId, period: string): Promise<FinancialStatement> {
    const allAccounts = this.repository.listAllAccounts();
    let operatingCashflow = 0n;
    let investingCashflow = 0n;
    let financingCashflow = 0n;

    const lines: StatementLine[] = [];

    for (const account of allAccounts) {
      const entries = this.repository.listLedgerByPeriod(account.id, period);
      const netChange = entries.reduce((sum, e) => sum + (e.entryType === "credit" ? e.amount : -e.amount), 0n);

      let category: string;
      if (account.accountType === TreasuryAccountType.Revenue || account.accountType === TreasuryAccountType.Expense) {
        category = "operating";
        operatingCashflow += netChange;
      } else if (account.accountType === TreasuryAccountType.Asset) {
        category = "investing";
        investingCashflow += netChange;
      } else {
        category = "financing";
        financingCashflow += netChange;
      }

      lines.push({
        accountId: account.id,
        accountName: account.name,
        amount: netChange,
        category,
      });
    }

    const netIncome = operatingCashflow + investingCashflow + financingCashflow;

    const statement = this.createStatement(TreasuryReportType.CashFlow, period, lines, netIncome);
    this.repository.saveFinancialStatement(statement);

    await publishTreasuryEvent(this.events, TreasuryEventType.StatementGenerated, statement.id, actorId, {
      statementId: statement.id as string,
      statementType: TreasuryReportType.CashFlow,
      period,
      operatingCashflow: operatingCashflow.toString(),
      investingCashflow: investingCashflow.toString(),
      financingCashflow: financingCashflow.toString(),
      netIncome: netIncome.toString(),
    });

    this.logger?.info("cash flow statement generated", { period, netIncome: netIncome.toString() });

    return statement;
  }

  listByPeriod(period: string): FinancialStatement[] {
    return this.repository.listStatementsByPeriod(period);
  }

  private createStatement(
    statementType: TreasuryReportType,
    period: string,
    lines: StatementLine[],
    netIncome: bigint,
    totalAssets = 0n,
    totalLiabilities = 0n,
    totalEquity = 0n,
  ): FinancialStatement {
    return {
      id: generateId(),
      statementType,
      period,
      lines,
      totalAssets,
      totalLiabilities,
      totalEquity,
      netIncome,
      generatedAt: new Date().toISOString(),
    };
  }
}
