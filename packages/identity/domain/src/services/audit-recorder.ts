import type { AuditCategory, AuditContext } from '../value-objects';

export interface AuditEntry {
  readonly category: AuditCategory;
  readonly action: string;
  readonly actorId: string;
  readonly targetId?: string;
  readonly context?: AuditContext;
  readonly outcome: string;
  readonly metadata?: Record<string, unknown>;
}

export interface IAuditRecorder {
  record(entry: AuditEntry): Promise<void>;
  recordMany(entries: readonly AuditEntry[]): Promise<void>;
}
