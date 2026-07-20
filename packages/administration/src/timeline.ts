import type { EntityId } from "@relcko/types";
import { InMemoryAdministrationRepository } from "./repository";
import type { AdminActivityEntry } from "./types";

/** Read-only view over the administrator activity timeline (reuses the repository). */
export class AdministrationTimeline {
  constructor(private readonly repo: InMemoryAdministrationRepository) {}

  list(limit?: number): readonly AdminActivityEntry[] {
    return this.repo.listActivity(limit);
  }

  byActor(actorId: EntityId, limit?: number): readonly AdminActivityEntry[] {
    return this.repo.listActivity(limit).filter(v => v.actorId === actorId);
  }

  byCorrelation(correlationId: string): readonly AdminActivityEntry[] {
    return this.repo.listActivity().filter(v => v.correlationId === correlationId);
  }
}
