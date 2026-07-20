import type { MessageContext, PipelineBehavior } from '../pipeline';
import type { Counter, Histogram, MetricsProvider } from '@relcko/telemetry';

/** Metric names emitted by {@link MetricsBehavior}. */
export const CQRS_MESSAGES_TOTAL = 'cqrs_messages_total';
/** Metric name for per-message latency in milliseconds. */
export const CQRS_MESSAGE_DURATION_MS = 'cqrs_message_duration_ms';

/**
 * Pipeline behavior exporting throughput and latency metrics per message
 * kind and type (Playbook 6.2 - observability).
 */
export class MetricsBehavior implements PipelineBehavior {
  private readonly total: Counter;
  private readonly duration: Histogram;

  /**
   * @param metrics - metrics provider to register series with
   */
  constructor(metrics: MetricsProvider) {
    this.total = metrics.counter(CQRS_MESSAGES_TOTAL, 'CQRS messages processed');
    this.duration = metrics.histogram(CQRS_MESSAGE_DURATION_MS, {
      description: 'CQRS message latency',
    });
  }

  async handle<TResult>(
    _message: unknown,
    context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    const start = performance.now();
    const labels = { kind: context.kind, type: context.messageType };
    try {
      const result = await next();
      this.total.inc(1, { ...labels, result: 'success' });
      return result;
    } catch (error) {
      this.total.inc(1, { ...labels, result: 'error' });
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      this.duration.observe(performance.now() - start, labels);
    }
  }
}
