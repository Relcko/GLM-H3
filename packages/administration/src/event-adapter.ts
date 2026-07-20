import type { EventBus, EventHandler } from "@relcko/events";
import type { RelckoEventEnvelope } from "@relcko/events";
import { AdminActivityEntry, type AdminArea } from "./types";
import { InMemoryAdministrationRepository, newEntityId } from "./repository";

/**
 * Subscribes to the canonical Event Bus and mirrors cross-domain events into the
 * administrator activity timeline. This is the primary integration point with
 * Identity, Treasury, Governance, Marketplace, Portfolio, AI, Network Engine and
 * every other domain: the administration platform observes their events without
 * owning or mutating their state.
 */
export class AdministrationEventAdapter {
  private unsubscribe?: () => void;
  constructor(private readonly events: EventBus, private readonly repo: InMemoryAdministrationRepository) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.events.subscribeAll((envelope) => this.observe(envelope));
  }

  stop(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }

  private observe(envelope: RelckoEventEnvelope): void {
    if (envelope.source === "relcko.administration") return;
    const area = areaFromSource(envelope.source);
    const entry: AdminActivityEntry = {
      id: newEntityId("act"),
      action: envelope.type as AdminActivityEntry["action"],
      actorId: envelope.actorId,
      message: `observed ${envelope.type} from ${envelope.source ?? "unknown"}`,
      correlationId: envelope.correlationId,
      traceId: envelope.traceId,
      occurredAt: envelope.occurredAt,
    };
    void area;
    this.repo.saveActivity(entry);
  }
}

function areaFromSource(source?: string): AdminArea | undefined {
  if (!source) return undefined;
  if (source.includes("identity")) return "user";
  if (source.includes("treasury")) return "treasury";
  if (source.includes("governance")) return "governance";
  if (source.includes("marketplace")) return "marketplace";
  if (source.includes("portfolio")) return "portfolio";
  if (source.includes("ai")) return "ai";
  if (source.includes("network")) return "investment";
  return undefined;
}

export type { EventHandler };
