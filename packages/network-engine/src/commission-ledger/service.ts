import type { EntityId, Money, Currency } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { CommissionLedgerEntry, CommissionRecord } from "../types";
import { CommissionStatus } from "../types";
import { CommissionLedgerError } from "../errors";

export class CommissionLedgerAdapter {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly logger?: Logger,
  ) {}

  recordEarned(commission: CommissionRecord): CommissionLedgerEntry {
    const prevEntries = this.repository.listLedgerByAgent(commission.agentId);
    const balanceBefore = prevEntries.length > 0
      ? prevEntries[prevEntries.length - 1].balanceAfter
      : { amount: 0n, currency: commission.amount.currency };

    const entry: CommissionLedgerEntry = {
      id: generateId("cmledger") as EntityId,
      agentId: commission.agentId,
      commissionId: commission.id,
      amount: commission.amount,
      entryType: "earned",
      balanceBefore,
      balanceAfter: { amount: balanceBefore.amount + commission.amount.amount, currency: balanceBefore.currency },
      period: commission.period,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveLedgerEntry(entry);
    return entry;
  }

  recordPaid(commission: CommissionRecord): CommissionLedgerEntry {
    const prevEntries = this.repository.listLedgerByAgent(commission.agentId);
    const balanceBefore = prevEntries.length > 0
      ? prevEntries[prevEntries.length - 1].balanceAfter
      : { amount: 0n, currency: commission.amount.currency };

    const entry: CommissionLedgerEntry = {
      id: generateId("cmledger") as EntityId,
      agentId: commission.agentId,
      commissionId: commission.id,
      amount: commission.amount,
      entryType: "paid",
      balanceBefore,
      balanceAfter: { amount: balanceBefore.amount - commission.amount.amount, currency: balanceBefore.currency },
      period: commission.period,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveLedgerEntry(entry);
    return entry;
  }

  recordRecovered(commission: CommissionRecord): CommissionLedgerEntry {
    const prevEntries = this.repository.listLedgerByAgent(commission.agentId);
    const balanceBefore = prevEntries.length > 0
      ? prevEntries[prevEntries.length - 1].balanceAfter
      : { amount: 0n, currency: commission.amount.currency };

    const entry: CommissionLedgerEntry = {
      id: generateId("cmledger") as EntityId,
      agentId: commission.agentId,
      commissionId: commission.id,
      amount: commission.amount,
      entryType: "recovered",
      balanceBefore,
      balanceAfter: { amount: balanceBefore.amount - commission.amount.amount, currency: balanceBefore.currency },
      period: commission.period,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveLedgerEntry(entry);
    return entry;
  }

  getBalance(agentId: EntityId): Money {
    const entries = this.repository.listLedgerByAgent(agentId);
    if (entries.length === 0) return { amount: 0n, currency: "USDT" as Currency };
    return entries[entries.length - 1].balanceAfter;
  }

  listByAgent(agentId: EntityId): CommissionLedgerEntry[] {
    return this.repository.listLedgerByAgent(agentId);
  }
}
