import { generateId } from "@relcko/utils";
import type { EntityId, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { MemoryEntry, MemoryScope } from "../types";
import { MemoryError } from "../errors";
import { AiEventType, publishAiEvent } from "../events";
import type { AiMemoryRepository } from "../repository";
import { SYSTEM_ACTOR_ID } from "../system-actor";

export class MemoryService {
  constructor(
    private readonly repository: AiMemoryRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async store(
    actorId: EntityId,
    params: {
      scope: MemoryScope;
      scopeId: EntityId;
      key: string;
      value: unknown;
      priority?: number;
      retention?: "volatile" | "persistent" | "critical";
      ttlMs?: number;
    },
  ): Promise<MemoryEntry> {
    const now = new Date().toISOString();
    const expiresAt = params.ttlMs ? new Date(Date.now() + params.ttlMs).toISOString() : undefined;

    const existing = this.repository.getMemoryByKey(params.scope, params.scopeId, params.key);
    if (existing && params.retention !== "critical") {
      const updated: MemoryEntry = {
        ...existing,
        value: params.value,
        priority: params.priority ?? existing.priority,
        retention: params.retention ?? existing.retention,
        expiresAt: expiresAt ?? existing.expiresAt,
        updatedAt: now,
      };
      this.repository.saveMemory(updated);
      return updated;
    }

    const entry: MemoryEntry = {
      id: existing?.id ?? (generateId() as EntityId),
      scope: params.scope,
      scopeId: params.scopeId,
      key: params.key,
      value: params.value,
      priority: params.priority ?? 0,
      retention: params.retention ?? "volatile",
      expiresAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.repository.saveMemory(entry);

    await publishAiEvent(this.events, AiEventType.MemoryStored, entry.id, actorId, {
      memoryId: entry.id,
      scope: params.scope,
      scopeId: params.scopeId,
      key: params.key,
      retention: entry.retention,
    });

    this.logger?.info("memory stored", { scope: params.scope, key: params.key });
    return entry;
  }

  get(id: EntityId): MemoryEntry | undefined {
    return this.repository.getMemory(id);
  }

  getByKey(scope: MemoryScope, scopeId: EntityId, key: string): MemoryEntry | undefined {
    return this.repository.getMemoryByKey(scope, scopeId, key);
  }

  search(params: {
    scope?: MemoryScope;
    scopeId?: EntityId;
    keys?: readonly string[];
    minPriority?: number;
  }): MemoryEntry[] {
    return this.repository.searchMemory(params);
  }

  async erase(actorId: EntityId, id: EntityId): Promise<void> {
    const entry = this.repository.getMemory(id);
    if (!entry) throw new MemoryError(`Memory entry ${id} not found`);

    this.repository.deleteMemory(id);

    await publishAiEvent(this.events, AiEventType.MemoryErased, id, actorId, {
      memoryId: id,
      scope: entry.scope,
      scopeId: entry.scopeId,
    });

    this.logger?.info("memory erased", { id, scope: entry.scope });
  }

  eraseByScope(scope: MemoryScope, scopeId: EntityId): void {
    this.repository.deleteMemoryByScope(scope, scopeId);
  }

  async pruneExpired(): Promise<number> {
    const now = Date.now();
    const all = this.repository.searchMemory({});
    let count = 0;
    for (const entry of all) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now) {
        this.repository.deleteMemory(entry.id);
        try {
          await publishAiEvent(this.events, AiEventType.MemoryExpired, entry.id, SYSTEM_ACTOR_ID, {
            memoryId: entry.id,
            scope: entry.scope,
            key: entry.key,
          });
        } catch (error) {
          this.logger?.warn("failed to publish memory expired event", { id: entry.id, error: String(error) });
        }
        count++;
      }
    }
    return count;
  }
}
