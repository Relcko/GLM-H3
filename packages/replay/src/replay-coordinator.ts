import { ValidationError } from '@relcko/errors';
import { systemClock } from '@relcko/kernel';
import { NoOpLogger } from '@relcko/logger';

import { ReplayMode } from './replay-mode';
import { ReplayProgressTracker } from './replay-progress';
import { ReplaySession } from './replay-session';
import { SequentialReplayStrategy } from './replay-strategy';

import type { ReplayProgress } from './replay-progress';
import type { ReplayResult } from './replay-result';
import type { ReplayControl, ReplayEventSink, ReplayStrategy } from './replay-strategy';
import type { EventStore } from '@relcko/event-store';
import type { Clock } from '@relcko/kernel';
import type { Logger } from '@relcko/logger';

/** Options accepted by {@link ReplayCoordinator.startReplay}. */
export interface ReplayOptions {
  /** Replay mode. */
  readonly mode: ReplayMode;
  /** Consumer of replayed events (business logic lives here, replay-safe). */
  readonly sink: ReplayEventSink;
  /** Exclusive lower bound. Required for FromPosition and Range modes. */
  readonly fromPosition?: number;
  /** Inclusive upper bound. Required for Range mode. */
  readonly toPosition?: number;
  /** Delivery strategy. Defaults to {@link SequentialReplayStrategy}. */
  readonly strategy?: ReplayStrategy;
  /** Batch window for batched strategies. Defaults to 500. */
  readonly batchSize?: number;
}

/** Dependencies of {@link ReplayCoordinator}. */
export interface ReplayCoordinatorDeps {
  /** Event store used as the replay source. */
  readonly eventStore: EventStore;
  /** Clock used for session timestamps. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Structured logger. Defaults to a no-op logger. */
  readonly logger?: Logger;
  /** Session id factory. Defaults to UUID generation. */
  readonly idFactory?: () => string;
  /**
   * Maximum terminal (completed/failed/cancelled) sessions kept in memory.
   * Oldest are pruned first. Defaults to unlimited.
   */
  readonly maxSessions?: number;
}

const DEFAULT_BATCH_SIZE = 500;

/**
 * Replay coordinator (Playbook 2.7 - replay-safe development).
 *
 * Infrastructure only: it reads the event store within the requested
 * bounds, drives a {@link ReplayStrategy}, tracks progress in a
 * {@link ReplaySession}, and reports a {@link ReplayResult}. It contains no
 * business replay logic - that lives in the caller-provided sink, which
 * must honor the replay-mode flag and avoid real side effects.
 *
 * Sessions are kept in memory. Use {@link ReplayCoordinatorDeps.maxSessions}
 * to bound memory usage for long-running processes.
 */
export class ReplayCoordinator {
  private readonly sessions = new Map<string, ReplaySession>();
  private readonly eventStore: EventStore;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly idFactory: () => string;
  private readonly maxSessions: number;

  constructor(deps: ReplayCoordinatorDeps) {
    this.eventStore = deps.eventStore;
    this.clock = deps.clock ?? systemClock;
    this.logger = (deps.logger ?? new NoOpLogger()).child('ReplayCoordinator');
    this.idFactory = deps.idFactory ?? ((): string => crypto.randomUUID());
    this.maxSessions = deps.maxSessions ?? Infinity;
  }

  /**
   * Executes a replay session to completion.
   *
   * The returned promise always resolves with a {@link ReplayResult}; sink
   * failures are captured as a failed session, never thrown.
   *
   * @param options - replay bounds, sink, and strategy
   * @returns the terminal replay result
   * @throws {ValidationError} when the mode/bounds combination is invalid
   */
  async startReplay(options: ReplayOptions): Promise<ReplayResult> {
    const bounds = resolveBounds(options);
    const session = new ReplaySession({
      id: this.idFactory(),
      mode: options.mode,
      fromPosition: bounds.fromPosition,
      toPosition: bounds.toPosition,
      clock: this.clock,
    });
    this.pruneSessions();
    this.sessions.set(session.id, session);

    const tracker = new ReplayProgressTracker(this.clock);
    const strategy = options.strategy ?? new SequentialReplayStrategy();
    const control: ReplayControl = {
      batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
      shouldStop: () => session.status === 'cancelled',
    };

    this.logger.info('Starting replay session', {
      sessionId: session.id,
      mode: session.mode,
      fromPosition: session.fromPosition,
      toPosition: session.toPosition,
    });

    session.start(tracker.snapshot());
    try {
      const source = this.eventStore.stream({
        fromPosition: bounds.fromPosition,
        toPosition: bounds.toPosition,
      });
      const sink: ReplayEventSink = async (event) => {
        await options.sink(event);
        tracker.record(event);
        session.report(tracker.snapshot());
      };
      await strategy.execute(source, sink, control);
      if (session.status === 'running') {
        session.complete(tracker.snapshot());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Replay session failed',
        error instanceof Error ? error : new Error(message),
        { sessionId: session.id },
      );
      session.fail(tracker.snapshot(), message);
    }

    this.logger.info('Replay session terminated', {
      sessionId: session.id,
      status: session.status,
      processedCount: session.progress?.processedCount ?? 0,
    });
    return toResult(session);
  }

  /**
   * Requests cancellation of a session. Running sessions stop at the next
   * batch boundary.
   *
   * @param sessionId - session to cancel
   * @returns true when the session existed and was cancellable
   */
  cancelSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session === undefined) {
      return false;
    }
    if (session.status !== 'pending' && session.status !== 'running') {
      return false;
    }
    session.cancel();
    return true;
  }

  /**
   * Looks up a session by id.
   *
   * @param sessionId - session identifier
   * @returns the session, or undefined when unknown
   */
  getSession(sessionId: string): ReplaySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Lists all sessions known to this coordinator.
   *
   * @returns sessions in registration order
   */
  listSessions(): readonly ReplaySession[] {
    return [...this.sessions.values()];
  }

  private pruneSessions(): void {
    if (this.maxSessions === Infinity) {
      return;
    }
    const terminal = [...this.sessions.entries()].filter(
      ([, session]) =>
        session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled',
    );
    if (this.sessions.size - terminal.length >= this.maxSessions) {
      return;
    }
    const surplus = this.sessions.size - this.maxSessions;
    if (surplus <= 0) {
      return;
    }
    const sorted = terminal.sort(
      (left, right) =>
        (left[1].finishedAt?.getTime() ?? 0) - (right[1].finishedAt?.getTime() ?? 0),
    );
    const pruneCount = Math.min(surplus, sorted.length);
    for (let index = 0; index < pruneCount; index += 1) {
      const entry = sorted[index];
      if (entry !== undefined) {
        this.sessions.delete(entry[0]);
      }
    }
  }
}

function resolveBounds(options: ReplayOptions): { fromPosition: number; toPosition?: number } {
  switch (options.mode) {
    case ReplayMode.Full:
      return { fromPosition: 0 };
    case ReplayMode.FromPosition: {
      if (options.fromPosition === undefined || options.fromPosition < 0) {
        throw new ValidationError('fromPosition must be a non-negative number', {
          mode: options.mode,
          fromPosition: options.fromPosition,
        });
      }
      return { fromPosition: options.fromPosition };
    }
    case ReplayMode.Range: {
      if (
        options.fromPosition === undefined ||
        options.fromPosition < 0 ||
        options.toPosition === undefined ||
        options.toPosition <= options.fromPosition
      ) {
        throw new ValidationError(
          'Range mode requires 0 <= fromPosition < toPosition',
          { mode: options.mode, fromPosition: options.fromPosition, toPosition: options.toPosition },
        );
      }
      return { fromPosition: options.fromPosition, toPosition: options.toPosition };
    }
  }
}

function toResult(session: ReplaySession): ReplayResult {
  const progress: ReplayProgress | undefined = session.progress;
  const finishedAt = session.finishedAt ?? new Date();
  return {
    sessionId: session.id,
    status: session.status,
    mode: session.mode,
    processedCount: progress?.processedCount ?? 0,
    fromPosition: session.fromPosition,
    toPosition: session.toPosition,
    lastPosition: progress?.lastPosition ?? 0,
    startedAt: progress?.startedAt ?? session.createdAt,
    finishedAt,
    durationMs: finishedAt.getTime() - (progress?.startedAt ?? session.createdAt).getTime(),
    errorMessage: session.errorMessage,
  };
}
