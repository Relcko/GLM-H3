import { AggregateRoot } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { InvariantViolationError } from '@relcko/errors';
import type { DomainEvent } from '@relcko/kernel';
import type { IdentityId as EntityId } from '@relcko/types';
import {
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationArchivedEvent,
  MemberInvitedEvent,
  MemberAcceptedEvent,
  MemberRemovedEvent,
  OrganizationRoleAssignedEvent,
  OrganizationRoleRevokedEvent,
} from '../../events';

export enum OrganizationStatus {
  Active = 'active',
  Archived = 'archived',
}

export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export interface OrganizationMember {
  readonly userId: string;
  readonly role: string;
  readonly joinedAt: Date;
}

export interface OrganizationInvitation {
  readonly invitationId: string;
  readonly email: string;
  readonly role: string;
  readonly status: InvitationStatus;
  readonly invitedBy: string;
  readonly invitedAt: Date;
  readonly expiresAt: Date;
}

export interface OrganizationState {
  id: EntityId;
  name: string;
  status: OrganizationStatus;
  members: readonly OrganizationMember[];
  invitations: readonly OrganizationInvitation[];
  parentOrganizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function initialState(id: EntityId): OrganizationState {
  const now = systemClock.now();
  return {
    id,
    name: '',
    status: OrganizationStatus.Active,
    members: [],
    invitations: [],
    parentOrganizationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export class Organization extends AggregateRoot<EntityId> {
  public readonly aggregateType = 'Organization';
  private state: OrganizationState;

  private constructor(id: EntityId) {
    super(id);
    this.state = initialState(id);
  }

  static create(params: {
    id?: EntityId;
    name: string;
    createdBy: string;
    parentOrganizationId?: string;
    clock?: Clock;
  }): Organization {
    const org = new Organization(params.id ?? generateId('org'));
    const occurredAt = params.clock?.now() ?? systemClock.now();
    org.state.parentOrganizationId = params.parentOrganizationId ?? null;
    org.state.name = params.name;
    org.state.createdAt = occurredAt;
    org.state.updatedAt = occurredAt;
    org.state.members = [{
      userId: params.createdBy,
      role: 'owner',
      joinedAt: occurredAt,
    }];
    org.apply(new OrganizationCreatedEvent(
      String(org.id), org.nextVersion(), occurredAt,
      params.name, params.createdBy,
    ));
    return org;
  }

  static fromHistory(id: EntityId, events: readonly DomainEvent[]): Organization {
    const org = new Organization(id);
    org.loadFromHistory(events);
    return org;
  }

  get name(): string { return this.state.name; }
  get status(): OrganizationStatus { return this.state.status; }
  get members(): readonly OrganizationMember[] { return this.state.members; }
  get invitations(): readonly OrganizationInvitation[] { return this.state.invitations; }
  get parentOrganizationId(): string | null { return this.state.parentOrganizationId; }
  get createdAt(): Date { return this.state.createdAt; }
  get updatedAt(): Date { return this.state.updatedAt; }

  isMember(userId: string): boolean {
    return this.state.members.some((m) => m.userId === userId);
  }

  hasChildOrganization(_childOrgId: string): boolean {
    return false;
  }

  updateName(name: string, clock?: Clock): void {
    if (!name.trim()) throw new InvariantViolationError('Organization', String(this.id), 'empty-name');
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new OrganizationUpdatedEvent(
      String(this.id), this.nextVersion(), occurredAt, ['name'],
    ));
    this.state.name = name;
    this.state.updatedAt = occurredAt;
  }

  archive(clock?: Clock): void {
    if (this.state.status === OrganizationStatus.Archived) return;
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new OrganizationArchivedEvent(
      String(this.id), this.nextVersion(), occurredAt,
    ));
  }

  inviteMember(params: {
    email: string;
    role: string;
    invitedBy: string;
    ttlMs: number;
    clock?: Clock;
  }): OrganizationInvitation {
    if (this.state.status !== OrganizationStatus.Active) {
      throw new InvariantViolationError('Organization', String(this.id), 'org-not-active');
    }
    const occurredAt = params.clock?.now() ?? systemClock.now();
    const existing = this.state.invitations.find(
      (inv) => inv.email === params.email && inv.status === InvitationStatus.Pending,
    );
    if (existing) throw new InvariantViolationError('Organization', String(this.id), 'invitation-already-pending');

    const invitation: OrganizationInvitation = {
      invitationId: generateId('inv'),
      email: params.email,
      role: params.role,
      status: InvitationStatus.Pending,
      invitedBy: params.invitedBy,
      invitedAt: occurredAt,
      expiresAt: new Date(occurredAt.getTime() + params.ttlMs),
    };

    this.apply(new MemberInvitedEvent(
      String(this.id), this.nextVersion(), occurredAt,
      params.email, params.role, params.invitedBy,
    ));
    return invitation;
  }

  acceptInvitation(invitationId: string, userId: string, clock?: Clock): void {
    const invitation = this.state.invitations.find((inv) => inv.invitationId === invitationId);
    if (!invitation) throw new InvariantViolationError('Organization', String(this.id), 'invitation-not-found');
    if (invitation.status !== InvitationStatus.Pending) {
      throw new InvariantViolationError('Organization', String(this.id), 'invitation-not-pending');
    }
    const c = clock ?? systemClock;
    if (c.now() > invitation.expiresAt) {
      throw new InvariantViolationError('Organization', String(this.id), 'invitation-expired');
    }
    if (this.state.members.some((m) => m.userId === userId)) {
      throw new InvariantViolationError('Organization', String(this.id), 'already-member');
    }
    const occurredAt = c.now();
    this.apply(new MemberAcceptedEvent(
      String(this.id), this.nextVersion(), occurredAt, userId,
    ));
  }

  removeMember(userId: string, removedBy: string, clock?: Clock): void {
    if (!this.state.members.some((m) => m.userId === userId)) {
      throw new InvariantViolationError('Organization', String(this.id), 'not-a-member');
    }
    if (userId === removedBy) {
      throw new InvariantViolationError('Organization', String(this.id), 'cannot-remove-self');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new MemberRemovedEvent(
      String(this.id), this.nextVersion(), occurredAt, userId, removedBy,
    ));
  }

  assignRole(userId: string, role: string, assignedBy: string, clock?: Clock): void {
    if (!this.state.members.some((m) => m.userId === userId)) {
      throw new InvariantViolationError('Organization', String(this.id), 'not-a-member');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new OrganizationRoleAssignedEvent(
      String(this.id), this.nextVersion(), occurredAt, userId, role, assignedBy,
    ));
  }

  revokeRole(userId: string, role: string, revokedBy: string, clock?: Clock): void {
    if (!this.state.members.some((m) => m.userId === userId)) {
      throw new InvariantViolationError('Organization', String(this.id), 'not-a-member');
    }
    const member = this.state.members.find((m) => m.userId === userId)!;
    if (member.role !== role) {
      throw new InvariantViolationError('Organization', String(this.id), 'role-not-assigned');
    }
    const occurredAt = clock?.now() ?? systemClock.now();
    this.apply(new OrganizationRoleRevokedEvent(
      String(this.id), this.nextVersion(), occurredAt, userId, role, revokedBy,
    ));
  }

  protected when(event: DomainEvent): void {
    switch (event.eventType) {
      case 'identity-access.organization.created': {
        const e = event as OrganizationCreatedEvent;
        this.state.name = e.name;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.updated': {
        const e = event as OrganizationUpdatedEvent;
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.archived': {
        this.state.status = OrganizationStatus.Archived;
        break;
      }
      case 'identity-access.organization.member_invited': {
        const e = event as MemberInvitedEvent;
        const inv: OrganizationInvitation = {
          invitationId: generateId('inv'),
          email: e.email,
          role: e.role,
          status: InvitationStatus.Pending,
          invitedBy: e.invitedBy,
          invitedAt: e.occurredAt,
          expiresAt: new Date(e.occurredAt.getTime() + 604800000),
        };
        this.state.invitations = [...this.state.invitations, inv];
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.member_accepted': {
        const e = event as MemberAcceptedEvent;
        this.state.members = [...this.state.members, {
          userId: e.userId,
          role: 'member',
          joinedAt: e.occurredAt,
        }];
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.member_removed': {
        const e = event as MemberRemovedEvent;
        this.state.members = this.state.members.filter((m) => m.userId !== e.userId);
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.role_assigned': {
        const e = event as OrganizationRoleAssignedEvent;
        this.state.members = this.state.members.map((m) =>
          m.userId === e.userId ? { ...m, role: e.role } : m,
        );
        this.state.updatedAt = e.occurredAt;
        break;
      }
      case 'identity-access.organization.role_revoked': {
        const e = event as OrganizationRoleRevokedEvent;
        this.state.updatedAt = e.occurredAt;
        break;
      }
    }
  }
}
