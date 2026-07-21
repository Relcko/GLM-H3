import type { DistributionId, SagaId } from "../../domain/value-objects";
import type { SagaStateData } from "../../saga/saga-state.model";

export interface SagaSnapshot {
  readonly sagaId: SagaId;
  readonly stateData: SagaStateData;
  readonly checkpointIndex: number;
  readonly globalPosition: number;
  readonly createdAt: number;
}

export interface SagaSnapshotStore {
  saveSnapshot(sagaId: SagaId, stateData: SagaStateData, checkpointIndex: number, globalPosition: number): Promise<void>;
  getSnapshot(sagaId: SagaId): Promise<SagaSnapshot | null>;
  getSnapshotByDistributionId(distributionId: DistributionId): Promise<SagaSnapshot | null>;
}

export class InMemorySagaSnapshotStore implements SagaSnapshotStore {
  private readonly snapshots = new Map<string, SagaSnapshot>();

  async saveSnapshot(sagaId: SagaId, stateData: SagaStateData, checkpointIndex: number, globalPosition: number): Promise<void> {
    this.snapshots.set(String(sagaId), {
      sagaId,
      stateData,
      checkpointIndex,
      globalPosition,
      createdAt: Date.now(),
    });
  }

  async getSnapshot(sagaId: SagaId): Promise<SagaSnapshot | null> {
    return this.snapshots.get(String(sagaId)) ?? null;
  }

  async getSnapshotByDistributionId(distributionId: DistributionId): Promise<SagaSnapshot | null> {
    for (const snapshot of this.snapshots.values()) {
      if (String(snapshot.stateData.distributionId) === String(distributionId)) {
        return snapshot;
      }
    }
    return null;
  }

  clear(): void {
    this.snapshots.clear();
  }

  count(): number {
    return this.snapshots.size;
  }
}
