import type { EntityId, TxHash } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { TransactionRecord } from "../types";
import { InvestmentTxStatus } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import { ConfirmationTimeoutError } from "../errors";
import { TransactionEngine } from "./engine";
import type { BlockchainAdapter } from "../blockchain/adapter";

export class TransactionMonitor {
  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly blockchain: BlockchainAdapter,
    private readonly txEngine: TransactionEngine,
    private readonly logger?: Logger,
  ) {}

  async monitorTransaction(actorId: EntityId, txId: EntityId): Promise<TransactionRecord> {
    const tx = this.txEngine.getTransaction(txId);

    if (tx.status !== InvestmentTxStatus.Submitted || !tx.txHash) {
      return tx;
    }

    try {
      const receipt = await this.blockchain.getTransactionReceipt(tx.txHash, tx.chainId);

      if (receipt.status === "reverted") {
        this.logger?.warn("transaction reverted", { txHash: tx.txHash, txId: tx.id });
        return this.txEngine.failTransaction(actorId, txId, "Transaction reverted on chain");
      }

      const confirmations = await this.blockchain.getTransactionConfirmations(tx.txHash, tx.chainId);
      const chainConfig = this.blockchain.getChainConfig(tx.chainId);

      if (confirmations >= chainConfig.requiredConfirmations) {
        return this.txEngine.confirmTransaction(actorId, txId, {
          txHash: tx.txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          gasPrice: receipt.gasPrice,
        });
      }

      if (this.txEngine.hasTimedOut(tx)) {
        this.logger?.warn("transaction confirmation timeout", { txHash: tx.txHash, txId: tx.id });
        if (this.txEngine.canRetry(tx)) {
          return this.txEngine.retryTransaction(actorId, txId);
        }
        return this.txEngine.expireTransaction(actorId, txId);
      }

      const updated: TransactionRecord = {
        ...tx,
        confirmations,
      };
      this.repository.saveTransaction(updated);
      return updated;
    } catch (error) {
      this.logger?.error("monitor error", { txId: tx.id, error: String(error) });

      if (this.txEngine.hasTimedOut(tx)) {
        if (this.txEngine.canRetry(tx)) {
          return this.txEngine.retryTransaction(actorId, txId);
        }
        return this.txEngine.expireTransaction(actorId, txId);
      }

      return tx;
    }
  }

  async monitorAllPending(actorId: EntityId): Promise<void> {
    const allTxs = this.repository.listAllTransactions();
    for (const tx of allTxs) {
      if (tx.status === InvestmentTxStatus.Submitted) {
        await this.monitorTransaction(actorId, tx.id);
      }
    }
  }
}
