import type { EntityId, Timestamp } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { GovernanceActivityEntry } from "../types";

export class GovernanceActivity {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  recordActivity(
    actorId: EntityId,
    activityType: string,
    description: string,
    proposalId?: EntityId,
    metadata?: Record<string, unknown>,
  ): GovernanceActivityEntry {
    const entry: GovernanceActivityEntry = {
      id: generateId("govactivity") as EntityId,
      actorId,
      activityType,
      proposalId,
      description,
      metadata: metadata ?? {},
      occurredAt: new Date().toISOString() as Timestamp,
    };

    this.repository.saveActivityEntry(entry);

    this.logger?.info("activity recorded", { actorId, activityType });

    return entry;
  }

  listByActor(actorId: EntityId): GovernanceActivityEntry[] {
    return this.repository.listActivityByActor(actorId);
  }

  listAll(): GovernanceActivityEntry[] {
    return this.repository.listAllActivity();
  }

  listByDateRange(from: Timestamp, to: Timestamp): GovernanceActivityEntry[] {
    return this.repository.listAllActivity().filter(a => a.occurredAt >= from && a.occurredAt <= to);
  }
}
