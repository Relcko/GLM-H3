import type { JobRetryPolicy } from './retry-policy';
import type { Schedule } from './schedule';
import type { Logger } from '@relcko/logger';
import type { CorrelationId } from '@relcko/types';

/**
 * Context handed to a job task at execution time.
 */
export interface JobContext {
  /** Identifier of the job being executed. */
  readonly jobId: string;
  /** Unique identifier of this execution. */
  readonly executionId: string;
  /** Time the execution was scheduled for. */
  readonly scheduledAt: Date;
  /** Correlation id of this execution for observability (Playbook 8.5). */
  readonly correlationId: CorrelationId;
  /** Structured logger scoped to the job. */
  readonly logger: Logger;
}

/**
 * Unit of work executed by the scheduler.
 */
export type JobTask = (context: JobContext) => Promise<void>;

/**
 * A job registered with the scheduler.
 */
export interface ScheduledJob {
  /** Unique job identifier. */
  readonly id: string;
  /** Human-readable job name used in logs and metrics. */
  readonly name: string;
  /** When the job runs. */
  readonly schedule: Schedule;
  /** Unit of work to execute. */
  readonly task: JobTask;
  /** Retry policy. Defaults to {@link defaultJobRetryPolicy}. */
  readonly retryPolicy?: JobRetryPolicy;
}
