import { DistributionSaga } from "../../saga/distribution.saga";
import type { SagaStateData } from "../../saga/saga-state.model";
import { SagaStateModel } from "../../saga/saga-state.model";
import type { DistributionId, SagaId } from "../../domain/value-objects";
import type { SagaCheckpoint } from "../../saga/saga-checkpoint.model";
import type { ISagaRepository } from "../../application/repositories";

export class InMemorySagaPersistence implements ISagaRepository {
  private readonly states = new Map<string, SagaStateData>();
  private readonly checkpoints = new Map<string, SagaCheckpoint>();
  private readonly leases = new Map<string, { workerId: string; expiresAt: number }>();

  async acquire(sagaId: SagaId, workerId: string, ttlMs: number): Promise<boolean> {
    const key = String(sagaId);
    const now = Date.now();
    const existing = this.leases.get(key);
    if (existing && existing.expiresAt > now && existing.workerId !== workerId) {
      return false;
    }
    this.leases.set(key, { workerId, expiresAt: now + ttlMs });
    return true;
  }

  async release(sagaId: SagaId, workerId: string): Promise<void> {
    const key = String(sagaId);
    const existing = this.leases.get(key);
    if (existing && existing.workerId === workerId) {
      this.leases.delete(key);
    }
  }

  async save(saga: DistributionSaga): Promise<void> {
    this.states.set(String(saga.sagaId), {
      sagaId: saga.sagaId,
      distributionId: saga.distributionId,
      state: saga.state,
      pendingRecipients: [...saga.pendingRecipients],
      inFlightRecipients: [...saga.inFlightRecipients],
      paidCount: saga.paidCount,
      failedCount: saga.failedCount,
      recoveredCount: saga.recoveredCount,
      checkpointAt: saga.checkpointAt,
      recoveryPolicyId: saga.recoveryPolicyId,
      startedAt: saga.totalRecipients > 0 ? Date.now() : 0,
      updatedAt: Date.now(),
      version: saga.version,
    });
    saga.markEventsAsCommitted();
  }

  async findBySagaId(sagaId: SagaId): Promise<DistributionSaga | null> {
    const stateData = this.states.get(String(sagaId));
    if (!stateData) return null;
    const checkpointIndex = this.checkpoints.get(String(sagaId))?.globalPosition ?? 0;
    return DistributionSaga.resume(sagaId, stateData, checkpointIndex);
  }

  async findByDistributionId(distributionId: DistributionId): Promise<DistributionSaga | null> {
    for (const stateData of this.states.values()) {
      if (String(stateData.distributionId) === String(distributionId)) {
        const checkpointIndex = this.checkpoints.get(String(stateData.sagaId))?.globalPosition ?? 0;
        return DistributionSaga.resume(stateData.sagaId, stateData, checkpointIndex);
      }
    }
    return null;
  }

  saveCheckpoint(sagaId: SagaId, checkpoint: SagaCheckpoint): void {
    this.checkpoints.set(String(sagaId), checkpoint);
  }

  getCheckpoint(sagaId: SagaId): SagaCheckpoint | null {
    return this.checkpoints.get(String(sagaId)) ?? null;
  }

  clear(): void {
    this.states.clear();
    this.checkpoints.clear();
  }

  count(): number {
    return this.states.size;
  }
}
