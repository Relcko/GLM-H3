import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['knowledge', 'possession', 'inherence', 'location'] as const;

export class AuthenticationFactor extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid AuthenticationFactor: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
      );
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
