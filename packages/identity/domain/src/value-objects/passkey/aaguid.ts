import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AAGUID extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!UUID_RE.test(value)) {
      throw new ValidationError(`Invalid AAGUID: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
