import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['active', 'expired', 'revoked', 'consumed'] as const;

export class TokenStatus extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid TokenStatus: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
      );
    }
  }

  get isActive(): boolean {
    return this.value === 'active';
  }

  get isExpired(): boolean {
    return this.value === 'expired';
  }

  get isRevoked(): boolean {
    return this.value === 'revoked';
  }

  get isConsumed(): boolean {
    return this.value === 'consumed';
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
