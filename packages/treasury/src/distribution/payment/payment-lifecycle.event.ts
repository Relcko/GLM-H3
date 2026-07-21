import crypto from "node:crypto";
import { DomainEvent, type DomainEventProps } from "@relcko/kernel";

export const PaymentEventType = {
  PaymentRequested: "treasury.payment.requested",
  PaymentInitiated: "treasury.payment.initiated",
  PaymentSucceeded: "treasury.payment.succeeded",
  PaymentFailed: "treasury.payment.failed",
  PaymentRetryScheduled: "treasury.payment.retry_scheduled",
  PaymentTimedOut: "treasury.payment.timed_out",
} as const;

export type PaymentEventType = (typeof PaymentEventType)[keyof typeof PaymentEventType];

function eventProps(
  aggregateId: string,
  version: number,
): Omit<DomainEventProps, "schemaVersion"> {
  return {
    eventId: crypto.randomUUID() as unknown as DomainEventProps["eventId"],
    aggregateId,
    aggregateType: "payment",
    aggregateVersion: version,
    occurredAt: new Date(),
  };
}

export interface PaymentRequestedPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly investorId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly settlementRef: string;
  readonly requestedAt: number;
}

export class PaymentRequestedEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentRequested;
  public readonly data: PaymentRequestedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentRequestedPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export interface PaymentInitiatedPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly settlementRef: string;
  readonly initiatedAt: number;
}

export class PaymentInitiatedEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentInitiated;
  public readonly data: PaymentInitiatedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentInitiatedPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export interface PaymentSucceededPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly settlementRef: string;
  readonly txHash: string;
  readonly completedAt: number;
}

export class PaymentSucceededEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentSucceeded;
  public readonly data: PaymentSucceededPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentSucceededPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export interface PaymentFailedPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly settlementRef: string;
  readonly errorCode: string;
  readonly reason: string;
  readonly failedAt: number;
}

export class PaymentFailedEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentFailed;
  public readonly data: PaymentFailedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentFailedPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export interface PaymentRetryScheduledPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly settlementRef: string;
  readonly attemptNumber: number;
  readonly nextRetryAt: number;
  readonly errorCode: string;
  readonly reason: string;
}

export class PaymentRetryScheduledEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentRetryScheduled;
  public readonly data: PaymentRetryScheduledPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentRetryScheduledPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export interface PaymentTimedOutPayload {
  readonly distributionId: string;
  readonly sagaId: string;
  readonly recipientId: string;
  readonly settlementRef: string;
  readonly timedOutAt: number;
}

export class PaymentTimedOutEvent extends DomainEvent {
  public readonly eventType = PaymentEventType.PaymentTimedOut;
  public readonly data: PaymentTimedOutPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: PaymentTimedOutPayload,
  ) {
    super(eventProps(aggregateId, version) as DomainEventProps);
    this.data = data;
  }
}

export type PaymentDomainEvent =
  | PaymentRequestedEvent
  | PaymentInitiatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRetryScheduledEvent
  | PaymentTimedOutEvent;
