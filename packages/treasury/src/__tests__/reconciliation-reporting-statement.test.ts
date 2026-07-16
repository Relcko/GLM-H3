import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { Currency } from "@relcko/types";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import { ReconciliationService } from "../services/reconciliation-service";
import { ReportingService } from "../services/reporting-service";
import { StatementService } from "../services/statement-service";
import { TreasuryAccountType, TreasuryReportType } from "../types";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: (e: unknown) => { events.push(e); } };
}

describe("ReconciliationService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let reconciliationService: ReconciliationService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;
  let accountId: string;
  let accountId2: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    reconciliationService = new ReconciliationService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const acct1 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Test Account",
      currency: Currency.USDT,
    });
    const acct2 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Test Account 2",
      currency: Currency.USDT,
    });
    accountId = acct1.id as string;
    accountId2 = acct2.id as string;
  });

  it("reconcileAccount creates record with correct difference", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId, entryType: "debit", amount: 10000n, description: "deposit" },
        { accountId: accountId2, entryType: "credit", amount: 10000n, description: "deposit" },
      ],
      reference: "DEP",
      referenceId: "ref-1",
    });

    const record = await reconciliationService.reconcileAccount(actorId, accountId as never, 9500n, "2026-01");
    expect(record.expectedBalance).toBe(9500n);
    expect(record.actualBalance).toBe(10000n);
    expect(record.difference).toBe(-500n);
    expect(record.reconciled).toBe(false);
  });

  it("reconcileAccount sets reconciled true when balances match", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId, entryType: "debit", amount: 5000n, description: "deposit" },
        { accountId: accountId2, entryType: "credit", amount: 5000n, description: "deposit" },
      ],
      reference: "DEP",
      referenceId: "ref-2",
    });

    const record = await reconciliationService.reconcileAccount(actorId, accountId as never, 5000n, "2026-01");
    expect(record.difference).toBe(0n);
    expect(record.reconciled).toBe(true);
  });

  it("resolveReconciliation updates actual balance and reconciled flag", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId, entryType: "debit", amount: 10000n, description: "deposit" },
        { accountId: accountId2, entryType: "credit", amount: 10000n, description: "deposit" },
      ],
      reference: "DEP",
      referenceId: "ref-3",
    });

    const record = await reconciliationService.reconcileAccount(actorId, accountId as never, 9500n, "2026-01");
    const resolved = await reconciliationService.resolveReconciliation(actorId, record.id as never, 10000n, "Corrected");
    expect(resolved.reconciled).toBe(false);
    expect(resolved.difference).toBe(-500n);
  });
});

describe("ReportingService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let reportingService: ReportingService;
  let accountService: AccountService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    reportingService = new ReportingService(repository, events as never);
    accountService = new AccountService(repository, events as never);

    await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
  });

  it("generateReport creates report with correct type and period", async () => {
    const report = await reportingService.generateReport(actorId, TreasuryReportType.Treasury, "2026-01");
    expect(report.reportType).toBe(TreasuryReportType.Treasury);
    expect(report.period).toBe("2026-01");
    expect(report.data).toBeDefined();
  });

  it("listByPeriod returns reports for period", async () => {
    await reportingService.generateReport(actorId, TreasuryReportType.Treasury, "2026-01");
    await reportingService.generateReport(actorId, TreasuryReportType.Treasury, "2026-02");

    const janReports = reportingService.listByPeriod("2026-01");
    expect(janReports.length).toBe(1);
  });

  it("listByType returns reports by type", async () => {
    await reportingService.generateReport(actorId, TreasuryReportType.Reserve, "2026-01");
    await reportingService.generateReport(actorId, TreasuryReportType.Reserve, "2026-02");

    const reserves = reportingService.listByType(TreasuryReportType.Reserve);
    expect(reserves.length).toBe(2);
  });
});

describe("StatementService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let statementService: StatementService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;
  let revenueId: string;
  let expenseId: string;
  let assetId: string;
  let liabilityId: string;
  let equityId: string;
  let opId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    statementService = new StatementService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const rev = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Revenue,
      name: "Revenue",
      currency: Currency.USDT,
    });
    const exp = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Expense,
      name: "Expense",
      currency: Currency.USDT,
    });
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset,
      name: "Asset",
      currency: Currency.USDT,
    });
    const liab = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Liability,
      name: "Liability",
      currency: Currency.USDT,
    });
    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity,
      name: "Equity",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
    revenueId = rev.id as string;
    expenseId = exp.id as string;
    assetId = as.id as string;
    liabilityId = liab.id as string;
    equityId = eq.id as string;
    opId = op.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Seed balances",
      entries: [
        { accountId: revenueId, entryType: "debit", amount: 50000n, description: "rev" },
        { accountId: opId, entryType: "credit", amount: 50000n, description: "rev" },
      ],
      reference: "SEED",
      referenceId: "s-1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed expenses",
      entries: [
        { accountId: expenseId, entryType: "debit", amount: 20000n, description: "exp" },
        { accountId: opId, entryType: "credit", amount: 20000n, description: "exp" },
      ],
      reference: "SEED2",
      referenceId: "s-2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed equity",
      entries: [
        { accountId: equityId, entryType: "debit", amount: 50000n, description: "eq" },
        { accountId: opId, entryType: "credit", amount: 50000n, description: "eq" },
      ],
      reference: "SEED3",
      referenceId: "s-3",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed liability",
      entries: [
        { accountId: liabilityId, entryType: "debit", amount: 30000n, description: "liab" },
        { accountId: opId, entryType: "credit", amount: 30000n, description: "liab" },
      ],
      reference: "SEED4",
      referenceId: "s-4",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed asset",
      entries: [
        { accountId: assetId, entryType: "debit", amount: 80000n, description: "asset" },
        { accountId: opId, entryType: "credit", amount: 80000n, description: "asset" },
      ],
      reference: "SEED5",
      referenceId: "s-5",
    });
  });

  it("generateIncomeStatement returns statement with correct line items", async () => {
    const statement = await statementService.generateIncomeStatement(actorId, "2026-01");
    expect(statement.statementType).toBe(TreasuryReportType.IncomeStatement);
    expect(statement.lines.length).toBe(2);
    expect(statement.netIncome).toBe(30000n);
  });

  it("generateBalanceSheet returns statement with correct totals", async () => {
    const statement = await statementService.generateBalanceSheet(actorId, "2026-01");
    expect(statement.statementType).toBe(TreasuryReportType.BalanceSheet);
    expect(statement.totalAssets).toBe(80000n);
    expect(statement.totalLiabilities).toBe(30000n);
    expect(statement.totalEquity).toBe(50000n);
    expect(statement.lines.length).toBe(3);
  });

  it("generateCashFlowStatement returns statement with correct categories", async () => {
    const statement = await statementService.generateCashFlowStatement(actorId, "2026-01");
    expect(statement.statementType).toBe(TreasuryReportType.CashFlow);

    const hasOperating = statement.lines.some(l => l.category === "operating");
    const hasInvesting = statement.lines.some(l => l.category === "investing");
    const hasFinancing = statement.lines.some(l => l.category === "financing");
    expect(hasOperating).toBe(true);
    expect(hasInvesting).toBe(true);
    expect(hasFinancing).toBe(true);
  });

  it("listByPeriod returns statements", async () => {
    await statementService.generateIncomeStatement(actorId, "2026-01");
    await statementService.generateBalanceSheet(actorId, "2026-01");

    const statements = statementService.listByPeriod("2026-01");
    expect(statements.length).toBe(2);
  });
});
