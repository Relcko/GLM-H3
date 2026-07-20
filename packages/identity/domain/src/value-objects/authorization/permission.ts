import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

const PERMISSION_RE = /^[a-z][a-z0-9]*:[a-z][a-z0-9]*$/;

export class Permission extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!PERMISSION_RE.test(value)) {
      throw new ValidationError(
        `Invalid Permission: ${value}. Must be in format 'resource:action'`,
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
