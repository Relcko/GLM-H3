import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const BASE32_RE = /^[A-Z2-7]{16,}$/;

export class TotpSecret extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!BASE32_RE.test(value)) {
      throw new ValidationError('Invalid TotpSecret: must be base32-encoded');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
