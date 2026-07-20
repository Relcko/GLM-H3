import type { EventBus, EventHandler, RelckoEventEnvelope } from "@relcko/events";
import type { Timestamp } from "@relcko/types";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceEventType, publishPerformanceEvent } from "./events";

export interface ThroughputSample {
  readonly perSecond: number;
  readonly sampledAt: Timestamp;
}

/**
 * Observes the canonical Event Bus and measures ingest throughput (events/sec)
 * over a rolling 1-second window. Pure observation — never alters published
 * events. The measured rate is published as a performance-only event for the
 * operations/observability layer to consume.
 */
export class EventThroughputOptimizer {
  private unsubscribe?: () => void;
  private count = 0;
  private windowStart = Date.now();
  private lastSample: ThroughputSample = { perSecond: 0, sampledAt: new Date().toISOString() };

  constructor(private readonly events: EventBus, private readonly repository: InMemoryPerformanceRepository) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.events.subscribeAll((envelope: RelckoEventEnvelope) => this.observe(envelope));
    this.sampler = setInterval(() => this.sample(), 1000);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    if (this.sampler) { clearInterval(this.sampler); this.sampler = undefined; }
  }

  private sampler?: ReturnType<typeof setInterval>;

  private observe(envelope: RelckoEventEnvelope): void {
    if (envelope.source === "relcko.performance") return;
    this.count++;
    this.repository.recordEvent();
  }

  private sample(): void {
    const now = Date.now();
    const perSecond = this.count;
    this.count = 0;
    this.windowStart = now;
    this.lastSample = { perSecond, sampledAt: new Date(now).toISOString() };
    void publishPerformanceEvent(this.events, PerformanceEventType.ThroughputSampled, { perSecond });
  }

  snapshot(): ThroughputSample { return this.lastSample; }
  currentRate(): number { return this.repository.eventThroughputPerSec(); }
}
