import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['siwe', 'password', 'passkey', 'totp', 'backup_code', 'recovery'] as const;

export class AuthenticationMethod extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid AuthenticationMethod: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
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
