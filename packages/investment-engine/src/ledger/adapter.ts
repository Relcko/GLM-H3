import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { Investment } from "@relcko/domain-core";
import type { InvestmentEngineRepository } from "../repository";
import type { TransactionRecord, LedgerEntry } from "../types";
import { LedgerEntryType } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { LedgerError } from "../errors";

export interface TreasuryLedger {
  recordDebit(accountId: EntityId, amount: bigint, currency: string, reference: string): Promise<void>;
  recordCredit(accountId: EntityId, amount: bigint, currency: string, reference: string): Promise<void>;
  getBalance(accountId: EntityId, currency: string): Promise<bigint>;
}

export interface LedgerAdapterDeps {
  readonly repository: InvestmentEngineRepository;
  readonly eventBus: EventBus;
  readonly logger?: Logger;
  readonly treasury?: TreasuryLedger;
}

export class LedgerAdapter {
  private readonly treasury?: TreasuryLedger;

  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
    treasury?: TreasuryLedger,
  ) {
    this.treasury = treasury;
  }

  async recordInvestment(actorId: EntityId, investment: Investment, tx: TransactionRecord): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: generateId("ledger"),
      investmentId: investment.id,
      investorId: investment.investorId,
      amount: investment.amount,
      currency: investment.amount.currency,
      type: LedgerEntryType.Investment,
      txHash: tx.txHash,
      recordedAt: new Date().toISOString(),
    };

    this.repository.saveLedgerEntry(entry);

    if (this.treasury) {
      try {
        await this.treasury.recordCredit(
          investment.propertyId,
          investment.amount.amount,
          investment.amount.currency,
          `investment:${investment.id}`,
        );
      } catch (error) {
        this.logger?.error("treasury credit failed", {
          propertyId: investment.propertyId,
          error: String(error),
        });
      }
    }

    await publishInvestmentEvent(this.events, InvestmentEventType.LedgerRecorded, investment.id, actorId, {
      entryId: entry.id,
      amount: entry.amount.amount.toString(),
      currency: entry.amount.currency,
      type: entry.type,
    });

    this.logger?.info("ledger entry recorded", {
      entryId: entry.id,
      investmentId: investment.id,
      amount: investment.amount.amount.toString(),
    });

    return entry;
  }

  async recordRefund(actorId: EntityId, investment: Investment, txHash?: string): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: generateId("ledger"),
      investmentId: investment.id,
      investorId: investment.investorId,
      amount: { amount: -investment.amount.amount, currency: investment.amount.currency },
      currency: investment.amount.currency,
      type: LedgerEntryType.Refund,
      txHash: txHash as never,
      recordedAt: new Date().toISOString(),
    };

    this.repository.saveLedgerEntry(entry);

    await publishInvestmentEvent(this.events, InvestmentEventType.LedgerRecorded, investment.id, actorId, {
      entryId: entry.id,
      amount: entry.amount.amount.toString(),
      currency: entry.amount.currency,
      type: entry.type,
    });

    return entry;
  }

  listEntries(investmentId: EntityId): LedgerEntry[] {
    return this.repository.listLedgerEntries(investmentId);
  }
}

export function createLedgerAdapter(deps: LedgerAdapterDeps): LedgerAdapter {
  return new LedgerAdapter(deps.repository, deps.eventBus, deps.logger, deps.treasury);
}
