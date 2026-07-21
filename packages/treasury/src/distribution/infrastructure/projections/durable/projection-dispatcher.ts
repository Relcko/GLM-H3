import type { Projection } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";
import type { EventStore, StoredEvent, EventDeserializer } from "@relcko/event-store";
import type { IProjectionCheckpointStore, ProjectionCheckpoint } from "./projection-checkpoint-store";
import { ProjectionIdempotencyService } from "./projection-idempotency.service";

export interface DispatcherRetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: DispatcherRetryOptions = {
  maxRetries: 3,
  baseDelayMs: 100,
};

export interface DispatchResult {
  readonly projectionName: string;
  readonly processed: number;
  readonly skipped: number;
  readonly errors: readonly string[];
  readonly position: number;
}

export interface ProjectionHandler {
  readonly projection: Projection;
  readonly idempotency: ProjectionIdempotencyService;
  processedCount: number;
  skippedCount: number;
}

export class DurableProjectionDispatcher {
  private readonly handlers = new Map<string, ProjectionHandler>();

  constructor(
    private readonly eventStore: EventStore,
    private readonly checkpointStore: IProjectionCheckpointStore,
    private readonly deserializer: EventDeserializer,
    private readonly retryOptions: DispatcherRetryOptions = DEFAULT_RETRY_OPTIONS,
  ) {}

  register(projection: Projection): void {
    if (this.handlers.has(projection.name)) return;
    this.handlers.set(projection.name, {
      projection,
      idempotency: new ProjectionIdempotencyService(),
      processedCount: 0,
      skippedCount: 0,
    });
  }

  getHandler(projectionName: string): ProjectionHandler | undefined {
    return this.handlers.get(projectionName);
  }

  getProjection(projectionName: string): Projection | undefined {
    return this.handlers.get(projectionName)?.projection;
  }

  async dispatchSingle(
    projectionName: string,
    envelope: EventEnvelope,
  ): Promise<{ processed: boolean; error: string | null }> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      return { processed: false, error: `Projection ${projectionName} not registered` };
    }

    if (!this.shouldHandle(handler.projection, envelope.metadata.eventType)) {
      return { processed: false, error: null };
    }

    const check = handler.idempotency.checkEvent(envelope);
    if (!check.canProcess) {
      handler.skippedCount += 1;
      return { processed: false, error: check.reason };
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        await handler.projection.handle(envelope);
        handler.idempotency.recordProcessed(envelope);
        handler.processedCount += 1;
        return { processed: true, error: null };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.retryOptions.maxRetries) {
          await this.delay(this.retryOptions.baseDelayMs * Math.pow(2, attempt));
        }
      }
    }

    return { processed: false, error: `Failed after ${this.retryOptions.maxRetries} retries: ${lastError!.message}` };
  }

  async dispatchBatch(
    projectionName: string,
    envelopes: readonly EventEnvelope[],
  ): Promise<DispatchResult> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      return { projectionName, processed: 0, skipped: 0, errors: [`Projection ${projectionName} not registered`], position: 0 };
    }

    const sorted = [...envelopes].sort(
      (a, b) => (a.metadata.timestamp ?? 0) - (b.metadata.timestamp ?? 0),
    );

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let lastPosition = 0;

    for (const envelope of sorted) {
      const result = await this.dispatchSingle(projectionName, envelope);
      if (result.processed) processed += 1;
      else if (result.error) {
        errors.push(result.error);
        skipped += 1;
      } else skipped += 1;
      lastPosition = envelope.metadata.timestamp ?? lastPosition;
    }

    return { projectionName, processed, skipped, errors, position: lastPosition };
  }

  async catchUp(projectionName: string, batchSize: number = 100): Promise<DispatchResult> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      return { projectionName, processed: 0, skipped: 0, errors: [`Projection ${projectionName} not registered`], position: 0 };
    }

    const checkpoint = await this.checkpointStore.load(projectionName);
    const fromPosition = checkpoint?.globalPosition ?? 0;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let lastPosition = fromPosition;
    let batch: EventEnvelope[] = [];

    for await (const storedEvent of this.eventStore.stream({ fromPosition: fromPosition, batchSize })) {
      if (!this.shouldHandle(handler.projection, storedEvent.eventType)) {
        lastPosition = Math.max(lastPosition, storedEvent.globalPosition);
        continue;
      }

      const envelope = this.deserializer.deserialize(storedEvent);
      batch.push(envelope);

      if (batch.length >= batchSize) {
        const result = await this.dispatchBatch(projectionName, batch);
        processed += result.processed;
        skipped += result.skipped;
        errors.push(...result.errors);
        lastPosition = result.position;
        batch = [];
      }
    }

    if (batch.length > 0) {
      const result = await this.dispatchBatch(projectionName, batch);
      processed += result.processed;
      skipped += result.skipped;
      errors.push(...result.errors);
      lastPosition = result.position;
    }

    if (processed > 0 || lastPosition > fromPosition) {
      const nextPosition = await this.getLastGlobalPosition();
      const ckpt: ProjectionCheckpoint = {
        projectionName,
        position: lastPosition,
        globalPosition: nextPosition,
        version: checkpoint?.version ?? 0,
        updatedAt: Date.now(),
        eventCount: processed + skipped,
      };
      await this.checkpointStore.save(ckpt);
    }

    return { projectionName, processed, skipped, errors, position: lastPosition };
  }

  async replay(projectionName: string): Promise<DispatchResult> {
    const handler = this.handlers.get(projectionName);
    if (!handler) {
      return { projectionName, processed: 0, skipped: 0, errors: [`Projection ${projectionName} not registered`], position: 0 };
    }

    await handler.projection.reset();
    await this.checkpointStore.delete(projectionName);
    handler.idempotency.clear();
    handler.processedCount = 0;
    handler.skippedCount = 0;

    return this.catchUp(projectionName);
  }

  async catchUpAll(): Promise<{ [name: string]: DispatchResult }> {
    const results: { [name: string]: DispatchResult } = {};
    for (const [name] of this.handlers) {
      results[name] = await this.catchUp(name);
    }
    return results;
  }

  async replayAll(): Promise<{ [name: string]: DispatchResult }> {
    const results: { [name: string]: DispatchResult } = {};
    for (const [name] of this.handlers) {
      results[name] = await this.replay(name);
    }
    return results;
  }

  private async getLastGlobalPosition(): Promise<number> {
    let lastPos = 0;
    for await (const storedEvent of this.eventStore.stream({})) {
      if (storedEvent.globalPosition > lastPos) {
        lastPos = storedEvent.globalPosition;
      }
    }
    return lastPos;
  }

  private shouldHandle(projection: Projection, eventType: string): boolean {
    if (projection.handledEventTypes.length === 0) return true;
    return projection.handledEventTypes.includes(eventType);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
