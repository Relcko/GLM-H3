import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

import type { AuthenticationMethod } from './authentication-method';

export interface AuthenticationResultValues {
  readonly success: boolean;
  readonly method: AuthenticationMethod;
  readonly failureReason?: string;
  readonly attemptCount?: number;
}

export class AuthenticationResult extends ValueObject {
  public readonly success: boolean;
  public readonly method: AuthenticationMethod;
  public readonly failureReason?: string;
  public readonly attemptCount?: number;

  constructor(values: AuthenticationResultValues) {
    super();
    if (!values.success && !values.failureReason) {
      throw new ValidationError(
        'AuthenticationResult failureReason is required when success is false',
      );
    }
    this.success = values.success;
    this.method = values.method;
    this.failureReason = values.failureReason;
    this.attemptCount = values.attemptCount;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.success, this.method.toString(), this.failureReason, this.attemptCount];
  }

  toJSON(): AuthenticationResultValues {
    return {
      success: this.success,
      method: this.method,
      failureReason: this.failureReason,
      attemptCount: this.attemptCount,
    };
  }
}
