import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export class ChainId extends ValueObject {
  public readonly value: number;

  constructor(value: number) {
    super();
    if (!Number.isInteger(value) || value < 1) {
      throw new ValidationError(`Invalid ChainId: ${value}. Must be a positive integer`);
    }
    this.value = value;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return String(this.value);
  }
}
