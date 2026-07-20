import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  OrganizationActivated,
  OrganizationArchived,
  OrganizationCreated,
  OrganizationDeactivated,
  OrganizationDescriptionUpdated,
  OrganizationDisplayNameUpdated,
  OrganizationRenamed,
  OrganizationRestored,
} from '../../events/organization-events';
import { OrganizationId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface OrganizationSnapshot {
  readonly id: string;
  readonly name: string;
  readonly displayName: string | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly deleted: boolean;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export type OrganizationStatus = 'active' | 'inactive' | 'archived';

export class Organization extends AggregateRoot<OrganizationId> {
  readonly aggregateType = 'Organization';

  private _name!: string;
  private _displayName: string | null = null;
  private _description: string | null = null;
  private _active = true;
  private _deleted = false;
  private _archivedAt: Date | null = null;
  private _createdAt!: Date;
  private _updatedAt!: Date;

  private constructor(id: OrganizationId) {
    super(id);
  }

  static create(
    id: OrganizationId,
    name: string,
    displayName: string | null,
    description: string | null,
    eventId: EventId,
    occurredAt: Date,
  ): Organization {
    if (!name.trim()) {
      throw new InvariantViolationError(
        'Organization',
        id.toString(),
        'organization-name-empty',
        {},
      );
    }
    const org = new Organization(id);
    org.apply(
      new OrganizationCreated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: org.aggregateType,
          aggregateVersion: org.nextVersion(),
          occurredAt,
        },
        id,
        name.trim(),
        displayName?.trim() ?? null,
        description?.trim() ?? null,
        occurredAt,
      ),
    );
    return org;
  }

  static fromSnapshot(snapshot: OrganizationSnapshot): Organization {
    const org = new Organization(new OrganizationId(snapshot.id));
    org._name = snapshot.name;
    org._displayName = snapshot.displayName;
    org._description = snapshot.description;
    org._active = snapshot.active;
    org._deleted = snapshot.deleted;
    org._archivedAt = snapshot.archivedAt ? new Date(snapshot.archivedAt) : null;
    org._createdAt = new Date(snapshot.createdAt);
    org._updatedAt = new Date(snapshot.updatedAt);
    org.restoreVersion(snapshot.version);
    return org;
  }

  static reconstitute(id: OrganizationId): Organization {
    return new Organization(id);
  }

  get name(): string {
    return this._name;
  }

  get displayName(): string | null {
    return this._displayName;
  }

  get description(): string | null {
    return this._description;
  }

  get active(): boolean {
    return this._active;
  }

  get deleted(): boolean {
    return this._deleted;
  }

  get archivedAt(): Date | null {
    return this._archivedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get status(): OrganizationStatus {
    if (this._deleted) {
      return 'archived';
    }
    return this._active ? 'active' : 'inactive';
  }

  rename(newName: string, eventId: EventId, occurredAt: Date): void {
    this.requireNotArchived();
    if (!newName.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'organization-name-empty',
        {},
      );
    }
    const trimmed = newName.trim();
    if (trimmed === this._name) {
      return;
    }
    const oldName = this._name;
    this.apply(
      new OrganizationRenamed(
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

  updateDisplayName(newDisplayName: string | null, eventId: EventId, occurredAt: Date): void {
    this.requireNotArchived();
    const normalized = newDisplayName !== null ? newDisplayName.trim() : null;
    if (normalized === this._displayName) {
      return;
    }
    const oldDisplayName = this._displayName;
    this.apply(
      new OrganizationDisplayNameUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        oldDisplayName,
        normalized,
      ),
    );
  }

  updateDescription(newDescription: string | null, eventId: EventId, occurredAt: Date): void {
    this.requireNotArchived();
    const normalized = newDescription !== null ? newDescription.trim() : null;
    if (normalized === this._description) {
      return;
    }
    const oldDescription = this._description;
    this.apply(
      new OrganizationDescriptionUpdated(
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

  activate(eventId: EventId, occurredAt: Date): void {
    this.requireNotArchived();
    if (this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'organization-already-active',
        {},
      );
    }
    this.apply(
      new OrganizationActivated(
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
    this.requireNotArchived();
    if (!this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'organization-already-inactive',
        {},
      );
    }
    this.apply(
      new OrganizationDeactivated(
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
        'organization-already-archived',
        {},
      );
    }
    this.apply(
      new OrganizationArchived(
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

  restore(eventId: EventId, occurredAt: Date): void {
    if (!this._deleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'organization-not-archived',
        {},
      );
    }
    this.apply(
      new OrganizationRestored(
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

  toSnapshot(): OrganizationSnapshot {
    return {
      id: this.id.toString(),
      name: this._name,
      displayName: this._displayName,
      description: this._description,
      active: this._active,
      deleted: this._deleted,
      archivedAt: this._archivedAt?.toISOString() ?? null,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof OrganizationCreated) {
      this._name = event.name;
      this._displayName = event.displayName;
      this._description = event.description;
      this._active = true;
      this._deleted = false;
      this._archivedAt = null;
      this._createdAt = event.createdAt;
      this._updatedAt = event.createdAt;
    } else if (event instanceof OrganizationRenamed) {
      this._name = event.newName;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationDisplayNameUpdated) {
      this._displayName = event.newDisplayName;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationDescriptionUpdated) {
      this._description = event.newDescription;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationActivated) {
      this._active = true;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationDeactivated) {
      this._active = false;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationArchived) {
      this._deleted = true;
      this._active = false;
      this._archivedAt = event.archivedAt;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof OrganizationRestored) {
      this._deleted = false;
      this._active = true;
      this._archivedAt = null;
      this._updatedAt = event.occurredAt;
    }
  }

  private requireNotArchived(): void {
    if (this._deleted) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'organization-archived',
        {},
      );
    }
  }
}
