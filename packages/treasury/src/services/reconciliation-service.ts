import { generateId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { TreasuryRepository } from "../repository";
import type { ReconciliationRecord } from "../types";
import { AccountNotFoundError, ReconciliationError } from "../errors";
import { TreasuryEventType, publishTreasuryEvent } from "../events";

export class ReconciliationService {
  constructor(
    private readonly repository: TreasuryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async reconcileAccount(actorId: EntityId, accountId: EntityId, expectedBalance: bigint, period: string): Promise<ReconciliationRecord> {
    const account = this.repository.getAccount(accountId);
    if (!account) throw new AccountNotFoundError(accountId as string);

    const ledgerEntries = this.repository.listLedgerByAccount(accountId);
    const actualBalance = ledgerEntries.length > 0
      ? ledgerEntries[ledgerEntries.length - 1].balanceAfter
      : 0n;

    const difference = expectedBalance - actualBalance;

    const record: ReconciliationRecord = {
      id: generateId(),
      accountId,
      expectedBalance,
      actualBalance,
      difference,
      reconciled: difference === 0n,
      period,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveReconciliation(record);

    await publishTreasuryEvent(this.events, TreasuryEventType.ReconciliationPerformed, record.id, actorId, {
      reconciliationId: record.id as string,
      accountId: accountId as string,
      expectedBalance: expectedBalance.toString(),
      actualBalance: actualBalance.toString(),
      difference: difference.toString(),
      reconciled: record.reconciled,
      period,
    });

    this.logger?.info("reconciliation performed", { accountId: accountId as string, period, difference: difference.toString() });

    return record;
  }

  listByAccount(accountId: EntityId): ReconciliationRecord[] {
    return this.repository.listReconciliationsByAccount(accountId);
  }

  listByPeriod(period: string): ReconciliationRecord[] {
    return this.repository.listReconciliationsByPeriod(period);
  }

  async resolveReconciliation(actorId: EntityId, id: EntityId, actualBalance: bigint, notes?: string): Promise<ReconciliationRecord> {
    const record = this.findReconciliationById(id);
    if (!record) throw new ReconciliationError(`Reconciliation ${id as string} not found`);

    const difference = record.expectedBalance - actualBalance;
    const reconciled = difference === 0n;

    const updated: ReconciliationRecord = {
      ...record,
      actualBalance,
      difference,
      reconciled,
      reconciledAt: reconciled ? new Date().toISOString() : undefined,
      notes: notes ?? record.notes,
    };

    this.repository.saveReconciliation(updated);

    await publishTreasuryEvent(this.events, TreasuryEventType.ReconciliationPerformed, id, actorId, {
      reconciliationId: id as string,
      accountId: record.accountId as string,
      expectedBalance: record.expectedBalance.toString(),
      actualBalance: actualBalance.toString(),
      difference: difference.toString(),
      reconciled,
      period: record.period,
      ...(notes ? { notes } : {}),
    } as Parameters<typeof publishTreasuryEvent>[4]);

    this.logger?.info("reconciliation resolved", { id: id as string, reconciled });

    return updated;
  }

  private findReconciliationById(id: EntityId): ReconciliationRecord | undefined {
    const accounts = this.repository.listAllAccounts();
    for (const account of accounts) {
      const found = this.repository.listReconciliationsByAccount(account.id).find(r => r.id === id);
      if (found) return found;
    }
    return undefined;
  }
}
