import { ConflictError, ValidationError } from '@relcko/errors';

import { CronExpression } from './cron';

import type { ScheduledJob } from './scheduled-job';

/**
 * Registry of scheduled jobs.
 */
export class JobRegistry {
  private readonly jobs = new Map<string, ScheduledJob>();

  /**
   * Registers a job after validating its schedule.
   *
   * @param job - job to register
   * @throws {ConflictError} when a job with the same id is already registered
   * @throws {ValidationError} when the job definition or schedule is invalid
   */
  register(job: ScheduledJob): void {
    if (this.jobs.has(job.id)) {
      throw new ConflictError(`Job '${job.id}' is already registered`, { jobId: job.id });
    }
    validateJob(job);
    this.jobs.set(job.id, job);
  }

  /**
   * Looks up a job by id.
   *
   * @param jobId - job identifier
   * @returns the job, or undefined when unknown
   */
  get(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Checks whether a job id is registered.
   *
   * @param jobId - job identifier
   * @returns true when the job exists
   */
  has(jobId: string): boolean {
    return this.jobs.has(jobId);
  }

  /**
   * Lists all registered jobs.
   *
   * @returns jobs in registration order
   */
  list(): readonly ScheduledJob[] {
    return [...this.jobs.values()];
  }

  /**
   * Removes a job from the registry.
   *
   * @param jobId - job identifier
   * @returns true when the job existed
   */
  unregister(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }
}

function validateJob(job: ScheduledJob): void {
  if (job.id.trim().length === 0 || job.name.trim().length === 0) {
    throw new ValidationError('Job id and name must be non-empty strings', {
      jobId: job.id,
      name: job.name,
    });
  }
  switch (job.schedule.kind) {
    case 'interval':
      if (!Number.isFinite(job.schedule.everyMs) || job.schedule.everyMs <= 0) {
        throw new ValidationError('Interval schedule requires a positive everyMs', {
          jobId: job.id,
          everyMs: job.schedule.everyMs,
        });
      }
      return;
    case 'cron':
      CronExpression.parse(job.schedule.expression);
      return;
    case 'once':
      if (Number.isNaN(job.schedule.runAt.getTime())) {
        throw new ValidationError('Once schedule requires a valid runAt date', { jobId: job.id });
      }
      return;
    default: {
      const exhaustive: never = job.schedule;
      throw new ValidationError(`Unknown schedule kind: ${JSON.stringify(exhaustive)}`, {
        jobId: job.id,
      });
    }
  }
}
