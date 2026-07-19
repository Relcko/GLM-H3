import type { OrganizationId, UserId } from '../value-objects';

export interface CreateOrganizationCommand {
  readonly name: string;
  readonly createdBy: UserId;
  readonly description?: string;
}

export interface UpdateOrganizationCommand {
  readonly organizationId: OrganizationId;
  readonly name?: string;
  readonly description?: string;
}

export interface DeleteOrganizationCommand {
  readonly organizationId: OrganizationId;
}

export interface AddMemberCommand {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role: string;
}

export interface RemoveMemberCommand {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
}

export interface ChangeMemberRoleCommand {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly newRole: string;
}
