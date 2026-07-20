import type { EventBus, EventHandler, RelckoEventEnvelope } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { EntityId } from "@relcko/types";
import type { ExecutionOrchestrator } from "../execution/service";
import type { PerformanceModuleContext } from "@relcko/performance";
import { PerformanceEventType, publishPerformanceEvent } from "@relcko/performance";

export class GovernanceEventAdapter {
  private readonly unsubscribers: (() => void)[] = [];

  constructor(
    private readonly events: EventBus,
    private readonly logger?: Logger,
    private readonly executionOrchestrator?: ExecutionOrchestrator,
    private readonly performance?: PerformanceModuleContext,
  ) {}

  subscribeToExternalEvents(): (() => void)[] {
    const handler: EventHandler = (envelope: RelckoEventEnvelope) => {
      this.handleExternalEvent(envelope);
    };

    this.unsubscribers.push(this.events.subscribe("portfolio.holding_added", handler));
    this.unsubscribers.push(this.events.subscribe("network.agent_activated", handler));
    this.unsubscribers.push(this.events.subscribe("property.published", handler));

    return this.unsubscribers;
  }

  subscribeToInternalEvents(): (() => void)[] {
    const unsub = this.events.subscribe("governance.proposal_succeeded", async (envelope: RelckoEventEnvelope) => {
      if (this.executionOrchestrator) {
        this.logger?.info("auto-queuing execution for succeeded proposal", {
          proposalId: envelope.aggregateId,
        });
        // Must propagate business-processing failures so the Event Bus
        // can retry and, if exhausted, route to the dead-letter queue.
        await this.executionOrchestrator.queueExecution(envelope.actorId, envelope.aggregateId);
      }
    });
    return [unsub];
  }

  unsubscribeAll(): void {
    for (const fn of this.unsubscribers) {
      fn();
    }
    this.unsubscribers.length = 0;
  }

  handleExternalEvent(envelope: RelckoEventEnvelope): void {
    this.logger?.info("external event received", {
      type: envelope.type,
      source: envelope.source,
      aggregateId: envelope.aggregateId,
    });
    this.recordMetric(envelope.type);
  }

  private recordMetric(source: string): void {
    if (!this.performance) return;
    try {
      this.performance.performance.analytics.recordMetric("governance.external_event", 1, "event", "event_throughput");
      void publishPerformanceEvent(this.events, PerformanceEventType.MetricRecorded, {
        name: "governance.external_event", value: 1, unit: "event", source,
      });
    } catch {
      // Telemetry must never break the integration path.
    }
  }
}