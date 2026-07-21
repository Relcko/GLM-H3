import type { Projection } from "@relcko/projections";
import type { EventEnvelope } from "@relcko/events";

import type { DistributionId, RecipientId, RecipientStatus } from "../../domain/value-objects";

export interface RecipientProjectionRow {
  id: RecipientId;
  distributionId: DistributionId;
  investorId: string;
  eligibleAmount: bigint;
  currency: string;
  status: RecipientStatus;
  paidAmount: bigint;
  settlementRef: string | null;
  txHash: string | null;
  failureReason: string | null;
  failureCode: string | null;
  recoveryAttempts: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export class RecipientProjection implements Projection {
  readonly name = "recipient_projection";
  readonly handledEventTypes = [
    "treasury.recipient.materialized",
    "treasury.recipient.paid",
    "treasury.recipient.failed",
    "treasury.recipient.recovered",
  ];

  private readonly rows = new Map<string, RecipientProjectionRow>();

  async handle(envelope: EventEnvelope): Promise<void> {
    const id = envelope.metadata.aggregateId as unknown as RecipientId;
    const existing = this.rows.get(String(id));

    switch (envelope.metadata.eventType) {
      case "treasury.recipient.materialized": {
        const p = envelope.payload as Record<string, unknown>;
        this.rows.set(String(id), {
          id,
          distributionId: p.distributionId as DistributionId,
          investorId: p.investorId as string,
          eligibleAmount: p.eligibleAmount as bigint,
          currency: p.currency as string,
          status: "pending" as RecipientStatus,
          paidAmount: 0n,
          settlementRef: null,
          txHash: null,
          failureReason: null,
          failureCode: null,
          recoveryAttempts: 0,
          version: envelope.metadata.aggregateVersion,
          createdAt: envelope.metadata.timestamp,
          updatedAt: envelope.metadata.timestamp,
        });
        break;
      }
      case "treasury.recipient.paid": {
        const p = envelope.payload as Record<string, unknown>;
        if (!existing) break;
        this.rows.set(String(id), {
          ...existing,
          status: "paid" as RecipientStatus,
          paidAmount: p.amount as bigint,
          settlementRef: p.settlementRef as string,
          txHash: (p.txHash as string) ?? null,
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
      case "treasury.recipient.failed": {
        const p = envelope.payload as Record<string, unknown>;
        if (!existing) break;
        this.rows.set(String(id), {
          ...existing,
          status: "failed" as RecipientStatus,
          failureReason: p.reason as string,
          failureCode: p.errorCode as string,
          recoveryAttempts: existing.status === "failed" as RecipientStatus
            ? existing.recoveryAttempts + 1
            : existing.recoveryAttempts,
          updatedAt: envelope.metadata.timestamp,
          version: envelope.metadata.aggregateVersion,
        });
        break;
      }
      case "treasury.recipient.recovered": {
        const p = envelope.payload as Record<string, unknown>;
        if (!existing) break;
        this.rows.set(String(id), {
          ...existing,
          status: "recovered" as RecipientStatus,
          settlementRef: p.settlementRef as string,
          recoveryAttempts: existing.recoveryAttempts + 1,
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

  findById(id: RecipientId): RecipientProjectionRow | null {
    return this.rows.get(String(id)) ?? null;
  }

  findByDistributionId(distributionId: DistributionId): RecipientProjectionRow[] {
    return Array.from(this.rows.values()).filter(
      (r) => String(r.distributionId) === String(distributionId),
    );
  }

  findByInvestorId(investorId: string): RecipientProjectionRow[] {
    return Array.from(this.rows.values()).filter((r) => r.investorId === investorId);
  }

  findAll(): RecipientProjectionRow[] {
    return Array.from(this.rows.values());
  }
}
