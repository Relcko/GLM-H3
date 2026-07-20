import type { EntityId, TxHash } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { RecoveryRecord, TransactionRecord } from "../types";
import { RecoveryStatus, InvestmentTxStatus } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { RecoveryError, TransactionNotFoundError } from "../errors";
import type { BlockchainAdapter } from "../blockchain/adapter";

export class RecoveryEngine {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly blockchain: BlockchainAdapter,
    private readonly logger?: Logger,
  ) {}

  async startRecovery(actorId: EntityId, tx: TransactionRecord, reason: string): Promise<RecoveryRecord> {
    const existing = this.repository.getRecoveryByTransaction(tx.id);
    if (existing && existing.status === RecoveryStatus.InProgress) {
      throw new RecoveryError(tx.id, "Recovery already in progress");
    }

    const recovery: RecoveryRecord = {
      id: generateId("recv"),
      transactionId: tx.id,
      reason,
      status: RecoveryStatus.Pending,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveRecovery(recovery);

    const updatedTx: TransactionRecord = {
      ...tx,
      status: InvestmentTxStatus.Recovered,
    };
    this.repository.saveTransaction(updatedTx);

    await publishInvestmentEvent(this.events, InvestmentEventType.RecoveryStarted, tx.investmentId, actorId, {
      recoveryId: recovery.id as string,
      transactionId: tx.id as string,
      reason,
    });

    this.logger?.info("recovery started", {
      recoveryId: recovery.id,
      transactionId: tx.id,
      reason,
    });

    return recovery;
  }

  async attemptRecovery(actorId: EntityId, recoveryId: EntityId): Promise<RecoveryRecord> {
    const recovery = this.repository.getRecovery(recoveryId);
    if (!recovery) throw new RecoveryError(recoveryId, "Recovery record not found");

    const tx = this.repository.getTransaction(recovery.transactionId);
    if (!tx) throw new TransactionNotFoundError(recovery.transactionId);

    const updated: RecoveryRecord = {
      ...recovery,
      attempts: recovery.attempts + 1,
      status: RecoveryStatus.InProgress,
    };
    this.repository.saveRecovery(updated);

    try {
      if (tx.txHash) {
        const receipt = await this.blockchain.getTransactionReceipt(tx.txHash, tx.chainId);

        if (receipt.status === "success") {
          const chainConfig = this.blockchain.getChainConfig(tx.chainId);
          const confirmations = await this.blockchain.getTransactionConfirmations(tx.txHash, tx.chainId);

          if (confirmations >= chainConfig.requiredConfirmations) {
            const resolved: RecoveryRecord = {
              ...updated,
              status: RecoveryStatus.Resolved,
              resolvedAt: new Date().toISOString(),
            };
            this.repository.saveRecovery(resolved);

            await publishInvestmentEvent(this.events, InvestmentEventType.RecoveryResolved, tx.investmentId, actorId, {
              recoveryId: resolved.id as string,
              transactionId: tx.id as string,
              txHash: tx.txHash as string,
            } as never);

            return resolved;
          }
        }
      }

      const resolved: RecoveryRecord = {
        ...updated,
        status: RecoveryStatus.Resolved,
        newTxHash: tx.txHash,
        resolvedAt: new Date().toISOString(),
      };
      this.repository.saveRecovery(resolved);

      await publishInvestmentEvent(this.events, InvestmentEventType.RecoveryResolved, tx.investmentId, actorId, {
        recoveryId: resolved.id as string,
        transactionId: tx.id as string,
        txHash: tx.txHash as string,
      } as never);

      return resolved;
    } catch (error) {
      this.logger?.error("recovery attempt failed", {
        recoveryId: recovery.id,
        error: String(error),
      });

      const failed: RecoveryRecord = {
        ...updated,
        status: RecoveryStatus.Failed,
      };
      this.repository.saveRecovery(failed);

      await publishInvestmentEvent(this.events, InvestmentEventType.RecoveryFailed, tx.investmentId, actorId, {
        recoveryId: failed.id,
        transactionId: tx.id,
        error: String(error),
      });

      return failed;
    }
  }
}
