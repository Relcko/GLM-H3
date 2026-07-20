
import type { EventStream } from './event-stream';
import type { ExpectedVersion } from './expected-version';
import type { StoredEvent } from './stored-event';
import type { StreamId } from './stream-id';
import type { EventEnvelope } from '@relcko/events';

/** Options accepted by {@link EventStore.append}. */
export interface AppendOptions {
  /** Optimistic-concurrency expectation for the stream. */
  readonly expectedVersion: ExpectedVersion;
}

/** Result of a successful append. */
export interface AppendResult {
  /** Stream that received the events. */
  readonly streamId: StreamId;
  /** New current version of the stream. */
  readonly version: number;
  /** Number of events appended by this call. */
  readonly appendedCount: number;
}

/** Options accepted by {@link EventStore.stream}. */
export interface StreamOptions {
  /** Exclusive global position to start after (defaults to 0 = from the beginning). */
  readonly fromPosition?: number;
  /** Inclusive global position to stop at (defaults to unbounded). */
  readonly toPosition?: number;
  /** Hint for implementations on internal read batching. */
  readonly batchSize?: number;
}

/**
 * Append-only event store contract (Playbook 2.3 - events are authoritative).
 *
 * This package defines interfaces only; database-backed implementations are
 * delivered by infrastructure packages. All implementations must guarantee:
 *
 * - Per-stream versions are 1-based and gapless.
 * - Global positions are 1-based, gapless, and reflect append order.
 * - Appends to one stream are serialized (Playbook 12.3).
 */
export interface EventStore {
  /**
   * Appends events to a stream with optimistic concurrency control.
   *
   * @param streamId - target stream
   * @param events - envelopes to append, in order
   * @param options - append options including the expected version
   * @returns the resulting stream version
   * @throws {OptimisticConcurrencyError} when the stream version does not
   *   match options.expectedVersion
   * @throws {EventSerializationError} when an envelope cannot be serialized
   */
  append(
    streamId: StreamId,
    events: readonly EventEnvelope[],
    options: AppendOptions,
  ): Promise<AppendResult>;

  /**
   * Loads all events of a stream.
   *
   * @param streamId - stream to load
   * @returns the stream view (empty stream with version 0 when unknown)
   */
  load(streamId: StreamId): Promise<EventStream>;

  /**
   * Loads the events of a stream starting at a given version.
   *
   * @param streamId - stream to load
   * @param fromVersion - first version to include (1-based, inclusive)
   * @returns the stream slice plus the current stream version
   */
  loadFromVersion(streamId: StreamId, fromVersion: number): Promise<EventStream>;

  /**
   * Streams every event of the store in global-position order. This is the
   * catch-up and replay source for projections (Playbook 6.3).
   *
   * @param options - optional position bounds
   * @returns async iterable of stored events ordered by global position
   */
  stream(options?: StreamOptions): AsyncIterable<StoredEvent>;
}
