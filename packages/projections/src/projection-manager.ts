import { ConflictError } from '@relcko/errors';
import { systemClock } from '@relcko/kernel';
import { NoOpLogger } from '@relcko/logger';

import { ProjectionNotFoundError, ProjectionAlreadyRegisteredError } from './errors';

import type { CheckpointStore, ProjectionCheckpoint } from './checkpoint';
import type { Projection } from './projection';
import type { EventDeserializer, EventStore, StoredEvent } from '@relcko/event-store';
import type { EventBus, EventEnvelope, Subscription } from '@relcko/events';
import type { Clock } from '@relcko/kernel';
import type { Logger } from '@relcko/logger';

/** Outcome of a catch-up or replay run. */
export interface CatchUpResult {
  /** Projection that was advanced. */
  readonly projectionName: string;
  /** Events scanned from the store during the run. */
  readonly processedCount: number;
  /** Global position the projection is caught up to. */
  readonly lastPosition: number;
}

/** Options accepted by {@link ProjectionManager.catchUp}. */
export interface CatchUpOptions {
  /** Inclusive global position to stop at. Defaults to unbounded. */
  readonly toPosition?: number;
}

/** Dependencies of {@link ProjectionManager}. */
export interface ProjectionManagerDeps {
  /** Event store used as the catch-up/replay source. */
  readonly eventStore: EventStore;
  /** Event bus used for live event dispatch. */
  readonly eventBus: EventBus;
  /** Checkpoint persistence. */
  readonly checkpointStore: CheckpointStore;
  /** Deserializer converting stored events back into envelopes. */
  readonly deserializer: EventDeserializer;
  /** Clock for checkpoint timestamps. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Structured logger. Defaults to a no-op logger. */
  readonly logger?: Logger;
  /** Events scanned between checkpoint saves. Defaults to 1 (Playbook 2.4). */
  readonly checkpointInterval?: number;
  /** Consumer group used for the live bus subscription. Must be unique per
   * manager instance sharing a bus. Defaults to 'projection-manager'. */
  readonly liveConsumerGroup?: string;
}

const DEFAULT_CHECKPOINT_INTERVAL = 1;
const DEFAULT_LIVE_CONSUMER_GROUP = 'projection-manager';

/**
 * Projection manager (Playbook 6.3).
 *
 * Coordinates the two projection delivery modes:
 *
 * - Catch-up mode: scans the event store from the durable checkpoint,
 *   deserializes events, and folds them into a projection, persisting
 *   progress. Replay support is reset + catch-up from position 0.
 * - Live mode: dispatches bus events directly to matching projections.
 *   Live delivery does not advance checkpoints; store-confirmed positions
 *   only move through catch-up, which also repairs events missed by live
 *   delivery failures.
 */
export class ProjectionManager {
  private readonly projections = new Map<string, Projection>();
  private readonly eventStore: EventStore;
  private readonly eventBus: EventBus;
  private readonly checkpointStore: CheckpointStore;
  private readonly deserializer: EventDeserializer;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly checkpointInterval: number;
  private readonly liveConsumerGroup: string;
  private liveSubscription: Subscription | undefined;
  private catchingUp = false;

  constructor(deps: ProjectionManagerDeps) {
    this.eventStore = deps.eventStore;
    this.eventBus = deps.eventBus;
    this.checkpointStore = deps.checkpointStore;
    this.deserializer = deps.deserializer;
    this.clock = deps.clock ?? systemClock;
    this.logger = (deps.logger ?? new NoOpLogger()).child('ProjectionManager');
    this.checkpointInterval = deps.checkpointInterval ?? DEFAULT_CHECKPOINT_INTERVAL;
    this.liveConsumerGroup = deps.liveConsumerGroup ?? DEFAULT_LIVE_CONSUMER_GROUP;
    if (!Number.isInteger(this.checkpointInterval) || this.checkpointInterval < 1) {
      throw new ConflictError('checkpointInterval must be a positive integer', {
        checkpointInterval: this.checkpointInterval,
      });
    }
  }

  /**
   * Registers a projection.
   *
   * @param projection - projection to register
   * @throws {ProjectionAlreadyRegisteredError} when the name is taken
   */
  register(projection: Projection): void {
    if (this.projections.has(projection.name)) {
      throw new ProjectionAlreadyRegisteredError(projection.name);
    }
    this.projections.set(projection.name, projection);
  }

  /**
   * Looks up a projection by name.
   *
   * @param name - projection name
   * @returns the projection, or undefined when unknown
   */
  get(name: string): Projection | undefined {
    return this.projections.get(name);
  }

  /**
   * Lists all registered projections.
   *
   * @returns projections in registration order
   */
  list(): readonly Projection[] {
    return [...this.projections.values()];
  }

  /** True while live dispatch is active. */
  get isLive(): boolean {
    return this.liveSubscription !== undefined;
  }

  /**
   * Catch-up mode: advances a projection to the current store head (or to
   * options.toPosition), resuming from its durable checkpoint.
   *
   * @param name - projection name
   * @param options - optional upper bound
   * @returns the catch-up outcome
   * @throws {ProjectionNotFoundError} when the projection is unknown
   * @throws {ConflictError} when another catch-up is already running
   */
  async catchUp(name: string, options?: CatchUpOptions): Promise<CatchUpResult> {
    const projection = this.requireProjection(name);
    if (this.catchingUp) {
      throw new ConflictError('A projection catch-up is already in progress', {
        projectionName: name,
      });
    }
    this.catchingUp = true;
    try {
      const checkpoint = await this.checkpointStore.load(name);
      const fromPosition = checkpoint?.position ?? 0;
      let processed = 0;
      let lastPosition = fromPosition;
      for await (const stored of this.eventStore.stream({
        fromPosition,
        toPosition: options?.toPosition,
      })) {
        if (this.handles(projection, stored.eventType)) {
          await projection.handle(this.toEnvelope(stored));
        }
        lastPosition = stored.globalPosition;
        processed += 1;
        if (processed % this.checkpointInterval === 0) {
          await this.saveCheckpoint(name, lastPosition);
        }
      }
      await this.saveCheckpoint(name, lastPosition);
      this.logger.info('Projection catch-up completed', {
        projectionName: name,
        processedCount: processed,
        lastPosition,
      });
      return { projectionName: name, processedCount: processed, lastPosition };
    } finally {
      this.catchingUp = false;
    }
  }

  /**
   * Replay support: resets the projection's read model and rebuilds it from
   * the event store starting at position 0 (Playbook 6.3 - rebuild is
   * verifiable from the same event stream).
   *
   * @param name - projection name
   * @param options - optional upper bound for a partial rebuild
   * @returns the rebuild outcome
   * @throws {ProjectionNotFoundError} when the projection is unknown
   */
  async replay(name: string, options?: CatchUpOptions): Promise<CatchUpResult> {
    const projection = this.requireProjection(name);
    this.logger.info('Replaying projection from position 0', { projectionName: name });
    await projection.reset();
    await this.checkpointStore.delete(name);
    return this.catchUp(name, options);
  }

  /**
   * Starts live mode: subscribes to the bus and dispatches every event to
   * matching projections, sequentially per event. Idempotent.
   */
  startLive(): void {
    if (this.liveSubscription !== undefined) {
      return;
    }
    this.liveSubscription = this.eventBus.subscribe(
      (envelope) => this.dispatchLive(envelope),
      { consumerGroup: this.liveConsumerGroup },
    );
  }

  /** Stops live mode. */
  stopLive(): void {
    if (this.liveSubscription !== undefined) {
      this.liveSubscription.unsubscribe();
      this.liveSubscription = undefined;
    }
  }

  private async dispatchLive(envelope: EventEnvelope): Promise<void> {
    for (const projection of this.projections.values()) {
      if (!this.handles(projection, envelope.metadata.eventType)) {
        continue;
      }
      try {
        await projection.handle(envelope);
      } catch (error) {
        this.logger.error(
          'Projection failed to handle live event; catch-up will repair the read model',
          error instanceof Error ? error : new Error(String(error)),
          {
            projectionName: projection.name,
            eventId: envelope.metadata.eventId,
            eventType: envelope.metadata.eventType,
          },
        );
      }
    }
  }

  private handles(projection: Projection, eventType: string): boolean {
    return (
      projection.handledEventTypes.length === 0 ||
      projection.handledEventTypes.includes(eventType)
    );
  }

  private toEnvelope(stored: StoredEvent): EventEnvelope {
    return this.deserializer.deserialize({
      eventType: stored.eventType,
      eventVersion: stored.eventVersion,
      data: stored.data,
      metadata: stored.metadata,
    });
  }

  private async saveCheckpoint(projectionName: string, position: number): Promise<void> {
    const checkpoint: ProjectionCheckpoint = {
      projectionName,
      position,
      updatedAt: this.clock.nowMs(),
    };
    await this.checkpointStore.save(checkpoint);
  }

  private requireProjection(name: string): Projection {
    const projection = this.projections.get(name);
    if (projection === undefined) {
      throw new ProjectionNotFoundError(name);
    }
    return projection;
  }
}
