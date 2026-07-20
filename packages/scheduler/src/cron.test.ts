import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { CronExpression } from './cron';

describe('CronExpression.parse', () => {
  it('should_parse_every_minute', () => {
    const cron = CronExpression.parse('* * * * *');

    expect(cron.matches(new Date('2026-07-19T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T23:59:00Z'))).toBe(true);
  });

  it('should_parse_step_values', () => {
    const cron = CronExpression.parse('*/15 * * * *');

    expect(cron.matches(new Date('2026-07-19T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T00:15:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T00:07:00Z'))).toBe(false);
  });

  it('should_parse_ranges_lists_and_single_values', () => {
    const cron = CronExpression.parse('0,30 9-17 * * *');

    expect(cron.matches(new Date('2026-07-19T09:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T12:30:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T12:15:00Z'))).toBe(false);
    expect(cron.matches(new Date('2026-07-19T20:00:00Z'))).toBe(false);
  });

  it('should_support_range_with_step', () => {
    const cron = CronExpression.parse('0-30/10 * * * *');

    expect(cron.matches(new Date('2026-07-19T00:10:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T00:20:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T00:40:00Z'))).toBe(false);
  });

  it('should_treat_7_as_sunday_in_day_of_week', () => {
    const cron = CronExpression.parse('0 0 * * 7');

    expect(cron.matches(new Date('2026-07-19T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-20T00:00:00Z'))).toBe(false);
  });

  it('should_apply_or_semantics_when_both_day_fields_are_restricted', () => {
    const cron = CronExpression.parse('0 0 1 * 0');

    expect(cron.matches(new Date('2026-07-19T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-08-01T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-20T00:00:00Z'))).toBe(false);
  });

  it('should_apply_and_semantics_for_a_single_restricted_day_field', () => {
    const cron = CronExpression.parse('0 0 * * 1');

    expect(cron.matches(new Date('2026-07-20T00:00:00Z'))).toBe(true);
    expect(cron.matches(new Date('2026-07-19T00:00:00Z'))).toBe(false);
  });

  it('should_reject_malformed_expressions', () => {
    expect(() => CronExpression.parse('* * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('* * * * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('61 * * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('* 25 * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('0 0 0 * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('0 0 * 13 *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('0 0 * * 8')).toThrow(ValidationError);
    expect(() => CronExpression.parse('*/0 * * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('5-1 * * * *')).toThrow(ValidationError);
    expect(() => CronExpression.parse('x * * * *')).toThrow(ValidationError);
  });
});

describe('CronExpression.next', () => {
  it('should_return_the_next_minute_for_every_minute', () => {
    const cron = CronExpression.parse('* * * * *');

    expect(cron.next(new Date('2026-07-19T00:00:00Z'))).toEqual(
      new Date('2026-07-19T00:01:00Z'),
    );
  });

  it('should_compute_the_next_step_boundary', () => {
    const cron = CronExpression.parse('*/15 * * * *');

    expect(cron.next(new Date('2026-07-19T00:07:30Z'))).toEqual(
      new Date('2026-07-19T00:15:00Z'),
    );
  });

  it('should_roll_over_days_and_months', () => {
    const daily = CronExpression.parse('30 14 * * *');
    expect(daily.next(new Date('2026-07-19T15:00:00Z'))).toEqual(
      new Date('2026-07-20T14:30:00Z'),
    );

    const monthly = CronExpression.parse('0 9 1 * *');
    expect(monthly.next(new Date('2026-07-19T00:00:00Z'))).toEqual(
      new Date('2026-08-01T09:00:00Z'),
    );

    const weekly = CronExpression.parse('0 0 * * 0');
    expect(weekly.next(new Date('2026-07-19T12:00:00Z'))).toEqual(
      new Date('2026-07-26T00:00:00Z'),
    );
  });

  it('should_never_return_the_reference_instant_itself', () => {
    const cron = CronExpression.parse('0 0 * * *');

    expect(cron.next(new Date('2026-07-19T00:00:00Z'))).toEqual(
      new Date('2026-07-20T00:00:00Z'),
    );
  });
});
