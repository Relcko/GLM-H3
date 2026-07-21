import type { Projection } from "@relcko/projections";
import type { EventStore, EventDeserializer, StoredEvent } from "@relcko/event-store";
import type { IProjectionCheckpointStore } from "./projection-checkpoint-store";
import { ProjectionIdempotencyService } from "./projection-idempotency.service";

export interface ReplayResult {
  readonly projectionName: string;
  readonly totalEvents: number;
  readonly processed: number;
  readonly skipped: number;
  readonly errors: readonly string[];
  readonly fromPosition: number;
  readonly toPosition: number;
  readonly completed: boolean;
}

export interface ReplayValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
  readonly processedCount: number;
  readonly expectedCount: number;
}

export class ProjectionReplayService {
  private readonly idempotency = new ProjectionIdempotencyService();

  constructor(
    private readonly eventStore: EventStore,
    private readonly checkpointStore: IProjectionCheckpointStore,
    private readonly deserializer: EventDeserializer,
  ) {}

  async replayAll(
    projection: Projection,
    projectionName: string,
  ): Promise<ReplayResult> {
    await projection.reset();
    this.idempotency.clear();

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let fromPosition = 0;
    let toPosition = 0;
    let totalEvents = 0;

    for await (const storedEvent of this.eventStore.stream({})) {
      totalEvents += 1;
      toPosition = storedEvent.globalPosition;

      if (!this.shouldHandle(projection, storedEvent.eventType)) {
        skipped += 1;
        continue;
      }

      const envelope = this.deserializer.deserialize(storedEvent);
      const check = this.idempotency.checkEvent(envelope);
      if (!check.canProcess) {
        skipped += 1;
        continue;
      }

      try {
        await projection.handle(envelope);
        this.idempotency.recordProcessed(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId} at position ${storedEvent.globalPosition}: ${err instanceof Error ? err.message : String(err)}`);
        skipped += 1;
      }
    }

    return {
      projectionName,
      totalEvents,
      processed,
      skipped,
      errors,
      fromPosition,
      toPosition,
      completed: errors.length === 0,
    };
  }

  async replayStream(
    projection: Projection,
    projectionName: string,
    aggregateId: string,
  ): Promise<ReplayResult> {
    const streamId = this.resolveStreamId(aggregateId);
    const stream = await this.eventStore.load(streamId as never);

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let fromPosition = 0;
    let toPosition = 0;

    const events = stream.events as unknown as StoredEvent[];
    for (const storedEvent of events) {
      toPosition = storedEvent.globalPosition;
      if (fromPosition === 0) fromPosition = storedEvent.globalPosition;

      if (!this.shouldHandle(projection, storedEvent.eventType)) {
        skipped += 1;
        continue;
      }

      const envelope = this.deserializer.deserialize(storedEvent);
      try {
        await projection.handle(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId} in stream ${aggregateId}: ${err instanceof Error ? err.message : String(err)}`);
        skipped += 1;
      }
    }

    return {
      projectionName,
      totalEvents: events.length,
      processed,
      skipped,
      errors,
      fromPosition,
      toPosition,
      completed: errors.length === 0,
    };
  }

  async replayFromCheckpoint(
    projection: Projection,
    projectionName: string,
  ): Promise<ReplayResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    const fromPosition = checkpoint?.globalPosition ?? 0;

    await projection.reset();
    this.idempotency.clear();

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let toPosition = fromPosition;
    let totalEvents = 0;

    for await (const storedEvent of this.eventStore.stream({ fromPosition })) {
      totalEvents += 1;
      toPosition = storedEvent.globalPosition;

      if (!this.shouldHandle(projection, storedEvent.eventType)) {
        skipped += 1;
        continue;
      }

      const envelope = this.deserializer.deserialize(storedEvent);
      const check = this.idempotency.checkEvent(envelope);
      if (!check.canProcess) {
        skipped += 1;
        continue;
      }

      try {
        await projection.handle(envelope);
        this.idempotency.recordProcessed(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId}: ${err instanceof Error ? err.message : String(err)}`);
        skipped += 1;
      }
    }

    return {
      projectionName,
      totalEvents,
      processed,
      skipped,
      errors,
      fromPosition,
      toPosition,
      completed: errors.length === 0,
    };
  }

  async resumeReplay(
    projection: Projection,
    projectionName: string,
  ): Promise<ReplayResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    if (!checkpoint) {
      return this.replayAll(projection, projectionName);
    }

    const fromPosition = checkpoint.globalPosition;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let toPosition = fromPosition;
    let totalEvents = 0;

    for await (const storedEvent of this.eventStore.stream({ fromPosition })) {
      totalEvents += 1;
      toPosition = storedEvent.globalPosition;

      if (!this.shouldHandle(projection, storedEvent.eventType)) {
        skipped += 1;
        continue;
      }

      const envelope = this.deserializer.deserialize(storedEvent);
      try {
        await projection.handle(envelope);
        this.idempotency.recordProcessed(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId}: ${err instanceof Error ? err.message : String(err)}`);
        skipped += 1;
      }
    }

    return {
      projectionName,
      totalEvents,
      processed,
      skipped,
      errors,
      fromPosition,
      toPosition,
      completed: errors.length === 0,
    };
  }

  async validateReplay(
    projection: Projection,
    projectionName: string,
    expectedEventCount: number,
  ): Promise<ReplayValidationResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    if (!checkpoint) {
      return {
        valid: false,
        reason: `No checkpoint found for projection ${projectionName} after replay`,
        processedCount: 0,
        expectedCount: expectedEventCount,
      };
    }

    const isComplete = checkpoint.eventCount >= expectedEventCount;
    return {
      valid: isComplete,
      reason: isComplete
        ? null
        : `Projection ${projectionName} processed ${checkpoint.eventCount}/${expectedEventCount} events`,
      processedCount: checkpoint.eventCount,
      expectedCount: expectedEventCount,
    };
  }

  private shouldHandle(projection: Projection, eventType: string): boolean {
    if (projection.handledEventTypes.length === 0) return true;
    return projection.handledEventTypes.includes(eventType);
  }

  private resolveStreamId(aggregateId: string): string {
    if (aggregateId.startsWith("saga:")) return `saga-${aggregateId.replace("saga:", "")}`;
    return aggregateId.includes("-") ? `${aggregateId.split("-")[0]}-${aggregateId}` : aggregateId;
  }
}
