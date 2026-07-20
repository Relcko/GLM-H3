import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  SessionCreatedEvent,
  SessionRefreshedEvent,
  SessionRevokedEvent,
  SessionExpiredEvent,
  DeviceTrustedEvent,
} from '../../events';

export enum SessionStatus {
  Active = 'active',
  Revoked = 'revoked',
  Expired = 'expired',
}

export interface SessionState {
  id: EntityId;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  previousRefreshTokenHash: string | null;
  status: SessionStatus;
  deviceFingerprint: string | null;
  deviceTrusted: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  refreshedAt: Date;
  expiresAt: Date;
}

function initialState(id: EntityId): SessionState {
  const now = systemClock.now();
  return {
    id,
    userId: '',
    accessTokenHash: '',
    refreshTokenHash: '',
    previousRefreshTokenHash: null,
    status: SessionStatus.Active,
    deviceFingerprint: null,
    deviceTrusted: false,
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    refreshedAt: now,
    expiresAt: now,
  };
}

export class Session extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'Session';
  private state: SessionState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static create(params: {
    id?: EntityId;
    userId: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    deviceFingerprint?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
    clock?: Clock;
  }): Session {
    const session = new Session(params.id ?? generateId('ses'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    session.apply(new SessionCreatedEvent(
      String(session.id),
      session.nextVersion(),
      occurredAt,
      params.userId,
      params.accessTokenHash,
      params.refreshTokenHash,
      params.deviceFingerprint ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      params.expiresAt.getTime(),
    ));
    return session;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): Session {
    const session = new Session(id);
    session.loadFromHistory(events);
    return session;
  }

  get userId(): string { return this.state.userId; }
  get accessTokenHash(): string { return this.state.accessTokenHash; }
  get refreshTokenHash(): string { return this.state.refreshTokenHash; }
  get previousRefreshTokenHash(): string | null { return this.state.previousRefreshTokenHash; }
  get status(): SessionStatus { return this.state.status; }
  get deviceFingerprint(): string | null { return this.state.deviceFingerprint; }
  get deviceTrusted(): boolean { return this.state.deviceTrusted; }
  get ipAddress(): string | null { return this.state.ipAddress; }
  get userAgent(): string | null { return this.state.userAgent; }
  get createdAt(): Date { return this.state.createdAt; }
  get refreshedAt(): Date { return this.state.refreshedAt; }
  get expiresAt(): Date { return this.state.expiresAt; }

  isActive(): boolean { return this.state.status === SessionStatus.Active; }
  isExpired(clock?: Clock): boolean {
    const c = clock ?? systemClock;
    return c.now() > this.state.expiresAt;
  }

  refresh(params: {
    newAccessTokenHash: string;
    newRefreshTokenHash: string;
    newExpiresAt: Date;
    clock?: Clock;
  }): void {
    if (this.state.status !== SessionStatus.Active) {
      throw new InvariantViolationError('Session', String(this.id), 'session-not-active');
    }
    const occurredAt = params.clock?.now() ?? systemClock.now();
    if (occurredAt > this.state.expiresAt) {
      throw new InvariantViolationError('Session', String(this.id), 'session-expired');
    }
    this.apply(new SessionRefreshedEvent(
      String(this.id),
      this.nextVersion(),
      occurredAt,
      params.newAccessTokenHash,
      params.newRefreshTokenHash,
      this.state.refreshTokenHash,
      params.newExpiresAt.getTime(),
    ));
  }

  revoke(reason: string, clock?: Clock): void {
    if (this.state.status !== SessionStatus.Active) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new SessionRevokedEvent(
      String(this.id), this.nextVersion(), occurredAt, reason,
    ));
  }

  expire(clock?: Clock): void {
    if (this.state.status !== SessionStatus.Active) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new SessionExpiredEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  trustDevice(clock?: Clock): void {
    if (this.state.deviceTrusted) return;
    if (!this.state.deviceFingerprint) {
      throw new InvariantViolationError('Session', String(this.id), 'no-device-fingerprint');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new DeviceTrustedEvent(
      String(this.id), this.nextVersion(), occurredAt, this.state.deviceFingerprint,
    ));
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.session.created': {
        const e = event as SessionCreatedEvent;
        this.state.userId = e.userId;
        this.state.accessTokenHash = e.accessTokenHash;
        this.state.refreshTokenHash = e.refreshTokenHash;
        this.state.status = SessionStatus.Active;
        this.state.deviceFingerprint = e.deviceFingerprint;
        this.state.ipAddress = e.ipAddress;
        this.state.userAgent = e.userAgent;
        this.state.createdAt = e.occurredAt;
        this.state.refreshedAt = e.occurredAt;
        this.state.expiresAt = new Date(e.expiresAt);
        break;
      }
      case 'identity-access.session.refreshed': {
        const e = event as SessionRefreshedEvent;
        this.state.previousRefreshTokenHash = e.previousRefreshTokenHash;
        this.state.accessTokenHash = e.newAccessTokenHash;
        this.state.refreshTokenHash = e.newRefreshTokenHash;
        this.state.refreshedAt = e.occurredAt;
        this.state.expiresAt = new Date(e.expiresAt);
        break;
      }
      case 'identity-access.session.revoked': {
        this.state.status = SessionStatus.Revoked;
        break;
      }
      case 'identity-access.session.expired': {
        this.state.status = SessionStatus.Expired;
        break;
      }
      case 'identity-access.session.device_trusted': {
        this.state.deviceTrusted = true;
        break;
      }
    }
  }
}
