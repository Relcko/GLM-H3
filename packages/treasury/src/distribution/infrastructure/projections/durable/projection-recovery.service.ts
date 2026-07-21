import type { Projection } from "@relcko/projections";
import type { EventStore, EventDeserializer } from "@relcko/event-store";
import type { IProjectionCheckpointStore, CheckpointValidationResult } from "./projection-checkpoint-store";
import { ProjectionIdempotencyService } from "./projection-idempotency.service";

export interface RecoveryResult {
  readonly projectionName: string;
  readonly recovered: boolean;
  readonly fromCheckpoint: number;
  readonly processed: number;
  readonly errors: readonly string[];
  readonly checkpointValid: boolean;
}

export interface VerificationResult {
  readonly verified: boolean;
  readonly reason: string | null;
  readonly rowCount: number;
  readonly checkpointPosition: number;
}

export class ProjectionRecoveryService {
  private readonly idempotency = new ProjectionIdempotencyService();

  constructor(
    private readonly eventStore: EventStore,
    private readonly checkpointStore: IProjectionCheckpointStore,
    private readonly deserializer: EventDeserializer,
  ) {}

  async recoverProjection(
    projection: Projection,
    projectionName: string,
  ): Promise<RecoveryResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    const validation = await this.checkpointStore.verifyCheckpoint(projectionName);

    if (!validation.valid && checkpoint) {
      await projection.reset();
      this.idempotency.clear();
      await this.checkpointStore.delete(projectionName);
    }

    let processed = 0;
    const errors: string[] = [];
    const fromPosition = checkpoint?.globalPosition ?? 0;

    for await (const storedEvent of this.eventStore.stream({ fromPosition })) {
      if (!this.shouldHandle(projection, storedEvent.eventType)) continue;

      const envelope = this.deserializer.deserialize(storedEvent);
      const check = this.idempotency.checkEvent(envelope);
      if (!check.canProcess) continue;

      try {
        await projection.handle(envelope);
        this.idempotency.recordProcessed(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId} at ${storedEvent.globalPosition}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      projectionName,
      recovered: errors.length === 0,
      fromCheckpoint: fromPosition,
      processed,
      errors,
      checkpointValid: validation.valid,
    };
  }

  async partialReplay(
    projection: Projection,
    projectionName: string,
    aggregateId: string,
    fromVersion: number,
  ): Promise<RecoveryResult> {
    const streamId = this.resolveStreamId(aggregateId);
    const stream = await this.eventStore.load(streamId as never);

    const filteredEvents = (stream.events as unknown as { globalPosition: number; eventType: string; eventId: string }[])
      .filter((e) => {
        const env = this.deserializer.deserialize(e as never);
        return env.metadata.aggregateVersion >= fromVersion;
      });

    let processed = 0;
    const errors: string[] = [];
    const fromPosition = filteredEvents[0]?.globalPosition ?? 0;

    for (const storedEvent of filteredEvents) {
      if (!this.shouldHandle(projection, storedEvent.eventType)) continue;

      const envelope = this.deserializer.deserialize(storedEvent as never);
      try {
        await projection.handle(envelope);
        processed += 1;
      } catch (err) {
        errors.push(`Event ${storedEvent.eventId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      projectionName,
      recovered: errors.length === 0,
      fromCheckpoint: fromPosition,
      processed,
      errors,
      checkpointValid: true,
    };
  }

  async validateCheckpoint(projectionName: string): Promise<CheckpointValidationResult> {
    return this.checkpointStore.verifyCheckpoint(projectionName);
  }

  async verifyProjection(
    projection: Projection,
    projectionName: string,
  ): Promise<VerificationResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    const checkpointPosition = checkpoint?.globalPosition ?? 0;

    let eventCount = 0;
    for await (const storedEvent of this.eventStore.stream({})) {
      if (this.shouldHandle(projection, storedEvent.eventType)) {
        eventCount += 1;
      }
    }

    const rows = await this.getRowCount(projection);

    if (rows === 0 && eventCount > 0) {
      return {
        verified: false,
        reason: `Projection ${projectionName} has 0 rows but ${eventCount} relevant events exist in store`,
        rowCount: rows,
        checkpointPosition,
      };
    }

    return {
      verified: true,
      reason: null,
      rowCount: rows,
      checkpointPosition,
    };
  }

  async compareWithSource(
    projection: Projection,
    projectionName: string,
  ): Promise<VerificationResult> {
    const checkpoint = await this.checkpointStore.load(projectionName);
    const checkpointPosition = checkpoint?.globalPosition ?? 0;

    let expectedCount = 0;
    for await (const storedEvent of this.eventStore.stream({})) {
      if (this.shouldHandle(projection, storedEvent.eventType)) {
        expectedCount += 1;
      }
    }

    const processedCount = checkpoint?.eventCount ?? 0;
    const match = processedCount >= expectedCount;

    return {
      verified: match,
      reason: match
        ? null
        : `Projection ${projectionName} processed ${processedCount}/${expectedCount} events`,
      rowCount: processedCount,
      checkpointPosition,
    };
  }

  private async getRowCount(projection: Projection): Promise<number> {
    const resetMethod = (projection as unknown as { findMany?(): unknown[] }).findMany;
    if (resetMethod) {
      return resetMethod.call(projection).length;
    }
    return 0;
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
