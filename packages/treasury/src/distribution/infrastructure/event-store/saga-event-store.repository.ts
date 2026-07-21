import type { EventStore } from "@relcko/event-store";
import { streamIdFor } from "@relcko/event-store";
import { toEventEnvelope } from "@relcko/kernel";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionSaga } from "../../saga/distribution.saga";
import type { SagaStateData } from "../../saga";
import { SagaStateModel } from "../../saga/saga-state.model";
import type { DistributionId, SagaId } from "../../domain/value-objects";
import type { ISagaRepository } from "../../application/repositories";
import type { SagaCheckpoint } from "../../saga/saga-checkpoint.model";
import type { SagaSnapshotStore } from "../persistence/saga-snapshot-store";

export class SagaEventStoreRepository implements ISagaRepository {
  private readonly sagaStates = new Map<string, SagaStateData>();
  private readonly checkpoints = new Map<string, SagaCheckpoint>();
  private readonly leases = new Map<string, { workerId: string; expiresAt: number }>();

  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore?: SagaSnapshotStore,
  ) {}

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

  private sagaStreamId(sagaId: SagaId): ReturnType<typeof streamIdFor> {
    return streamIdFor("saga", String(sagaId));
  }

  async save(saga: DistributionSaga): Promise<void> {
    const sagaId = String(saga.sagaId);
    const uncommitted = saga.getUncommittedEvents();

    if (uncommitted.length > 0) {
      const streamId = this.sagaStreamId(saga.sagaId);
      const expectedVersion = saga.version - uncommitted.length;
      const envelopes = uncommitted.map((event) =>
        toEventEnvelope(
          event,
          (event as unknown as { data: Record<string, unknown> }).data ?? {},
          sagaId,
          "saga",
          { producer: "treasury.saga" },
        ),
      );
      await this.eventStore.append(streamId, envelopes, {
        expectedVersion,
      } as never);
    }

    this.sagaStates.set(sagaId, {
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
      startedAt: 0,
      updatedAt: Date.now(),
      version: saga.version,
    });
    saga.markEventsAsCommitted();
  }

  async findBySagaId(sagaId: SagaId): Promise<DistributionSaga | null> {
    const key = String(sagaId);
    const cached = this.sagaStates.get(key);
    if (cached) {
      const checkpointIndex = this.checkpoints.get(key)?.globalPosition ?? 0;
      return DistributionSaga.resume(sagaId, cached, checkpointIndex);
    }
    const snapshot = this.snapshotStore
      ? await this.snapshotStore.getSnapshot(sagaId)
      : null;
    if (snapshot) {
      this.sagaStates.set(key, snapshot.stateData);
      return DistributionSaga.resume(sagaId, snapshot.stateData, snapshot.checkpointIndex);
    }
    return null;
  }

  async findByDistributionId(distributionId: DistributionId): Promise<DistributionSaga | null> {
    for (const [key, state] of this.sagaStates) {
      if (String(state.distributionId) === String(distributionId)) {
        const checkpointIndex = this.checkpoints.get(key)?.globalPosition ?? 0;
        return DistributionSaga.resume(state.sagaId, state, checkpointIndex);
      }
    }
    if (this.snapshotStore) {
      const snapshot = await this.snapshotStore.getSnapshotByDistributionId(distributionId);
      if (snapshot) {
        const key = String(snapshot.sagaId);
        this.sagaStates.set(key, snapshot.stateData);
        return DistributionSaga.resume(snapshot.sagaId, snapshot.stateData, snapshot.checkpointIndex);
      }
    }
    return null;
  }

  async saveCheckpoint(sagaId: SagaId, checkpoint: SagaCheckpoint, checkpointIndex: number): Promise<void> {
    this.checkpoints.set(String(sagaId), checkpoint);
    if (this.snapshotStore) {
      await this.snapshotStore.saveSnapshot(sagaId, checkpoint.stateData, checkpointIndex, checkpoint.globalPosition);
    }
  }

  getCheckpoint(sagaId: SagaId): SagaCheckpoint | null {
    return this.checkpoints.get(String(sagaId)) ?? null;
  }

  clearCache(): void {
    this.sagaStates.clear();
    this.checkpoints.clear();
  }
}
