import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { generateId } from "@relcko/utils";
import type { TreasuryRepository } from "../repository";
import type { TreasuryAccount, LedgerEntry, JournalEntry } from "../types";
import { JournalStatus, TreasuryEntryType } from "../types";
import { TreasuryEventType, publishTreasuryEvent } from "../events";
import { AccountNotFoundError, JournalNotFoundError, UnbalancedJournalError } from "../errors";
import { postJournalSchema } from "../validation";
import type { z } from "zod";

type PostJournalInput = z.infer<typeof postJournalSchema>;

export default class LedgerService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async postJournal(actorId: EntityId, params: PostJournalInput): Promise<JournalEntry> {
    const parsed = postJournalSchema.parse(params);

    const accounts = this.validateAndGetAccounts(parsed.entries.map(e => e.accountId));

    let debitTotal = 0n;
    let creditTotal = 0n;
    for (const entry of parsed.entries) {
      if (entry.entryType === "debit") debitTotal += entry.amount;
      else creditTotal += entry.amount;
    }

    if (debitTotal !== creditTotal) {
      throw new UnbalancedJournalError(String(debitTotal), String(creditTotal));
    }

    const journalId = generateId("treasury") as EntityId;
    const now = new Date().toISOString();
    const runningBalance = new Map<EntityId, bigint>();
    for (const a of accounts) {
      runningBalance.set(a.id, a.balance);
    }

    const accountMap = new Map<EntityId, TreasuryAccount>();
    for (const a of accounts) {
      accountMap.set(a.id, a);
    }

    const ledgerEntries: LedgerEntry[] = parsed.entries.map(entry => {
      const account = accountMap.get(entry.accountId as EntityId)!;
      const balanceBefore = runningBalance.get(entry.accountId as EntityId)!;
      const balanceAfter = entry.entryType === "debit"
        ? balanceBefore + entry.amount
        : balanceBefore - entry.amount;
      runningBalance.set(entry.accountId as EntityId, balanceAfter);

      return {
        id: generateId("treasury") as EntityId,
        journalId,
        accountId: entry.accountId as EntityId,
        entryType: entry.entryType as TreasuryEntryType,
        amount: entry.amount,
        currency: account.currency,
        balanceBefore,
        balanceAfter,
        description: entry.description,
        reference: parsed.reference,
        referenceId: parsed.referenceId as EntityId,
        createdAt: now,
      };
    });

    for (const [accountId, newBalance] of runningBalance) {
      const account = accountMap.get(accountId)!;
      const delta = newBalance - account.balance;
      this.repository.saveAccount({
        ...account,
        balance: newBalance,
        availableBalance: account.availableBalance + delta,
        updatedAt: now,
      });
    }

    const journal: JournalEntry = {
      id: journalId,
      description: parsed.description,
      status: JournalStatus.Posted,
      entries: ledgerEntries,
      debitTotal,
      creditTotal,
      balanced: true,
      reference: parsed.reference,
      referenceId: parsed.referenceId as EntityId,
      postedAt: now,
      createdAt: now,
    };

    for (const entry of ledgerEntries) {
      this.repository.saveLedgerEntry(entry);
    }
    this.repository.saveJournal(journal);

    await publishTreasuryEvent(this.events, TreasuryEventType.JournalPosted, journalId, actorId, {
      journalId: journalId as string,
      debitTotal: String(debitTotal),
      creditTotal: String(creditTotal),
      entryCount: ledgerEntries.length,
    });

    this.logger?.info("journal posted", { journalId, debitTotal, creditTotal });
    return journal;
  }

  async reverseJournal(actorId: EntityId, journalId: EntityId, reason: string): Promise<JournalEntry> {
    const original = this.repository.getJournal(journalId);
    if (!original) throw new JournalNotFoundError(journalId as string);
    if (original.status !== JournalStatus.Posted) {
      throw new Error(`Journal ${journalId} is not posted, cannot reverse`);
    }

    const now = new Date().toISOString();
    const reverseJournalId = generateId("treasury") as EntityId;

    const reverseEntries: LedgerEntry[] = original.entries.map(entry => {
      const account = this.repository.getAccount(entry.accountId)!;
      if (!account) throw new AccountNotFoundError(entry.accountId as string);

      const reversedEntryType = entry.entryType === TreasuryEntryType.Debit
        ? TreasuryEntryType.Credit
        : TreasuryEntryType.Debit;

      const balanceBefore = account.balance;
      const balanceAfter = reversedEntryType === TreasuryEntryType.Debit
        ? balanceBefore + entry.amount
        : balanceBefore - entry.amount;

      this.repository.saveAccount({
        ...account,
        balance: balanceAfter,
        availableBalance: account.availableBalance + (balanceAfter - balanceBefore),
        updatedAt: now,
      });

      return {
        id: generateId("treasury") as EntityId,
        journalId: reverseJournalId,
        accountId: entry.accountId,
        entryType: reversedEntryType,
        amount: entry.amount,
        currency: entry.currency,
        balanceBefore,
        balanceAfter,
        description: `Reverse: ${entry.description} - ${reason}`,
        reference: `REVERSE_${original.reference}`,
        referenceId: original.id,
        createdAt: now,
      };
    });

    const reverseJournal: JournalEntry = {
      id: reverseJournalId,
      description: `Reverse of ${journalId}: ${reason}`,
      status: JournalStatus.Posted,
      entries: reverseEntries,
      debitTotal: original.creditTotal,
      creditTotal: original.debitTotal,
      balanced: true,
      reference: `REVERSE_${original.reference}`,
      referenceId: original.id,
      postedAt: now,
      createdAt: now,
    };

    for (const entry of reverseEntries) {
      this.repository.saveLedgerEntry(entry);
    }
    this.repository.saveJournal(reverseJournal);

    this.repository.saveJournal({
      ...original,
      status: JournalStatus.Reversed,
      reversedById: reverseJournalId,
    });

    await publishTreasuryEvent(this.events, TreasuryEventType.JournalReversed, journalId, actorId, {
      journalId: journalId as string,
      reverseJournalId: reverseJournalId as string,
      reason,
    });

    this.logger?.info("journal reversed", { journalId, reverseJournalId });
    return reverseJournal;
  }

  getJournal(id: EntityId): JournalEntry | undefined {
    return this.repository.getJournal(id);
  }

  listJournalsByStatus(status: string): JournalEntry[] {
    return this.repository.listJournalsByStatus(status);
  }

  getAccountBalance(accountId: EntityId): bigint {
    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);
    return account.balance;
  }

  getAccountAvailableBalance(accountId: EntityId): bigint {
    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);
    return account.availableBalance;
  }

  listLedgerByAccount(accountId: EntityId): LedgerEntry[] {
    return this.repository.listLedgerByAccount(accountId);
  }

  listLedgerByPeriod(accountId: EntityId, period: string): LedgerEntry[] {
    return this.repository.listLedgerByPeriod(accountId, period);
  }

  private validateAndGetAccounts(accountIds: string[]): TreasuryAccount[] {
    const accounts: TreasuryAccount[] = [];
    for (const id of accountIds) {
      const account = this.repository.getAccount(id as EntityId);
      if (!account) throw new AccountNotFoundError(id);
      accounts.push(account);
    }
    return accounts;
  }
}
