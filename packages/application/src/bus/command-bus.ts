import { DomainError } from '@relcko/errors';

import { HandlerRegistry } from './handler-registry';
import { HandlerExecutionFailedError } from '../errors/application-error';

import type { Command } from '../message';

type AnyCommandHandler = CommandHandler<Command, unknown>;

export interface CommandHandler<TCommand extends Command = Command, TResult = void> {
  readonly commandType: string;
  handle(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  register<T extends Command, TResult>(handler: CommandHandler<T, TResult>): void;
  dispatch<TResult>(command: Command): Promise<TResult>;
  hasHandler(commandType: string): boolean;
}

export class InMemoryCommandBus implements CommandBus {
  private readonly registry = new HandlerRegistry<AnyCommandHandler>();

  register<T extends Command, TResult>(handler: CommandHandler<T, TResult>): void {
    this.registry.register(handler.commandType, handler, 'command');
  }

  async dispatch<TResult>(command: Command): Promise<TResult> {
    const handler = this.registry.resolve(command.type, 'command');
    try {
      const raw = await handler.handle(command);
      return raw as TResult;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new HandlerExecutionFailedError(command.type, error as Error);
    }
  }

  hasHandler(commandType: string): boolean {
    return this.registry.has(commandType, 'command');
  }
}
