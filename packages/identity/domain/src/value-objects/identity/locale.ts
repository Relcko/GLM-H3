import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const LOCALE_RE = /^[a-z]{2,3}(-[A-Z]{2})?$/;

export class Locale extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!LOCALE_RE.test(value)) {
      throw new ValidationError(`Invalid Locale: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
