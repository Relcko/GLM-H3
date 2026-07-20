import type { CorrelationId } from '@relcko/types';

export interface MessageMetadata {
  readonly messageId: string;
  readonly correlationId: CorrelationId;
  readonly causationId?: string;
  readonly timestamp: number;
}

export interface Command<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly metadata: MessageMetadata;
}

export interface Query<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
  readonly metadata: MessageMetadata;
}

export interface CreateMessageOptions {
  readonly messageId?: string;
  readonly causationId?: string;
  readonly timestamp?: number;
}

export function createCommand<TPayload>(
  type: string,
  payload: TPayload,
  correlationId: CorrelationId,
  options?: CreateMessageOptions,
): Command<TPayload> {
  return {
    type,
    payload,
    metadata: {
      messageId: options?.messageId ?? crypto.randomUUID(),
      correlationId,
      causationId: options?.causationId,
      timestamp: options?.timestamp ?? Date.now(),
    },
  };
}

export function createQuery<TPayload>(
  type: string,
  payload: TPayload,
  correlationId: CorrelationId,
  options?: CreateMessageOptions,
): Query<TPayload> {
  return {
    type,
    payload,
    metadata: {
      messageId: options?.messageId ?? crypto.randomUUID(),
      correlationId,
      causationId: options?.causationId,
      timestamp: options?.timestamp ?? Date.now(),
    },
  };
}
