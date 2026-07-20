import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export class PasswordHash extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) {
      throw new ValidationError('PasswordHash must not be empty');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
