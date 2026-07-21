import type { Projection } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";

import type { DistributionId, RecipientStatus } from "../../domain/value-objects";

export interface ProgressProjectionRow {
  distributionId: DistributionId;
  totalRecipients: number;
  paidCount: number;
  failedCount: number;
  recoveredCount: number;
  pendingCount: number;
  percentage: number;
}

export class ProgressProjection implements Projection {
  readonly name = "progress_projection";
  readonly handledEventTypes = [
    "treasury.recipient.materialized",
    "treasury.recipient.paid",
    "treasury.recipient.failed",
    "treasury.recipient.recovered",
  ];

  private readonly rows = new Map<string, ProgressProjectionRow>();
  private readonly recipientStatuses = new Map<string, Map<string, RecipientStatus>>();

  async handle(envelope: EventEnvelope): Promise<void> {
    const p = envelope.payload as Record<string, unknown>;
    const distributionId = p.distributionId as DistributionId;
    const recipientId = envelope.metadata.aggregateId;
    const distKey = String(distributionId);

    if (!this.recipientStatuses.has(distKey)) {
      this.recipientStatuses.set(distKey, new Map());
    }
    const statusMap = this.recipientStatuses.get(distKey)!;

    switch (envelope.metadata.eventType) {
      case "treasury.recipient.materialized": {
        statusMap.set(recipientId, "pending" as RecipientStatus);
        break;
      }
      case "treasury.recipient.paid": {
        statusMap.set(recipientId, "paid" as RecipientStatus);
        break;
      }
      case "treasury.recipient.failed": {
        statusMap.set(recipientId, "failed" as RecipientStatus);
        break;
      }
      case "treasury.recipient.recovered": {
        statusMap.set(recipientId, "recovered" as RecipientStatus);
        break;
      }
    }

    this.recompute(distKey, distributionId);
  }

  async reset(): Promise<void> {
    this.rows.clear();
    this.recipientStatuses.clear();
  }

  findByDistributionId(distributionId: DistributionId): ProgressProjectionRow | null {
    return this.rows.get(String(distributionId)) ?? null;
  }

  private recompute(distKey: string, distributionId: DistributionId): void {
    const statusMap = this.recipientStatuses.get(distKey);
    if (!statusMap || statusMap.size === 0) return;

    let totalRecipients = 0;
    let paidCount = 0;
    let failedCount = 0;
    let recoveredCount = 0;

    for (const status of statusMap.values()) {
      totalRecipients += 1;
      if (status === "paid" as RecipientStatus) paidCount += 1;
      else if (status === "failed" as RecipientStatus) failedCount += 1;
      else if (status === "recovered" as RecipientStatus) recoveredCount += 1;
    }

    const pendingCount = totalRecipients - paidCount - failedCount - recoveredCount;
    const percentage = totalRecipients > 0
      ? ((paidCount + recoveredCount) / totalRecipients) * 100
      : 0;

    this.rows.set(distKey, {
      distributionId,
      totalRecipients,
      paidCount,
      failedCount,
      recoveredCount,
      pendingCount,
      percentage,
    });
  }
}
