import { describe, it, expect, beforeEach } from "vitest";
import { generateId } from "@relcko/utils";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import LedgerService from "../services/ledger-service";
import AccountService from "../services/account-service";
import { TreasuryAccountType, TreasuryEntryType, JournalStatus } from "../types";
import { Currency } from "@relcko/types";
import { AccountNotFoundError, UnbalancedJournalError } from "../errors";

function createMockEventBus() {
  const events: unknown[] = [];
  return {
    events,
    publish: async (e: unknown) => { events.push(e); },
  };
}

describe("LedgerService + AccountService", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let ledgerService: LedgerService;
  let accountService: AccountService;
  const actorId = "actor-1" as never;
  let operatingAccountId: string;
  let revenueAccountId: string;

  beforeEach(async () => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    ledgerService = new LedgerService(repository, events as never);
    accountService = new AccountService(repository, events as never);

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
    operatingAccountId = op.id as string;
    revenueAccountId = rev.id as string;
  });

  it("createAccount creates account with zero balances", async () => {
    const acct = await accountService.createAccount(actorId, {
      accountType: TreasuryAccountType.Expense,
      name: "Test Expense",
      currency: Currency.USDC,
    });

    expect(acct.name).toBe("Test Expense");
    expect(acct.accountType).toBe(TreasuryAccountType.Expense);
    expect(acct.currency).toBe(Currency.USDC);
    expect(acct.balance).toBe(0n);
    expect(acct.reservedBalance).toBe(0n);
    expect(acct.availableBalance).toBe(0n);
    expect(acct.active).toBe(true);
    expect(acct.id).toBeDefined();
  });

  it("postJournal creates ledger entries and updates balances", async () => {
    const journal = await ledgerService.postJournal(actorId, {
      description: "Test journal",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 1000n, description: "debit entry" },
        { accountId: revenueAccountId, entryType: "credit", amount: 1000n, description: "credit entry" },
      ],
      reference: "TEST-001",
      referenceId: "ref-1",
    });

    expect(journal.status).toBe(JournalStatus.Posted);
    expect(journal.balanced).toBe(true);
    expect(journal.debitTotal).toBe(1000n);
    expect(journal.creditTotal).toBe(1000n);
    expect(journal.entries.length).toBe(2);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(1000n);
    expect(opAccount!.availableBalance).toBe(1000n);

    const revAccount = repository.getAccount(revenueAccountId as never);
    expect(revAccount!.balance).toBe(-1000n);
    expect(revAccount!.availableBalance).toBe(-1000n);

    expect(events.events.length).toBeGreaterThan(0);
  });

  it("postJournal throws UnbalancedJournalError for unbalanced entries", async () => {
    await expect(
      ledgerService.postJournal(actorId, {
        description: "Unbalanced",
        entries: [
          { accountId: operatingAccountId, entryType: "debit", amount: 1000n, description: "debit" },
          { accountId: revenueAccountId, entryType: "credit", amount: 500n, description: "credit" },
        ],
        reference: "UNBAL",
        referenceId: "ref-2",
      }),
    ).rejects.toThrow(UnbalancedJournalError);
  });

  it("postJournal throws AccountNotFoundError for missing account", async () => {
    const missingId = generateId("test");
    await expect(
      ledgerService.postJournal(actorId, {
        description: "Missing account",
        entries: [
          { accountId: operatingAccountId, entryType: "debit", amount: 500n, description: "debit" },
          { accountId: missingId, entryType: "credit", amount: 500n, description: "credit" },
        ],
        reference: "MISS",
        referenceId: "ref-3",
      }),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it("reverseJournal reverses entries and restores balances", async () => {
    const journal = await ledgerService.postJournal(actorId, {
      description: "To reverse",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 2000n, description: "debit" },
        { accountId: revenueAccountId, entryType: "credit", amount: 2000n, description: "credit" },
      ],
      reference: "REV-TEST",
      referenceId: "ref-4",
    });

    const reverseJournal = await ledgerService.reverseJournal(actorId, journal.id as never, "Test reversal");

    expect(reverseJournal.status).toBe(JournalStatus.Posted);
    expect(reverseJournal.balanced).toBe(true);

    const original = ledgerService.getJournal(journal.id as never);
    expect(original!.status).toBe(JournalStatus.Reversed);
    expect(original!.reversedById).toBe(reverseJournal.id);

    const opAccount = repository.getAccount(operatingAccountId as never);
    expect(opAccount!.balance).toBe(0n);

    const revAccount = repository.getAccount(revenueAccountId as never);
    expect(revAccount!.balance).toBe(0n);

    expect(events.events.length).toBe(4);
  });

  it("getAccountBalance returns correct balance", async () => {
    const balance = ledgerService.getAccountBalance(operatingAccountId as never);
    expect(balance).toBe(0n);
  });

  it("getAccountBalance throws for missing account", async () => {
    expect(() => ledgerService.getAccountBalance("missing" as never)).toThrow(AccountNotFoundError);
  });

  it("getAccountAvailableBalance returns correct available balance", async () => {
    const bal = ledgerService.getAccountAvailableBalance(operatingAccountId as never);
    expect(bal).toBe(0n);
  });

  it("listLedgerByAccount returns entries for account", async () => {
    await ledgerService.postJournal(actorId, {
      description: "List test",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 500n, description: "d1" },
        { accountId: revenueAccountId, entryType: "credit", amount: 500n, description: "c1" },
      ],
      reference: "LIST",
      referenceId: "ref-5",
    });

    const entries = ledgerService.listLedgerByAccount(operatingAccountId as never);
    expect(entries.length).toBe(1);
    expect(entries[0].amount).toBe(500n);
  });

  it("listLedgerByPeriod returns entries for period", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Period test",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 300n, description: "d1" },
        { accountId: revenueAccountId, entryType: "credit", amount: 300n, description: "c1" },
      ],
      reference: "PER",
      referenceId: "ref-6",
    });

    const entries = ledgerService.listLedgerByPeriod(operatingAccountId as never, "2026");
    expect(entries.length).toBe(1);
  });

  it("reserveBalance reserves amount from available balance", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund account",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 5000n, description: "fund" },
        { accountId: revenueAccountId, entryType: "credit", amount: 5000n, description: "fund" },
      ],
      reference: "FUND",
      referenceId: "ref-7",
    });

    const updated = await accountService.reserveBalance(actorId, operatingAccountId as never, 2000n);
    expect(updated.reservedBalance).toBe(2000n);
    expect(updated.availableBalance).toBe(3000n);
    expect(updated.balance).toBe(5000n);
  });

  it("releaseReservedBalance releases reserved amount back to available", async () => {
    await ledgerService.postJournal(actorId, {
      description: "Fund account",
      entries: [
        { accountId: operatingAccountId, entryType: "debit", amount: 5000n, description: "fund" },
        { accountId: revenueAccountId, entryType: "credit", amount: 5000n, description: "fund" },
      ],
      reference: "FUND2",
      referenceId: "ref-8",
    });

    await accountService.reserveBalance(actorId, operatingAccountId as never, 2000n);
    const released = await accountService.releaseReservedBalance(actorId, operatingAccountId as never, 1000n);
    expect(released.reservedBalance).toBe(1000n);
    expect(released.availableBalance).toBe(4000n);
  });
});
