import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export class Timestamp extends ValueObject {
  public readonly value: Date;

  constructor(value: Date | number | string) {
    super();
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Invalid Timestamp: ${String(value)}`);
    }
    this.value = date;
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  get epochMs(): number {
    return this.value.getTime();
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value.getTime()];
  }

  toString(): string {
    return this.value.toISOString();
  }

  toJSON(): string {
    return this.value.toISOString();
  }
}
