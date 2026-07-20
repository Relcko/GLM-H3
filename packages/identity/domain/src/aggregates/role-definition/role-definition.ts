import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  RoleCreated,
  RoleRenamed,
  RoleDescriptionChanged,
  RolePermissionAssigned,
  RolePermissionRevoked,
  RoleActivated,
  RoleDeactivated,
  RoleDeleted,
} from '../../events/role-definition-events';
import { Permission, RoleId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface RoleDefinitionSnapshot {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
  readonly active: boolean;
  readonly deleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export class RoleDefinition extends AggregateRoot<RoleId> {
  readonly aggregateType = 'RoleDefinition';

  private _name!: string;
  private _description: string | null = null;
  private _permissions: Permission[] = [];
  private _active = true;
  private _deleted = false;
  private _createdAt!: Date;
  private _updatedAt!: Date;

  private constructor(id: RoleId) {
    super(id);
  }

  static create(
    id: RoleId,
    name: string,
    description: string | null,
    permissions: readonly Permission[],
    eventId: EventId,
    occurredAt: Date,
  ): RoleDefinition {
    if (!name.trim()) {
      throw new InvariantViolationError(
        'RoleDefinition',
        id.toString(),
        'role-definition-name-empty',
        {},
      );
    }
    const seen = new Set<string>();
    const uniquePermissions: Permission[] = [];
    for (const p of permissions) {
      if (!seen.has(p.toString())) {
        seen.add(p.toString());
        uniquePermissions.push(p);
      }
    }
    const rd = new RoleDefinition(id);
    rd.apply(
      new RoleCreated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: rd.aggregateType,
          aggregateVersion: rd.nextVersion(),
          occurredAt,
        },
        id,
        name.trim(),
        description?.trim() ?? null,
        uniquePermissions,
        occurredAt,
      ),
    );
    return rd;
  }

  static fromSnapshot(snapshot: RoleDefinitionSnapshot): RoleDefinition {
    const rd = new RoleDefinition(new RoleId(snapshot.id));
    rd._name = snapshot.name;
    rd._description = snapshot.description;
    rd._permissions = snapshot.permissions.map((p) => new Permission(p));
    rd._active = snapshot.active;
    rd._deleted = snapshot.deleted;
    rd._createdAt = new Date(snapshot.createdAt);
    rd._updatedAt = new Date(snapshot.updatedAt);
    rd.restoreVersion(snapshot.version);
    return rd;
  }

  static reconstitute(id: RoleId): RoleDefinition {
    return new RoleDefinition(id);
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get permissions(): readonly Permission[] {
    return [...this._permissions];
  }

  get active(): boolean {
    return this._active;
  }

  get deleted(): boolean {
    return this._deleted;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(newName: string, eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (!newName.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-name-empty',
        {},
      );
    }
    const trimmed = newName.trim();
    if (trimmed === this._name) {
      return;
    }
    const oldName = this._name;
    this.apply(
      new RoleRenamed(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        oldName,
        trimmed,
      ),
    );
  }

  changeDescription(newDescription: string | null, eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    const normalized = newDescription !== null ? newDescription.trim() : null;
    if (normalized === this._description) {
      return;
    }
    const oldDescription = this._description;
    this.apply(
      new RoleDescriptionChanged(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        oldDescription,
        normalized,
      ),
    );
  }

  assignPermission(permission: Permission, eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (this._permissions.some((p) => p.equals(permission))) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-permission-already-assigned',
        { permission: permission.toString() },
      );
    }
    this.apply(
      new RolePermissionAssigned(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        permission,
      ),
    );
  }

  revokePermission(permission: Permission, eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (!this._permissions.some((p) => p.equals(permission))) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-permission-not-assigned',
        { permission: permission.toString() },
      );
    }
    this.apply(
      new RolePermissionRevoked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        permission,
      ),
    );
  }

  activate(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-already-active',
        {},
      );
    }
    this.apply(
      new RoleActivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  deactivate(eventId: EventId, occurredAt: Date): void {
    this.requireNotDeleted();
    if (!this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-already-inactive',
        {},
      );
    }
    this.apply(
      new RoleDeactivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  archive(eventId: EventId, occurredAt: Date): void {
    if (this._deleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-already-deleted',
        {},
      );
    }
    this.apply(
      new RoleDeleted(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        occurredAt,
      ),
    );
  }

  toSnapshot(): RoleDefinitionSnapshot {
    return {
      id: this.id.toString(),
      name: this._name,
      description: this._description,
      permissions: this._permissions.map((p) => p.toString()),
      active: this._active,
      deleted: this._deleted,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof RoleCreated) {
      this._name = event.name;
      this._description = event.description;
      this._permissions = [...event.permissions].sort((a, b) =>
        a.toString().localeCompare(b.toString()),
      );
      this._createdAt = event.createdAt;
      this._updatedAt = event.createdAt;
    } else if (event instanceof RoleRenamed) {
      this._name = event.newName;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RoleDescriptionChanged) {
      this._description = event.newDescription;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RolePermissionAssigned) {
      this._permissions = [...this._permissions, event.permission].sort((a, b) =>
        a.toString().localeCompare(b.toString()),
      );
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RolePermissionRevoked) {
      this._permissions = this._permissions.filter((p) => !p.equals(event.permission));
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RoleActivated) {
      this._active = true;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RoleDeactivated) {
      this._active = false;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof RoleDeleted) {
      this._deleted = true;
      this._active = false;
      this._updatedAt = event.occurredAt;
    }
  }

  private requireNotDeleted(): void {
    if (this._deleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'role-definition-deleted',
        {},
      );
    }
  }
}
