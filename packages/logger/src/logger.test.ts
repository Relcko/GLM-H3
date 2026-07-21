import { describe, expect, it } from 'vitest';

import { ConsoleLogger, NoOpLogger } from './index';

describe('ConsoleLogger', () => {
  it('creates with default service name', () => {
    const logger = new ConsoleLogger();
    expect(logger).toBeDefined();
  });

  it('supports child loggers', () => {
    const logger = new ConsoleLogger();
    const child = logger.child('test-service');
    expect(child).toBeDefined();
  });
});

describe('NoOpLogger', () => {
  it('does not throw on any method', () => {
    const logger = new NoOpLogger();
    expect(() => {
      logger.debug('test');
      logger.info('test');
      logger.warn('test');
      logger.error('test');
      logger.child('svc');
    }).not.toThrow();
  });
});
