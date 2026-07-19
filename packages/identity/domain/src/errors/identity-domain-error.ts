import { DomainError } from '@relcko/errors';

export abstract class IdentityDomainError extends DomainError {
  protected constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(`IDENTITY_${code}`, message, context);
  }
}
