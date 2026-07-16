import { describe, expect, it } from "vitest";
import { correlationContext } from "@relcko/observability";
import { createHealthRegistry, HealthStatus } from "@relcko/observability";
import { createNoopMetrics, createNoopTracer } from "@relcko/observability";

describe("correlation context", () => {
  it("propagates ids across async boundaries", async () => {
    const outer = await correlationContext.run({ correlationId: "c1", traceId: "t1" }, async () => {
      await Promise.resolve();
      return correlationContext.currentIds();
    });
    expect(outer.correlationId).toBe("c1");
    expect(correlationContext.currentIds().correlationId).toBeUndefined();
  });
});

describe("health registry", () => {
  it("aggregates to healthy, degraded, unhealthy", async () => {
    const reg = createHealthRegistry();
    reg.register({ name: "db", check: () => ({ status: HealthStatus.Healthy }) });
    expect((await reg.aggregate()).status).toBe(HealthStatus.Healthy);

    reg.register({ name: "cache", check: () => ({ status: HealthStatus.Degraded }) });
    expect((await reg.aggregate()).status).toBe(HealthStatus.Degraded);

    reg.register({
      name: "fail",
      check: () => {
        throw new Error("down");
      },
    });
    const report = await reg.aggregate();
    expect(report.status).toBe(HealthStatus.Unhealthy);
    expect(report.checks.find((c) => c.name === "fail")?.status).toBe(HealthStatus.Unhealthy);
  });
});

describe("metrics & tracer", () => {
  it("noop implementations exist and do not throw", () => {
    const m = createNoopMetrics();
    expect(() => m.increment("x", 1)).not.toThrow();
    const t = createNoopTracer();
    const span = t.startSpan("op");
    expect(() => span.end()).not.toThrow();
  });
});
