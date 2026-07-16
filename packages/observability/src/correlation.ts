import { AsyncLocalStorage } from "node:async_hooks";

export interface CorrelationState {
  readonly correlationId: string;
  readonly traceId: string;
  readonly actorId?: string;
  readonly spanId?: string;
}

const storage = new AsyncLocalStorage<CorrelationState>();

/**
 * Async context carrying correlation/trace/actor ids across awaits. Provides
 * the "correlation context" required by the observability + audit layers so
 * that logs, spans and audit entries share a request identity.
 */
export const correlationContext = {
  run<T>(state: CorrelationState, fn: () => T): T {
    return storage.run(state, fn);
  },
  get(): CorrelationState | undefined {
    return storage.getStore();
  },
  currentIds(): { correlationId?: string; traceId?: string; actorId?: string } {
    const s = storage.getStore();
    return s
      ? { correlationId: s.correlationId, traceId: s.traceId, actorId: s.actorId }
      : {};
  },
};
