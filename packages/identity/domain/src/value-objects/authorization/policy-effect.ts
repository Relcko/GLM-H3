import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['Allow', 'Deny'] as const;

export class PolicyEffect extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(`Invalid PolicyEffect: ${value}. Must be 'Allow' or 'Deny'`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }

  get isAllow(): boolean {
    return this.value === 'Allow';
  }

  get isDeny(): boolean {
    return this.value === 'Deny';
  }
}
