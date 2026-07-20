import type { StoredEvent } from '@relcko/event-store';

/**
 * Consumer receiving replayed events. Business logic lives exclusively
 * behind this port; the replay engine itself is pure infrastructure.
 */
export type ReplayEventSink = (event: StoredEvent) => Promise<void>;

/**
 * Control surface handed to a {@link ReplayStrategy}.
 */
export interface ReplayControl {
  /** Maximum events flushed to the sink per batch window. */
  readonly batchSize: number;

  /**
   * Signals cooperative cancellation of the replay.
   *
   * @returns true when the replay should stop at the next opportunity
   */
  shouldStop(): boolean;
}

/**
 * Strategy determining how events flow from the store to the sink.
 */
export interface ReplayStrategy {
  /**
   * Drives events from source to sink honoring the control surface.
   *
   * @param source - ordered event source (global position ascending)
   * @param sink - consumer of replayed events
   * @param control - batching and cancellation controls
   * @returns number of events delivered to the sink
   * @throws rethrows sink errors to the coordinator
   */
  execute(
    source: AsyncIterable<StoredEvent>,
    sink: ReplayEventSink,
    control: ReplayControl,
  ): Promise<number>;
}

/**
 * Default strategy: delivers events one at a time, in order. This is the
 * only acceptable strategy when event ordering must be strictly preserved
 * (Playbook 2.6).
 */
export class SequentialReplayStrategy implements ReplayStrategy {
  async execute(
    source: AsyncIterable<StoredEvent>,
    sink: ReplayEventSink,
    control: ReplayControl,
  ): Promise<number> {
    let processed = 0;
    for await (const event of source) {
      if (control.shouldStop()) {
        break;
      }
      await sink(event);
      processed += 1;
    }
    return processed;
  }
}

/**
 * Batched strategy: groups events into windows of control.batchSize before
 * flushing them to the sink in order. Useful for progress reporting on
 * large replays; ordering within and across windows is preserved.
 */
export class BatchedReplayStrategy implements ReplayStrategy {
  async execute(
    source: AsyncIterable<StoredEvent>,
    sink: ReplayEventSink,
    control: ReplayControl,
  ): Promise<number> {
    let processed = 0;
    let batch: StoredEvent[] = [];
    for await (const event of source) {
      if (control.shouldStop()) {
        break;
      }
      batch.push(event);
      if (batch.length >= control.batchSize) {
        for (const item of batch) {
          await sink(item);
          processed += 1;
        }
        batch = [];
      }
    }
    for (const item of batch) {
      await sink(item);
      processed += 1;
    }
    return processed;
  }
}
