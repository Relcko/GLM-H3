import { describe, expect, it, vi } from "vitest";
import { ConsoleLogger, LogLevel, type LogSink } from "@relcko/logging";

describe("logging", () => {
  it("filters by level and threads scope/metadata", () => {
    const entries: unknown[] = [];
    const sink: LogSink = (e) => entries.push(e);
    const logger = new ConsoleLogger({ minLevel: LogLevel.Warn, sink });
    logger.info("ignored");
    logger.warn("kept", { a: 1 });
    const child = logger.child("sub", { tenant: "t1" });
    child.error("err");
    expect(entries).toHaveLength(2);
    const warnEntry = entries[0] as { message: string; metadata?: Record<string, unknown> };
    expect(warnEntry.message).toBe("kept");
    const errEntry = entries[1] as { scope?: string; metadata?: Record<string, unknown> };
    expect(errEntry.scope).toBe("sub");
    expect(errEntry.metadata?.tenant).toBe("t1");
  });

  it("does not throw on missing sink", () => {
    expect(() => new ConsoleLogger({ sink: vi.fn() }).info("x")).not.toThrow();
  });
});
