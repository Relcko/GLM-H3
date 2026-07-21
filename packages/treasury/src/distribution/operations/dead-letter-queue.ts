import type { IClock } from "../infrastructure/services/clock";

export interface DeadLetterEntry {
  readonly id: string;
  readonly eventType: string;
  readonly eventId: string;
  readonly aggregateId: string;
  readonly payload: unknown;
  readonly failureReason: string;
  readonly failedAt: number;
  readonly retryCount: number;
  readonly lastRetryAt: number | null;
  readonly poison: boolean;
  readonly poisonDetectedAt: number | null;
  readonly projectionName: string;
  readonly metadata: Record<string, unknown>;
}

export interface DeadLetterInsertRequest {
  readonly eventType: string;
  readonly eventId: string;
  readonly aggregateId: string;
  readonly payload: unknown;
  readonly failureReason: string;
  readonly projectionName: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ReplayDeadLetterResult {
  readonly success: boolean;
  readonly error: string | null;
  readonly entryId: string;
}

const POISON_THRESHOLD = 3;

export class DeadLetterQueue {
  private readonly _entries = new Map<string, DeadLetterEntry>();
  private readonly _replayHistory: { entryId: string; timestamp: number; success: boolean }[] = [];

  constructor(private readonly clock: IClock) {}

  get entryCount(): number {
    return this._entries.size;
  }

  get poisonEntryCount(): number {
    let count = 0;
    for (const entry of this._entries.values()) {
      if (entry.poison) count += 1;
    }
    return count;
  }

  get replayHistory(): readonly { entryId: string; timestamp: number; success: boolean }[] {
    return [...this._replayHistory];
  }

  insert(request: DeadLetterInsertRequest): DeadLetterEntry {
    const id = this.generateId(request.eventId, request.projectionName);
    const existing = this._entries.get(id);

    if (existing) {
      const updated: DeadLetterEntry = {
        ...existing,
        retryCount: existing.retryCount + 1,
        lastRetryAt: this.clock.nowMs(),
        failureReason: request.failureReason,
        poison: existing.retryCount + 1 >= POISON_THRESHOLD,
        poisonDetectedAt:
          existing.retryCount + 1 >= POISON_THRESHOLD
            ? this.clock.nowMs()
            : existing.poisonDetectedAt,
        payload: request.payload,
        metadata: { ...existing.metadata, ...request.metadata },
      };
      this._entries.set(id, updated);
      return updated;
    }

    const entry: DeadLetterEntry = {
      id,
      eventType: request.eventType,
      eventId: request.eventId,
      aggregateId: request.aggregateId,
      payload: request.payload,
      failureReason: request.failureReason,
      failedAt: this.clock.nowMs(),
      retryCount: 0,
      lastRetryAt: null,
      poison: false,
      poisonDetectedAt: null,
      projectionName: request.projectionName,
      metadata: request.metadata ?? {},
    };

    this._entries.set(id, entry);
    return entry;
  }

  getEntry(id: string): DeadLetterEntry | null {
    return this._entries.get(id) ?? null;
  }

  getAllEntries(): readonly DeadLetterEntry[] {
    return Array.from(this._entries.values()).sort(
      (a, b) => a.failedAt - b.failedAt,
    );
  }

  getEntriesByProjection(projectionName: string): readonly DeadLetterEntry[] {
    return this.getAllEntries().filter((e) => e.projectionName === projectionName);
  }

  getPoisonEntries(): readonly DeadLetterEntry[] {
    return this.getAllEntries().filter((e) => e.poison);
  }

  getEntriesByEventType(eventType: string): readonly DeadLetterEntry[] {
    return this.getAllEntries().filter((e) => e.eventType === eventType);
  }

  detectPoisonEvents(): readonly DeadLetterEntry[] {
    const now = this.clock.nowMs();
    const detected: DeadLetterEntry[] = [];
    for (const entry of this._entries.values()) {
      if (!entry.poison && entry.retryCount + 1 >= POISON_THRESHOLD) {
        const updated: DeadLetterEntry = {
          ...entry,
          poison: true,
          poisonDetectedAt: now,
        };
        this._entries.set(entry.id, updated);
        detected.push(updated);
      }
    }
    return detected;
  }

  markForReplay(entryId: string): boolean {
    const entry = this._entries.get(entryId);
    if (!entry) return false;
    this._entries.set(entryId, {
      ...entry,
      retryCount: 0,
      lastRetryAt: null,
    });
    return true;
  }

  removeEntry(entryId: string): boolean {
    return this._entries.delete(entryId);
  }

  clear(): void {
    this._entries.clear();
    this._replayHistory.length = 0;
  }

  private generateId(eventId: string, projectionName: string): string {
    return `${projectionName}::${eventId}`;
  }
}
