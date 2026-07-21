import type { EventStore } from "@relcko/event-store";
import { streamIdFor } from "@relcko/event-store";
import type { DomainEvent } from "@relcko/kernel";

import { DistributionSaga } from "../../saga/distribution.saga";
import type { SagaStateData, SagaCheckpoint } from "../../saga";
import { SagaStateModel } from "../../saga/saga-state.model";
import type { DistributionId, SagaId } from "../../domain/value-objects";
import type { ISagaRepository } from "../../application/repositories";
import { SagaNotFoundError } from "../../domain/errors";
import { reconstructDomainEvents } from "./domain-event-reconstructor";

export class SagaEventStoreRepository implements ISagaRepository {
  private readonly sagaStates = new Map<string, SagaStateData>();
  private readonly checkpoints = new Map<string, SagaCheckpoint>();

  constructor(
    private readonly eventStore: EventStore,
  ) {}

  private sagaStreamId(sagaId: SagaId): ReturnType<typeof streamIdFor> {
    return streamIdFor("saga", String(sagaId));
  }

  private async loadSagaEvents(sagaId: SagaId): Promise<readonly DomainEvent[]> {
    const stream = await this.eventStore.load(this.sagaStreamId(sagaId));
    if (stream.events.length === 0) return [];
    return reconstructDomainEvents(stream.events);
  }

  async save(saga: DistributionSaga): Promise<void> {
    this.sagaStates.set(String(saga.sagaId), {
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
    const stateData = this.sagaStates.get(String(sagaId));
    if (!stateData) {
      const events = await this.loadSagaEvents(sagaId);
      if (events.length === 0) return null;
      const saga = DistributionSaga.resume(sagaId, {
        sagaId,
        distributionId: "" as unknown as DistributionId,
        state: SagaStateModel.prototype.state,
        pendingRecipients: [],
        inFlightRecipients: [],
        paidCount: 0,
        failedCount: 0,
        recoveredCount: 0,
        checkpointAt: 0,
        recoveryPolicyId: null,
        startedAt: 0,
        updatedAt: Date.now(),
        version: 0,
      }, 0);
      return saga;
    }
    const checkpointIndex = this.checkpoints.get(String(sagaId))?.globalPosition ?? 0;
    return DistributionSaga.resume(sagaId, stateData, checkpointIndex);
  }

  async findByDistributionId(distributionId: DistributionId): Promise<DistributionSaga | null> {
    for (const [_key, state] of this.sagaStates) {
      if (String(state.distributionId) === String(distributionId)) {
        const checkpointIndex = this.checkpoints.get(String(state.sagaId))?.globalPosition ?? 0;
        return DistributionSaga.resume(state.sagaId, state, checkpointIndex);
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
}
