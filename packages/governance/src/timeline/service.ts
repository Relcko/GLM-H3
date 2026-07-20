import type { EntityId, Timestamp } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { TimelineEntry } from "../types";

export class GovernanceTimeline {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  addEntry(
    actorId: EntityId,
    proposalId: EntityId,
    eventType: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): TimelineEntry {
    const entry: TimelineEntry = {
      id: generateId("govtimeline") as EntityId,
      proposalId,
      eventType,
      description,
      actorId,
      metadata: metadata ?? {},
      occurredAt: new Date().toISOString() as Timestamp,
    };

    this.repository.saveTimelineEntry(entry);

    this.logger?.info("timeline entry added", { proposalId, eventType });

    return entry;
  }

  listByProposal(proposalId: EntityId): TimelineEntry[] {
    return this.repository.listTimelineByProposal(proposalId);
  }

  listAll(): TimelineEntry[] {
    return this.repository.listAllTimeline();
  }

  listByDateRange(from: Timestamp, to: Timestamp): TimelineEntry[] {
    return this.repository.listAllTimeline().filter(e => e.occurredAt >= from && e.occurredAt <= to);
  }
}
