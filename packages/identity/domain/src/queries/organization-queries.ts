import type { OrganizationId, UserId } from '../value-objects';

export interface GetOrganizationQuery {
  readonly organizationId: OrganizationId;
}

export interface ListOrganizationsQuery {
  readonly offset?: number;
  readonly limit?: number;
}

export interface ListOrganizationMembersQuery {
  readonly organizationId: OrganizationId;
}

export interface GetUserOrganizationsQuery {
  readonly userId: UserId;
}
