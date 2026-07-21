import type { DistributionId, SagaId } from "../domain/value-objects";
import { SagaState } from "../domain/value-objects";

export interface RetryStateEntry {
  readonly attemptNumber: number;
  readonly nextRetryAt: number;
}

export type RetryStateMap = Record<string, RetryStateEntry>;

export interface SagaStateData {
  readonly sagaId: SagaId;
  readonly distributionId: DistributionId;
  readonly state: SagaState;
  readonly pendingRecipients: readonly string[];
  readonly inFlightRecipients: readonly string[];
  readonly paidCount: number;
  readonly failedCount: number;
  readonly recoveredCount: number;
  readonly checkpointAt: number;
  readonly recoveryPolicyId: string | null;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly version: number;
  readonly retryState: RetryStateMap;
}

export class SagaStateModel {
  private _sagaId: SagaId;
  private _distributionId: DistributionId;
  private _state: SagaState;
  private _pendingRecipients: string[];
  private _inFlightRecipients: string[];
  private _paidCount: number;
  private _failedCount: number;
  private _recoveredCount: number;
  private _checkpointAt: number;
  private _recoveryPolicyId: string | null;
  private _startedAt: number;
  private _updatedAt: number;
  private _version: number;
  private _retryState: Map<string, RetryStateEntry>;

  constructor(data: SagaStateData) {
    this._sagaId = data.sagaId;
    this._distributionId = data.distributionId;
    this._state = data.state;
    this._pendingRecipients = [...data.pendingRecipients];
    this._inFlightRecipients = [...data.inFlightRecipients];
    this._paidCount = data.paidCount;
    this._failedCount = data.failedCount;
    this._recoveredCount = data.recoveredCount;
    this._checkpointAt = data.checkpointAt;
    this._recoveryPolicyId = data.recoveryPolicyId;
    this._startedAt = data.startedAt;
    this._updatedAt = data.updatedAt;
    this._version = data.version;
    this._retryState = new Map(Object.entries(data.retryState ?? {}));
  }

  get sagaId(): SagaId { return this._sagaId; }
  get distributionId(): DistributionId { return this._distributionId; }
  get state(): SagaState { return this._state; }
  get pendingRecipients(): readonly string[] { return this._pendingRecipients; }
  get inFlightRecipients(): readonly string[] { return this._inFlightRecipients; }
  get paidCount(): number { return this._paidCount; }
  get failedCount(): number { return this._failedCount; }
  get recoveredCount(): number { return this._recoveredCount; }
  get checkpointAt(): number { return this._checkpointAt; }
  get recoveryPolicyId(): string | null { return this._recoveryPolicyId; }
  get startedAt(): number { return this._startedAt; }
  get updatedAt(): number { return this._updatedAt; }
  get version(): number { return this._version; }
  get totalProcessed(): number { return this._paidCount + this._failedCount + this._recoveredCount; }
  get totalRecipients(): number { return this._paidCount + this._failedCount + this._recoveredCount + this._pendingRecipients.length + this._inFlightRecipients.length; }

  hasRecipient(recipientId: string): boolean {
    return this._pendingRecipients.includes(recipientId) || this._inFlightRecipients.includes(recipientId);
  }

  isPending(recipientId: string): boolean {
    return this._pendingRecipients.includes(recipientId);
  }

  isInFlight(recipientId: string): boolean {
    return this._inFlightRecipients.includes(recipientId);
  }

  moveToInFlight(recipientId: string): void {
    const idx = this._pendingRecipients.indexOf(recipientId);
    if (idx === -1) throw new Error(`Recipient ${recipientId} is not in pending set`);
    this._pendingRecipients.splice(idx, 1);
    this._inFlightRecipients.push(recipientId);
    this._updatedAt = Date.now();
  }

  completeRecipient(recipientId: string, status: "paid" | "failed" | "recovered"): void {
    const idx = this._inFlightRecipients.indexOf(recipientId);
    if (idx === -1) throw new Error(`Recipient ${recipientId} is not in flight`);
    this._inFlightRecipients.splice(idx, 1);
    if (status === "paid") this._paidCount += 1;
    else if (status === "failed") this._failedCount += 1;
    else if (status === "recovered") this._recoveredCount += 1;
    this._retryState.delete(recipientId);
    this._updatedAt = Date.now();
  }

  scheduleRetry(recipientId: string, attemptNumber: number, nextRetryAt: number): void {
    this._retryState.set(recipientId, { attemptNumber, nextRetryAt });
    this._updatedAt = Date.now();
  }

  getDueRetries(now: number): string[] {
    const due: string[] = [];
    for (const [recipientId, entry] of this._retryState) {
      if (now >= entry.nextRetryAt) {
        const idx = this._inFlightRecipients.indexOf(recipientId);
        if (idx !== -1) {
          this._inFlightRecipients.splice(idx, 1);
          this._pendingRecipients.push(recipientId);
        }
        this._retryState.delete(recipientId);
        due.push(recipientId);
      }
    }
    return due;
  }

  getRetryAttempt(recipientId: string): number {
    return this._retryState.get(recipientId)?.attemptNumber ?? 0;
  }

  hasRetryScheduled(recipientId: string): boolean {
    return this._retryState.has(recipientId);
  }

  setState(state: SagaState): void {
    this._state = state;
    this._updatedAt = Date.now();
  }

  incrementVersion(): void {
    this._version += 1;
  }

  updateCheckpoint(globalPosition: number): void {
    this._checkpointAt = globalPosition;
    this._updatedAt = Date.now();
  }

  snapshot(): SagaStateData {
    const retryState: RetryStateMap = {};
    for (const [key, value] of this._retryState) {
      retryState[key] = value;
    }
    return {
      sagaId: this._sagaId,
      distributionId: this._distributionId,
      state: this._state,
      pendingRecipients: [...this._pendingRecipients],
      inFlightRecipients: [...this._inFlightRecipients],
      paidCount: this._paidCount,
      failedCount: this._failedCount,
      recoveredCount: this._recoveredCount,
      checkpointAt: this._checkpointAt,
      recoveryPolicyId: this._recoveryPolicyId,
      startedAt: this._startedAt,
      updatedAt: this._updatedAt,
      version: this._version,
      retryState,
    };
  }

  static create(
    sagaId: SagaId,
    distributionId: DistributionId,
    pendingRecipients: string[],
    recoveryPolicyId: string | null,
  ): SagaStateModel {
    const now = Date.now();
    return new SagaStateModel({
      sagaId,
      distributionId,
      state: SagaState.Running,
      pendingRecipients,
      inFlightRecipients: [],
      paidCount: 0,
      failedCount: 0,
      recoveredCount: 0,
      checkpointAt: 0,
      recoveryPolicyId,
      startedAt: now,
      updatedAt: now,
      version: 1,
      retryState: {},
    });
  }
}
