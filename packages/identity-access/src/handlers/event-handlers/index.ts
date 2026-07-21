import type { EventEnvelope } from '@relcko/events';
import { IdentityAccessEventCatalog } from '../../events';
import type { Logger } from '@relcko/logger';

export interface UserProjection { id: string; email: string; username: string; status: string; emailVerified: boolean; mfaEnabled: boolean; roles: readonly string[]; createdAt: string; updatedAt: string }
export interface SessionProjection { id: string; userId: string; status: string; deviceFingerprint: string | null; ipAddress: string | null; createdAt: string; expiresAt: string }
export interface OrganizationProjection { id: string; name: string; status: string; memberCount: number; createdAt: string }

export class UserRegisteredEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('User registered', { userId: envelope.metadata.aggregateId }); } }
export class SessionCreatedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Session created', { sessionId: envelope.metadata.aggregateId }); } }
export class SessionRevokedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Session revoked', { sessionId: envelope.metadata.aggregateId }); } }
export class SessionExpiredEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Session expired', { sessionId: envelope.metadata.aggregateId }); } }
export class AccountLockedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.warn('Account locked', { userId: envelope.metadata.aggregateId }); } }
export class AuthenticationFailedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.warn('Authentication failed', { attemptId: envelope.metadata.aggregateId }); } }
export class EmailVerificationRequestedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Email verification requested', { verificationId: envelope.metadata.aggregateId }); } }
export class PasswordResetRequestedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Password reset requested', { resetId: envelope.metadata.aggregateId }); } }
export class RoleDefinitionCreatedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Role definition created', { roleId: envelope.metadata.aggregateId }); } }
export class PermissionGrantedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Permission granted', { roleId: envelope.metadata.aggregateId }); } }
export class MemberInvitedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Member invited', { orgId: envelope.metadata.aggregateId }); } }
export class ServiceAccountCreatedEventHandler { constructor(private readonly logger: Logger) {} async handle(envelope: EventEnvelope): Promise<void> { this.logger.info('Service account created', { saId: envelope.metadata.aggregateId }); } }

export class UserProjectionHandler {
  private users = new Map<string, Partial<UserProjection>>();
  async handle(envelope: EventEnvelope): Promise<void> {
    const eventType = envelope.metadata.eventType;
    const userId = envelope.metadata.aggregateId;
    switch (eventType) {
      case IdentityAccessEventCatalog.UserRegistered: { const p = envelope.payload as { email: string; username: string }; this.users.set(userId, { id: userId, email: p.email, username: p.username, status: 'pending', emailVerified: false, mfaEnabled: false, roles: [] }); break; }
      case IdentityAccessEventCatalog.UserEmailVerified: { const existing = this.users.get(userId); if (existing) { existing.emailVerified = true; existing.status = 'active'; } break; }
      case IdentityAccessEventCatalog.UserSuspended: { const existing = this.users.get(userId); if (existing) existing.status = 'suspended'; break; }
      case IdentityAccessEventCatalog.UserReactivated: { const existing = this.users.get(userId); if (existing) existing.status = 'active'; break; }
      case IdentityAccessEventCatalog.UserRoleAssigned: { const p = envelope.payload as { role: string }; const existing = this.users.get(userId); if (existing?.roles) { existing.roles = [...existing.roles, p.role]; } break; }
      case IdentityAccessEventCatalog.UserRoleRevoked: { const p = envelope.payload as { role: string }; const existing = this.users.get(userId); if (existing?.roles) { existing.roles = existing.roles.filter((r: string) => r !== p.role); } break; }
      case IdentityAccessEventCatalog.UserMfaEnrolled: { const existing = this.users.get(userId); if (existing) existing.mfaEnabled = true; break; }
      case IdentityAccessEventCatalog.UserMfaDisabled: { const existing = this.users.get(userId); if (existing) existing.mfaEnabled = false; break; }
    }
  }
  getUser(userId: string): UserProjection | undefined { const u = this.users.get(userId); return u ? (u as UserProjection) : undefined; }
  findAll(): UserProjection[] { return [...this.users.values()] as UserProjection[]; }
}

export class SessionProjectionHandler {
  private sessions = new Map<string, SessionProjection>();
  async handle(envelope: EventEnvelope): Promise<void> {
    const eventType = envelope.metadata.eventType;
    const sessionId = envelope.metadata.aggregateId;
    switch (eventType) {
      case IdentityAccessEventCatalog.SessionCreated: {
        const p = envelope.payload as { userId: string; deviceFingerprint: string | null; ipAddress: string | null; expiresAt: number };
        this.sessions.set(sessionId, { id: sessionId, userId: p.userId, status: 'active', deviceFingerprint: p.deviceFingerprint, ipAddress: p.ipAddress, createdAt: new Date(envelope.metadata.timestamp).toISOString(), expiresAt: new Date(p.expiresAt).toISOString() });
        break;
      }
      case IdentityAccessEventCatalog.SessionRevoked: { const existing = this.sessions.get(sessionId); if (existing) existing.status = 'revoked'; break; }
      case IdentityAccessEventCatalog.SessionExpired: { const existing = this.sessions.get(sessionId); if (existing) existing.status = 'expired'; break; }
    }
  }
  findByUser(userId: string): SessionProjection[] { return [...this.sessions.values()].filter((s) => s.userId === userId); }
}

export class OrganizationProjectionHandler {
  private orgs = new Map<string, OrganizationProjection>();
  async handle(envelope: EventEnvelope): Promise<void> {
    const eventType = envelope.metadata.eventType;
    const orgId = envelope.metadata.aggregateId;
    switch (eventType) {
      case IdentityAccessEventCatalog.OrganizationCreated: { const p = envelope.payload as { name: string }; this.orgs.set(orgId, { id: orgId, name: p.name, status: 'active', memberCount: 1, createdAt: new Date(envelope.metadata.timestamp).toISOString() }); break; }
      case IdentityAccessEventCatalog.OrganizationArchived: { const existing = this.orgs.get(orgId); if (existing) existing.status = 'archived'; break; }
      case IdentityAccessEventCatalog.MemberAccepted: { const existing = this.orgs.get(orgId); if (existing) existing.memberCount += 1; break; }
      case IdentityAccessEventCatalog.MemberRemoved: { const existing = this.orgs.get(orgId); if (existing) existing.memberCount = Math.max(0, existing.memberCount - 1); break; }
    }
  }
  getOrg(orgId: string): OrganizationProjection | undefined { return this.orgs.get(orgId); }
  findAll(): OrganizationProjection[] { return [...this.orgs.values()]; }
}
