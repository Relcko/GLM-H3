import type { RoleId, UserId } from '../value-objects';

export interface GetRoleQuery {
  readonly roleId: RoleId;
}

export interface ListRolesQuery {
  readonly offset?: number;
  readonly limit?: number;
}

export interface ListRoleAssignmentsQuery {
  readonly roleId?: RoleId;
  readonly assigneeId?: UserId;
}
