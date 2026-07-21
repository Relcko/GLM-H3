import type { Projection } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";

import type {
  DistributionId,
  SagaId,
  ScheduleId,
  DistributionStatus,
  DistributionType,
  AllocationMethod,
  FinalTotals,
} from "../../domain/value-objects";

export interface DistributionProjectionRow {
  id: DistributionId;
  distributionType: DistributionType;
  status: DistributionStatus;
  sourceAccountId: string;
  totalAmount: bigint;
  currency: string;
  perUnitAmount: bigint | null;
  recipientCount: number;
  materializationManifestHash: string | null;
  sagaId: SagaId | null;
  finalTotals: FinalTotals | null;
  scheduleId: ScheduleId | null;
  snapshotId: string | null;
  allocationMethod: AllocationMethod;
  proposalRef: { readonly proposalId: string; readonly proposalType: string } | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export class DistributionProjection implements Projection {
  readonly name = "distribution_projection";
  readonly handledEventTypes = [
    "treasury.distribution.created",
    "treasury.distribution.approved",
    "treasury.distribution.recipients_materialized",
    "treasury.distribution.execution_started",
    "treasury.distribution.execution_finalized",
    "treasury.distribution.cancelled",
    "treasury.distribution.reconciled",
  ];

  private readonly rows = new Map<string, DistributionProjectionRow>();

  async handle(envelope: EventEnvelope): Promise<void> {
    const id = envelope.metadata.aggregateId as unknown as DistributionId;
    const existing = this.rows.get(String(id));

    switch (envelope.metadata.eventType) {
      case "treasury.distribution.created": {
        const p = envelope.payload as Record<string, unknown>;
        this.rows.set(String(id), {
          id,
          distributionType: p.distributionType as DistributionType,
          status: "draft" as DistributionStatus,
          sourceAccountId: p.sourceAccountId as string,
          totalAmount: p.totalAmount as bigint,
          currency: p.currency as string,
          perUnitAmount: (p.perUnitAmount as bigint) ?? null,
          recipientCount: 0,
          materializationManifestHash: null,
          sagaId: null,
          finalTotals: null,
          scheduleId: (p.scheduleId as ScheduleId) ?? null,
          snapshotId: (p.snapshotId as string) ?? null,
          allocationMethod: p.allocationMethod as AllocationMethod,
          proposalRef: (p.proposalRef as DistributionProjectionRow["proposalRef"]) ?? null,
          createdAt: envelope.metadata.timestamp,
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
      case "treasury.distribution.approved": {
        this.updateRow(id, { status: "approved" as DistributionStatus }, envelope);
        break;
      }
      case "treasury.distribution.recipients_materialized": {
        const p = envelope.payload as Record<string, unknown>;
        this.updateRow(id, {
          status: "recipients_materialized" as DistributionStatus,
          recipientCount: p.recipientCount as number,
          materializationManifestHash: p.manifestHash as string,
        }, envelope);
        break;
      }
      case "treasury.distribution.execution_started": {
        const p = envelope.payload as Record<string, unknown>;
        this.updateRow(id, {
          status: "executing" as DistributionStatus,
          sagaId: p.sagaId as SagaId,
        }, envelope);
        break;
      }
      case "treasury.distribution.execution_finalized": {
        const p = envelope.payload as Record<string, unknown>;
        this.updateRow(id, {
          status: p.finalStatus === "Completed" ? ("completed" as DistributionStatus) : ("failed" as DistributionStatus),
          finalTotals: p.finalTotals as FinalTotals,
        }, envelope);
        break;
      }
      case "treasury.distribution.cancelled": {
        this.updateRow(id, { status: "cancelled" as DistributionStatus }, envelope);
        break;
      }
      case "treasury.distribution.reconciled": {
        break;
      }
    }
  }

  async reset(): Promise<void> {
    this.rows.clear();
  }

  findById(id: DistributionId): DistributionProjectionRow | null {
    return this.rows.get(String(id)) ?? null;
  }

  findMany(): DistributionProjectionRow[] {
    return Array.from(this.rows.values());
  }

  private updateRow(
    id: DistributionId,
    partial: Partial<DistributionProjectionRow>,
    envelope: EventEnvelope,
  ): void {
    const key = String(id);
    const existing = this.rows.get(key);
    if (!existing) return;
    this.rows.set(key, {
      ...existing,
      ...partial,
      updatedAt: envelope.metadata.timestamp,
      version: envelope.metadata.aggregateVersion,
    });
  }
}
