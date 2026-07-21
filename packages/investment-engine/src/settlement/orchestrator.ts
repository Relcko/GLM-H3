import {
  applyInvestmentToSupply,
  type Investment,
  type Property,
} from "@relcko/domain-core";
import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { SettlementRecord, TransactionRecord } from "../types";
import { SettlementStatus, InvestmentTxStatus } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { SettlementFailedError, SettlementInProgressError } from "../errors";
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

  createPendingSettlement(investment: Investment, tx: TransactionRecord): SettlementRecord {
    const now = new Date().toISOString();
    const settlement: SettlementRecord = {
      id: generateId("settle"),
      investmentId: investment.id,
      transactionId: tx.id,
      investorId: investment.investorId,
      propertyId: investment.propertyId,
      tokens: investment.tokens,
      amount: investment.amount,
      status: SettlementStatus.Pending,
      createdAt: now,
      retryCount: 0,
      maxRetries: 3,
    };

    this.repository.saveSettlement(settlement);

    this.logger?.info("settlement created", {
      settlementId: settlement.id,
      investmentId: investment.id,
    });

    return settlement;
  }

  async settle(
    actorId: EntityId,
    investment: Investment,
    property: Property,
    tx: TransactionRecord,
    claimedSettlement?: SettlementRecord,
  ): Promise<SettlementRecord> {
    const repoExisting = this.repository.getSettlementByInvestment(investment.id);

    if (repoExisting?.status === SettlementStatus.Completed) {
      this.logger?.info("settlement already completed", {
        settlementId: repoExisting.id,
        investmentId: investment.id,
      });
      return repoExisting;
    }

    if (
      repoExisting?.status === SettlementStatus.Settling &&
      repoExisting.processorId &&
      !claimedSettlement
    ) {
      throw new SettlementInProgressError(
        investment.id as string,
        repoExisting.processorId,
      );
    }

    if (tx.status !== InvestmentTxStatus.Confirmed) {
      throw new SettlementFailedError(investment.id as string, "Transaction is not confirmed");
    }

    let settlement = claimedSettlement ?? repoExisting;

    if (!settlement) {
      const now = new Date().toISOString();
      settlement = {
        id: generateId("settle"),
        investmentId: investment.id,
        transactionId: tx.id,
        investorId: investment.investorId,
        propertyId: investment.propertyId,
        tokens: investment.tokens,
        amount: investment.amount,
        status: SettlementStatus.Pending,
        createdAt: now,
        retryCount: 0,
        maxRetries: 3,
      };

      this.repository.saveSettlement(settlement);
    }

    const now = new Date().toISOString();
    const settling: SettlementRecord = {
      ...settlement,
      status: SettlementStatus.Settling,
      lastAttemptAt: now,
    };
    this.repository.saveSettlement(settling);

    await publishInvestmentEvent(
      this.events,
      InvestmentEventType.SettlementStarted,
      investment.id,
      actorId,
      {
        settlementId: settling.id as string,
        propertyId: investment.propertyId as string,
        tokens: investment.tokens.toString(),
        txHash: tx.txHash as string,
      } as never,
    );

    const updatedProperty = applyInvestmentToSupply(property, investment.tokens);
    this.repository.saveProperty(updatedProperty as any);

    await this.ownershipAllocator.allocate(actorId, investment);
    await this.ledgerAdapter.recordInvestment(actorId, investment, tx);

    const completedAt = new Date().toISOString();
    const completed: SettlementRecord = {
      ...settling,
      status: SettlementStatus.Completed,
      completedAt,
      lastAttemptAt: completedAt,
    };
    this.repository.saveSettlement(completed);

    await publishInvestmentEvent(
      this.events,
      InvestmentEventType.SettlementCompleted,
      investment.id,
      actorId,
      {
        settlementId: completed.id as string,
        propertyId: investment.propertyId as string,
        tokens: investment.tokens.toString(),
        txHash: tx.txHash as string,
        amount: investment.amount.amount.toString(),
        currency: investment.amount.currency,
      } as never,
    );

    this.logger?.info("settlement completed", {
      investmentId: investment.id,
      settlementId: completed.id,
      tokens: investment.tokens.toString(),
    });

    return completed;
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
