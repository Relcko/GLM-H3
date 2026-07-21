import type { CommandHandler, Command } from '@relcko/cqrs';
import { systemClock } from '@relcko/kernel';
import { generateId } from '../../shared-types';
import { User } from '../../aggregates/user';
import { Session } from '../../aggregates/session';
import { Organization } from '../../aggregates/organization';
import { ServiceAccount } from '../../aggregates/service-account';
import { AuthenticationAttempt } from '../../aggregates/authentication-attempt';
import { EmailVerification } from '../../aggregates/email-verification';
import { PasswordReset } from '../../aggregates/password-reset';
import { RoleDefinition } from '../../aggregates/role-definition';
import type { UserRepository } from '../../aggregates/user/repository';
import type { SessionRepository } from '../../aggregates/session/repository';
import type { OrganizationRepository } from '../../aggregates/organization/repository';
import type { ServiceAccountRepository } from '../../aggregates/service-account/repository';
import type { AuthenticationAttemptRepository } from '../../aggregates/authentication-attempt/repository';
import type { EmailVerificationRepository } from '../../aggregates/email-verification/repository';
import type { PasswordResetRepository } from '../../aggregates/password-reset/repository';
import type { RoleDefinitionRepository } from '../../aggregates/role-definition/repository';
import { PasswordService, TotpService, SessionTokenService, AuthenticationService } from '../../services';
import { AccountLockedError } from '../../errors';
import type { AuthenticationServiceConfig } from '../../services';

const mockLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => mockLogger };
const AUTH_CONFIG: AuthenticationServiceConfig = { maxFailedAttempts: 5, lockoutDurationMs: 900000, throttlingMinIntervalMs: 2000 };

export interface RegisterUserPayload { email: string; username: string; password: string }
export interface LoginPayload { email: string; password: string; deviceFingerprint?: string; ipAddress?: string; userAgent?: string }
export interface VerifyMfaPayload { userId: string; code: string; method: 'totp' | 'backup_code' }
export interface RevokeSessionPayload { sessionId: string }
export interface RequestEmailVerificationPayload { userId: string; email: string }
export interface VerifyEmailPayload { token: string }
export interface RequestPasswordResetPayload { email: string }
export interface CompletePasswordResetPayload { token: string; newPassword: string }
export interface CreateOrganizationPayload { name: string; createdBy: string }
export interface InviteMemberPayload { organizationId: string; email: string; role: string; invitedBy: string }
export interface AssignRolePayload { userId: string; role: string; assignedBy: string }
export interface CreateServiceAccountPayload { name: string; organizationId: string; capabilities?: string[] }
export interface CreateRoleDefinitionPayload { name: string; description: string; permissions?: string[]; isPlatform?: boolean }

export class RegisterUserHandler implements CommandHandler<Command<RegisterUserPayload>, { userId: string }> {
  readonly commandType = 'identity.register_user';
  constructor(private readonly userRepo: UserRepository, private readonly passwordService: PasswordService) {}
  async handle(command: Command<RegisterUserPayload>): Promise<{ userId: string }> {
    const { email, username, password } = command.payload;
    const strength = this.passwordService.validateStrength(password);
    if (!strength.valid) throw new Error(`Password invalid: ${strength.reason}`);
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('Email already registered');
    const passwordHash = await this.passwordService.hashPassword(password);
    const user = User.create({ email, username, passwordHash, clock: systemClock });
    await this.userRepo.save(user);
    return { userId: String(user.id) };
  }
}

export class LoginHandler implements CommandHandler<Command<LoginPayload>, { accessToken: string; refreshToken: string; sessionId: string; requiresMfa: boolean }> {
  readonly commandType = 'identity.login';
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authAttemptRepo: AuthenticationAttemptRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: SessionTokenService,
  ) {}
  async handle(command: Command<LoginPayload>): Promise<{ accessToken: string; refreshToken: string; sessionId: string; requiresMfa: boolean }> {
    const { email, password, deviceFingerprint, ipAddress, userAgent } = command.payload;
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      const attempt = AuthenticationAttempt.recordFailure({
        userId: null, identifier: email, method: 'password',
        reason: 'user_not_found', previousConsecutiveFailures: 0,
        maxAttempts: AUTH_CONFIG.maxFailedAttempts, lockoutDurationMs: AUTH_CONFIG.lockoutDurationMs, clock: systemClock,
      });
      await this.authAttemptRepo.save(attempt);
      throw new Error('Invalid credentials');
    }
    const recentFailures = await this.authAttemptRepo.countRecentFailures(String(user.id), 900000);
    const authService = new AuthenticationService({ logger: mockLogger as never, clock: systemClock }, AUTH_CONFIG);
    const lockout = authService.computeLockout(recentFailures);
    if (lockout.locked) {
      throw new AccountLockedError(String(user.id), Math.ceil((lockout.lockedUntil!.getTime() - Date.now()) / 1000));
    }
    const valid = await this.passwordService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempt = AuthenticationAttempt.recordFailure({
        userId: String(user.id), identifier: email, method: 'password',
        reason: 'invalid_credentials', previousConsecutiveFailures: recentFailures,
        maxAttempts: AUTH_CONFIG.maxFailedAttempts, lockoutDurationMs: AUTH_CONFIG.lockoutDurationMs, clock: systemClock,
      });
      await this.authAttemptRepo.save(attempt);
      throw new Error('Invalid credentials');
    }
    const successAttempt = AuthenticationAttempt.recordSuccess({
      userId: String(user.id), identifier: email, method: 'password',
      previousConsecutiveFailures: recentFailures, clock: systemClock,
    });
    await this.authAttemptRepo.save(successAttempt);
    const { token: accessToken, hash: accessHash, expiresAt } = this.tokenService.generateAccessToken();
    const { token: refreshToken, hash: refreshHash } = this.tokenService.generateRefreshToken();
    const session = Session.create({
      userId: String(user.id), accessTokenHash: accessHash, refreshTokenHash: refreshHash,
      deviceFingerprint: deviceFingerprint ?? null, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null,
      expiresAt, clock: systemClock,
    });
    await this.sessionRepo.save(session);
    return { accessToken, refreshToken, sessionId: String(session.id), requiresMfa: user.mfaEnabled };
  }
}

export class VerifyMfaHandler implements CommandHandler<Command<VerifyMfaPayload>, { verified: boolean }> {
  readonly commandType = 'identity.verify_mfa';
  constructor(private readonly userRepo: UserRepository, private readonly totpService: TotpService) {}
  async handle(command: Command<VerifyMfaPayload>): Promise<{ verified: boolean }> {
    const { userId, code, method } = command.payload;
    const user = await this.userRepo.getById(userId as never);
    if (!user.mfaEnabled) throw new Error('MFA not enabled');
    if (method === 'totp' && user.totpSecret) {
      return { verified: this.totpService.verify(user.totpSecret, code) };
    }
    return { verified: false };
  }
}

export class EnrollMfaHandler implements CommandHandler<Command<{ userId: string }>, { secret: string; backupCodes: string[] }> {
  readonly commandType = 'identity.enroll_mfa';
  constructor(private readonly userRepo: UserRepository, private readonly totpService: TotpService) {}
  async handle(command: Command<{ userId: string }>): Promise<{ secret: string; backupCodes: string[] }> {
    const user = await this.userRepo.getById(command.payload.userId as never);
    const secret = this.totpService.generateSecret();
    const backupCodes = this.totpService.generateBackupCodes(10);
    user.enrollMfa(secret, backupCodes, systemClock);
    await this.userRepo.save(user);
    return { secret, backupCodes };
  }
}

export class RevokeSessionHandler implements CommandHandler<Command<RevokeSessionPayload>, void> {
  readonly commandType = 'identity.revoke_session';
  constructor(private readonly sessionRepo: SessionRepository) {}
  async handle(command: Command<RevokeSessionPayload>): Promise<void> {
    const session = await this.sessionRepo.getById(command.payload.sessionId as never);
    session.revoke('user_request', systemClock);
    await this.sessionRepo.save(session);
  }
}

export class RequestEmailVerificationHandler implements CommandHandler<Command<RequestEmailVerificationPayload>, { token: string }> {
  readonly commandType = 'identity.request_email_verification';
  constructor(private readonly evRepo: EmailVerificationRepository, private readonly tokenService: SessionTokenService) {}
  async handle(command: Command<RequestEmailVerificationPayload>): Promise<{ token: string }> {
    const { userId, email } = command.payload;
    const { token, hash, expiresAt: _expiresAt } = this.tokenService.generateVerificationToken(3600000);
    const ev = EmailVerification.request({ userId, email, tokenHash: hash, ttlMs: 3600000, clock: systemClock });
    await this.evRepo.save(ev);
    return { token };
  }
}

export class VerifyEmailHandler implements CommandHandler<Command<VerifyEmailPayload>, void> {
  readonly commandType = 'identity.verify_email';
  constructor(private readonly userRepo: UserRepository, private readonly evRepo: EmailVerificationRepository) {}
  async handle(command: Command<VerifyEmailPayload>): Promise<void> {
    const ev = await this.evRepo.findByTokenHash(command.payload.token);
    if (!ev || ev.isExpired()) throw new Error('Invalid or expired verification token');
    const user = await this.userRepo.getById(ev.userId as never);
    ev.verify(String(user.id), ev.email, systemClock);
    user.verifyEmail(ev.email, systemClock);
    await this.evRepo.save(ev);
    await this.userRepo.save(user);
  }
}

export class RequestPasswordResetHandler implements CommandHandler<Command<RequestPasswordResetPayload>, void> {
  readonly commandType = 'identity.request_password_reset';
  constructor(private readonly userRepo: UserRepository, private readonly prRepo: PasswordResetRepository, private readonly tokenService: SessionTokenService) {}
  async handle(command: Command<RequestPasswordResetPayload>): Promise<void> {
    const user = await this.userRepo.findByEmail(command.payload.email);
    if (!user) return;
    const { hash } = this.tokenService.generateVerificationToken(1800000);
    const pr = PasswordReset.request({ userId: String(user.id), tokenHash: hash, ttlMs: 1800000, clock: systemClock });
    await this.prRepo.save(pr);
  }
}

export class CompletePasswordResetHandler implements CommandHandler<Command<CompletePasswordResetPayload>, void> {
  readonly commandType = 'identity.complete_password_reset';
  constructor(private readonly userRepo: UserRepository, private readonly prRepo: PasswordResetRepository, private readonly passwordService: PasswordService) {}
  async handle(command: Command<CompletePasswordResetPayload>): Promise<void> {
    const pr = await this.prRepo.findByTokenHash(command.payload.token);
    if (!pr || pr.isExpired()) throw new Error('Invalid or expired reset token');
    const user = await this.userRepo.getById(pr.userId as never);
    const passwordHash = await this.passwordService.hashPassword(command.payload.newPassword);
    pr.complete(passwordHash, systemClock);
    user.changePassword(passwordHash, systemClock);
    await this.prRepo.save(pr);
    await this.userRepo.save(user);
  }
}

export class CreateOrganizationHandler implements CommandHandler<Command<CreateOrganizationPayload>, { organizationId: string }> {
  readonly commandType = 'identity.create_organization';
  constructor(private readonly orgRepo: OrganizationRepository) {}
  async handle(command: Command<CreateOrganizationPayload>): Promise<{ organizationId: string }> {
    const org = Organization.create({ name: command.payload.name, createdBy: command.payload.createdBy, clock: systemClock });
    await this.orgRepo.save(org);
    return { organizationId: String(org.id) };
  }
}

export class InviteMemberHandler implements CommandHandler<Command<InviteMemberPayload>, { invitationId: string }> {
  readonly commandType = 'identity.invite_member';
  constructor(private readonly orgRepo: OrganizationRepository) {}
  async handle(command: Command<InviteMemberPayload>): Promise<{ invitationId: string }> {
    const { organizationId, email, role, invitedBy } = command.payload;
    const org = await this.orgRepo.getById(organizationId as never);
    const invitation = org.inviteMember({ email, role, invitedBy, ttlMs: 604800000, clock: systemClock });
    await this.orgRepo.save(org);
    return { invitationId: invitation.invitationId };
  }
}

export class AssignUserRoleHandler implements CommandHandler<Command<AssignRolePayload>, void> {
  readonly commandType = 'identity.assign_user_role';
  constructor(private readonly userRepo: UserRepository) {}
  async handle(command: Command<AssignRolePayload>): Promise<void> {
    const { userId, role, assignedBy } = command.payload;
    const user = await this.userRepo.getById(userId as never);
    user.assignRole(role, assignedBy, systemClock);
    await this.userRepo.save(user);
  }
}

export class CreateServiceAccountHandler implements CommandHandler<Command<CreateServiceAccountPayload>, { serviceAccountId: string; key: string }> {
  readonly commandType = 'identity.create_service_account';
  constructor(private readonly saRepo: ServiceAccountRepository) {}
  async handle(command: Command<CreateServiceAccountPayload>): Promise<{ serviceAccountId: string; key: string }> {
    const key = `sa_${generateId()}`;
    const sa = ServiceAccount.create({
      name: command.payload.name, organizationId: command.payload.organizationId,
      keyHash: `sa_hash_${key}`, capabilities: command.payload.capabilities, clock: systemClock,
    });
    await this.saRepo.save(sa);
    return { serviceAccountId: String(sa.id), key };
  }
}

export class CreateRoleDefinitionHandler implements CommandHandler<Command<CreateRoleDefinitionPayload>, { roleDefinitionId: string }> {
  readonly commandType = 'identity.create_role_definition';
  constructor(private readonly rdRepo: RoleDefinitionRepository) {}
  async handle(command: Command<CreateRoleDefinitionPayload>): Promise<{ roleDefinitionId: string }> {
    const rd = RoleDefinition.create({
      name: command.payload.name, description: command.payload.description,
      permissions: command.payload.permissions, isPlatform: command.payload.isPlatform, clock: systemClock,
    });
    await this.rdRepo.save(rd);
    return { roleDefinitionId: String(rd.id) };
  }
}

export interface IdentityCommandDeps {
  userRepo: UserRepository; authAttemptRepo: AuthenticationAttemptRepository;
  sessionRepo: SessionRepository; evRepo: EmailVerificationRepository;
  prRepo: PasswordResetRepository; orgRepo: OrganizationRepository;
  saRepo: ServiceAccountRepository; rdRepo: RoleDefinitionRepository;
  passwordService: PasswordService; totpService: TotpService;
  tokenService: SessionTokenService;
}

export function createIdentityCommandHandlers(deps: IdentityCommandDeps): CommandHandler<Command, unknown>[] {
  return [
    new RegisterUserHandler(deps.userRepo, deps.passwordService),
    new LoginHandler(deps.userRepo, deps.authAttemptRepo, deps.sessionRepo, deps.passwordService, deps.tokenService),
    new VerifyMfaHandler(deps.userRepo, deps.totpService),
    new EnrollMfaHandler(deps.userRepo, deps.totpService),
    new RevokeSessionHandler(deps.sessionRepo),
    new RequestEmailVerificationHandler(deps.evRepo, deps.tokenService),
    new VerifyEmailHandler(deps.userRepo, deps.evRepo),
    new RequestPasswordResetHandler(deps.userRepo, deps.prRepo, deps.tokenService),
    new CompletePasswordResetHandler(deps.userRepo, deps.prRepo, deps.passwordService),
    new CreateOrganizationHandler(deps.orgRepo),
    new InviteMemberHandler(deps.orgRepo),
    new AssignUserRoleHandler(deps.userRepo),
    new CreateServiceAccountHandler(deps.saRepo),
    new CreateRoleDefinitionHandler(deps.rdRepo),
  ];
}
