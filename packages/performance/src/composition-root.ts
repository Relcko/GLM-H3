import type { EventBus } from "@relcko/events";
import { createEventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceService } from "./service";

export interface PerformanceModuleOptions {
  readonly events?: EventBus;
  readonly repository?: InMemoryPerformanceRepository;
  readonly concurrencyLimit?: number;
  readonly cacheOptions?: ConstructorParameters<typeof import("./caching").CachingEngine>[2];
  readonly rateLimitOptions?: ConstructorParameters<typeof import("./ratelimit").RateLimitingFramework>[2];
  readonly logger?: Logger;
  readonly autoStart?: boolean;
}

export class PerformanceModuleContext {
  constructor(
    public readonly repository: InMemoryPerformanceRepository,
    public readonly events: EventBus,
    public readonly performance: PerformanceService,
  ) {}
}

export function createPerformanceModule(options: PerformanceModuleOptions = {}): PerformanceModuleContext {
  const repository = options.repository ?? new InMemoryPerformanceRepository();
  const events = options.events ?? createEventBus();
  const performance = new PerformanceService(
    repository, events,
    options.concurrencyLimit ?? 16,
    options.cacheOptions, options.rateLimitOptions,
  );
  if (options.autoStart !== false) performance.start();
  return new PerformanceModuleContext(repository, events, performance);
}
