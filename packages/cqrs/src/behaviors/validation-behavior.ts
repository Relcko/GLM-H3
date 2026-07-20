import { ValidationError } from '@relcko/errors';

import type { MessageContext, PipelineBehavior } from '../pipeline';

/** A single validation finding for a message. */
export interface ValidationIssue {
  /** Path of the offending field (empty for message-level issues). */
  readonly path: string;
  /** Human-readable description of the violation. */
  readonly message: string;
}

/**
 * Validates one message type before it reaches its handler.
 */
export interface MessageValidator {
  /** Message type name this validator applies to. */
  readonly messageType: string;

  /**
   * Validates a message.
   *
   * @param message - message in flight (narrow inside the validator)
   * @returns validation issues; an empty list means the message is valid
   */
  validate(message: unknown): readonly ValidationIssue[];
}

/**
 * Pipeline behavior rejecting invalid messages with a
 * {@link ValidationError} before they reach the handler (Playbook 11 -
 * input validation on every operation).
 */
export class ValidationBehavior implements PipelineBehavior {
  private readonly validators = new Map<string, MessageValidator>();

  /**
   * @param validators - validators indexed by their messageType
   */
  constructor(validators: readonly MessageValidator[]) {
    for (const validator of validators) {
      this.validators.set(validator.messageType, validator);
    }
  }

  handle<TResult>(
    message: unknown,
    context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    const validator = this.validators.get(context.messageType);
    if (validator !== undefined) {
      const issues = validator.validate(message);
      if (issues.length > 0) {
        return Promise.reject(
          new ValidationError(`Validation failed for ${context.kind} '${context.messageType}'`, {
            issues,
          }),
        );
      }
    }
    return next();
  }
}
