import type { AuditLog, AuditAction, EntityType } from "@relcko/domain-core";
import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";

export type { AuditLog, AuditAction, EntityType };

export interface AuditFilter {
  readonly actorId?: EntityId;
  readonly entityType?: EntityType;
  readonly entityId?: EntityId;
  readonly action?: AuditAction;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
}

export interface AuditWriter {
  write(entry: AuditLog): Promise<void>;
  writeMany(entries: readonly AuditLog[]): Promise<void>;
}

export interface AuditReader {
  getById(id: EntityId): Promise<AuditLog | undefined>;
  query(filter: AuditFilter): Promise<ReadonlyArray<AuditLog>>;
}

export interface AuditStore extends AuditWriter, AuditReader {}

/** In-memory audit store (framework + tests). Production uses an append-only, immutable backend. */
export class InMemoryAuditStore implements AuditStore {
  private readonly entries = new Map<string, AuditLog>();

  async write(entry: AuditLog): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async writeMany(entries: readonly AuditLog[]): Promise<void> {
    for (const e of entries) this.entries.set(e.id, e);
  }

  async getById(id: EntityId): Promise<AuditLog | undefined> {
    return this.entries.get(id);
  }

  async query(filter: AuditFilter): Promise<ReadonlyArray<AuditLog>> {
    let result = [...this.entries.values()];
    if (filter.actorId) result = result.filter((e) => e.actorId === filter.actorId);
    if (filter.entityType) result = result.filter((e) => e.entityType === filter.entityType);
    if (filter.entityId) result = result.filter((e) => e.entityId === filter.entityId);
    if (filter.action) result = result.filter((e) => e.action === filter.action);
    if (filter.from) result = result.filter((e) => e.timestamp >= filter.from!);
    if (filter.to) result = result.filter((e) => e.timestamp <= filter.to!);
    result.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return filter.limit ? result.slice(0, filter.limit) : result;
  }
}

/** PII minimization: strip sensitive fields before exposing an audit entry. */
export function redactAudit(entry: AuditLog, sensitiveKeys: readonly string[]): AuditLog {
  const strip = (obj?: Record<string, unknown>) =>
    obj
      ? Object.fromEntries(Object.entries(obj).filter(([k]) => !sensitiveKeys.includes(k)))
      : undefined;
  return { ...entry, before: strip(entry.before), after: strip(entry.after) };
}

export function createInMemoryAuditStore(): AuditStore {
  return new InMemoryAuditStore();
}

export { generateId };
