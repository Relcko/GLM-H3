import { NoOpLogger } from '@relcko/logger';
import { correlationScope } from '@relcko/telemetry';

import { DuplicateHandlerError, HandlerNotFoundError } from './errors';
import { composePipeline } from './pipeline';

import type { MessageContext } from './pipeline';
import type { PipelineBehavior } from './pipeline';
import type { Command } from '@relcko/application';
import type { Logger } from '@relcko/logger';
import type { EventId } from '@relcko/types';

export interface CommandHandler<TCommand extends Command = Command, TResult = void> {
  readonly commandType: string;

  handle(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  register(handler: CommandHandler<Command, unknown>): void;

  dispatch<TResult>(command: Command): Promise<TResult>;
}

export interface CommandBusOptions {
  readonly logger?: Logger;
  readonly behaviors?: readonly PipelineBehavior[];
}

export class InProcessCommandBus implements CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();
  private readonly behaviors: PipelineBehavior[] = [];
  private readonly logger: Logger;

  constructor(options?: CommandBusOptions) {
    this.logger = (options?.logger ?? new NoOpLogger()).child('InProcessCommandBus');
    if (options?.behaviors !== undefined) {
      this.behaviors.push(...options.behaviors);
    }
  }

  use(behavior: PipelineBehavior): void {
    this.behaviors.push(behavior);
  }

  register(handler: CommandHandler<Command, unknown>): void {
    if (this.handlers.has(handler.commandType)) {
      throw new DuplicateHandlerError('command', handler.commandType);
    }
    this.handlers.set(handler.commandType, handler);
  }

  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }

  async dispatch<TResult>(command: Command): Promise<TResult> {
    const handler = this.handlers.get(command.type);
    if (handler === undefined) {
      this.logger.warn('Command rejected: no handler registered', {
        commandType: command.type,
        messageId: command.metadata.messageId,
      });
      throw new HandlerNotFoundError('command', command.type);
    }
    const context: MessageContext = {
      kind: 'command',
      messageType: command.type,
      metadata: command.metadata,
    };
    const pipeline = composePipeline(this.behaviors, command, context, () =>
      handler.handle(command),
    );
    return (await correlationScope.run(
      { correlationId: command.metadata.correlationId, causationId: command.metadata.messageId as EventId },
      () => pipeline(),
    )) as TResult;
  }
}
