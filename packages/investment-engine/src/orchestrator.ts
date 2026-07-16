import type { Property, Investment } from "@relcko/domain-core";
import type { EntityId, Address, TxHash } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { InvestmentEngineRepository } from "./repository";
import type {
  InvestmentRequest,
  Reservation,
  TransactionRecord,
  SettlementRecord,
  InvestmentTxStatus,
} from "./types";
import { PaymentMethod } from "./types";
import { InvestmentEventType, publishInvestmentEvent } from "./events";
import { EligibilityEngine } from "./eligibility/engine";
import { ReservationEngine } from "./reservation/engine";
import { TransactionEngine } from "./transaction/engine";
import { TransactionMonitor } from "./transaction/monitor";
import { SettlementOrchestrator } from "./settlement/orchestrator";
import { OwnershipAllocator } from "./ownership/allocator";
import { LedgerAdapter } from "./ledger/adapter";
import { RecoveryEngine } from "./recovery/engine";
import { InvestmentHistoryService } from "./history/service";
import { PortfolioAdapter } from "./portfolio/adapter";
import { SecurityGuard } from "./security/guard";
import type { BlockchainAdapter } from "./blockchain/adapter";

export interface InvestmentOrchestratorDeps {
  repository: InvestmentEngineRepository;
  eventBus: EventBus;
  blockchain: BlockchainAdapter;
  logger?: Logger;
  performance?: PerformanceModuleContext;
}

export class InvestmentOrchestrator {
  readonly eligibility: EligibilityEngine;
  readonly reservation: ReservationEngine;
  readonly transactions: TransactionEngine;
  readonly monitor: TransactionMonitor;
  readonly settlement: SettlementOrchestrator;
  readonly ownership: OwnershipAllocator;
  readonly ledger: LedgerAdapter;
  readonly recovery: RecoveryEngine;
  readonly history: InvestmentHistoryService;
  readonly security: SecurityGuard;
  readonly portfolio: PortfolioAdapter;
  readonly performance?: PerformanceModuleContext;
  private readonly eventBus: EventBus;

  constructor(deps: InvestmentOrchestratorDeps) {
    this.eventBus = deps.eventBus;
    this.performance = deps.performance;
    this.security = new SecurityGuard(deps.repository);
    this.eligibility = new EligibilityEngine(deps.repository, deps.eventBus, deps.logger);
    this.reservation = new ReservationEngine(deps.repository, deps.eventBus, deps.logger);
    this.transactions = new TransactionEngine(
      deps.repository,
      deps.eventBus,
      deps.blockchain,
      this.security,
      deps.logger,
    );
    this.monitor = new TransactionMonitor(
      deps.repository,
      deps.eventBus,
      deps.blockchain,
      this.transactions,
      deps.logger,
    );
    this.ownership = new OwnershipAllocator(deps.repository, deps.eventBus, deps.logger);
    this.ledger = new LedgerAdapter(deps.repository, deps.eventBus, deps.logger);
    this.settlement = new SettlementOrchestrator(
      deps.repository,
      deps.eventBus,
      this.ownership,
      this.ledger,
      deps.logger,
    );
    this.recovery = new RecoveryEngine(deps.repository, deps.eventBus, deps.blockchain, deps.logger);
    this.history = new InvestmentHistoryService(deps.repository);
    this.portfolio = new PortfolioAdapter(deps.repository, deps.eventBus, deps.logger);
  }

  async requestInvestment(
    actorId: EntityId,
    request: InvestmentRequest,
    property: Property,
  ): Promise<{ investment: Investment; reservation: Reservation }> {
    this.security.checkDoubleSubmit(request.idempotencyKey);
    this.security.verifyChain(Number(property.blockchain), request.chainId);

    await this.eligibility.assertAndPublish(actorId, request, property);
    const result = await this.reservation.create(actorId, request);
    return result;
  }

  async confirmWallet(actorId: EntityId, reservationId: EntityId): Promise<void> {
    await this.reservation.confirmWallet(actorId, reservationId);
  }

  async submitTransaction(
    actorId: EntityId,
    reservationId: EntityId,
    toAddress: Address,
    txHash?: TxHash,
  ): Promise<TransactionRecord> {
    const reservation = this.reservation.getReservation(reservationId);
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);

    const tx = await this.transactions.createTransaction(actorId, {
      investmentId: reservation.investmentId,
      reservationId: reservation.id,
      investorId: reservation.investorId,
      chainId: reservation.chainId,
      from: reservation.walletAddress,
      to: toAddress,
      amount: reservation.amount.amount,
      currency: reservation.amount.currency,
      method: reservation.paymentMethod,
      tokenAddress: undefined,
    });

    if (txHash) {
      return this.transactions.markSubmitted(actorId, tx.id, txHash);
    }

    return tx;
  }

  async monitorTransaction(actorId: EntityId, txId: EntityId): Promise<TransactionRecord> {
    return this.monitor.monitorTransaction(actorId, txId);
  }

  async settle(
    actorId: EntityId,
    investment: Investment,
    property: Property,
    tx: TransactionRecord,
  ): Promise<SettlementRecord> {
    const settlement = await this.settlement.settle(actorId, investment, property, tx);

    await publishInvestmentEvent(this.eventBus, InvestmentEventType.InvestmentCompleted, investment.id, actorId, {
      settlementId: settlement.id,
      propertyId: investment.propertyId,
      tokens: investment.tokens.toString(),
      amount: investment.amount.amount.toString(),
      currency: investment.amount.currency,
    });

    await this.portfolio.updatePortfolio(investment.investorId);

    return settlement;
  }

  async completePurchase(
    actorId: EntityId,
    request: InvestmentRequest,
    property: Property,
    toAddress: Address,
    txHash: TxHash,
  ): Promise<{
    investment: Investment;
    reservation: Reservation;
    transaction: TransactionRecord;
    settlement: SettlementRecord;
  }> {
    const { investment, reservation } = await this.requestInvestment(actorId, request, property);

    await this.confirmWallet(actorId, reservation.id);

    const tx = await this.submitTransaction(actorId, reservation.id, toAddress, txHash);

    const confirmedTx = await this.transactions.confirmTransaction(actorId, tx.id, {
      txHash,
      blockNumber: 0,
      gasUsed: 0n,
      gasPrice: 0n,
    });

    const settlement = await this.settle(actorId, investment, property, confirmedTx);

    this.history.record({
      investmentId: investment.id,
      investorId: investment.investorId,
      propertyId: investment.propertyId,
      event: "investment.completed",
      txHash,
      tokens: investment.tokens,
      amount: investment.amount.amount,
      currency: investment.amount.currency,
      status: "completed",
    });

    return { investment, reservation, transaction: confirmedTx, settlement };
  }
}
