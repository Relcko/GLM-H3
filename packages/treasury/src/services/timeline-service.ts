import { generateId } from "@relcko/utils";
import type { EntityId, Json } from "@relcko/types";

export interface TimelineEvent {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: EntityId;
  readonly actorId: EntityId;
  readonly payload: Json;
  readonly timestamp: number;
}

export interface TimelineFilters {
  readonly type?: string;
  readonly aggregateId?: EntityId;
  readonly dateFrom?: number;
  readonly dateTo?: number;
}

export class TimelineService {
  private readonly events: TimelineEvent[] = [];

  recordEvent(type: string, aggregateId: EntityId, actorId: EntityId, payload: Json): TimelineEvent {
    const event: TimelineEvent = {
      id: generateId("treasury"),
      type,
      aggregateId,
      actorId,
      payload,
      timestamp: Date.now(),
    };
    this.events.push(event);
    return event;
  }

  getTimeline(filters?: TimelineFilters): TimelineEvent[] {
    let result = [...this.events];
    if (filters) {
      if (filters.type) result = result.filter(e => e.type === filters.type);
      if (filters.aggregateId) result = result.filter(e => e.aggregateId === filters.aggregateId);
      if (filters.dateFrom !== undefined) result = result.filter(e => e.timestamp >= filters.dateFrom!);
      if (filters.dateTo !== undefined) result = result.filter(e => e.timestamp <= filters.dateTo!);
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  getTimelineByAccount(accountId: EntityId): TimelineEvent[] {
    return this.events
      .filter(e => e.aggregateId === accountId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getTimelineByPeriod(start: number, end: number): TimelineEvent[] {
    return this.events
      .filter(e => e.timestamp >= start && e.timestamp <= end)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

export default TimelineService;
