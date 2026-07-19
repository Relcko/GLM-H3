import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const CAPABILITY_RE = /^[a-z][a-z0-9]*(:[a-z][a-z0-9]*)*$/;

export class Capability extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!CAPABILITY_RE.test(value)) {
      throw new ValidationError(`Invalid Capability: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
