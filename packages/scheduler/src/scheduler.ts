import { generateCorrelationId, systemClock } from '@relcko/kernel';
import { NoOpLogger } from '@relcko/logger';

import { InMemoryDistributedLock } from './distributed-lock';
import { JobRegistry } from './job-registry';
import { defaultJobRetryPolicy } from './retry-policy';
import { nextRunAfter } from './schedule';

import type { DistributedLock } from './distributed-lock';
import type { JobExecution } from './job-execution';
import type { JobRetryPolicy } from './retry-policy';
import type { Schedule } from './schedule';
import type { JobContext, ScheduledJob } from './scheduled-job';
import type { Clock } from '@relcko/kernel';
import type { Logger } from '@relcko/logger';

/** Dependencies of {@link Scheduler}. */
export interface SchedulerDeps {
  /** Job registry. Defaults to an empty registry. */
  readonly registry?: JobRegistry;
  /** Distributed lock guarding job execution. Defaults to in-memory. */
  readonly lock?: DistributedLock;
  /** Clock driving due-time evaluation. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Structured logger. Defaults to a no-op logger. */
  readonly logger?: Logger;
  /** Lock time-to-live in milliseconds. Defaults to 30000. */
  readonly lockTtlMs?: number;
  /** Interval between automatic ticks when using start(). Defaults to 1000. */
  readonly tickMs?: number;
  /** Sleep function between retry attempts. Injectable for tests. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Execution id factory. Defaults to UUID generation. */
  readonly idFactory?: () => string;
  /** Maximum recorded executions kept per job. Oldest are pruned. Defaults to 100. */
  readonly maxExecutionsPerJob?: number;
}

interface JobState {
  readonly job: ScheduledJob;
  nextRunAt: Date | null;
  running: boolean;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const DEFAULT_LOCK_TTL_MS = 30_000;
const DEFAULT_TICK_MS = 1_000;
const DEFAULT_MAX_EXECUTIONS_PER_JOB = 100;

/**
 * Scheduler runtime (Playbook 6.2).
 *
 * Evaluates due jobs per tick, guards each execution with the distributed
 * lock, applies the job's retry policy with backoff, and records every
 * execution. {@link Scheduler.tick} is public so tests and custom drivers
 * can trigger evaluations deterministically; {@link Scheduler.start} drives
 * ticks from a timer in production.
 *
 * Single-process only: the default lock ({@link InMemoryDistributedLock}) and
 * execution history ({@link SchedulerDeps.maxExecutionsPerJob}) are in-memory
 * and lost on restart. Production deployments must supply a shared lock
 * (e.g. Redis, Postgres advisory lock) and a durable execution store.
 */
export class Scheduler {
  private readonly registry: JobRegistry;
  private readonly lock: DistributedLock;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly lockTtlMs: number;
  private readonly tickMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly idFactory: () => string;
  private readonly maxExecutionsPerJob: number;
  private readonly states = new Map<string, JobState>();
  private readonly executions = new Map<string, JobExecution[]>();
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(deps?: SchedulerDeps) {
    this.clock = deps?.clock ?? systemClock;
    this.registry = deps?.registry ?? new JobRegistry();
    this.lock = deps?.lock ?? new InMemoryDistributedLock(this.clock);
    this.logger = (deps?.logger ?? new NoOpLogger()).child('Scheduler');
    this.lockTtlMs = deps?.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
    this.tickMs = deps?.tickMs ?? DEFAULT_TICK_MS;
    this.sleep = deps?.sleep ?? defaultSleep;
    this.idFactory = deps?.idFactory ?? ((): string => crypto.randomUUID());
    this.maxExecutionsPerJob = deps?.maxExecutionsPerJob ?? DEFAULT_MAX_EXECUTIONS_PER_JOB;
  }

  /**
   * Registers a job and schedules its first run.
   *
   * @param job - job to register
   * @throws {ConflictError} when a job with the same id exists
   * @throws {ValidationError} when the job definition is invalid
   */
  register(job: ScheduledJob): void {
    this.registry.register(job);
    this.states.set(job.id, {
      job,
      nextRunAt: nextRunAfter(job.schedule, this.clock.now()),
      running: false,
    });
  }

  /**
   * Removes a job and stops scheduling it.
   *
   * @param jobId - job identifier
   * @returns true when the job existed
   */
  unregister(jobId: string): boolean {
    this.states.delete(jobId);
    return this.registry.unregister(jobId);
  }

  /**
   * Returns the next scheduled run time of a job.
   *
   * @param jobId - job identifier
   * @returns the next run time, null when exhausted, or undefined when unknown
   */
  nextRunAt(jobId: string): Date | null | undefined {
    return this.states.get(jobId)?.nextRunAt;
  }

  /**
   * Starts timer-driven ticking. Safe to call multiple times. The timer
   * keeps the process alive; call {@link Scheduler.stop} to release it.
   */
  start(): void {
    if (this.timer !== undefined) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickMs);
  }

  /** Stops timer-driven ticking. */
  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Evaluates all registered jobs once, executing those that are due.
   * Re-entrant ticks are ignored.
   *
   * @returns resolved when every due job finished its execution
   */
  async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    try {
      const now = this.clock.now();
      for (const state of this.states.values()) {
        if (state.running || state.nextRunAt === null) {
          continue;
        }
        if (state.nextRunAt.getTime() <= now.getTime()) {
          await this.executeJob(state, state.nextRunAt);
        }
      }
    } finally {
      this.ticking = false;
    }
  }

  /**
   * Returns the recorded executions of a job in chronological order.
   *
   * @param jobId - job identifier
   * @returns copy of the execution history
   */
  jobExecutions(jobId: string): readonly JobExecution[] {
    return [...(this.executions.get(jobId) ?? [])];
  }

  private async executeJob(state: JobState, scheduledAt: Date): Promise<void> {
    const job = state.job;
    state.running = true;
    const executionId = this.idFactory();
    const startedAt = this.clock.now();
    const lockHandle = await this.lock.acquire(`scheduler:${job.id}`, this.lockTtlMs);

    if (lockHandle === null) {
      this.logger.warn('Job skipped: distributed lock held by another instance', {
        jobId: job.id,
        executionId,
      });
      this.recordExecution({
        executionId,
        jobId: job.id,
        scheduledAt,
        startedAt,
        finishedAt: this.clock.now(),
        status: 'skipped-locked',
        attempts: 0,
      });
      state.nextRunAt = this.computeNext(job.schedule, scheduledAt);
      state.running = false;
      return;
    }

    try {
      const policy = job.retryPolicy ?? defaultJobRetryPolicy();
      const outcome = await this.runWithRetry(job, executionId, scheduledAt, policy);
      this.recordExecution({
        executionId,
        jobId: job.id,
        scheduledAt,
        startedAt,
        finishedAt: this.clock.now(),
        status: outcome.status,
        attempts: outcome.attempts,
        errorMessage: outcome.errorMessage,
      });
    } finally {
      await lockHandle.release();
      state.nextRunAt = this.computeNext(job.schedule, scheduledAt);
      state.running = false;
    }
  }

  private async runWithRetry(
    job: ScheduledJob,
    executionId: string,
    scheduledAt: Date,
    policy: JobRetryPolicy,
  ): Promise<{ status: 'succeeded' | 'failed'; attempts: number; errorMessage?: string }> {
    const context: JobContext = {
      jobId: job.id,
      executionId,
      scheduledAt,
      correlationId: generateCorrelationId(),
      logger: this.logger.child(`job:${job.name}`),
    };
    let lastError: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      try {
        await job.task(context);
        this.logger.info('Job executed', { jobId: job.id, executionId, attempts: attempt });
        return { status: 'succeeded', attempts: attempt };
      } catch (error) {
        lastError = error;
        const retryable = policy.retryable?.(error) ?? true;
        if (attempt < policy.maxAttempts && retryable) {
          await this.sleep(policy.backoff.delayMs(attempt));
          continue;
        }
        break;
      }
    }
    const failure = lastError instanceof Error ? lastError : new Error(String(lastError));
    this.logger.error('Job execution failed after exhausting retries', failure, {
      jobId: job.id,
      executionId,
      attempts: policy.maxAttempts,
    });
    return { status: 'failed', attempts: policy.maxAttempts, errorMessage: failure.message };
  }

  private computeNext(schedule: Schedule, after: Date): Date | null {
    return schedule.kind === 'once' ? null : nextRunAfter(schedule, after);
  }

  private recordExecution(execution: JobExecution): void {
    const history = this.executions.get(execution.jobId) ?? [];
    history.push(execution);
    while (history.length > this.maxExecutionsPerJob) {
      history.shift();
    }
    this.executions.set(execution.jobId, history);
  }
}
