import type { EntityId, TxHash } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { InvestmentEngineRepository } from "../repository";
import type { InvestmentHistoryEntry } from "../types";

export class InvestmentHistoryService {
  constructor(private readonly repository: InvestmentEngineRepository) {}

  record(entry: {
    investmentId: EntityId;
    investorId: EntityId;
    propertyId: EntityId;
    event: string;
    txHash?: TxHash;
    tokens: bigint;
    amount: bigint;
    currency: string;
    status: string;
  }): InvestmentHistoryEntry {
    const historyEntry: InvestmentHistoryEntry = {
      id: generateId("hist") as EntityId,
      investmentId: entry.investmentId,
      investorId: entry.investorId,
      propertyId: entry.propertyId,
      eventType: entry.event,
      actorId: entry.investorId,
      metadata: {
        txHash: entry.txHash as string,
        tokens: entry.tokens.toString(),
        amount: entry.amount.toString(),
        currency: entry.currency,
        status: entry.status,
      },
      occurredAt: new Date().toISOString(),
    };

    this.repository.saveHistoryEntry(historyEntry);
    return historyEntry;
  }

  listByInvestment(investmentId: EntityId): InvestmentHistoryEntry[] {
    return this.repository.listHistoryByInvestment(investmentId);
  }
}
