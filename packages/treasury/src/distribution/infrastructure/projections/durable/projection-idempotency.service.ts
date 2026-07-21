import type { EventEnvelope } from "@relcko/events";

export interface IdempotencyCheckResult {
  readonly isDuplicate: boolean;
  readonly isStaleVersion: boolean;
  readonly isOutOfOrder: boolean;
  readonly canProcess: boolean;
  readonly reason: string | null;
}

export class ProjectionIdempotencyService {
  private readonly processedEvents = new Set<string>();
  private readonly aggregateVersions = new Map<string, number>();
  private readonly eventOrder = new Map<string, number>();

  isDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  markProcessed(eventId: string): void {
    this.processedEvents.add(eventId);
  }

  validateVersion(aggregateId: string, aggregateVersion: number): boolean {
    const latest = this.aggregateVersions.get(aggregateId);
    if (latest === undefined) return true;
    return aggregateVersion > latest;
  }

  updateVersion(aggregateId: string, aggregateVersion: number): void {
    this.aggregateVersions.set(aggregateId, aggregateVersion);
  }

  detectOutOfOrder(aggregateId: string, aggregateVersion: number): boolean {
    const latest = this.aggregateVersions.get(aggregateId);
    if (latest === undefined) return false;
    return aggregateVersion <= latest;
  }

  checkEvent(envelope: EventEnvelope): IdempotencyCheckResult {
    const eventId = envelope.metadata.eventId;
    const aggregateId = envelope.metadata.aggregateId;
    const aggregateVersion = envelope.metadata.aggregateVersion;
    const eventGlobalOrder = envelope.metadata.timestamp;

    const reasons: string[] = [];

    const dup = this.isDuplicate(eventId);
    if (dup) {
      reasons.push(`Duplicate event ${eventId}`);
    }

    const stale = !this.validateVersion(aggregateId, aggregateVersion);
    if (stale) {
      reasons.push(`Stale version for ${aggregateId}: event version ${aggregateVersion} <= latest ${this.aggregateVersions.get(aggregateId)}`);
    }

    const ooo = this.detectOutOfOrder(aggregateId, aggregateVersion);
    if (ooo) {
      reasons.push(`Out-of-order event for ${aggregateId}: version ${aggregateVersion} not after latest ${this.aggregateVersions.get(aggregateId)}`);
    }

    return {
      isDuplicate: dup,
      isStaleVersion: stale,
      isOutOfOrder: ooo,
      canProcess: !dup && !stale && !ooo,
      reason: reasons.length > 0 ? reasons.join("; ") : null,
    };
  }

  recordProcessed(envelope: EventEnvelope): void {
    const eventId = envelope.metadata.eventId;
    const aggregateId = envelope.metadata.aggregateId;
    const aggregateVersion = envelope.metadata.aggregateVersion;

    this.processedEvents.add(eventId);

    const latest = this.aggregateVersions.get(aggregateId) ?? 0;
    if (aggregateVersion > latest) {
      this.aggregateVersions.set(aggregateId, aggregateVersion);
    }

    this.eventOrder.set(eventId, aggregateVersion);
  }

  getLatestVersion(aggregateId: string): number {
    return this.aggregateVersions.get(aggregateId) ?? 0;
  }

  getProcessedCount(): number {
    return this.processedEvents.size;
  }

  clear(): void {
    this.processedEvents.clear();
    this.aggregateVersions.clear();
    this.eventOrder.clear();
  }
}
