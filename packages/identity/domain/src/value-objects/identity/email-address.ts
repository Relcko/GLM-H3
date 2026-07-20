import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!EMAIL_RE.test(value)) {
      throw new ValidationError(`Invalid EmailAddress: ${value}`);
    }
  }

  static fromRaw(value: string): EmailAddress {
    return new EmailAddress(value.toLowerCase().trim());
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
