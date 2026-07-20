import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const ALLOWED = ['active', 'inactive', 'suspended', 'locked', 'deleted'] as const;

export class UserStatus extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!(ALLOWED as readonly string[]).includes(value)) {
      throw new ValidationError(
        `Invalid UserStatus: ${value}. Must be one of: ${ALLOWED.join(', ')}`,
      );
    }
  }

  get isActive(): boolean {
    return this.value === 'active';
  }

  get isInactive(): boolean {
    return this.value === 'inactive';
  }

  get isSuspended(): boolean {
    return this.value === 'suspended';
  }

  get isLocked(): boolean {
    return this.value === 'locked';
  }

  get isDeleted(): boolean {
    return this.value === 'deleted';
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
