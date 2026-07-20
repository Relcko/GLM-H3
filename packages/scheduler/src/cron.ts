import { ValidationError } from '@relcko/errors';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const MAX_SEARCH_SPAN = 4 * 366 * DAY;

interface CronFields {
  readonly minute: ReadonlySet<number>;
  readonly hour: ReadonlySet<number>;
  readonly dayOfMonth: ReadonlySet<number>;
  readonly month: ReadonlySet<number>;
  readonly dayOfWeek: ReadonlySet<number>;
  readonly dayOfMonthRestricted: boolean;
  readonly dayOfWeekRestricted: boolean;
}

/**
 * Parsed five-field cron expression (minute hour day-of-month month
 * day-of-week), evaluated in UTC for determinism (Playbook 2.6).
 *
 * Supported syntax per field: `*`, `*\/n`, `a`, `a-b`, `a-b\/n`, `a\/n`, and
 * comma-separated combinations (e.g. `1,15\/5`, `0-30\/10`). Day-of-week
 * accepts 0-6 with 7 as an alias for Sunday (0). When both day fields are
 * restricted, standard cron OR semantics apply.
 */
export class CronExpression {
  private constructor(
    private readonly fields: CronFields,
    private readonly expression: string,
  ) {}

  /**
   * Parses a cron expression.
   *
   * @param expression - five-field cron expression
   * @returns the parsed expression
   * @throws {ValidationError} when the expression is malformed or out of range
   */
  static parse(expression: string): CronExpression {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new ValidationError('Cron expression must have exactly 5 fields', { expression });
    }
    const [minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart] = parts as [
      string,
      string,
      string,
      string,
      string,
    ];
    const fields: CronFields = {
      minute: parseField(minutePart, 0, 59, expression),
      hour: parseField(hourPart, 0, 23, expression),
      dayOfMonth: parseField(dayOfMonthPart, 1, 31, expression),
      month: parseField(monthPart, 1, 12, expression),
      dayOfWeek: parseField(dayOfWeekPart, 0, 7, expression, (value) => (value === 7 ? 0 : value)),
      dayOfMonthRestricted: dayOfMonthPart !== '*',
      dayOfWeekRestricted: dayOfWeekPart !== '*',
    };
    return new CronExpression(fields, expression);
  }

  /**
   * Tests whether a date matches the expression (UTC, minute precision).
   *
   * @param date - instant to test
   * @returns true when the date matches every field
   */
  matches(date: Date): boolean {
    return (
      this.fields.month.has(date.getUTCMonth() + 1) &&
      this.dayMatches(date) &&
      this.fields.hour.has(date.getUTCHours()) &&
      this.fields.minute.has(date.getUTCMinutes())
    );
  }

  /**
   * Computes the next matching instant strictly after the given date.
   *
   * @param after - lower bound (exclusive)
   * @returns the next matching instant at minute precision
   * @throws {ValidationError} when no instant matches within 4 years
   */
  next(after: Date): Date {
    let candidate = Math.floor(after.getTime() / MINUTE) * MINUTE + MINUTE;
    const limit = candidate + MAX_SEARCH_SPAN;
    while (candidate < limit) {
      const date = new Date(candidate);
      if (!this.fields.month.has(date.getUTCMonth() + 1)) {
        candidate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
        continue;
      }
      if (!this.dayMatches(date)) {
        candidate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
        continue;
      }
      if (!this.fields.hour.has(date.getUTCHours())) {
        candidate =
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) +
          (date.getUTCHours() + 1) * HOUR;
        continue;
      }
      if (!this.fields.minute.has(date.getUTCMinutes())) {
        candidate += MINUTE;
        continue;
      }
      return new Date(candidate);
    }
    throw new ValidationError('Cron expression has no matching instant within 4 years', {
      expression: this.expression,
    });
  }

  private dayMatches(date: Date): boolean {
    const dayOfMonthMatch = this.fields.dayOfMonth.has(date.getUTCDate());
    const dayOfWeekMatch = this.fields.dayOfWeek.has(date.getUTCDay());
    if (this.fields.dayOfMonthRestricted && this.fields.dayOfWeekRestricted) {
      return dayOfMonthMatch || dayOfWeekMatch;
    }
    return dayOfMonthMatch && dayOfWeekMatch;
  }
}

function parseField(
  field: string,
  min: number,
  max: number,
  expression: string,
  normalize?: (value: number) => number,
): ReadonlySet<number> {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    parsePart(part, min, max, expression, values, normalize);
  }
  if (values.size === 0) {
    throw new ValidationError('Cron field produced no values', { expression, field });
  }
  return values;
}

function parsePart(
  part: string,
  min: number,
  max: number,
  expression: string,
  values: Set<number>,
  normalize?: (value: number) => number,
): void {
  const slashIndex = part.indexOf('/');
  const rangePart = slashIndex === -1 ? part : part.slice(0, slashIndex);
  const stepPart = slashIndex === -1 ? undefined : part.slice(slashIndex + 1);

  let step = 1;
  if (stepPart !== undefined) {
    step = parseNumber(stepPart, expression);
    if (step < 1) {
      throw new ValidationError('Cron step must be a positive integer', { expression, part });
    }
  }

  let start: number;
  let end: number;
  if (rangePart === '*' || rangePart === '') {
    start = min;
    end = max;
  } else if (rangePart.includes('-')) {
    const dashIndex = rangePart.indexOf('-');
    start = parseNumber(rangePart.slice(0, dashIndex), expression);
    end = parseNumber(rangePart.slice(dashIndex + 1), expression);
  } else {
    start = parseNumber(rangePart, expression);
    end = stepPart !== undefined ? max : start;
  }

  if (start < min || end > max || start > end) {
    throw new ValidationError(`Cron field values must be within ${min}-${max}`, {
      expression,
      part,
    });
  }
  for (let value = start; value <= end; value += step) {
    values.add(normalize === undefined ? value : normalize(value));
  }
}

function parseNumber(raw: string, expression: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError('Cron field contains a non-numeric value', { expression, raw });
  }
  return Number.parseInt(raw, 10);
}
