import type { Json } from "@relcko/types";
import {
  createEnvelope,
  InMemoryEventBus,
  type EventBus,
  type RelckoEventEnvelope,
} from "@relcko/events";

/**
 * Test double for the event bus: extends the in-memory bus and records every
 * published envelope plus per-type delivery counts for assertions.
 */
export class MockEventBus extends InMemoryEventBus implements EventBus {
  readonly history: RelckoEventEnvelope[] = [];
  readonly byType = new Map<string, RelckoEventEnvelope[]>();

  override async publish<P extends Json>(envelope: RelckoEventEnvelope<P>): ReturnType<EventBus["publish"]> {
    this.history.push(envelope);
    const list = this.byType.get(envelope.type) ?? [];
    list.push(envelope);
    this.byType.set(envelope.type, list);
    return super.publish(envelope);
  }

  clear(): void {
    this.history.length = 0;
    this.byType.clear();
  }

  publishedOfType(type: string): RelckoEventEnvelope[] {
    // Loose equality is intentional: event `type` values may originate from a
    // different module copy of @relcko/events, producing String instances that
    // are not strictly === to a literal but are semantically identical.
    return this.history.filter((e) => (e.type as unknown) == type);
  }
}

export function createMockEventBus(): MockEventBus {
  return new MockEventBus();
}

/** Build an envelope quickly inside tests. */
export function mockEnvelope(type: string, aggregateId: string, payload: Json = {}) {
  return createEnvelope({
    type,
    aggregateId: aggregateId as never,
    actorId: "actor_test" as never,
    payload,
  });
}
