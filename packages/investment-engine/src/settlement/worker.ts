import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { InvestmentEngineRepository } from "../repository";
import type { SettlementRecord } from "../types";
import { SettlementStatus } from "../types";
import { InvestmentEventType, publishInvestmentEvent } from "../events";
import type { SettlementOrchestrator } from "./orchestrator";

export interface SettlementWorkerConfig {
  readonly maxRetries: number;
  readonly claimTimeoutMs: number;
}

const DEFAULT_WORKER_CONFIG: SettlementWorkerConfig = {
  maxRetries: 3,
  claimTimeoutMs: 300_000,
};

export class SettlementWorker {
  private readonly config: SettlementWorkerConfig;

  constructor(
    private readonly repository: InvestmentEngineRepository,
    private readonly events: EventBus,
    private readonly orchestrator: SettlementOrchestrator,
    private readonly logger?: Logger,
    config?: Partial<SettlementWorkerConfig>,
  ) {
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
  }

  async claimAndSettle(
    actorId: EntityId,
    settlementId: EntityId,
    workerId: string,
  ): Promise<SettlementRecord | undefined> {
    const reserved = this.repository.reserveSettlement(settlementId, workerId);
    if (!reserved) {
      this.logger?.debug("settlement not available for claim", { settlementId, workerId });
      return undefined;
    }

    const investment = this.repository.getInvestment(reserved.investmentId);
    if (!investment) {
      return this.markFailed(reserved, `Investment ${reserved.investmentId} not found`, workerId);
    }

    const tx = this.repository.getTransaction(reserved.transactionId);
    if (!tx) {
      return this.markFailed(reserved, `Transaction ${reserved.transactionId} not found`, workerId);
    }

    const property = this.repository.getProperty(reserved.propertyId);
    if (!property) {
      return this.markFailed(reserved, `Property ${reserved.propertyId} not found`, workerId);
    }

    try {
      const result = await this.orchestrator.settle(actorId, investment, property, tx, reserved);
      return result;
    } catch (error) {
      return this.handleFailure(reserved, error, workerId);
    }
  }

  async processPending(actorId: EntityId, workerId: string): Promise<SettlementRecord[]> {
    const pending = this.repository.listPendingSettlements();
    const results: SettlementRecord[] = [];

    for (const settlement of pending) {
      const result = await this.claimAndSettle(actorId, settlement.id, workerId);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  async recoverInterrupted(workerId: string): Promise<SettlementRecord[]> {
    const cutoff = new Date(Date.now() - this.config.claimTimeoutMs).toISOString();
    const stale = this.repository.listStaleClaimedSettlements(cutoff);

    const results: SettlementRecord[] = [];

    for (const settlement of stale) {
      if (settlement.processorId === workerId) {
        const reset: SettlementRecord = {
          ...settlement,
          status: SettlementStatus.Pending,
          processorId: undefined,
          claimedAt: undefined,
        };
        this.repository.saveSettlement(reset);

        const actorId = reset.investorId;
        const result = await this.claimAndSettle(actorId, reset.id, workerId);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  private handleFailure(
    settlement: SettlementRecord,
    error: unknown,
    workerId: string,
  ): SettlementRecord {
    const nextRetry = settlement.retryCount + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (nextRetry >= this.config.maxRetries) {
      return this.markFailed(settlement, errorMessage, workerId);
    }

    const retry: SettlementRecord = {
      ...settlement,
      status: SettlementStatus.Pending,
      retryCount: nextRetry,
      lastError: errorMessage,
      processorId: undefined,
      claimedAt: undefined,
    };
    this.repository.saveSettlement(retry);

    this.logger?.warn("settlement retry scheduled", {
      settlementId: settlement.id,
      investmentId: settlement.investmentId,
      retryCount: nextRetry,
      error: errorMessage,
    });

    return retry;
  }

  private async markFailed(
    settlement: SettlementRecord,
    errorMessage: string,
    workerId: string,
  ): Promise<SettlementRecord> {
    const now = new Date().toISOString();
    const failed: SettlementRecord = {
      ...settlement,
      status: SettlementStatus.Failed,
      lastAttemptAt: now,
      lastError: errorMessage,
    };
    this.repository.saveSettlement(failed);

    await publishInvestmentEvent(
      this.events,
      InvestmentEventType.SettlementFailed,
      settlement.investmentId,
      workerId as EntityId,
      {
        settlementId: settlement.id as string,
        investmentId: settlement.investmentId as string,
        reason: errorMessage,
        retryCount: settlement.retryCount,
      } as never,
    );

    this.logger?.error("settlement permanently failed", {
      settlementId: settlement.id,
      investmentId: settlement.investmentId,
      error: errorMessage,
    });

    return failed;
  }
}
