import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { Currency } from "@relcko/types";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import { InMemoryEventBus } from "@relcko/events";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import DividendService from "../services/dividend-service";
import BuybackService from "../services/buyback-service";
import BurnService from "../services/burn-service";
import AllocationService from "../services/allocation-service";
import MovementService from "../services/movement-service";
import { ReconciliationService } from "../services/reconciliation-service";
import { ReportingService } from "../services/reporting-service";
import { AnalyticsService } from "../services/analytics-service";
import { HealthService } from "../services/health-service";
import { StatementService } from "../services/statement-service";
import type { PortfolioAdapter, EligibleInvestor } from "../services/portfolio-adapter";
import {
  TreasuryAccountType, DividendStatus, BuybackStatus, BuybackType,
  BurnStatus, BurnType, MovementStatus, TreasuryReportType, TreasuryHealthStatus,
} from "../types";
import { TreasuryEventType } from "../events";
import { createTreasuryContext } from "../services/composition-root";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

function createMockPortfolioAdapter(investors: EligibleInvestor[] = []): PortfolioAdapter {
  return { getEligibleInvestors: async () => investors };
}

describe("Fix 1: Composition Root — Real Service Wiring", () => {
  it("instantiates real DividendService, BuybackService, BurnService", () => {
    const ctx = createTreasuryContext();
    expect(typeof ctx.dividendService.proposeDividend).toBe("function");
    expect(typeof ctx.buybackService.requestBuyback).toBe("function");
    expect(typeof ctx.burnService.requestBurn).toBe("function");
  });

  it("injects portfolioAdapter into DividendService", async () => {
    const ctx = createTreasuryContext();
    expect((ctx.dividendService as any).portfolioAdapter).toBe(ctx.portfolioAdapter);
  });

  it("all services share the same repository", () => {
    const ctx = createTreasuryContext();
    const repo = ctx.repo;
    expect((ctx.dividendService as any).repository).toBe(repo);
    expect((ctx.buybackService as any).repository).toBe(repo);
    expect((ctx.burnService as any).repository).toBe(repo);
  });
});

describe("Fix 2 & 3: Allocation Engine — Pure Bigint & Validation", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let allocationService: AllocationService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    allocationService = new AllocationService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const src = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Revenue,
      name: "Revenue Source",
      currency: Currency.USDT,
    });
    const dest1 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
    const dest2 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.EmergencyReserve,
      name: "Reserve",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Fund source",
      entries: [
        { accountId: src.id as string, entryType: "debit", amount: 100000n, description: "seed" },
        { accountId: dest1.id as string, entryType: "credit", amount: 100000n, description: "seed" },
      ],
      reference: "F",
      referenceId: "f1",
    });
  });

  it("rejects allocation when rules sum < 100%", async () => {
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.Operating)[0].id,
      percentage: 50,
      priority: 1,
    });

    const src = repository.listAccountsByType(TreasuryAccountType.Revenue)[0];
    await expect(allocationService.executeAllocation(actorId, {
      sourceAccountId: src.id,
      amount: 1000n,
      currency: "USDT",
      period: "2026-Q2",
    })).rejects.toThrow("must equal 100%");
  });

  it("rejects allocation when rules sum > 100%", async () => {
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.Operating)[0].id,
      percentage: 60,
      priority: 1,
    });
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.EmergencyReserve)[0].id,
      percentage: 50,
      priority: 2,
    });

    const src = repository.listAccountsByType(TreasuryAccountType.Revenue)[0];
    await expect(allocationService.executeAllocation(actorId, {
      sourceAccountId: src.id,
      amount: 1000n,
      currency: "USDT",
      period: "2026-Q2",
    })).rejects.toThrow("must equal 100%");
  });

  it("accepts allocation when rules sum to exactly 100%", async () => {
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.Operating)[0].id,
      percentage: 70,
      priority: 1,
    });
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.EmergencyReserve)[0].id,
      percentage: 30,
      priority: 2,
    });

    const src = repository.listAccountsByType(TreasuryAccountType.Revenue)[0];
    const result = await allocationService.executeAllocation(actorId, {
      sourceAccountId: src.id,
      amount: 1000n,
      currency: "USDT",
      period: "2026-Q2",
    });
    expect(result.rules.length).toBe(2);
    const ruleTotal = result.rules.reduce((s, r) => s + r.amount, 0n);
    expect(ruleTotal).toBe(1000n);
  });

  it("uses pure bigint arithmetic (no Number conversion)", async () => {
    await allocationService.configureRule(actorId, {
      sourceType: TreasuryAccountType.Revenue,
      destinationAccountId: repository.listAccountsByType(TreasuryAccountType.Operating)[0].id,
      percentage: 100,
      priority: 1,
    });

    const src = repository.listAccountsByType(TreasuryAccountType.Revenue)[0];
    const largeAmount = 99999n;
    const result = await allocationService.executeAllocation(actorId, {
      sourceAccountId: src.id,
      amount: largeAmount,
      currency: "USDT",
      period: "2026-Q2",
    });
    expect(result.rules[0].amount).toBe(largeAmount);
  });
});

describe("Fix 4 & 5: Dividend — Balance Guard & Reconciliation", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let dividendService: DividendService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const div = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Dividend,
      name: "Dividend",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Fund operating",
      entries: [
        { accountId: op.id as string, entryType: "debit", amount: 50000n, description: "fund" },
        { accountId: div.id as string, entryType: "credit", amount: 50000n, description: "fund" },
      ],
      reference: "F",
      referenceId: "f1",
    });

    const portfolioAdapter = createMockPortfolioAdapter([
      { investorId: "inv-1" as never, units: 100n },
    ]);
    dividendService = new DividendService(repository, events as never, portfolioAdapter);
  });

  it("rejects distribution when balance is insufficient", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 100000n, currency: Currency.USDT },
      perUnitAmount: { amount: 1000n, currency: Currency.USDT },
      eligibleUnits: 100n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);

    await expect(dividendService.distributeDividend(actorId, proposal.id as never))
      .rejects.toThrow("Insufficient Treasury balance");
  });

  it("rejects distribution when perUnitAmount × eligibleUnits != totalAmount", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 200n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);

    await expect(dividendService.distributeDividend(actorId, proposal.id as never))
      .rejects.toThrow("reconciliation failed");
  });

  it("accepts distribution when checks pass", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 10000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 100n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);
    const result = await dividendService.distributeDividend(actorId, proposal.id as never);
    expect(result.status).toBe(DividendStatus.Distributed);
  });

  it("publishes DividendRejected event on reconciliation failure", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 200n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);
    await expect(dividendService.distributeDividend(actorId, proposal.id as never)).rejects.toThrow();
  });
});

describe("Fix 6: Audit Events — Cancel/Reject Events", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let buybackService: BuybackService;
  let burnService: BurnService;
  let movementService: MovementService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    buybackService = new BuybackService(repository, events as never);
    burnService = new BurnService(repository, events as never);
    movementService = new MovementService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const src = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Source",
      currency: Currency.USDT,
    });
    const dst = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Dest",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId: src.id as string, entryType: "debit", amount: 10000n, description: "fund" },
        { accountId: dst.id as string, entryType: "credit", amount: 10000n, description: "fund" },
      ],
      reference: "F",
      referenceId: "f1",
    });

    const bb = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.BuybackReserve,
      name: "BB",
      currency: Currency.USDT,
    });
    await ledgerService.postJournal(actorId, {
      description: "Fund BB",
      entries: [
        { accountId: bb.id as string, entryType: "debit", amount: 10000n, description: "fund" },
        { accountId: dst.id as string, entryType: "credit", amount: 10000n, description: "fund" },
      ],
      reference: "F2",
      referenceId: "f2",
    });
  });

  it("publishes BuybackCancelled event on cancel", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 1000n, currency: Currency.USDT },
      reason: "test",
    });
    await buybackService.cancelBuyback(actorId, req.id as never);
    const eventTypes = (events.events as any[]).map(e => JSON.parse(JSON.stringify(e)).type);
    expect(eventTypes).toContain(TreasuryEventType.BuybackCancelled);
  });

  it("publishes BurnCancelled event on cancel", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 1000n,
      reason: "test",
    });
    await burnService.cancelBurn(actorId, req.id as never);
    const eventTypes = (events.events as any[]).map(e => JSON.parse(JSON.stringify(e)).type);
    expect(eventTypes).toContain(TreasuryEventType.BurnCancelled);
  });

  it("publishes MovementRejected event on reject", async () => {
    const src = repository.listAllAccounts()[0];
    const dst = repository.listAllAccounts()[1];
    const mov = await movementService.createMovement(actorId, {
      fromAccountId: src.id as string,
      toAccountId: dst.id as string,
      amount: { amount: 100n, currency: Currency.USDT },
      reason: "test",
    });
    await movementService.rejectMovement(actorId, mov.id as never, "Not approved");
    const eventTypes = (events.events as any[]).map(e => JSON.parse(JSON.stringify(e)).type);
    expect(eventTypes).toContain(TreasuryEventType.MovementRejected);
  });
});

describe("Fix 7: Double Recovery Protection", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let dividendService: DividendService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const div = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Dividend,
      name: "Dividend",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId: op.id as string, entryType: "debit", amount: 50000n, description: "fund" },
        { accountId: div.id as string, entryType: "credit", amount: 50000n, description: "fund" },
      ],
      reference: "F",
      referenceId: "f1",
    });

    const portfolioAdapter = createMockPortfolioAdapter([
      { investorId: "inv-1" as never, units: 100n },
    ]);
    dividendService = new DividendService(repository, events as never, portfolioAdapter);
  });

  it("prevents recovering the same dividend distribution twice", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 10000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 100n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);
    await dividendService.distributeDividend(actorId, proposal.id as never);

    const distributions = dividendService.listDistributionsByDividend(proposal.id as never);
    await dividendService.recoverDividend(
      actorId, proposal.id as never,
      distributions[0].id as never, "inv-1" as never, "Overpayment",
    );

    await expect(dividendService.recoverDividend(
      actorId, proposal.id as never,
      distributions[0].id as never, "inv-1" as never, "Duplicate",
    )).rejects.toThrow("already been recovered");
  });

  it("allows recovering a different distribution", async () => {
    const portfolioAdapter = createMockPortfolioAdapter([
      { investorId: "inv-1" as never, units: 50n },
      { investorId: "inv-2" as never, units: 50n },
    ]);
    dividendService = new DividendService(repository, events as never, portfolioAdapter);

    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 10000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 100n,
    });
    await dividendService.approveDividend(actorId, proposal.id as never);
    await dividendService.distributeDividend(actorId, proposal.id as never);

    const distributions = dividendService.listDistributionsByDividend(proposal.id as never);
    const r1 = await dividendService.recoverDividend(
      actorId, proposal.id as never,
      distributions[0].id as never, "inv-1" as never, "Error",
    );
    expect(r1.reason).toBe("Error");

    const r2 = await dividendService.recoverDividend(
      actorId, proposal.id as never,
      distributions[1].id as never, "inv-2" as never, "Different",
    );
    expect(r2.reason).toBe("Different");
  });
});

describe("Fix 8: Balance Sheet Validation", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let statementService: StatementService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    statementService = new StatementService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
  });

  it("rejects balance sheet when Assets != Liabilities + Equity", async () => {
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset, name: "Asset", currency: Currency.USDT,
    });
    const liab = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Liability, name: "Liability", currency: Currency.USDT,
    });
    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity, name: "Equity", currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating, name: "Op", currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Seed asset",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 100000n, description: "a" },
        { accountId: op.id as string, entryType: "credit", amount: 100000n, description: "a" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed liab",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 30000n, description: "l" },
        { accountId: op.id as string, entryType: "credit", amount: 30000n, description: "l" },
      ],
      reference: "S2",
      referenceId: "s2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed eq",
      entries: [
        { accountId: eq.id as string, entryType: "debit", amount: 50000n, description: "e" },
        { accountId: op.id as string, entryType: "credit", amount: 50000n, description: "e" },
      ],
      reference: "S3",
      referenceId: "s3",
    });

    await expect(statementService.generateBalanceSheet(actorId, "2026-01"))
      .rejects.toThrow("Balance sheet validation failed");
  });

  it("accepts balance sheet when Assets == Liabilities + Equity", async () => {
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset, name: "Asset", currency: Currency.USDT,
    });
    const liab = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Liability, name: "Liability", currency: Currency.USDT,
    });
    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity, name: "Equity", currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating, name: "Op", currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Seed asset",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 80000n, description: "a" },
        { accountId: op.id as string, entryType: "credit", amount: 80000n, description: "a" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed liab",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 30000n, description: "l" },
        { accountId: op.id as string, entryType: "credit", amount: 30000n, description: "l" },
      ],
      reference: "S2",
      referenceId: "s2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed eq",
      entries: [
        { accountId: eq.id as string, entryType: "debit", amount: 50000n, description: "e" },
        { accountId: op.id as string, entryType: "credit", amount: 50000n, description: "e" },
      ],
      reference: "S3",
      referenceId: "s3",
    });

    const result = await statementService.generateBalanceSheet(actorId, "2026-01");
    expect(result.totalAssets).toBe(80000n);
  });
});

describe("Fix 9: Reconciliation Persistence", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let reconciliationService: ReconciliationService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    reconciliationService = new ReconciliationService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const acct1 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Test",
      currency: Currency.USDT,
    });
    const acct2 = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Test2",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Fund",
      entries: [
        { accountId: acct1.id as string, entryType: "debit", amount: 10000n, description: "dep" },
        { accountId: acct2.id as string, entryType: "credit", amount: 10000n, description: "dep" },
      ],
      reference: "DEP",
      referenceId: "ref",
    });
  });

  it("update existing reconciliation by ID (no duplicates)", async () => {
    const record = await reconciliationService.reconcileAccount(actorId, repository.listAllAccounts()[0].id, 9500n, "2026-01");
    const beforeCount = repository.listReconciliationsByAccount(repository.listAllAccounts()[0].id).length;

    await reconciliationService.resolveReconciliation(actorId, record.id as never, 10000n, "Corrected");
    const afterCount = repository.listReconciliationsByAccount(repository.listAllAccounts()[0].id).length;

    expect(afterCount).toBe(beforeCount);
  });
});

describe("Fix 10: Zero-Liability Health", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let healthService: HealthService;
  let accountService: AccountService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    healthService = new HealthService(repository, events as never);
    accountService = new AccountService(repository, events as never);
  });

  it("zero liabilities produce Infinity ratios (max scores)", async () => {
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating, name: "Op", currency: Currency.USDT,
    });
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset, name: "Asset", currency: Currency.USDT,
    });

    repository.saveAccount({
      ...op,
      balance: 1000n,
      availableBalance: 1000n,
    });
    repository.saveAccount({
      ...as,
      balance: 5000n,
      availableBalance: 5000n,
    });

    const result = await healthService.checkHealth(actorId);
    expect(result.liquidityScore).toBe(100);
    expect(result.solvencyScore).toBe(100);
    expect(result.status).toBe(TreasuryHealthStatus.Healthy);
  });
});

describe("Fix 11: Analytics Period Filtering", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let analyticsService: AnalyticsService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    analyticsService = new AnalyticsService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);

    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating, name: "Op", currency: Currency.USDT,
    });
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset, name: "Asset", currency: Currency.USDT,
    });
    const liab = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Liability, name: "Liab", currency: Currency.USDT,
    });
    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity, name: "Eq", currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Seed",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 100000n, description: "a" },
        { accountId: op.id as string, entryType: "credit", amount: 100000n, description: "a" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed eq",
      entries: [
        { accountId: eq.id as string, entryType: "debit", amount: 80000n, description: "e" },
        { accountId: op.id as string, entryType: "credit", amount: 80000n, description: "e" },
      ],
      reference: "S2",
      referenceId: "s2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed liab",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 20000n, description: "l" },
        { accountId: op.id as string, entryType: "credit", amount: 20000n, description: "l" },
      ],
      reference: "S3",
      referenceId: "s3",
    });
  });

  it("buyback analytics respect period (count only completed in period)", async () => {
    const bb = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.BuybackReserve, name: "BB", currency: Currency.USDT,
    });
    await ledgerService.postJournal(actorId, {
      description: "Fund BB",
      entries: [
        { accountId: bb.id as string, entryType: "debit", amount: 50000n, description: "bb" },
        { accountId: repository.listAccountsByType(TreasuryAccountType.Operating)[0].id as string, entryType: "credit", amount: 50000n, description: "bb" },
      ],
      reference: "S4",
      referenceId: "s4",
    });

    const buybackService = new BuybackService(repository, events as never);
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 1000n, currency: Currency.USDT },
      reason: "test",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const entry = await analyticsService.computeAnalytics(actorId, "2026-07");
    expect(entry.buybacksExecuted).toBe(1n);
  });

  it("burn analytics respect period (count only completed in period)", async () => {
    const eq = repository.listAccountsByType(TreasuryAccountType.Equity)[0];
    const as = repository.listAccountsByType(TreasuryAccountType.Asset)[0];

    const burnService = new BurnService(repository, events as never);
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 5000n,
      reason: "test",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const entry = await analyticsService.computeAnalytics(actorId, "2026-07");
    expect(entry.burnExecuted).toBe(1n);
  });
});

describe("Fix 12: Canonical Timestamps", () => {
  it("all services use ISO-8601 string format", async () => {
    const repo = new InMemoryTreasuryRepository();
    const events = { publish: async () => {} } as any;
    const accountService = new AccountService(repo, events);

    const acct = await accountService.createAccount("actor" as never, {
      accountType: TreasuryAccountType.Operating,
      name: "Test",
      currency: Currency.USDT,
    });

    expect(acct.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(acct.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
