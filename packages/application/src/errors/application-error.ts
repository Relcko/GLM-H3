import { DomainError } from '@relcko/errors';

export class UnknownCommandError extends DomainError {
  constructor(commandType: string) {
    super('UNKNOWN_COMMAND', `No handler registered for command '${commandType}'`, { commandType });
  }
}

export class UnknownQueryError extends DomainError {
  constructor(queryType: string) {
    super('UNKNOWN_QUERY', `No handler registered for query '${queryType}'`, { queryType });
  }
}

export class DuplicateHandlerError extends DomainError {
  constructor(kind: 'command' | 'query', messageType: string) {
    super('DUPLICATE_HANDLER', `A ${kind} handler is already registered for '${messageType}'`, { kind, messageType });
  }
}

export class ValidationFailedError extends DomainError {
  constructor(errors: readonly string[]) {
    super('VALIDATION_FAILED', 'Validation failed', { errors });
  }
}

export class TransactionFailedError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('TRANSACTION_FAILED', message, context);
  }
}

export class HandlerExecutionFailedError extends DomainError {
  constructor(commandType: string, inner: Error) {
    super('HANDLER_EXECUTION_FAILED', `Handler for '${commandType}' failed: ${inner.message}`, {
      commandType,
      innerErrorName: inner.name,
      innerErrorMessage: inner.message,
    });
    this.cause = inner;
  }
}
