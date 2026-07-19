import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const MAX_LENGTH = 100;

export class DisplayName extends ValueObject {
  constructor(public readonly value: string) {
    super();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('DisplayName must not be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new ValidationError(`DisplayName must not exceed ${MAX_LENGTH} characters`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
