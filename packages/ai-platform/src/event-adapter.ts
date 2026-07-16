import type { EventBus, RelckoEventEnvelope } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { AiEventType } from "./events";

export interface DomainEventSubscription {
  readonly eventType: string;
  readonly description: string;
  handle(event: RelckoEventEnvelope): Promise<void>;
}

export class EventAdapter {
  private readonly subscriptions: DomainEventSubscription[] = [];
  private unsubscribers: (() => void)[] = [];

  constructor(
    private readonly bus: EventBus,
    private readonly logger?: Logger,
  ) {}

  register(subscription: DomainEventSubscription): void {
    this.subscriptions.push(subscription);
  }

  async start(): Promise<void> {
    for (const sub of this.subscriptions) {
      const unsub = this.bus.subscribe(sub.eventType, async (event: RelckoEventEnvelope) => {
        try {
          await sub.handle(event);
        } catch (error) {
          this.logger?.error("event adapter handler failed", {
            eventType: sub.eventType,
            error: String(error),
          });
        }
      });
      this.unsubscribers.push(unsub);
      this.logger?.info("event subscription started", { eventType: sub.eventType });
    }
  }

  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.logger?.info("event adapter stopped");
  }
}
