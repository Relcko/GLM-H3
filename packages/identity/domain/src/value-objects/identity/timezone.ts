import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const TIMEZONE_RE = /^[A-Z][a-zA-Z]+\/[A-Z][a-zA-Z_]+$/;

const KNOWN_TIMEZONES = new Set([
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/Argentina_Buenos_Aires',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Melbourne',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
]);

export class Timezone extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!TIMEZONE_RE.test(value) && value !== 'UTC') {
      throw new ValidationError(`Invalid Timezone format: ${value}`);
    }
    if (!KNOWN_TIMEZONES.has(value)) {
      throw new ValidationError(`Unknown Timezone: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
