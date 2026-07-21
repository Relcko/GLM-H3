import type { Projection, CheckpointStore, ProjectionCheckpoint } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";
import type { EventStore, StoredEvent } from "@relcko/event-store";
import type { EventDeserializer } from "@relcko/event-store";

export interface DispatcherOptions {
  batchSize?: number;
}

export class ProjectionDispatcher {
  private readonly projections: Projection[] = [];
  private running = false;

  constructor(
    private readonly eventStore: EventStore,
    private readonly checkpointStore: CheckpointStore,
    private readonly deserializer: EventDeserializer,
    private readonly options: DispatcherOptions = {},
  ) {}

  register(projection: Projection): void {
    if (this.projections.find((p) => p.name === projection.name)) {
      return;
    }
    this.projections.push(projection);
  }

  async catchUp(projectionName: string): Promise<{ processed: number }> {
    const projection = this.projections.find((p) => p.name === projectionName);
    if (!projection) throw new Error(`Projection ${projectionName} not found`);

    const checkpoint = await this.checkpointStore.load(projectionName);
    const fromPosition = checkpoint?.position ?? 0;

    let processed = 0;
    for await (const storedEvent of this.eventStore.stream({ fromPosition })) {
      if (!this.shouldHandle(projection, storedEvent.eventType)) continue;
      const envelope = this.deserializer.deserialize(storedEvent);
      await projection.handle(envelope);
      processed += 1;
    }

    const streamIterator = this.eventStore.stream({ batchSize: this.options.batchSize ?? 100 });
    let lastPosition = fromPosition;
    for await (const storedEvent of streamIterator) {
      if (storedEvent.globalPosition > lastPosition) {
        lastPosition = storedEvent.globalPosition;
      }
    }

    if (processed > 0 || lastPosition > fromPosition) {
      const ckpt: ProjectionCheckpoint = {
        projectionName,
        position: lastPosition,
        updatedAt: Date.now(),
      };
      await this.checkpointStore.save(ckpt);
    }

    return { processed };
  }

  async replay(projectionName: string): Promise<{ processed: number }> {
    const projection = this.projections.find((p) => p.name === projectionName);
    if (!projection) throw new Error(`Projection ${projectionName} not found`);

    await projection.reset();
    await this.checkpointStore.delete(projectionName);
    return this.catchUp(projectionName);
  }

  async catchUpAll(): Promise<{ [name: string]: number }> {
    const results: { [name: string]: number } = {};
    for (const projection of this.projections) {
      results[projection.name] = (await this.catchUp(projection.name)).processed;
    }
    return results;
  }

  async replayAll(): Promise<{ [name: string]: number }> {
    const results: { [name: string]: number } = {};
    for (const projection of this.projections) {
      results[projection.name] = (await this.replay(projection.name)).processed;
    }
    return results;
  }

  getProjection(name: string): Projection | undefined {
    return this.projections.find((p) => p.name === name);
  }

  private shouldHandle(projection: Projection, eventType: string): boolean {
    if (projection.handledEventTypes.length === 0) return true;
    return projection.handledEventTypes.includes(eventType);
  }
}
