/** Terminal status of one job execution. */
export type JobExecutionStatus = 'succeeded' | 'failed' | 'skipped-locked';

/**
 * Record of one job execution (Playbook 6.2 - trigger condition documented
 * and observable).
 */
export interface JobExecution {
  /** Unique execution identifier. */
  readonly executionId: string;
  /** Job that was executed. */
  readonly jobId: string;
  /** Time the execution was scheduled for. */
  readonly scheduledAt: Date;
  /** Time execution actually started. */
  readonly startedAt: Date;
  /** Time execution terminated. */
  readonly finishedAt: Date;
  /** Terminal status. */
  readonly status: JobExecutionStatus;
  /** Number of attempts made (0 when skipped). */
  readonly attempts: number;
  /** Failure description, when the execution failed. */
  readonly errorMessage?: string;
}
