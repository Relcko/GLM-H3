import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  RoleDefinitionCreatedEvent,
  RoleDefinitionUpdatedEvent,
  PermissionGrantedEvent,
  PermissionRevokedEvent,
} from '../../events';

export interface RoleDefinitionState {
  id: EntityId;
  name: string;
  description: string;
  permissions: readonly string[];
  isPlatform: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function initialState(id: EntityId): RoleDefinitionState {
  const now = systemClock.now();
  return {
    id,
    name: '',
    description: '',
    permissions: [],
    isPlatform: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class RoleDefinition extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'RoleDefinition';
  private state: RoleDefinitionState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static create(params: {
    id?: EntityId;
    name: string;
    description: string;
    permissions?: readonly string[];
    isPlatform?: boolean;
    clock?: Clock;
  }): RoleDefinition {
    const rd = new RoleDefinition(params.id ?? generateId('rld'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    rd.apply(new RoleDefinitionCreatedEvent(
      String(rd.id), rd.nextVersion(), occurredAt,
      params.name, params.description, params.permissions ?? [],
    ));
    if (params.isPlatform) {
      rd.state.isPlatform = true;
    }
    return rd;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): RoleDefinition {
    const rd = new RoleDefinition(id);
    rd.loadFromHistory(events);
    return rd;
  }

  get name(): string { return this.state.name; }
  get description(): string { return this.state.description; }
  get permissions(): readonly string[] { return this.state.permissions; }
  get isPlatform(): boolean { return this.state.isPlatform; }
  get createdAt(): Date { return this.state.createdAt; }
  get updatedAt(): Date { return this.state.updatedAt; }

  update(params: { name?: string; description?: string; clock?: Clock }): void {
    const fields: string[] = [];
    const occurredAt = params.clock?.now() ?? systemClock.now();
    if (params.name !== undefined) {
      if (!params.name.trim()) throw new InvariantViolationError('RoleDefinition', String(this.id), 'empty-name');
      this.state.name = params.name;
      fields.push('name');
    }
    if (params.description !== undefined) {
      this.state.description = params.description;
      fields.push('description');
    }
    if (fields.length > 0) {
      this.state.updatedAt = occurredAt;
      this.apply(new RoleDefinitionUpdatedEvent(
        String(this.id), this.nextVersion(), occurredAt, fields,
      ));
    }
  }

  grantPermission(permission: string, clock?: Clock): void {
    if (this.state.permissions.includes(permission)) {
      throw new InvariantViolationError('RoleDefinition', String(this.id), 'permission-already-granted');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new PermissionGrantedEvent(
      String(this.id), this.nextVersion(), occurredAt, permission,
    ));
  }

  revokePermission(permission: string, clock?: Clock): void {
    if (!this.state.permissions.includes(permission)) {
      throw new InvariantViolationError('RoleDefinition', String(this.id), 'permission-not-granted');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new PermissionRevokedEvent(
      String(this.id), this.nextVersion(), occurredAt, permission,
    ));
  }

  hasPermission(permission: string): boolean {
    return this.state.permissions.includes(permission);
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.role_definition.created': {
        const e = event as RoleDefinitionCreatedEvent;
        this.state.name = e.name;
        this.state.description = e.description;
        this.state.permissions = e.permissions;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.role_definition.updated': {
        const e = event as RoleDefinitionUpdatedEvent;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.role_definition.permission_granted': {
        const e = event as PermissionGrantedEvent;
        if (!this.state.permissions.includes(e.permission)) {
          this.state.permissions = [...this.state.permissions, e.permission];
        }
        break;
      }
      case 'identity-access.role_definition.permission_revoked': {
        const e = event as PermissionRevokedEvent;
        this.state.permissions = this.state.permissions.filter((p) => p !== e.permission);
        break;
      }
    }
  }
}
