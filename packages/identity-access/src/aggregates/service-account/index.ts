import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  ServiceAccountCreatedEvent,
  ServiceAccountEnabledEvent,
  ServiceAccountDisabledEvent,
  ServiceAccountRotatedEvent,
  ServiceAccountCapabilityGrantedEvent,
  ServiceAccountCapabilityRevokedEvent,
} from '../../events';

export enum ServiceAccountStatus {
  Active = 'active',
  Disabled = 'disabled',
}

export interface ServiceAccountState {
  id: EntityId;
  name: string;
  organizationId: string;
  status: ServiceAccountStatus;
  keyHash: string;
  capabilities: readonly string[];
  createdAt: Date;
  updatedAt: Date;
}

function initialState(id: EntityId): ServiceAccountState {
  const now = systemClock.now();
  return {
    id,
    name: '',
    organizationId: '',
    status: ServiceAccountStatus.Active,
    keyHash: '',
    capabilities: [],
    createdAt: now,
    updatedAt: now,
  };
}

export class ServiceAccount extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'ServiceAccount';
  private state: ServiceAccountState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static create(params: {
    id?: EntityId;
    name: string;
    organizationId: string;
    keyHash: string;
    capabilities?: readonly string[];
    clock?: Clock;
  }): ServiceAccount {
    const sa = new ServiceAccount(params.id ?? generateId('sa'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    sa.apply(new ServiceAccountCreatedEvent(
      String(sa.id), sa.nextVersion(), occurredAt,
      params.name, params.organizationId,
    ));
    sa.state.keyHash = params.keyHash;
    sa.state.capabilities = params.capabilities ?? [];
    return sa;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): ServiceAccount {
    const sa = new ServiceAccount(id);
    sa.loadFromHistory(events);
    return sa;
  }

  get name(): string { return this.state.name; }
  get organizationId(): string { return this.state.organizationId; }
  get status(): ServiceAccountStatus { return this.state.status; }
  get keyHash(): string { return this.state.keyHash; }
  get capabilities(): readonly string[] { return this.state.capabilities; }
  get createdAt(): Date { return this.state.createdAt; }
  get updatedAt(): Date { return this.state.updatedAt; }

  isActive(): boolean { return this.state.status === ServiceAccountStatus.Active; }

  enable(clock?: Clock): void {
    if (this.state.status === ServiceAccountStatus.Active) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new ServiceAccountEnabledEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  disable(clock?: Clock): void {
    if (this.state.status === ServiceAccountStatus.Disabled) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new ServiceAccountDisabledEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  rotateKey(newKeyHash: string, clock?: Clock): void {
    if (!newKeyHash) throw new InvariantViolationError('ServiceAccount', String(this.id), 'empty-key-hash');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new ServiceAccountRotatedEvent(
      String(this.id), this.nextVersion(), occurredAt, newKeyHash,
    ));
  }

  grantCapability(capability: string, clock?: Clock): void {
    if (this.state.capabilities.includes(capability)) {
      throw new InvariantViolationError('ServiceAccount', String(this.id), 'capability-already-granted');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new ServiceAccountCapabilityGrantedEvent(
      String(this.id), this.nextVersion(), occurredAt, capability,
    ));
  }

  revokeCapability(capability: string, clock?: Clock): void {
    if (!this.state.capabilities.includes(capability)) {
      throw new InvariantViolationError('ServiceAccount', String(this.id), 'capability-not-granted');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new ServiceAccountCapabilityRevokedEvent(
      String(this.id), this.nextVersion(), occurredAt, capability,
    ));
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.service_account.created': {
        const e = event as ServiceAccountCreatedEvent;
        this.state.name = e.name;
        this.state.organizationId = e.organizationId;
        this.state.status = ServiceAccountStatus.Active;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.service_account.enabled': {
        this.state.status = ServiceAccountStatus.Active;
        break;
      }
      case 'identity-access.service_account.disabled': {
        this.state.status = ServiceAccountStatus.Disabled;
        break;
      }
      case 'identity-access.service_account.rotated': {
        const e = event as ServiceAccountRotatedEvent;
        this.state.keyHash = e.newKeyHash;
        break;
      }
      case 'identity-access.service_account.capability_granted': {
        const e = event as ServiceAccountCapabilityGrantedEvent;
        if (!this.state.capabilities.includes(e.capability)) {
          this.state.capabilities = [...this.state.capabilities, e.capability];
        }
        break;
      }
      case 'identity-access.service_account.capability_revoked': {
        const e = event as ServiceAccountCapabilityRevokedEvent;
        this.state.capabilities = this.state.capabilities.filter((c) => c !== e.capability);
        break;
      }
    }
  }
}
