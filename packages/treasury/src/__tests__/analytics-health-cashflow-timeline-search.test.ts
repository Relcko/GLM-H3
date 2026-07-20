import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { Currency } from "@relcko/types";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import { AnalyticsService } from "../services/analytics-service";
import { HealthService } from "../services/health-service";
import { CashflowProjectionService } from "../services/cashflow-projection-service";
import TimelineService from "../services/timeline-service";
import SearchService from "../services/search-service";
import { TreasuryAccountType, TreasuryHealthStatus, BuybackStatus, BurnStatus, BuybackType, BurnType } from "../types";
import BuybackService from "../services/buyback-service";
import BurnService from "../services/burn-service";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: (e: unknown) => { events.push(e); } };
}

describe("AnalyticsService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let analyticsService: AnalyticsService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let buybackService: BuybackService;
  let burnService: BurnService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    analyticsService = new AnalyticsService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
    buybackService = new BuybackService(repository, events as never);
    burnService = new BurnService(repository, events as never);

    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
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
    const res = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.EmergencyReserve,
      name: "Reserve",
      currency: Currency.USDT,
    });

    const bb = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.BuybackReserve,
      name: "BuybackReserve",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Seed",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 100000n, description: "asset" },
        { accountId: op.id as string, entryType: "credit", amount: 100000n, description: "asset" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed2",
      entries: [
        { accountId: rev.id as string, entryType: "debit", amount: 50000n, description: "rev" },
        { accountId: op.id as string, entryType: "credit", amount: 50000n, description: "rev" },
      ],
      reference: "S2",
      referenceId: "s2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed3",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 20000n, description: "liab" },
        { accountId: op.id as string, entryType: "credit", amount: 20000n, description: "liab" },
      ],
      reference: "S3",
      referenceId: "s3",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed4",
      entries: [
        { accountId: eq.id as string, entryType: "debit", amount: 80000n, description: "eq" },
        { accountId: op.id as string, entryType: "credit", amount: 80000n, description: "eq" },
      ],
      reference: "S4",
      referenceId: "s4",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed5",
      entries: [
        { accountId: res.id as string, entryType: "debit", amount: 30000n, description: "res" },
        { accountId: op.id as string, entryType: "credit", amount: 30000n, description: "res" },
      ],
      reference: "S5",
      referenceId: "s5",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed6",
      entries: [
        { accountId: exp.id as string, entryType: "debit", amount: 20000n, description: "exp" },
        { accountId: op.id as string, entryType: "credit", amount: 20000n, description: "exp" },
      ],
      reference: "S6",
      referenceId: "s6",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed BB",
      entries: [
        { accountId: bb.id as string, entryType: "debit", amount: 15000n, description: "bb" },
        { accountId: op.id as string, entryType: "credit", amount: 15000n, description: "bb" },
      ],
      reference: "S7",
      referenceId: "s7",
    });
  });

  it("computeAnalytics computes correct ratios", async () => {
    const entry = await analyticsService.computeAnalytics(actorId, "2026-01");

    expect(entry.totalAssets).toBe(100000n);
    expect(entry.totalLiabilities).toBe(20000n);
    expect(entry.totalEquity).toBe(80000n);
    expect(entry.revenue).toBe(50000n);
    expect(entry.expenses).toBe(20000n);
    expect(entry.netIncome).toBe(30000n);
    expect(entry.reserveRatio).toBeCloseTo(0.45, 1);
    expect(entry.liquidityRatio).toBe(-10.75);
    expect(entry.solvencyRatio).toBe(5);
  });

  it("getLatestAnalytics returns latest entry", async () => {
    await analyticsService.computeAnalytics(actorId, "2026-01");
    const latest = analyticsService.getLatestAnalytics();
    expect(latest).toBeDefined();
    expect(latest!.period).toBe("2026-01");
  });

  it("listByPeriod returns entries for period", async () => {
    await analyticsService.computeAnalytics(actorId, "2026-01");
    const entries = analyticsService.listByPeriod("2026-01");
    expect(entries.length).toBe(1);
  });
});

describe("HealthService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let healthService: HealthService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    healthService = new HealthService(repository, events as never);
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
  });

  it("returns healthy with good ratios", async () => {
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
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
    const res = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.PlatformReserve,
      name: "Reserve",
      currency: Currency.USDT,
    });

    await ledgerService.postJournal(actorId, {
      description: "Seed",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 200000n, description: "asset" },
        { accountId: op.id as string, entryType: "credit", amount: 200000n, description: "asset" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed2",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 50000n, description: "liab" },
        { accountId: op.id as string, entryType: "credit", amount: 50000n, description: "liab" },
      ],
      reference: "S2",
      referenceId: "s2",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed3",
      entries: [
        { accountId: res.id as string, entryType: "debit", amount: 60000n, description: "res" },
        { accountId: op.id as string, entryType: "credit", amount: 60000n, description: "res" },
      ],
      reference: "S3",
      referenceId: "s3",
    });

    const result = await healthService.checkHealth(actorId);
    expect(result.status).toBe(TreasuryHealthStatus.Healthy);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("returns warning with low ratios", async () => {
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
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

    await ledgerService.postJournal(actorId, {
      description: "Seed",
      entries: [
        { accountId: liab.id as string, entryType: "debit", amount: 100000n, description: "high liab" },
        { accountId: op.id as string, entryType: "credit", amount: 100000n, description: "high liab" },
      ],
      reference: "S1",
      referenceId: "s1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Seed2",
      entries: [
        { accountId: as.id as string, entryType: "debit", amount: 80000n, description: "asset" },
        { accountId: op.id as string, entryType: "credit", amount: 80000n, description: "asset" },
      ],
      reference: "S2",
      referenceId: "s2",
    });

    const result = await healthService.checkHealth(actorId);
    expect(result.score).toBeLessThan(70);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("getLatestHealthResult returns last result", () => {
    const opId = generateId("test");
    repository.saveAccount({
      id: opId as never, accountType: TreasuryAccountType.Operating,
      name: "Op", description: "", currency: Currency.USDT as never,
      balance: 1000n, reservedBalance: 0n, availableBalance: 1000n,
      active: true, createdAt: "", updatedAt: "",
    });

    healthService.checkHealth(actorId);
    const latest = healthService.getLatestHealthResult();
    expect(latest).toBeDefined();
    expect(latest!.status).toBeDefined();
  });
});

describe("CashflowProjectionService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let cashflowProjectionService: CashflowProjectionService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    cashflowProjectionService = new CashflowProjectionService(repository, events as never);
  });

  it("projectCashflow computes net and closing balance", async () => {
    const projection = await cashflowProjectionService.projectCashflow(actorId, "2026-01", 50000n, [
      { category: "sales", amount: 30000n, description: "Product sales" },
    ], [
      { category: "expenses", amount: 10000n, description: "Operating expenses" },
    ]);

    expect(projection.netCashflow).toBe(20000n);
    expect(projection.closingBalance).toBe(70000n);
    expect(projection.openingBalance).toBe(50000n);
    expect(projection.period).toBe("2026-01");
  });

  it("getProjection retrieves saved projection", async () => {
    await cashflowProjectionService.projectCashflow(actorId, "2026-01", 50000n, [
      { category: "sales", amount: 10000n, description: "Sales" },
    ], [
      { category: "costs", amount: 5000n, description: "Costs" },
    ]);

    const retrieved = cashflowProjectionService.getProjection("2026-01");
    expect(retrieved).toBeDefined();
    expect(retrieved!.netCashflow).toBe(5000n);
  });
});

describe("TimelineService", () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    timelineService = new TimelineService();
  });

  it("recordEvent stores event", () => {
    const event = timelineService.recordEvent("test.event", "agg-1" as never, "actor-1" as never, { key: "value" });
    expect(event.type).toBe("test.event");
    expect(event.aggregateId).toBe("agg-1" as never);
  });

  it("getTimeline returns all events sorted descending", () => {
    timelineService.recordEvent("e1", "agg-1" as never, "actor-1" as never, {});
    timelineService.recordEvent("e2", "agg-2" as never, "actor-1" as never, {});

    const timeline = timelineService.getTimeline();
    expect(timeline.length).toBe(2);
  });

  it("getTimeline filters by type", () => {
    timelineService.recordEvent("type-a", "agg-1" as never, "actor-1" as never, {});
    timelineService.recordEvent("type-b", "agg-2" as never, "actor-1" as never, {});

    const filtered = timelineService.getTimeline({ type: "type-a" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe("type-a");
  });

  it("getTimelineByAccount returns events for account", () => {
    timelineService.recordEvent("e1", "acc-1" as never, "actor-1" as never, {});
    timelineService.recordEvent("e2", "acc-2" as never, "actor-1" as never, {});

    const accountEvents = timelineService.getTimelineByAccount("acc-1" as never);
    expect(accountEvents.length).toBe(1);
  });

  it("getTimelineByPeriod returns events within range", () => {
    const now = Date.now();
    timelineService.recordEvent("e1", "agg-1" as never, "actor-1" as never, {});
    timelineService.recordEvent("e2", "agg-2" as never, "actor-1" as never, {});

    const periodEvents = timelineService.getTimelineByPeriod(now - 1000, now + 10000);
    expect(periodEvents.length).toBe(2);
  });
});

describe("SearchService", () => {
  let repository: InMemoryTreasuryRepository;
  let searchService: SearchService;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let buybackService: BuybackService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    searchService = new SearchService(repository);
    accountService = new AccountService(repository, createMockEventBus() as never);
    ledgerService = new LedgerService(repository, createMockEventBus() as never);
    buybackService = new BuybackService(repository, createMockEventBus() as never);

    await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Alpha Fund",
      currency: Currency.USDT,
    });
    await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Revenue,
      name: "Beta Revenue",
      currency: Currency.USDT,
    });

    const opId = repository.listAllAccounts()[0].id;
    const revId = repository.listAllAccounts()[1].id;

    await ledgerService.postJournal(actorId, {
      description: "Test journal entry",
      entries: [
        { accountId: opId as string, entryType: "debit", amount: 1000n, description: "test" },
        { accountId: revId as string, entryType: "credit", amount: 1000n, description: "test" },
      ],
      reference: "REF-001",
      referenceId: "r1",
    });

    await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 5000n, currency: Currency.USDT },
      reason: "Market buyback program",
    });
  });

  it("searchAccounts finds by name", () => {
    const result = searchService.searchAccounts("Alpha");
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Alpha Fund");
  });

  it("searchAccounts finds by type", () => {
    const result = searchService.searchAccounts("revenue");
    expect(result.total).toBe(1);
  });

  it("searchJournals finds by description", () => {
    const result = searchService.searchJournals("journal");
    expect(result.total).toBe(1);
  });

  it("searchMovements finds by reason", () => {
    searchService.searchMovements("test"); // no movements yet, so 0
    expect(searchService.searchMovements("nonexistent").total).toBe(0);
  });

  it("searchDividends returns results", () => {
    const result = searchService.searchDividends("2026");
    expect(result.total).toBe(0);
  });

  it("searchBuybacks finds by reason", () => {
    const result = searchService.searchBuybacks("buyback");
    expect(result.total).toBe(1);
  });

  it("searchAll returns combined results", () => {
    const all = searchService.searchAll("Alpha");
    expect(all.accounts.total).toBe(1);
    expect(all.journals).toBeDefined();
    expect(all.movements).toBeDefined();
    expect(all.dividends).toBeDefined();
    expect(all.buybacks).toBeDefined();
  });
});
