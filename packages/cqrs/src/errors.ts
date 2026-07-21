import { DomainError } from '@relcko/errors';

/** Kind of CQRS message an error refers to. */
export type MessageKind = 'command' | 'query';

/**
 * Raised when dispatching a message with no registered handler.
 */
export class HandlerNotFoundError extends DomainError {
  constructor(
    public readonly kind: MessageKind,
    public readonly messageType: string,
  ) {
    super(
      'HANDLER_NOT_FOUND',
      `No ${kind} handler registered for '${messageType}'`,
      { kind, messageType },
    );
  }
}

/**
 * Raised when registering a second handler for the same message type.
 */
export class DuplicateHandlerError extends DomainError {
  constructor(
    public readonly kind: MessageKind,
    public readonly messageType: string,
  ) {
    super(
      'DUPLICATE_HANDLER',
      `A ${kind} handler is already registered for '${messageType}'`,
      { kind, messageType },
    );
  }
}
