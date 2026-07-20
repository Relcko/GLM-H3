import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const URL_RE = /^https?:\/\/.+/i;

export class AvatarUrl extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!URL_RE.test(value)) {
      throw new ValidationError(`Invalid AvatarUrl: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
