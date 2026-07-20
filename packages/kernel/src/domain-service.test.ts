import { NoOpLogger } from '@relcko/logger';
import { describe, expect, it } from 'vitest';


import { DomainService } from './domain-service';

import type { Clock } from './clock';
import type { Logger } from '@relcko/logger';

class RecordingLogger implements Logger {
  readonly childScopes: string[] = [];

  debug(_message: string, _context?: Record<string, unknown>): void {}
  info(_message: string, _context?: Record<string, unknown>): void {}
  warn(_message: string, _context?: Record<string, unknown>): void {}
  error(_message: string, _error?: Error, _context?: Record<string, unknown>): void {}

  child(service: string): Logger {
    this.childScopes.push(service);
    return this;
  }
}

class FixedTestClock implements Clock {
  private readonly fixed = new Date('2026-07-19T00:00:00.000Z');

  now(): Date {
    return this.fixed;
  }

  nowMs(): number {
    return this.fixed.getTime();
  }
}

class PricingDomainService extends DomainService {
  currentYear(): number {
    return this.clock.now().getUTCFullYear();
  }
}

describe('DomainService', () => {
  it('should_scope_the_logger_to_the_concrete_service_name', () => {
    const logger = new RecordingLogger();
    new PricingDomainService({ logger, clock: new FixedTestClock() });

    expect(logger.childScopes).toEqual(['PricingDomainService']);
  });

  it('should_expose_the_injected_clock', () => {
    const service = new PricingDomainService({
      logger: new NoOpLogger(),
      clock: new FixedTestClock(),
    });

    expect(service.currentYear()).toBe(2026);
  });
});
