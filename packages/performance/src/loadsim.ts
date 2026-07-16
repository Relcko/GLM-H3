import type { EventBus, EventHandler, RelckoEventEnvelope } from "@relcko/events";
import type { InMemoryPerformanceRepository } from "./repository";
import type { LoadSimulationOptions, LoadSimulationReport } from "./types";

/**
 * Drives synthetic load against a target task to validate concurrency behavior
 * and measure throughput/latency before production. This is a test/diagnostic
 * utility — it does not run in the request hot path.
 */
export class LoadSimulation {
  constructor(private readonly repository: InMemoryPerformanceRepository) {}

  async run(options: LoadSimulationOptions): Promise<LoadSimulationReport> {
    const { concurrency, iterations, rampUpMs = 0, task } = options;
    const start = Date.now();
    const latencies: number[] = [];
    let succeeded = 0;
    const errors: string[] = [];

    const workers: Promise<void>[] = [];
    for (let w = 0; w < concurrency; w++) {
      workers.push((async () => {
        for (let i = 0; i < iterations; i++) {
          const idx = w * iterations + i;
          if (rampUpMs) await delay((rampUpMs / (concurrency * iterations)) * idx);
          const t0 = Date.now();
          try {
            await task(idx);
            succeeded++;
          } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
          }
          latencies.push(Date.now() - t0);
        }
      })());
    }
    await Promise.all(workers);

    const durationMs = Date.now() - start;
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    const report: LoadSimulationReport = {
      total: concurrency * iterations,
      succeeded,
      failed: errors.length,
      durationMs,
      throughputPerSec: durationMs ? (succeeded / durationMs) * 1000 : 0,
      avgLatencyMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95LatencyMs: p95,
      errors: errors.slice(0, 10),
    };
    this.repository.saveLoadReport(report);
    return report;
  }
}

function delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

/** Subscribes to the bus and records performance-relevant events for the
 * analytics layer. Passive observation only. */
export class PerformanceEventAdapter {
  private unsubscribe?: () => void;
  constructor(private readonly events: EventBus, private readonly repository: InMemoryPerformanceRepository) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.events.subscribeAll((envelope: RelckoEventEnvelope) => {
      if (envelope.source === "relcko.performance") return;
      this.repository.recordEvent();
    });
  }

  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
}

export type { EventHandler };
