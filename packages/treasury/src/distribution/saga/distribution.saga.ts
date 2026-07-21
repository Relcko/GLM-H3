import crypto from "node:crypto";
import type { DomainEvent } from "@relcko/kernel";
import type { DistributionId, SagaId } from "../domain/value-objects";
import { SagaState } from "../domain/value-objects";
import { SagaInvalidStatusError } from "../domain/errors";
import {
  DistributionSagaStartedEvent,
  DistributionSagaCheckpointEvent,
  DistributionSagaCompensatedEvent,
  DistributionSagaCompletedEvent,
  DistributionSagaSuspendedEvent,
  DistributionSagaFailedEvent,
  type DistributionSagaStartedPayload,
  type DistributionSagaCheckpointPayload,
  type DistributionSagaCompensatedPayload,
  type DistributionSagaCompletedPayload,
  type DistributionSagaSuspendedPayload,
  type DistributionSagaFailedPayload,
  type SagaDomainEvent,
} from "../domain/events";
import { SagaStateModel } from "./saga-state.model";
import type { SagaStateData } from "./saga-state.model";
import { SagaCheckpoint } from "./saga-checkpoint.model";

const SAGA_TRANSITIONS: Record<SagaState, readonly SagaState[]> = {
  [SagaState.Running]: [SagaState.Suspended, SagaState.Compensating],
  [SagaState.Suspended]: [SagaState.Compensating],
  [SagaState.Compensating]: [SagaState.Completed, SagaState.Failed],
  [SagaState.Completed]: [],
  [SagaState.Failed]: [],
};

function assertSagaTransition(current: SagaState, next: SagaState, sagaId: string): void {
  const allowed = SAGA_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new SagaInvalidStatusError(sagaId, current, allowed?.join(", ") ?? "none");
  }
}

export interface SagaOptions {
  readonly perRecipientTimeoutMs?: number;
  readonly maxParallelism?: number;
  readonly recoveryPolicyId?: string | null;
}

const DEFAULT_PER_RECIPIENT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_PARALLELISM = 10;

export class DistributionSaga {
  private _state: SagaStateModel;
  private _version: number;
  private _checkpointIndex: number;
  private _uncommittedEvents: SagaDomainEvent[] = [];
  private _perRecipientTimeoutMs: number;
  private _maxParallelism: number;

  private constructor(
    state: SagaStateModel,
    version: number,
    checkpointIndex: number,
    perRecipientTimeoutMs: number,
    maxParallelism: number,
  ) {
    this._state = state;
    this._version = version;
    this._checkpointIndex = checkpointIndex;
    this._perRecipientTimeoutMs = perRecipientTimeoutMs;
    this._maxParallelism = maxParallelism;
  }

  static start(
    sagaId: SagaId,
    distributionId: DistributionId,
    pendingRecipients: string[],
    options?: SagaOptions,
  ): DistributionSaga {
    if (pendingRecipients.length === 0) {
      throw new Error("Cannot start saga with empty recipient list");
    }

    const recoveryPolicyId = options?.recoveryPolicyId ?? null;
    const state = SagaStateModel.create(sagaId, distributionId, [...pendingRecipients], recoveryPolicyId);

    const saga = new DistributionSaga(
      state,
      1,
      0,
      options?.perRecipientTimeoutMs ?? DEFAULT_PER_RECIPIENT_TIMEOUT_MS,
      options?.maxParallelism ?? DEFAULT_MAX_PARALLELISM,
    );

    const now = Date.now();
    const payload: DistributionSagaStartedPayload = {
      distributionId: String(distributionId),
      totalRecipients: pendingRecipients.length,
      perRecipientTimeoutMs: saga._perRecipientTimeoutMs,
      maxParallelism: saga._maxParallelism,
      recoveryPolicyId,
      startedAt: now,
    };

    saga._applyEvent(
      new DistributionSagaStartedEvent(
        String(sagaId),
        "saga",
        saga._version,
        payload,
      ),
    );

    return saga;
  }

  static resume(
    sagaId: SagaId,
    stateData: SagaStateData,
    checkpointIndex: number,
    perRecipientTimeoutMs?: number,
    maxParallelism?: number,
  ): DistributionSaga {
    const state = new SagaStateModel(stateData);
    return new DistributionSaga(
      state,
      stateData.version,
      checkpointIndex,
      perRecipientTimeoutMs ?? DEFAULT_PER_RECIPIENT_TIMEOUT_MS,
      maxParallelism ?? DEFAULT_MAX_PARALLELISM,
    );
  }

  get sagaId(): SagaId { return this._state.sagaId; }
  get distributionId(): DistributionId { return this._state.distributionId; }
  get state(): SagaState { return this._state.state; }
  get pendingRecipients(): readonly string[] { return this._state.pendingRecipients; }
  get inFlightRecipients(): readonly string[] { return this._state.inFlightRecipients; }
  get paidCount(): number { return this._state.paidCount; }
  get failedCount(): number { return this._state.failedCount; }
  get recoveredCount(): number { return this._state.recoveredCount; }
  get checkpointAt(): number { return this._state.checkpointAt; }
  get version(): number { return this._version; }
  get checkpointIndex(): number { return this._checkpointIndex; }
  get perRecipientTimeoutMs(): number { return this._perRecipientTimeoutMs; }
  get maxParallelism(): number { return this._maxParallelism; }
  get recoveryPolicyId(): string | null { return this._state.recoveryPolicyId; }
  get totalRecipients(): number { return this._state.totalRecipients; }

  get isTerminal(): boolean {
    return this._state.state === SagaState.Completed || this._state.state === SagaState.Failed;
  }

  get hasPendingWork(): boolean {
    return this._state.pendingRecipients.length > 0 || this._state.inFlightRecipients.length > 0;
  }

  getUncommittedEvents(): readonly SagaDomainEvent[] {
    return [...this._uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this._uncommittedEvents.length = 0;
  }

  nextBatch(maxParallelism?: number): string[] {
    if (this._state.state !== SagaState.Running) {
      return [];
    }

    const limit = maxParallelism ?? this._maxParallelism;
    const available = limit - this._state.inFlightRecipients.length;
    if (available <= 0) return [];

    const batch: string[] = [];
    const pending = [...this._state.pendingRecipients];
    for (let i = 0; i < Math.min(available, pending.length); i++) {
      const recipientId = pending[i];
      if (recipientId) {
        this._state.moveToInFlight(recipientId);
        batch.push(recipientId);
      }
    }
    return batch;
  }

  markRecipientPaid(recipientId: string): void {
    this._state.completeRecipient(recipientId, "paid");
  }

  markRecipientFailed(recipientId: string): void {
    this._state.completeRecipient(recipientId, "failed");
  }

  markRecipientRecovered(recipientId: string): void {
    this._state.completeRecipient(recipientId, "recovered");
  }

  suspend(reason: string): void {
    assertSagaTransition(this._state.state, SagaState.Suspended, String(this._state.sagaId));
    this._state.setState(SagaState.Suspended);

    const now = Date.now();
    const payload: DistributionSagaSuspendedPayload = {
      distributionId: String(this._state.distributionId),
      reason,
      timestamp: now,
    };
    this._version += 1;
    this._applyEvent(
      new DistributionSagaSuspendedEvent(String(this._state.sagaId), "saga", this._version, payload),
    );
  }

  compensate(reason: string): void {
    assertSagaTransition(this._state.state, SagaState.Compensating, String(this._state.sagaId));
    this._state.setState(SagaState.Compensating);

    const now = Date.now();
    const payload: DistributionSagaCompensatedPayload = {
      distributionId: String(this._state.distributionId),
      reason,
      timestamp: now,
    };
    this._version += 1;
    this._applyEvent(
      new DistributionSagaCompensatedEvent(String(this._state.sagaId), "saga", this._version, payload),
    );
  }

  complete(): void {
    assertSagaTransition(this._state.state, SagaState.Completed, String(this._state.sagaId));
    this._state.setState(SagaState.Completed);

    const now = Date.now();
    const payload: DistributionSagaCompletedPayload = {
      distributionId: String(this._state.distributionId),
      totalRecipients: this._state.totalRecipients,
      paidCount: this._state.paidCount,
      failedCount: this._state.failedCount,
      recoveredCount: this._state.recoveredCount,
      timestamp: now,
    };
    this._version += 1;
    this._applyEvent(
      new DistributionSagaCompletedEvent(String(this._state.sagaId), "saga", this._version, payload),
    );
  }

  fail(reason: string): void {
    assertSagaTransition(this._state.state, SagaState.Failed, String(this._state.sagaId));
    this._state.setState(SagaState.Failed);

    const now = Date.now();
    const payload: DistributionSagaFailedPayload = {
      distributionId: String(this._state.distributionId),
      reason,
      failedCount: this._state.failedCount,
      unrecoverableCount: this._state.failedCount,
      timestamp: now,
    };
    this._version += 1;
    this._applyEvent(
      new DistributionSagaFailedEvent(String(this._state.sagaId), "saga", this._version, payload),
    );
  }

  createCheckpoint(globalPosition: number): SagaCheckpoint {
    this._state.updateCheckpoint(globalPosition);
    this._checkpointIndex += 1;
    this._state.incrementVersion();

    const ckptPayload: DistributionSagaCheckpointPayload = {
      distributionId: String(this._state.distributionId),
      checkpointIndex: this._checkpointIndex,
      pendingCount: this._state.pendingRecipients.length,
      inFlightCount: this._state.inFlightRecipients.length,
      paidCount: this._state.paidCount,
      failedCount: this._state.failedCount,
      recoveredCount: this._state.recoveredCount,
      timestamp: Date.now(),
    };
    this._version += 1;
    this._applyEvent(
      new DistributionSagaCheckpointEvent(String(this._state.sagaId), "saga", this._version, ckptPayload),
    );

    return new SagaCheckpoint(
      this._state.sagaId,
      this._state.snapshot(),
      globalPosition,
      new Date(),
    );
  }

  shouldCheckpoint(recipientsSinceLastCheckpoint: number, checkpointInterval: number): boolean {
    return recipientsSinceLastCheckpoint >= checkpointInterval;
  }

  private _applyEvent(event: SagaDomainEvent): void {
    this._uncommittedEvents.push(event);
  }

  static computeSettlementRef(distributionId: string, recipientId: string, manifestHash: string): string {
    return crypto
      .createHash("sha256")
      .update(`${distributionId}:${recipientId}:${manifestHash}`)
      .digest("hex");
  }

  static computeIdempotencyKey(sagaId: string, settlementRef: string): string {
    return `saga:${sagaId}:${settlementRef}`;
  }
}
