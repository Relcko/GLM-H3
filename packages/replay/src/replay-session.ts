import { ConflictError } from '@relcko/errors';

import type { ReplayMode } from './replay-mode';
import type { ReplayProgress } from './replay-progress';
import type { Clock } from '@relcko/kernel';

/** Lifecycle status of a {@link ReplaySession}. */
export type ReplaySessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Construction properties of a {@link ReplaySession}. */
export interface ReplaySessionProps {
  /** Unique session identifier. */
  readonly id: string;
  /** Replay mode. */
  readonly mode: ReplayMode;
  /** Exclusive lower global-position bound of the replay. */
  readonly fromPosition: number;
  /** Inclusive upper global-position bound of the replay, when any. */
  readonly toPosition?: number;
  /** Clock used for timestamps. */
  readonly clock: Clock;
}

/**
 * One replay execution.
 *
 * State machine: pending -> running -> completed | failed | cancelled.
 * A pending session may also be cancelled before it starts.
 */
export class ReplaySession {
  /** Unique session identifier. */
  readonly id: string;
  /** Replay mode. */
  readonly mode: ReplayMode;
  /** Exclusive lower global-position bound of the replay. */
  readonly fromPosition: number;
  /** Inclusive upper global-position bound of the replay, when any. */
  readonly toPosition?: number;

  private statusValue: ReplaySessionStatus = 'pending';
  private progressValue: ReplayProgress | undefined;
  private errorMessageValue: string | undefined;
  private readonly createdAtValue: Date;
  private finishedAtValue: Date | undefined;
  private readonly clock: Clock;

  constructor(props: ReplaySessionProps) {
    this.id = props.id;
    this.mode = props.mode;
    this.fromPosition = props.fromPosition;
    this.toPosition = props.toPosition;
    this.clock = props.clock;
    this.createdAtValue = props.clock.now();
  }

  /** Current lifecycle status. */
  get status(): ReplaySessionStatus {
    return this.statusValue;
  }

  /** Latest progress snapshot, when the session has started. */
  get progress(): ReplayProgress | undefined {
    return this.progressValue;
  }

  /** Terminal error message, when the session failed. */
  get errorMessage(): string | undefined {
    return this.errorMessageValue;
  }

  /** Session creation time. */
  get createdAt(): Date {
    return this.createdAtValue;
  }

  /** Session terminal time, when finished. */
  get finishedAt(): Date | undefined {
    return this.finishedAtValue;
  }

  /**
   * Transitions the session from pending to running.
   *
   * @param progress - initial progress snapshot
   * @throws {ConflictError} when the session is not pending
   */
  start(progress: ReplayProgress): void {
    this.requireStatus('pending', 'start');
    this.statusValue = 'running';
    this.progressValue = progress;
  }

  /**
   * Records a new progress snapshot.
   *
   * @param progress - latest progress snapshot
   */
  report(progress: ReplayProgress): void {
    this.progressValue = progress;
  }

  /**
   * Marks the session as successfully completed.
   *
   * @param progress - terminal progress snapshot
   * @throws {ConflictError} when the session is not running
   */
  complete(progress: ReplayProgress): void {
    this.requireStatus('running', 'complete');
    this.statusValue = 'completed';
    this.progressValue = progress;
    this.finishedAtValue = this.clock.now();
  }

  /**
   * Marks the session as failed.
   *
   * @param progress - terminal progress snapshot
   * @param errorMessage - description of the failure
   * @throws {ConflictError} when the session is not running
   */
  fail(progress: ReplayProgress, errorMessage: string): void {
    this.requireStatus('running', 'fail');
    this.statusValue = 'failed';
    this.progressValue = progress;
    this.errorMessageValue = errorMessage;
    this.finishedAtValue = this.clock.now();
  }

  /**
   * Cancels the session. Running sessions stop at the next opportunity.
   *
   * @throws {ConflictError} when the session is already in a terminal state
   */
  cancel(): void {
    if (this.statusValue !== 'pending' && this.statusValue !== 'running') {
      throw new ConflictError(
        `ReplaySession ${this.id} cannot be cancelled from status '${this.statusValue}'`,
        { sessionId: this.id, status: this.statusValue },
      );
    }
    this.statusValue = 'cancelled';
    this.finishedAtValue = this.clock.now();
  }

  private requireStatus(expected: ReplaySessionStatus, transition: string): void {
    if (this.statusValue !== expected) {
      throw new ConflictError(
        `ReplaySession ${this.id} cannot ${transition} from status '${this.statusValue}'`,
        { sessionId: this.id, status: this.statusValue },
      );
    }
  }
}
