import { CronExpression } from './cron';

/**
 * When a job runs.
 *
 * - interval: fixed delay between the end of one due time and the next.
 * - cron: five-field cron expression evaluated in UTC.
 * - once: single execution at a fixed instant.
 */
export type Schedule =
  | { readonly kind: 'interval'; readonly everyMs: number }
  | { readonly kind: 'cron'; readonly expression: string }
  | { readonly kind: 'once'; readonly runAt: Date };

/**
 * Computes the next run time of a schedule strictly after a given instant.
 *
 * @param schedule - schedule to evaluate
 * @param after - lower bound (exclusive)
 * @returns the next run time, or null for exhausted one-shot schedules
 * @throws {ValidationError} when a cron expression is invalid
 */
export function nextRunAfter(schedule: Schedule, after: Date): Date | null {
  switch (schedule.kind) {
    case 'interval':
      return new Date(after.getTime() + schedule.everyMs);
    case 'cron':
      return CronExpression.parse(schedule.expression).next(after);
    case 'once':
      return schedule.runAt.getTime() > after.getTime() ? schedule.runAt : null;
    default: {
      const exhaustive: never = schedule;
      throw new Error(`Unknown schedule kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}
