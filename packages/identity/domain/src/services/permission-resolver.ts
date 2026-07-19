import type { Permission, UserId } from '../value-objects';

export interface IPermissionResolver {
  hasPermission(userId: UserId, permission: Permission): Promise<boolean>;
  hasAnyPermission(userId: UserId, permissions: readonly Permission[]): Promise<boolean>;
  hasAllPermissions(userId: UserId, permissions: readonly Permission[]): Promise<boolean>;
  getPermissions(userId: UserId): Promise<readonly Permission[]>;
  grantPermission(userId: UserId, permission: Permission, grantedBy: UserId): Promise<void>;
  revokePermission(userId: UserId, permission: Permission, revokedBy: UserId): Promise<void>;
}
