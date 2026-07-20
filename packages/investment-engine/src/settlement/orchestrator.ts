import {
  applyInvestmentToSupply,
  InvestmentStatus,
  type Investment,
  type Property,
} from "@relcko/domain-core";
import type { EntityId, TxHash } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { SettlementRecord, TransactionRecord } from "../types";
import { SettlementStatus, InvestmentTxStatus } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { SettlementFailedError } from "../errors";
import { OwnershipAllocator } from "../ownership/allocator";
import { LedgerAdapter } from "../ledger/adapter";

export class SettlementOrchestrator {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly ownershipAllocator: OwnershipAllocator,
    private readonly ledgerAdapter: LedgerAdapter,
    private readonly logger?: Logger,
  ) {}

  async settle(actorId: EntityId, investment: Investment, property: Property, tx: TransactionRecord): Promise<SettlementRecord> {
    if (tx.status !== InvestmentTxStatus.Confirmed) {
      throw new SettlementFailedError(investment.id, "Transaction is not confirmed");
    }

    await publishInvestmentEvent(this.events, InvestmentEventType.SettlementStarted, investment.id, actorId, {
      propertyId: investment.propertyId as string,
      tokens: investment.tokens.toString(),
      txHash: tx.txHash as string,
    } as never);

    const settlement: SettlementRecord = {
      id: generateId("settle"),
      investmentId: investment.id,
      transactionId: tx.id,
      investorId: investment.investorId,
      propertyId: investment.propertyId,
      tokens: investment.tokens,
      amount: investment.amount,
      status: SettlementStatus.Completed,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveSettlement(settlement);

    const updatedProperty = applyInvestmentToSupply(property, investment.tokens);
    this.repository.saveProperty(updatedProperty as any);

    await this.ownershipAllocator.allocate(actorId, investment);
    await this.ledgerAdapter.recordInvestment(actorId, investment, tx);

    await publishInvestmentEvent(this.events, InvestmentEventType.SettlementCompleted, investment.id, actorId, {
      settlementId: settlement.id as string,
      propertyId: investment.propertyId as string,
      tokens: investment.tokens.toString(),
      txHash: tx.txHash as string,
      amount: investment.amount.amount.toString(),
      currency: investment.amount.currency,
    } as never);

    this.logger?.info("settlement completed", {
      investmentId: investment.id,
      settlementId: settlement.id,
      tokens: investment.tokens.toString(),
    });

    return settlement;
  }

  getSettlement(investmentId: EntityId): SettlementRecord | undefined {
    return this.repository.getSettlementByInvestment(investmentId);
  }
}

export interface SettlementDeps {
  readonly repository: InvestmentEngineRepository;
  readonly eventBus: EventBus;
  readonly ownershipAllocator: OwnershipAllocator;
  readonly ledgerAdapter: LedgerAdapter;
  readonly logger?: Logger;
}
