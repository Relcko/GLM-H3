import type { EventBus } from "@relcko/events";
import type { Timestamp } from "@relcko/types";
import type { ConcurrencySample } from "./types";
import { ConcurrencyError } from "./errors";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceEventType, publishPerformanceEvent } from "./events";

/**
 * Bounded-concurrency semaphore. Caps the number of in-flight async tasks to
 * protect downstream resources and keep the event loop responsive. Includes an
 * optional queue with a max-wait timeout. Supports horizontal scaling: instances
 * coordinate only through shared limits, never shared memory.
 */
export class ConcurrencyController {
  private active = 0;
  private queued = 0;
  private readonly waiters: Array<{ resolve: () => void; reject: (e: unknown) => void; deadline: number }> = [];

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly limit: number,
  ) {
    if (limit < 1) throw new ConcurrencyError("limit must be >= 1");
  }

  get stats(): ConcurrencySample {
    const sample: ConcurrencySample = { active: this.active, queued: this.queued, limit: this.limit, sampledAt: new Date().toISOString() };
    this.repository.recordConcurrency(sample);
    return sample;
  }

  get inFlight(): number { return this.active; }

  async run<T>(task: () => Promise<T> | T, timeoutMs = 30_000): Promise<T> {
    await this.acquire(timeoutMs);
    this.repository.recordConcurrency(this.snapshot());
    try {
      return await task();
    } finally {
      this.active--;
      this.release();
      this.repository.recordConcurrency(this.snapshot());
    }
  }

  private snapshot(): ConcurrencySample {
    return { active: this.active, queued: this.queued, limit: this.limit, sampledAt: new Date().toISOString() };
  }

  private acquire(timeoutMs: number): Promise<void> {
    if (this.active < this.limit) { this.active++; return Promise.resolve(); }
    if (this.queued >= this.limit * 4) {
      void publishPerformanceEvent(this.events, PerformanceEventType.ConcurrencyLimit, { queued: this.queued });
      throw new ConcurrencyError("concurrency queue overflow", { limit: this.limit, queued: this.queued });
    }
    this.queued++;
    return new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      this.waiters.push({
        resolve: () => { this.queued--; this.active++; resolve(); },
        reject: (e) => { this.queued--; reject(e); },
        deadline,
      });
      setTimeout(() => this.expire(), Math.max(0, timeoutMs));
      this.deadline = deadline;
    });
  }

  private deadline = 0;

  private expire(): void {
    const now = Date.now();
    const ready = this.waiters.filter((w) => w.deadline <= now);
    for (const w of ready) {
      this.waiters.splice(this.waiters.indexOf(w), 1);
      this.queued--;
      w.reject(new ConcurrencyError("acquire timed out", { limit: this.limit }));
    }
  }

  private release(): void {
    while (this.waiters.length && this.active < this.limit) {
      const next = this.waiters.shift();
      if (next) next.resolve();
    }
  }
}
