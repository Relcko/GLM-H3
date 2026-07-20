import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export class RefreshTokenHash extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) {
      throw new ValidationError('RefreshTokenHash must not be empty');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
