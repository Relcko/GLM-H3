import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export class PhoneNumber extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!PHONE_RE.test(value)) {
      throw new ValidationError(`Invalid PhoneNumber: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
