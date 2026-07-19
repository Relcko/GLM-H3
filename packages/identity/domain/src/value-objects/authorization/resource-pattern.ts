import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export class ResourcePattern extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) {
      throw new ValidationError('ResourcePattern must not be empty');
    }
    if (!value.startsWith('/')) {
      throw new ValidationError('ResourcePattern must start with /');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
