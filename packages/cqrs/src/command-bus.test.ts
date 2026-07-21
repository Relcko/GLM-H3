import { describe, expect, it } from 'vitest';

import { InProcessCommandBus } from './command-bus';
import { DuplicateHandlerError, HandlerNotFoundError } from './errors';
import { createCommand } from './message';

import type { CommandHandler } from './command-bus';
import type { Command } from './message';
import type { MessageContext, PipelineBehavior } from './pipeline';
import type { CorrelationId } from '@relcko/types';

interface ApproveOrderPayload {
  readonly orderId: string;
}

type ApproveOrderCommand = Command<ApproveOrderPayload>;

class ApproveOrderHandler implements CommandHandler<ApproveOrderCommand, string> {
  readonly commandType = 'ApproveOrder';

  handle(command: ApproveOrderCommand): Promise<string> {
    return Promise.resolve(`approved:${command.payload.orderId}`);
  }
}

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;
const command = (payload: ApproveOrderPayload): ApproveOrderCommand =>
  createCommand('ApproveOrder', payload, correlationId());

describe('InProcessCommandBus', () => {
  it('dispatch_should_route_the_command_to_its_handler', async () => {
    const bus = new InProcessCommandBus();
    bus.register(new ApproveOrderHandler());

    const result = await bus.dispatch<string>(command({ orderId: 'o-1' }));

    expect(result).toBe('approved:o-1');
  });

  it('dispatch_should_throw_HandlerNotFoundError_for_unknown_commands', async () => {
    const bus = new InProcessCommandBus();

    await expect(bus.dispatch(command({ orderId: 'o-1' }))).rejects.toThrow(HandlerNotFoundError);
    await expect(bus.dispatch(command({ orderId: 'o-1' }))).rejects.toThrow(
      "No command handler registered for 'ApproveOrder'",
    );
  });

  it('register_should_reject_duplicate_handlers', () => {
    const bus = new InProcessCommandBus();
    bus.register(new ApproveOrderHandler());

    expect(() => {
      bus.register(new ApproveOrderHandler());
    }).toThrow(DuplicateHandlerError);
  });

  it('hasHandler_should_reflect_registrations', () => {
    const bus = new InProcessCommandBus();

    expect(bus.hasHandler('ApproveOrder')).toBe(false);
    bus.register(new ApproveOrderHandler());
    expect(bus.hasHandler('ApproveOrder')).toBe(true);
  });

  it('dispatch_should_run_behaviors_around_the_handler_in_order', async () => {
    const order: string[] = [];
    const behavior = (name: string): PipelineBehavior => ({
      handle: async <TResult>(
        _message: unknown,
        _context: MessageContext,
        next: () => Promise<TResult>,
      ): Promise<TResult> => {
        order.push(`${name}-before`);
        const result = await next();
        order.push(`${name}-after`);
        return result;
      },
    });
    const bus = new InProcessCommandBus({ behaviors: [behavior('b1')] });
    bus.use(behavior('b2'));
    bus.register(new ApproveOrderHandler());

    await bus.dispatch<string>(command({ orderId: 'o-1' }));

    expect(order).toEqual(['b1-before', 'b2-before', 'b2-after', 'b1-after']);
  });

  it('dispatch_should_propagate_the_message_context_to_behaviors', async () => {
    let observed: MessageContext | undefined;
    const observer: PipelineBehavior = {
      handle: <TResult>(
        _message: unknown,
        context: MessageContext,
        next: () => Promise<TResult>,
      ): Promise<TResult> => {
        observed = context;
        return next();
      },
    };
    const bus = new InProcessCommandBus({ behaviors: [observer] });
    bus.register(new ApproveOrderHandler());
    const cmd = command({ orderId: 'o-7' });

    await bus.dispatch<string>(cmd);

    expect(observed?.kind).toBe('command');
    expect(observed?.messageType).toBe('ApproveOrder');
    expect(observed?.metadata).toBe(cmd.metadata);
  });
});
