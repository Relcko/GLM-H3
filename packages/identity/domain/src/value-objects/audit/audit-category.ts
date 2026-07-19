import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = [
  'authentication',
  'authorization',
  'account',
  'wallet',
  'session',
  'recovery',
  'passkey',
  'admin',
  'settings',
  'security',
] as const;

export class AuditCategory extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid AuditCategory: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
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
