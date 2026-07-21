import type { StoredEvent } from '@relcko/event-store';
import type { Clock } from '@relcko/kernel';

/**
 * Point-in-time progress snapshot of a replay.
 */
export interface ReplayProgress {
  /** Events delivered to the sink so far. */
  readonly processedCount: number;
  /** Global position of the last delivered event (0 = none). */
  readonly lastPosition: number;
  /** Time the replay started. */
  readonly startedAt: Date;
  /** Delivery rate in events per second since the start. */
  readonly eventsPerSecond: number;
}

/**
 * Mutable tracker producing {@link ReplayProgress} snapshots.
 */
export class ReplayProgressTracker {
  private processed = 0;
  private lastPosition = 0;
  private readonly startedAt: Date;
  private readonly clock: Clock;

  /**
   * @param clock - clock used for start time and rate computation
   */
  constructor(clock: Clock) {
    this.clock = clock;
    this.startedAt = clock.now();
  }

  /**
   * Records one delivered event.
   *
   * @param event - event just delivered to the sink
   */
  record(event: StoredEvent): void {
    this.processed += 1;
    this.lastPosition = event.globalPosition;
  }

  /**
   * Builds an immutable progress snapshot.
   *
   * @returns current progress
   */
  snapshot(): ReplayProgress {
    const elapsedMs = this.clock.nowMs() - this.startedAt.getTime();
    return {
      processedCount: this.processed,
      lastPosition: this.lastPosition,
      startedAt: this.startedAt,
      eventsPerSecond: elapsedMs > 0 ? (this.processed * 1000) / elapsedMs : 0,
    };
  }
}
