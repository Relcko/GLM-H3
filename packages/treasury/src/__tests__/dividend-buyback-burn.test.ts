import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { Currency } from "@relcko/types";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import DividendService from "../services/dividend-service";
import BuybackService from "../services/buyback-service";
import BurnService from "../services/burn-service";
import type { PortfolioAdapter, EligibleInvestor } from "../services/portfolio-adapter";
import { TreasuryAccountType, DividendStatus, BuybackStatus, BuybackType, BurnStatus, BurnType } from "../types";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

function createMockPortfolioAdapter(investors: EligibleInvestor[] = []): PortfolioAdapter {
  return { getEligibleInvestors: async () => investors };
}

describe("DividendService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let ledgerService: LedgerService;
  let accountService: AccountService;
  let dividendService: DividendService;
  const actorId = "actor-1" as never;
  let dividendAccountId: string;
  let operatingAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    ledgerService = new LedgerService(repository, events as never);
    accountService = new AccountService(repository, events as never);

    const div = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Dividend,
      name: "Dividend Account",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating Account",
      currency: Currency.USDT,
    });
    dividendAccountId = div.id as string;
    operatingAccountId = op.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund operating",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 100000n, description: "fund" },
        { accountId: dividendAccountId, entryType: "credit", amount: 100000n, description: "fund" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });

    const portfolioAdapter = createMockPortfolioAdapter([
      { investorId: "inv-1" as never, units: 100n },
      { investorId: "inv-2" as never, units: 200n },
    ]);
    dividendService = new DividendService(repository, events as never, portfolioAdapter);
  });

  it("proposeDividend creates pending proposal", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 300n,
    });

    expect(proposal.status).toBe(DividendStatus.Pending);
    expect(proposal.period).toBe("2026-Q1");
    expect(proposal.totalAmount.amount).toBe(30000n);
  });

  it("approveDividend transitions to approved", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 300n,
    });

    const approved = await dividendService.approveDividend(actorId, proposal.id as never);
    expect(approved.status).toBe(DividendStatus.Approved);
  });

  it("distributeDividend creates entries, posts journal, updates balances", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 300n,
    });

    await dividendService.approveDividend(actorId, proposal.id as never);
    const distributed = await dividendService.distributeDividend(actorId, proposal.id as never);

    expect(distributed.status).toBe(DividendStatus.Distributed);
    expect(distributed.totalDistributed.amount).toBe(30000n);

    const eligibility = dividendService.listEligibilityByDividend(proposal.id as never);
    expect(eligibility.length).toBe(2);

    const distributions = dividendService.listDistributionsByDividend(proposal.id as never);
    expect(distributions.length).toBe(2);

    const divAccount = repository.getAccount(dividendAccountId as never);
    expect(divAccount!.balance).toBe(-70000n);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(70000n);
  });

  it("recoverDividend creates recovery entry and reversal journal", async () => {
    const proposal = await dividendService.proposeDividend(actorId, {
      period: "2026-Q1",
      totalAmount: { amount: 30000n, currency: Currency.USDT },
      perUnitAmount: { amount: 100n, currency: Currency.USDT },
      eligibleUnits: 300n,
    });

    await dividendService.approveDividend(actorId, proposal.id as never);
    await dividendService.distributeDividend(actorId, proposal.id as never);

    const distributions = dividendService.listDistributionsByDividend(proposal.id as never);
    const recovery = await dividendService.recoverDividend(
      actorId,
      proposal.id as never,
      distributions[0].id as never,
      "inv-1" as never,
      "Overpayment",
    );

    expect(recovery.amount.amount).toBe(10000n);
    expect(recovery.reason).toBe("Overpayment");

    const divAccount = repository.getAccount(dividendAccountId as never);
    expect(divAccount!.balance).toBe(-80000n);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(80000n);
  });
});

describe("BuybackService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let buybackService: BuybackService;
  const actorId = "actor-1" as never;
  let buybackAccountId: string;
  let operatingAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
    buybackService = new BuybackService(repository, events as never);

    const bb = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.BuybackReserve,
      name: "Buyback Reserve",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
    buybackAccountId = bb.id as string;
    operatingAccountId = op.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund accounts",
      entries: [
        { accountId: buybackAccountId, entryType: "debit", amount: 50000n, description: "fund bb" },
        { accountId: operatingAccountId, entryType: "credit", amount: 50000n, description: "fund bb" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Fund operating",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 50000n, description: "fund op" },
        { accountId: buybackAccountId, entryType: "credit", amount: 50000n, description: "fund op" },
      ],
      reference: "FUND2",
      referenceId: "f-2",
    });
  });

  it("requestBuyback creates pending buyback", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Quarterly buyback",
    });

    expect(req.status).toBe(BuybackStatus.Pending);
    expect(req.type).toBe(BuybackType.Scheduled);
  });

  it("approveBuyback transitions to approved", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Quarterly buyback",
    });

    const approved = await buybackService.approveBuyback(actorId, req.id as never);
    expect(approved.status).toBe(BuybackStatus.Approved);
  });

  it("completeBuyback posts journal and updates balances", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Quarterly buyback",
    });

    await buybackService.approveBuyback(actorId, req.id as never);
    const completed = await buybackService.completeBuyback(actorId, req.id as never);

    expect(completed.status).toBe(BuybackStatus.Completed);
    expect(completed.executedAmount!.amount).toBe(10000n);

    const bbAccount = repository.getAccount(buybackAccountId as never);
    expect(bbAccount!.balance).toBe(-10000n);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(10000n);
  });

  it("cancelBuyback sets status to cancelled", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Quarterly buyback",
    });

    const cancelled = await buybackService.cancelBuyback(actorId, req.id as never);
    expect(cancelled.status).toBe(BuybackStatus.Cancelled);
  });
});

describe("BurnService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let burnService: BurnService;
  const actorId = "actor-1" as never;
  let equityAccountId: string;
  let assetAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
    burnService = new BurnService(repository, events as never);

    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity,
      name: "Equity",
      currency: Currency.USDT,
    });
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset,
      name: "Asset",
      currency: Currency.USDT,
    });
    equityAccountId = eq.id as string;
    assetAccountId = as.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund accounts",
      entries: [
        { accountId: equityAccountId, entryType: "debit", amount: 50000n, description: "fund eq" },
        { accountId: assetAccountId, entryType: "credit", amount: 50000n, description: "fund eq" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });
  });

  it("requestBurn creates pending burn", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 10000n,
      reason: "Scheduled token burn",
    });

    expect(req.status).toBe(BurnStatus.Pending);
    expect(req.amount).toBe(10000n);
  });

  it("approveBurn transitions to approved", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 10000n,
      reason: "Scheduled token burn",
    });

    const approved = await burnService.approveBurn(actorId, req.id as never);
    expect(approved.status).toBe(BurnStatus.Approved);
  });

  it("completeBurn posts journal and updates balances", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 10000n,
      reason: "Scheduled token burn",
    });

    await burnService.approveBurn(actorId, req.id as never);
    const completed = await burnService.completeBurn(actorId, req.id as never);

    expect(completed.status).toBe(BurnStatus.Completed);
    expect(completed.executedAt).toBeDefined();

    const eqAccount = repository.getAccount(equityAccountId as never);
    expect(eqAccount!.balance).toBe(40000n);

    const asAccount = repository.getAccount(assetAccountId as never);
    expect(asAccount!.balance).toBe(-40000n);
  });

  it("cancelBurn sets status to cancelled", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled,
      amount: 10000n,
      reason: "Scheduled token burn",
    });

    const cancelled = await burnService.cancelBurn(actorId, req.id as never);
    expect(cancelled.status).toBe(BurnStatus.Cancelled);
  });
});

describe("Burn Accounting Verification", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let burnService: BurnService;
  const actorId = "actor-1" as never;
  let equityAccountId: string;
  let assetAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
    burnService = new BurnService(repository, events as never);

    const eq = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Equity,
      name: "Equity",
      currency: Currency.USDT,
    });
    const as = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Asset,
      name: "Asset",
      currency: Currency.USDT,
    });
    equityAccountId = eq.id as string;
    assetAccountId = as.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund accounts",
      entries: [
        { accountId: equityAccountId, entryType: "debit", amount: 50000n, description: "fund eq" },
        { accountId: assetAccountId, entryType: "credit", amount: 50000n, description: "fund eq" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });
  });

  it("burn journal is balanced", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled, amount: 10000n, reason: "Test burn",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const burnJournal = journals.find((j) => j.reference === "burn")!;

    expect(burnJournal.balanced).toBe(true);
    expect(burnJournal.debitTotal).toBe(10000n);
    expect(burnJournal.creditTotal).toBe(10000n);
  });

  it("burn journal entries reference correct accounts", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled, amount: 10000n, reason: "Test burn",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const burnJournal = journals.find((j) => j.reference === "burn")!;

    const assetEntry = burnJournal.entries.find((e) => e.accountId === assetAccountId);
    const equityEntry = burnJournal.entries.find((e) => e.accountId === equityAccountId);

    expect(assetEntry!.entryType).toBe("debit");
    expect(equityEntry!.entryType).toBe("credit");
  });

  it("burn journal entry balanceAfter follows debit=increase, credit=decrease convention", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled, amount: 10000n, reason: "Test burn",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const burnJournal = journals.find((j) => j.reference === "burn")!;

    const assetEntry = burnJournal.entries.find((e) => e.accountId === assetAccountId)!;
    const equityEntry = burnJournal.entries.find((e) => e.accountId === equityAccountId)!;

    expect(assetEntry.balanceAfter).toBe(assetEntry.balanceBefore + 10000n);
    expect(equityEntry.balanceAfter).toBe(equityEntry.balanceBefore - 10000n);
  });

  it("burn updates equity account balance correctly", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled, amount: 10000n, reason: "Test burn",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const eqAccount = repository.getAccount(equityAccountId as never);
    expect(eqAccount!.balance).toBe(40000n);
  });

  it("burn updates asset account balance correctly", async () => {
    const req = await burnService.requestBurn(actorId, {
      type: BurnType.Scheduled, amount: 10000n, reason: "Test burn",
    });
    await burnService.approveBurn(actorId, req.id as never);
    await burnService.completeBurn(actorId, req.id as never);

    const asAccount = repository.getAccount(assetAccountId as never);
    expect(asAccount!.balance).toBe(-40000n);
  });
});

describe("Buyback Accounting Verification", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let accountService: AccountService;
  let ledgerService: LedgerService;
  let buybackService: BuybackService;
  const actorId = "actor-1" as never;
  let buybackAccountId: string;
  let operatingAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    accountService = new AccountService(repository, events as never);
    ledgerService = new LedgerService(repository, events as never);
    buybackService = new BuybackService(repository, events as never);

    const bb = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.BuybackReserve,
      name: "Buyback Reserve",
      currency: Currency.USDT,
    });
    const op = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Operating,
      name: "Operating",
      currency: Currency.USDT,
    });
    buybackAccountId = bb.id as string;
    operatingAccountId = op.id as string;

    await ledgerService.postJournal(actorId, {
      description: "Fund accounts",
      entries: [
        { accountId: buybackAccountId, entryType: "debit", amount: 50000n, description: "fund bb" },
        { accountId: operatingAccountId, entryType: "credit", amount: 50000n, description: "fund bb" },
      ],
      reference: "FUND",
      referenceId: "f-1",
    });
    await ledgerService.postJournal(actorId, {
      description: "Fund operating",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 50000n, description: "fund op" },
        { accountId: buybackAccountId, entryType: "credit", amount: 50000n, description: "fund op" },
      ],
      reference: "FUND2",
      referenceId: "f-2",
    });
  });

  it("buyback journal is balanced", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Test buyback",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const buybackJournal = journals.find((j) => j.reference === "buyback")!;

    expect(buybackJournal.balanced).toBe(true);
    expect(buybackJournal.debitTotal).toBe(10000n);
    expect(buybackJournal.creditTotal).toBe(10000n);
  });

  it("buyback journal entries reference correct accounts", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Test buyback",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const buybackJournal = journals.find((j) => j.reference === "buyback")!;

    const opEntry = buybackJournal.entries.find((e) => e.accountId === operatingAccountId);
    const bbEntry = buybackJournal.entries.find((e) => e.accountId === buybackAccountId);

    expect(opEntry!.entryType).toBe("debit");
    expect(bbEntry!.entryType).toBe("credit");
  });

  it("buyback journal entry balanceAfter follows debit=increase, credit=decrease convention", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Test buyback",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const journals = repository.listJournalsByStatus("posted");
    const buybackJournal = journals.find((j) => j.reference === "buyback")!;

    const opEntry = buybackJournal.entries.find((e) => e.accountId === operatingAccountId)!;
    const bbEntry = buybackJournal.entries.find((e) => e.accountId === buybackAccountId)!;

    expect(opEntry.balanceAfter).toBe(opEntry.balanceBefore + 10000n);
    expect(bbEntry.balanceAfter).toBe(bbEntry.balanceBefore - 10000n);
  });

  it("buyback updates buyback reserve account balance correctly", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Test buyback",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const bbAccount = repository.getAccount(buybackAccountId as never);
    expect(bbAccount!.balance).toBe(-10000n);
  });

  it("buyback updates operating account balance correctly", async () => {
    const req = await buybackService.requestBuyback(actorId, {
      type: BuybackType.Scheduled,
      amount: { amount: 10000n, currency: Currency.USDT },
      reason: "Test buyback",
    });
    await buybackService.approveBuyback(actorId, req.id as never);
    await buybackService.completeBuyback(actorId, req.id as never);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(10000n);
  });
});
