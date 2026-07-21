import type { ReplayMode } from './replay-mode';
import type { ReplaySessionStatus } from './replay-session';

/**
 * Terminal outcome of a replay session.
 */
export interface ReplayResult {
  /** Session identifier. */
  readonly sessionId: string;
  /** Terminal session status. */
  readonly status: ReplaySessionStatus;
  /** Replay mode that was executed. */
  readonly mode: ReplayMode;
  /** Events delivered to the sink. */
  readonly processedCount: number;
  /** Exclusive lower global-position bound that was used. */
  readonly fromPosition: number;
  /** Inclusive upper global-position bound, when any. */
  readonly toPosition?: number;
  /** Global position of the last delivered event (0 = none). */
  readonly lastPosition: number;
  /** Time the replay started. */
  readonly startedAt: Date;
  /** Time the replay terminated. */
  readonly finishedAt: Date;
  /** Wall duration of the replay in milliseconds. */
  readonly durationMs: number;
  /** Failure description, when the replay failed. */
  readonly errorMessage?: string;
}
