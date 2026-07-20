import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UserId extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!UUID_V4_RE.test(value)) {
      throw new ValidationError(`Invalid UserId: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
