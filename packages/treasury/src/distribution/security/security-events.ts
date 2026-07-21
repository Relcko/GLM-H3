import crypto from "node:crypto";
import { DomainEvent, type DomainEventProps } from "@relcko/kernel";

export const SecurityEventType = {
  ReservationCreated: "treasury.security.reservation.created",
  ReservationConsumed: "treasury.security.reservation.consumed",
  ReservationReleased: "treasury.security.reservation.released",
  ReservationExpired: "treasury.security.reservation.expired",
  AuthorizationGranted: "treasury.security.authorization.granted",
  AuthorizationDenied: "treasury.security.authorization.denied",
  ApprovalAccepted: "treasury.security.approval.accepted",
  ApprovalRejected: "treasury.security.approval.rejected",
  ReplayDetected: "treasury.security.replay.detected",
  SettlementVerified: "treasury.security.settlement.verified",
  SettlementRejected: "treasury.security.settlement.rejected",
} as const;

export type SecurityEventType = (typeof SecurityEventType)[keyof typeof SecurityEventType];

function eventId(): string {
  return crypto.randomUUID();
}

function eventProps(
  aggregateId: string,
  aggregateType: string,
  version: number,
): Omit<DomainEventProps, "schemaVersion"> {
  return {
    eventId: eventId() as unknown as DomainEventProps["eventId"],
    aggregateId,
    aggregateType,
    aggregateVersion: version,
    occurredAt: new Date(),
  };
}

export interface ReservationCreatedPayload {
  readonly reservationId: string;
  readonly distributionId: string;
  readonly accountId: string;
  readonly amount: bigint;
  readonly currency: string;
  readonly journalId: string;
  readonly expiresAt: number;
  readonly createdAt: number;
}

export class ReservationCreatedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ReservationCreated;
  public readonly data: ReservationCreatedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ReservationCreatedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ReservationConsumedPayload {
  readonly reservationId: string;
  readonly distributionId: string;
  readonly amount: bigint;
  readonly consumedAt: number;
}

export class ReservationConsumedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ReservationConsumed;
  public readonly data: ReservationConsumedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ReservationConsumedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ReservationReleasedPayload {
  readonly reservationId: string;
  readonly distributionId: string;
  readonly amount: bigint;
  readonly releasedAt: number;
  readonly reason: string;
}

export class ReservationReleasedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ReservationReleased;
  public readonly data: ReservationReleasedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ReservationReleasedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ReservationExpiredPayload {
  readonly reservationId: string;
  readonly distributionId: string;
  readonly amount: bigint;
  readonly expiredAt: number;
}

export class ReservationExpiredEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ReservationExpired;
  public readonly data: ReservationExpiredPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ReservationExpiredPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface AuthorizationGrantedPayload {
  readonly actorId: string;
  readonly action: string;
  readonly resourceId: string | null;
  readonly grantedAt: number;
}

export class AuthorizationGrantedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.AuthorizationGranted;
  public readonly data: AuthorizationGrantedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: AuthorizationGrantedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface AuthorizationDeniedPayload {
  readonly actorId: string;
  readonly action: string;
  readonly resourceId: string | null;
  readonly reason: string;
  readonly deniedAt: number;
}

export class AuthorizationDeniedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.AuthorizationDenied;
  public readonly data: AuthorizationDeniedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: AuthorizationDeniedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ApprovalAcceptedPayload {
  readonly proposalId: string;
  readonly approverId: string;
  readonly epoch: number;
  readonly acceptedAt: number;
}

export class ApprovalAcceptedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ApprovalAccepted;
  public readonly data: ApprovalAcceptedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ApprovalAcceptedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ApprovalRejectedPayload {
  readonly proposalId: string;
  readonly approverId: string;
  readonly reason: string;
  readonly rejectedAt: number;
}

export class ApprovalRejectedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ApprovalRejected;
  public readonly data: ApprovalRejectedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ApprovalRejectedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface ReplayDetectedPayload {
  readonly replayType: string;
  readonly digest: string;
  readonly correlationId: string | null;
  readonly detectedAt: number;
}

export class ReplayDetectedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.ReplayDetected;
  public readonly data: ReplayDetectedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: ReplayDetectedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface SettlementVerifiedPayload {
  readonly settlementRef: string;
  readonly distributionId: string;
  readonly recipientId: string;
  readonly verifiedAt: number;
}

export class SettlementVerifiedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.SettlementVerified;
  public readonly data: SettlementVerifiedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: SettlementVerifiedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export interface SettlementRejectedPayload {
  readonly settlementRef: string;
  readonly distributionId: string;
  readonly recipientId: string;
  readonly reason: string;
  readonly rejectedAt: number;
}

export class SettlementRejectedEvent extends DomainEvent {
  public readonly eventType = SecurityEventType.SettlementRejected;
  public readonly data: SettlementRejectedPayload;

  constructor(
    aggregateId: string,
    version: number,
    data: SettlementRejectedPayload,
  ) {
    super(eventProps(aggregateId, "security", version) as DomainEventProps);
    this.data = data;
  }
}

export type SecurityDomainEvent =
  | ReservationCreatedEvent
  | ReservationConsumedEvent
  | ReservationReleasedEvent
  | ReservationExpiredEvent
  | AuthorizationGrantedEvent
  | AuthorizationDeniedEvent
  | ApprovalAcceptedEvent
  | ApprovalRejectedEvent
  | ReplayDetectedEvent
  | SettlementVerifiedEvent
  | SettlementRejectedEvent;
