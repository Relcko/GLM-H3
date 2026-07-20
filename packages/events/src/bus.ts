import { InfrastructureError } from "@relcko/error";
import { generateTraceId } from "@relcko/utils";
import type { EntityId } from "@relcko/types";
import { asTraceId } from "@relcko/types";
import type { Json } from "@relcko/types";
import type { RelckoEventEnvelope } from "./envelope";
import { markDeadLetter, withRetry } from "./envelope";
import { validateEnvelope } from "./validation";

export type EventHandler<P extends Json = Json> = (
  envelope: RelckoEventEnvelope<P>,
) => void | Promise<void>;

export interface DeadLetterEntry {
  readonly envelope: RelckoEventEnvelope;
  readonly error: string;
  readonly routedAt: string;
  readonly attempts: number;
}

export interface PublishResult {
  readonly delivered: boolean;
  readonly deduped: boolean;
  readonly deadLettered: boolean;
  readonly subscriberResults: ReadonlyArray<{ readonly type: string; readonly ok: boolean; readonly error?: string }>;
}

export interface EventBusOptions {
  /** Max delivery attempts per subscriber before dead-lettering. Default 3. */
  readonly maxAttempts?: number;
  /** Invoked when an event is dead-lettered. */
  readonly onDeadLetter?: (entry: DeadLetterEntry) => void;
  /** If false, disables idempotency de-duplication (re-delivers). Default true. */
  readonly idempotent?: boolean;
}

export interface EventBus {
  publish<P extends Json>(envelope: RelckoEventEnvelope<P>): Promise<PublishResult>;
  subscribe<P extends Json>(type: string, handler: EventHandler<P>): () => void;
  subscribeAll(handler: EventHandler): () => void;
  deadLetters(): ReadonlyArray<DeadLetterEntry>;
  replayDeadLetters(): Promise<PublishResult[]>;
}

/**
 * In-process event bus implementing the canonical guarantees:
 * at-least-once delivery, per-event idempotency (keyed by eventId), bounded
 * retry with metadata, and dead-letter routing for poison events.
 *
 * Pluggable adapter seam — a managed broker can replace this without changing
 * subscribers (EVENT_ARCHITECTURE.md §1).
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  private readonly seen = new Set<string>();
  private readonly deadLetterStore: DeadLetterEntry[] = [];
  private readonly maxAttempts: number;
  private readonly onDeadLetter?: (entry: DeadLetterEntry) => void;
  private readonly idempotent: boolean;

  constructor(options: EventBusOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.onDeadLetter = options.onDeadLetter;
    this.idempotent = options.idempotent ?? true;
  }

  subscribe<P extends Json>(type: string, handler: EventHandler<P>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler);
    return () => set!.delete(handler as EventHandler);
  }

  subscribeAll(handler: EventHandler): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  async publish<P extends Json>(envelope: RelckoEventEnvelope<P>): Promise<PublishResult> {
    const validated = validateEnvelope<P>(envelope);
    if (this.idempotent && this.seen.has(validated.eventId)) {
      return { delivered: true, deduped: true, deadLettered: false, subscriberResults: [] };
    }
    this.seen.add(validated.eventId);

    const result = await this.deliverToSubscribers(validated);
    return { ...result, deduped: false };
  }

  private async deliverWithRetry(
    handler: EventHandler,
    envelope: RelckoEventEnvelope,
  ): Promise<{ ok: boolean; error?: string; attempts: number }> {
    let current = envelope;
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await handler(current);
        return { ok: true, attempts: attempt };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        current = withRetry(current, lastError, this.maxAttempts);
      }
    }
    return { ok: false, error: lastError, attempts: this.maxAttempts };
  }

  deadLetters(): ReadonlyArray<DeadLetterEntry> {
    return this.deadLetterStore;
  }

  async replayDeadLetters(): Promise<PublishResult[]> {
    const entries = this.deadLetterStore.splice(0, this.deadLetterStore.length);
    const results: PublishResult[] = [];
    for (const entry of entries) {
      // Preserve original eventId, correlationId, traceId, and audit metadata.
      // Reset retry bookkeeping so replay gets a fresh attempt budget.
      // Bypass idempotency dedup — replay must perform a genuine delivery attempt.
      const envelope = { ...entry.envelope, retry: undefined, deadLettered: false };
      results.push(await this.deliverToSubscribers(validateEnvelope(envelope as RelckoEventEnvelope)));
    }
    return results;
  }

  private async deliverToSubscribers<P extends Json>(
    envelope: RelckoEventEnvelope<P>,
  ): Promise<PublishResult> {
    const subscribers = [
      ...(this.handlers.get(envelope.type) ?? []),
      ...this.allHandlers,
    ];

    const subscriberResults: { readonly type: string; readonly ok: boolean; readonly error?: string }[] = [];
    let deadLettered = false;

    for (const handler of subscribers) {
      const attempt = await this.deliverWithRetry(handler, envelope);
      subscriberResults.push({ type: envelope.type, ok: attempt.ok, error: attempt.error });
      if (!attempt.ok) {
        deadLettered = true;
        const entry: DeadLetterEntry = {
          envelope: markDeadLetter(envelope),
          error: attempt.error ?? "unknown",
          routedAt: new Date().toISOString(),
          attempts: attempt.attempts,
        };
        this.deadLetterStore.push(entry);
        this.onDeadLetter?.(entry);
      }
    }

    return { delivered: !deadLettered, deduped: false, deadLettered, subscriberResults };
  }
}

export function createEventBus(options?: EventBusOptions): EventBus {
  return new InMemoryEventBus(options);
}

export class EventBusClosedError extends InfrastructureError {
  constructor() {
    super("Event bus is closed", "EVENT_BUS_CLOSED");
  }
}

export type { EntityId };
