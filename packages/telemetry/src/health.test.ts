import { describe, expect, it } from 'vitest';

import { HealthAggregator } from './health';

import type { HealthCheckResult, HealthCheckable, HealthStatus } from '@relcko/shared';

const checkable = (componentName: string, status: HealthStatus): HealthCheckable => ({
  componentName,
  check: () => Promise.resolve<HealthCheckResult>({ status, component: componentName }),
});

describe('HealthAggregator', () => {
  it('check_should_report_healthy_when_all_components_are_healthy', async () => {
    const aggregator = new HealthAggregator({ version: '1.0.0', startedAt: Date.now() - 100 });
    aggregator.register(checkable('event-store', 'healthy'));
    aggregator.register(checkable('event-bus', 'healthy'));

    const report = await aggregator.check();

    expect(report.status).toBe('healthy');
    expect(report.components).toHaveLength(2);
    expect(report.version).toBe('1.0.0');
    expect(report.uptimeMs).toBeGreaterThanOrEqual(100);
    expect(report.checkedAt).toBeInstanceOf(Date);
  });

  it('check_should_report_degraded_when_any_component_is_degraded', async () => {
    const aggregator = new HealthAggregator();
    aggregator.register(checkable('a', 'healthy'));
    aggregator.register(checkable('b', 'degraded'));

    const report = await aggregator.check();

    expect(report.status).toBe('degraded');
  });

  it('check_should_report_unhealthy_when_any_component_is_unhealthy', async () => {
    const aggregator = new HealthAggregator();
    aggregator.register(checkable('a', 'degraded'));
    aggregator.register(checkable('b', 'unhealthy'));

    const report = await aggregator.check();

    expect(report.status).toBe('unhealthy');
  });

  it('check_should_report_unhealthy_when_a_component_throws', async () => {
    const aggregator = new HealthAggregator();
    aggregator.register({
      componentName: 'broken',
      check: () => Promise.reject(new Error('connection refused')),
    });

    const report = await aggregator.check();

    expect(report.status).toBe('unhealthy');
    expect(report.components[0]?.component).toBe('broken');
    expect(report.components[0]?.message).toBe('connection refused');
  });

  it('check_should_report_healthy_with_no_registered_components', async () => {
    const aggregator = new HealthAggregator();

    const report = await aggregator.check();

    expect(report.status).toBe('healthy');
    expect(report.components).toHaveLength(0);
  });
});
