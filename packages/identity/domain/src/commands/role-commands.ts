import type { RoleId, UserId } from '../value-objects';

export interface CreateRoleCommand {
  readonly name: string;
  readonly description?: string;
  readonly permissions: readonly string[];
}

export interface UpdateRoleCommand {
  readonly roleId: RoleId;
  readonly name?: string;
  readonly description?: string;
  readonly permissions?: readonly string[];
}

export interface DeleteRoleCommand {
  readonly roleId: RoleId;
}

export interface AssignRoleCommand {
  readonly roleId: RoleId;
  readonly assigneeId: UserId;
  readonly assignedBy: UserId;
}

export interface UnassignRoleCommand {
  readonly roleId: RoleId;
  readonly assigneeId: UserId;
  readonly unassignedBy: UserId;
}
