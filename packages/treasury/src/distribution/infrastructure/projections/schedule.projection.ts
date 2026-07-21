import type { Projection } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";

import type { ScheduleId, ScheduleStatus, DistributionType } from "../../domain/value-objects";

export interface ScheduleProjectionRow {
  id: ScheduleId;
  distributionType: DistributionType;
  propertyId: string;
  periodStart: number;
  periodEnd: number;
  totalAmount: bigint;
  perUnitAmount: bigint | null;
  currency: string;
  status: ScheduleStatus;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export class ScheduleProjection implements Projection {
  readonly name = "schedule_projection";
  readonly handledEventTypes = [
    "treasury.distribution.schedule.created",
    "treasury.distribution.schedule.activated",
    "treasury.distribution.schedule.closed",
  ];

  private readonly rows = new Map<string, ScheduleProjectionRow>();

  async handle(envelope: EventEnvelope): Promise<void> {
    const id = envelope.metadata.aggregateId as unknown as ScheduleId;
    const existing = this.rows.get(String(id));

    switch (envelope.metadata.eventType) {
      case "treasury.distribution.schedule.created": {
        const p = envelope.payload as Record<string, unknown>;
        this.rows.set(String(id), {
          id,
          distributionType: p.distributionType as DistributionType,
          propertyId: p.propertyId as string,
          periodStart: p.periodStart as number,
          periodEnd: p.periodEnd as number,
          totalAmount: p.totalAmount as bigint,
          perUnitAmount: (p.perUnitAmount as bigint) ?? null,
          currency: p.currency as string,
          status: "draft" as ScheduleStatus,
          createdAt: envelope.metadata.timestamp,
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
      case "treasury.distribution.schedule.activated": {
        if (!existing) break;
        this.rows.set(String(id), {
          ...existing,
          status: "executing" as ScheduleStatus,
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
      case "treasury.distribution.schedule.closed": {
        if (!existing) break;
        const p = envelope.payload as Record<string, unknown>;
        const isCompleted = existing.status === "executing" as ScheduleStatus;
        this.rows.set(String(id), {
          ...existing,
          status: isCompleted ? ("completed" as ScheduleStatus) : ("cancelled" as ScheduleStatus),
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
    }
  }

  async reset(): Promise<void> {
    this.rows.clear();
  }

  findById(id: ScheduleId): ScheduleProjectionRow | null {
    return this.rows.get(String(id)) ?? null;
  }

  findByPropertyId(propertyId: string): ScheduleProjectionRow[] {
    return Array.from(this.rows.values()).filter((r) => r.propertyId === propertyId);
  }

  findByStatus(status: ScheduleStatus): ScheduleProjectionRow[] {
    return Array.from(this.rows.values()).filter((r) => r.status === status);
  }

  findAll(): ScheduleProjectionRow[] {
    return Array.from(this.rows.values());
  }
}
