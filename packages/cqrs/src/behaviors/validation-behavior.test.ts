import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { createCommand } from '../message';
import { ValidationBehavior } from './validation-behavior';

import type { MessageContext } from '../pipeline';
import type { MessageValidator, ValidationIssue } from './validation-behavior';
import type { CorrelationId } from '@relcko/types';

const context: MessageContext = {
  kind: 'command',
  messageType: 'ApproveOrder',
  metadata: {
    messageId: 'msg-1',
    correlationId: crypto.randomUUID() as CorrelationId,
    timestamp: 1,
  },
};

const orderValidator: MessageValidator = {
  messageType: 'ApproveOrder',
  validate: (message) => {
    const command = message as { payload: { orderId?: string } };
    const issues: ValidationIssue[] = [];
    if (command.payload.orderId === undefined || command.payload.orderId === '') {
      issues.push({ path: 'orderId', message: 'orderId is required' });
    }
    return issues;
  },
};

describe('ValidationBehavior', () => {
  it('should_call_next_when_no_validator_matches_the_message_type', async () => {
    const behavior = new ValidationBehavior([orderValidator]);
    const otherContext: MessageContext = { ...context, messageType: 'Other' };

    const result = await behavior.handle({}, otherContext, () => Promise.resolve('ok'));

    expect(result).toBe('ok');
  });

  it('should_call_next_when_the_message_is_valid', async () => {
    const behavior = new ValidationBehavior([orderValidator]);
    const command = createCommand('ApproveOrder', { orderId: 'o-1' }, context.metadata.correlationId);

    const result = await behavior.handle(command, context, () => Promise.resolve('ok'));

    expect(result).toBe('ok');
  });

  it('should_throw_ValidationError_with_issues_when_invalid', async () => {
    const behavior = new ValidationBehavior([orderValidator]);
    const command = createCommand('ApproveOrder', { orderId: '' }, context.metadata.correlationId);
    let nextCalled = false;

    const attempt = behavior.handle(command, context, () => {
      nextCalled = true;
      return Promise.resolve('ok');
    });

    await expect(attempt).rejects.toThrow(ValidationError);
    await expect(attempt).rejects.toThrow(
      "Validation failed for command 'ApproveOrder'",
    );
    expect(nextCalled).toBe(false);
  });

  it('should_include_the_issues_in_the_error_context', async () => {
    const behavior = new ValidationBehavior([orderValidator]);
    const command = createCommand('ApproveOrder', { orderId: '' }, context.metadata.correlationId);

    const failure = await behavior
      .handle(command, context, () => Promise.resolve('ok'))
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ValidationError);
    expect((failure as ValidationError).context.issues).toEqual([
      { path: 'orderId', message: 'orderId is required' },
    ]);
  });
});
