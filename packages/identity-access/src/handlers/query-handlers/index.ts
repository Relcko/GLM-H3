import type { QueryHandler, Query } from '@relcko/cqrs';
import type { UserRepository } from '../../aggregates/user/repository';
import type { SessionRepository } from '../../aggregates/session/repository';
import type { OrganizationRepository } from '../../aggregates/organization/repository';
import type { ServiceAccountRepository } from '../../aggregates/service-account/repository';
import type { RoleDefinitionRepository } from '../../aggregates/role-definition/repository';
import { AuthorizationService } from '../../services';

export interface GetUserPayload { userId: string }
export interface GetUserByEmailPayload { email: string }
export interface GetUserSessionsPayload { userId: string }
export interface GetOrganizationPayload { organizationId: string }
export interface GetUserOrganizationsPayload { userId: string }
export interface GetServiceAccountPayload { serviceAccountId: string }
export interface GetRoleDefinitionPayload { roleDefinitionId: string }
export interface ResolvePermissionsPayload { userId: string }

export class GetUserHandler implements QueryHandler<Query<GetUserPayload>, { id: string; email: string; username: string; status: string; emailVerified: boolean; mfaEnabled: boolean; roles: string[] }> {
  readonly queryType = 'identity.get_user';
  constructor(private readonly userRepo: UserRepository) {}
  async handle(query: Query<GetUserPayload>) {
    const user = await this.userRepo.getById(query.payload.userId as never);
    return { id: String(user.id), email: user.email, username: user.username, status: user.status, emailVerified: user.emailVerified, mfaEnabled: user.mfaEnabled, roles: [...user.roles] };
  }
}

export class GetUserByEmailHandler implements QueryHandler<Query<GetUserByEmailPayload>, { id: string; email: string; username: string; status: string } | null> {
  readonly queryType = 'identity.get_user_by_email';
  constructor(private readonly userRepo: UserRepository) {}
  async handle(query: Query<GetUserByEmailPayload>) {
    const user = await this.userRepo.findByEmail(query.payload.email);
    if (!user) return null;
    return { id: String(user.id), email: user.email, username: user.username, status: user.status };
  }
}

export class GetUserSessionsHandler implements QueryHandler<Query<GetUserSessionsPayload>, readonly { id: string; status: string; deviceFingerprint: string | null; createdAt: string; expiresAt: string }[]> {
  readonly queryType = 'identity.get_user_sessions';
  constructor(private readonly sessionRepo: SessionRepository) {}
  async handle(query: Query<GetUserSessionsPayload>) {
    const sessions = await this.sessionRepo.findActiveByUser(query.payload.userId);
    return sessions.map((s: { id: unknown; status: string; deviceFingerprint: string | null; createdAt: Date; expiresAt: Date }) => ({
      id: String(s.id), status: s.status, deviceFingerprint: s.deviceFingerprint,
      createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(),
    }));
  }
}

export class GetOrganizationHandler implements QueryHandler<Query<GetOrganizationPayload>, { id: string; name: string; status: string; memberCount: number }> {
  readonly queryType = 'identity.get_organization';
  constructor(private readonly orgRepo: OrganizationRepository) {}
  async handle(query: Query<GetOrganizationPayload>) {
    const org = await this.orgRepo.getById(query.payload.organizationId as never);
    return { id: String(org.id), name: org.name, status: org.status, memberCount: org.members.length };
  }
}

export class GetUserOrganizationsHandler implements QueryHandler<Query<GetUserOrganizationsPayload>, readonly { id: string; name: string; status: string }[]> {
  readonly queryType = 'identity.get_user_organizations';
  constructor(private readonly orgRepo: OrganizationRepository) {}
  async handle(query: Query<GetUserOrganizationsPayload>) {
    const orgs = await this.orgRepo.findByMember(query.payload.userId);
    return orgs.map((org: { id: unknown; name: string; status: string }) => ({ id: String(org.id), name: org.name, status: org.status }));
  }
}

export class GetServiceAccountHandler implements QueryHandler<Query<GetServiceAccountPayload>, { id: string; name: string; organizationId: string; status: string; capabilities: readonly string[] }> {
  readonly queryType = 'identity.get_service_account';
  constructor(private readonly saRepo: ServiceAccountRepository) {}
  async handle(query: Query<GetServiceAccountPayload>) {
    const sa = await this.saRepo.getById(query.payload.serviceAccountId as never);
    return { id: String(sa.id), name: sa.name, organizationId: sa.organizationId, status: sa.status, capabilities: sa.capabilities };
  }
}

export class GetRoleDefinitionHandler implements QueryHandler<Query<GetRoleDefinitionPayload>, { id: string; name: string; description: string; permissions: readonly string[]; isPlatform: boolean }> {
  readonly queryType = 'identity.get_role_definition';
  constructor(private readonly rdRepo: RoleDefinitionRepository) {}
  async handle(query: Query<GetRoleDefinitionPayload>) {
    const rd = await this.rdRepo.getById(query.payload.roleDefinitionId as never);
    return { id: String(rd.id), name: rd.name, description: rd.description, permissions: rd.permissions, isPlatform: rd.isPlatform };
  }
}

export class ResolvePermissionsHandler implements QueryHandler<Query<ResolvePermissionsPayload>, { permissions: readonly string[] }> {
  readonly queryType = 'identity.resolve_permissions';
  constructor(
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly rdRepo: RoleDefinitionRepository,
    private readonly authz: AuthorizationService,
  ) {}
  async handle(query: Query<ResolvePermissionsPayload>) {
    const user = await this.userRepo.getById(query.payload.userId as never);
    const orgs = await this.orgRepo.findByMember(String(user.id));
    const roleDefs = await this.rdRepo.findAll();
    const orgMemberships = orgs.map((org: { members: readonly { userId: string; role: string }[]; id: unknown }) => {
      const member = org.members.find((m: { userId: string; role: string }) => m.userId === String(user.id));
      return { organizationId: String(org.id), role: member?.role ?? 'member' };
    });
    const { platformRoles, organizationRoles } = this.authz.resolveEffectiveRoles([...user.roles], orgMemberships);
    const allRoles = [...platformRoles, ...organizationRoles.map((o: { role: string }) => o.role)];
    const permissions = this.authz.resolvePermissions(allRoles, roleDefs.map((r: { name: string; permissions: readonly string[] }) => ({ name: r.name, permissions: r.permissions })));
    return { permissions: [...permissions] };
  }
}

export interface IdentityQueryDeps {
  userRepo: UserRepository; sessionRepo: SessionRepository;
  orgRepo: OrganizationRepository; saRepo: ServiceAccountRepository;
  rdRepo: RoleDefinitionRepository; authz: AuthorizationService;
}

export function createIdentityQueryHandlers(deps: IdentityQueryDeps): QueryHandler[] {
  return [
    new GetUserHandler(deps.userRepo),
    new GetUserByEmailHandler(deps.userRepo),
    new GetUserSessionsHandler(deps.sessionRepo),
    new GetOrganizationHandler(deps.orgRepo),
    new GetUserOrganizationsHandler(deps.orgRepo),
    new GetServiceAccountHandler(deps.saRepo),
    new GetRoleDefinitionHandler(deps.rdRepo),
    new ResolvePermissionsHandler(deps.userRepo, deps.orgRepo, deps.rdRepo, deps.authz),
  ];
}
