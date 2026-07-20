import { Severity } from "@relcko/types";
import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";

export enum NotificationChannel {
  InApp = "in_app",
  Email = "email",
  OnChain = "on_chain",
}

export interface NotificationMessage {
  readonly id: string;
  readonly channel: NotificationChannel;
  readonly recipientId: EntityId;
  readonly template?: string;
  readonly title: string;
  readonly body: string;
  readonly severity: Severity;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface NotificationResult {
  readonly delivered: boolean;
  readonly channel: NotificationChannel;
  readonly messageId: string;
  readonly error?: string;
}

export interface NotificationSender {
  send(message: NotificationMessage): Promise<NotificationResult>;
  sendBulk(messages: readonly NotificationMessage[]): Promise<ReadonlyArray<NotificationResult>>;
}

export interface CreateNotificationInput {
  channel: NotificationChannel;
  recipientId: EntityId;
  title: string;
  body: string;
  severity?: Severity;
  template?: string;
  data?: Record<string, unknown>;
}

export function createNotification(input: CreateNotificationInput): NotificationMessage {
  return {
    id: generateId("ntf"),
    channel: input.channel,
    recipientId: input.recipientId,
    template: input.template,
    title: input.title,
    body: input.body,
    severity: input.severity ?? Severity.Info,
    data: input.data,
    createdAt: new Date().toISOString(),
  };
}

/** In-memory sink (framework + tests). Production fans out to email/on-chain providers. */
export class InMemoryNotificationSink implements NotificationSender {
  private readonly outbox: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<NotificationResult> {
    this.outbox.push(message);
    return { delivered: true, channel: message.channel, messageId: message.id };
  }

  async sendBulk(messages: readonly NotificationMessage[]): Promise<ReadonlyArray<NotificationResult>> {
    const results: NotificationResult[] = [];
    for (const m of messages) results.push(await this.send(m));
    return results;
  }

  sent(): ReadonlyArray<NotificationMessage> {
    return this.outbox;
  }
}

export function createInMemoryNotificationSink(): InMemoryNotificationSink {
  return new InMemoryNotificationSink();
}
