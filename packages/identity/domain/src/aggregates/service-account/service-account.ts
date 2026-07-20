import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import {
  ServiceAccountActivated,
  ServiceAccountCreated,
  ServiceAccountDeactivated,
  ServiceAccountRenamed,
} from '../../events/service-account-events';
import { ServiceAccountId, UserId } from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface ServiceAccountSnapshot {
  readonly id: string;
  readonly name: string;
  readonly createdBy: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export class ServiceAccount extends AggregateRoot<ServiceAccountId> {
  readonly aggregateType = 'ServiceAccount';

  private _name!: string;
  private _createdBy!: UserId;
  private _active = true;
  private _createdAt!: Date;
  private _updatedAt!: Date;

  private constructor(id: ServiceAccountId) {
    super(id);
  }

  static create(
    id: ServiceAccountId,
    name: string,
    createdBy: UserId,
    eventId: EventId,
    occurredAt: Date,
  ): ServiceAccount {
    if (!name.trim()) {
      throw new InvariantViolationError(
        'ServiceAccount',
        id.toString(),
        'service-account-name-empty',
        {},
      );
    }
    const sa = new ServiceAccount(id);
    sa.apply(
      new ServiceAccountCreated(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: sa.aggregateType,
          aggregateVersion: sa.nextVersion(),
          occurredAt,
        },
        id,
        name.trim(),
        createdBy,
        occurredAt,
      ),
    );
    return sa;
  }

  static fromSnapshot(snapshot: ServiceAccountSnapshot): ServiceAccount {
    const sa = new ServiceAccount(new ServiceAccountId(snapshot.id));
    sa._name = snapshot.name;
    sa._createdBy = new UserId(snapshot.createdBy);
    sa._active = snapshot.active;
    sa._createdAt = new Date(snapshot.createdAt);
    sa._updatedAt = new Date(snapshot.updatedAt);
    sa.restoreVersion(snapshot.version);
    return sa;
  }

  static reconstitute(id: ServiceAccountId): ServiceAccount {
    return new ServiceAccount(id);
  }

  get name(): string {
    return this._name;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get active(): boolean {
    return this._active;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  rename(newName: string, eventId: EventId, occurredAt: Date): void {
    if (!newName.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'service-account-name-empty',
        {},
      );
    }
    const trimmed = newName.trim();
    if (trimmed === this._name) {
      return;
    }
    const oldName = this._name;
    this.apply(
      new ServiceAccountRenamed(
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

  activate(eventId: EventId, occurredAt: Date): void {
    if (this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'service-account-already-active',
        {},
      );
    }
    this.apply(
      new ServiceAccountActivated(
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
    if (!this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'service-account-already-inactive',
        {},
      );
    }
    this.apply(
      new ServiceAccountDeactivated(
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

  toSnapshot(): ServiceAccountSnapshot {
    return {
      id: this.id.toString(),
      name: this._name,
      createdBy: this._createdBy.toString(),
      active: this._active,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof ServiceAccountCreated) {
      this._name = event.name;
      this._createdBy = event.createdBy;
      this._active = true;
      this._createdAt = event.createdAt;
      this._updatedAt = event.createdAt;
    } else if (event instanceof ServiceAccountRenamed) {
      this._name = event.newName;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof ServiceAccountActivated) {
      this._active = true;
      this._updatedAt = event.occurredAt;
    } else if (event instanceof ServiceAccountDeactivated) {
      this._active = false;
      this._updatedAt = event.occurredAt;
    }
  }
}
