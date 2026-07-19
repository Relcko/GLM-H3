import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const HEX_RE = /^0x[0-9a-f]+$/i;

export class Nonce extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!HEX_RE.test(value)) {
      throw new ValidationError(`Invalid Nonce: must be a hex string with 0x prefix`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
