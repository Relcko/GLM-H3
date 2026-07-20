import type { EntityId, TxHash, Address } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type {
  TransactionRecord,
  InvestmentTxStatus,
  SettlementRecord,
  SettlementStatus,
} from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import {
  TransactionNotFoundError,
  TransactionExpiredError,
  ConfirmationTimeoutError,
} from "../errors";
import type { BlockchainAdapter } from "../blockchain/adapter";
import { getChainConfig } from "../blockchain/chains";
import { SecurityGuard } from "../security/guard";

export const TX_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_RETRIES = 3;

export class TransactionEngine {
  private readonly maxRetries: number;

  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly blockchain: BlockchainAdapter,
    private readonly security: SecurityGuard,
    private readonly logger?: Logger,
  ) {
    this.maxRetries = MAX_RETRIES;
  }

  async createTransaction(actorId: EntityId, params: {
    investmentId: EntityId;
    reservationId: EntityId;
    investorId: EntityId;
    chainId: number;
    from: Address;
    to: Address;
    amount: bigint;
    currency: string;
    method: string;
    tokenAddress?: Address;
  }): Promise<TransactionRecord> {
    const chainConfig = getChainConfig(params.chainId);

    const tx: TransactionRecord = {
      id: generateId("ie_tx") as EntityId,
      investmentId: params.investmentId,
      reservationId: params.reservationId,
      investorId: params.investorId,
      chainId: params.chainId,
      from: params.from,
      to: params.to,
      amount: params.amount,
      currency: params.currency as never,
      method: params.method as never,
      tokenAddress: params.tokenAddress,
      status: "pending" as InvestmentTxStatus,
      confirmations: 0,
      requiredConfirmations: chainConfig?.requiredConfirmations ?? 12,
      retryCount: 0,
      maxRetries: this.maxRetries,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.repository.saveTransaction(tx);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionSubmitted, tx.id, actorId, {
      investmentId: tx.investmentId,
      chainId: tx.chainId,
      from: tx.from,
      to: tx.to,
      amount: tx.amount.toString(),
    });

    return tx;
  }

  async markSubmitted(actorId: EntityId, txId: EntityId, txHash: TxHash): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);
    const updated: TransactionRecord = {
      ...tx,
      txHash,
      status: "submitted" as InvestmentTxStatus,
    };
    this.repository.saveTransaction(updated);
    return updated;
  }

  async confirmTransaction(actorId: EntityId, txId: EntityId, receipt: {
    txHash: TxHash;
    blockNumber: number;
    gasUsed: bigint;
    gasPrice: bigint;
  }): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);
    const chainConfig = getChainConfig(tx.chainId);
    const updated: TransactionRecord = {
      ...tx,
      txHash: receipt.txHash,
      status: "confirmed" as InvestmentTxStatus,
      confirmations: chainConfig?.requiredConfirmations ?? 12,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      gasPrice: receipt.gasPrice,
      confirmedAt: new Date().toISOString(),
    };
    this.repository.saveTransaction(updated);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionConfirmed, tx.investmentId, actorId, {
      txId: tx.id,
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
    });

    return updated;
  }

  async failTransaction(actorId: EntityId, txId: EntityId, error: string): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);
    const updated: TransactionRecord = {
      ...tx,
      status: "failed" as InvestmentTxStatus,
      error,
    };
    this.repository.saveTransaction(updated);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionFailed, tx.investmentId, actorId, {
      txId: tx.id,
      error,
    });

    return updated;
  }

  async cancelTransaction(actorId: EntityId, txId: EntityId): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);
    const updated: TransactionRecord = {
      ...tx,
      status: "cancelled" as InvestmentTxStatus,
    };
    this.repository.saveTransaction(updated);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionCancelled, tx.investmentId, actorId, {
      txId: tx.id,
    });

    return updated;
  }

  async retryTransaction(actorId: EntityId, txId: EntityId): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);

    if (tx.retryCount >= tx.maxRetries) {
      throw new Error(`Transaction ${txId} has exceeded max retries (${tx.maxRetries})`);
    }

    const updated: TransactionRecord = {
      ...tx,
      status: "pending" as InvestmentTxStatus,
      retryCount: tx.retryCount + 1,
      error: undefined,
      txHash: undefined,
      submittedAt: new Date().toISOString(),
    };
    this.repository.saveTransaction(updated);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionRetried, tx.investmentId, actorId, {
      txId: tx.id,
      retryCount: updated.retryCount,
    });

    return updated;
  }

  async expireTransaction(actorId: EntityId, txId: EntityId): Promise<TransactionRecord> {
    const tx = this.getTransaction(txId);
    const updated: TransactionRecord = {
      ...tx,
      status: "expired" as InvestmentTxStatus,
      error: "Transaction timed out",
    };
    this.repository.saveTransaction(updated);

    await publishInvestmentEvent(this.events, InvestmentEventType.TransactionExpired, tx.investmentId, actorId, {
      txId: tx.id,
    });

    return updated;
  }

  getTransaction(txId: EntityId): TransactionRecord {
    const tx = this.repository.getTransaction(txId);
    if (!tx) throw new TransactionNotFoundError(txId);
    return tx;
  }

  listByInvestment(investmentId: EntityId): TransactionRecord[] {
    return this.repository.listTransactionsByInvestment(investmentId);
  }

  hasTimedOut(tx: TransactionRecord): boolean {
    const submitted = new Date(tx.submittedAt).getTime();
    return Date.now() - submitted > TX_TIMEOUT_MS;
  }

  canRetry(tx: TransactionRecord): boolean {
    return tx.retryCount < tx.maxRetries;
  }
}
