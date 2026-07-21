// Value objects & foundation
export * from './value-objects';
export * from './events';
export * from './errors';
export * from './specifications';

// Aggregates
export { User, UserStatus } from './aggregates/user';
export type { UserState } from './aggregates/user';
export type { UserRepository } from './aggregates/user/repository';

export { Session, SessionStatus } from './aggregates/session';
export type { SessionState } from './aggregates/session';
export type { SessionRepository } from './aggregates/session/repository';

export { Organization, OrganizationStatus, InvitationStatus } from './aggregates/organization';
export type { OrganizationState, OrganizationMember, OrganizationInvitation } from './aggregates/organization';
export type { OrganizationRepository } from './aggregates/organization/repository';

export { ServiceAccount, ServiceAccountStatus } from './aggregates/service-account';
export type { ServiceAccountState } from './aggregates/service-account';
export type { ServiceAccountRepository } from './aggregates/service-account/repository';

export { AuthenticationAttempt } from './aggregates/authentication-attempt';
export type { AuthenticationAttemptState } from './aggregates/authentication-attempt';
export type { AuthenticationAttemptRepository } from './aggregates/authentication-attempt/repository';

export { EmailVerification, VerificationStatus } from './aggregates/email-verification';
export type { EmailVerificationState } from './aggregates/email-verification';
export type { EmailVerificationRepository } from './aggregates/email-verification/repository';

export { PasswordReset, PasswordResetStatus } from './aggregates/password-reset';
export type { PasswordResetState } from './aggregates/password-reset';
export type { PasswordResetRepository } from './aggregates/password-reset/repository';

export { RoleDefinition } from './aggregates/role-definition';
export type { RoleDefinitionState } from './aggregates/role-definition';
export type { RoleDefinitionRepository } from './aggregates/role-definition/repository';

// Services
export {
  AuthenticationService,
  PasswordService,
  TotpService,
  SessionTokenService,
  AuthorizationService,
} from './services';
export type { AuthenticationServiceConfig, PasswordServiceConfig } from './services';

// Command handlers
export {
  RegisterUserHandler,
  LoginHandler,
  VerifyMfaHandler,
  EnrollMfaHandler,
  RevokeSessionHandler,
  RequestEmailVerificationHandler,
  VerifyEmailHandler,
  RequestPasswordResetHandler,
  CompletePasswordResetHandler,
  CreateOrganizationHandler,
  InviteMemberHandler,
  AssignUserRoleHandler,
  CreateServiceAccountHandler,
  CreateRoleDefinitionHandler,
  createIdentityCommandHandlers,
} from './handlers/command-handlers';
export type {
  RegisterUserPayload,
  LoginPayload,
  VerifyMfaPayload,
  CreateOrganizationPayload,
  CreateServiceAccountPayload,
  CreateRoleDefinitionPayload,
  IdentityCommandDeps,
} from './handlers/command-handlers';

// Query handlers
export {
  GetUserHandler,
  GetUserByEmailHandler,
  GetUserSessionsHandler,
  GetOrganizationHandler,
  GetUserOrganizationsHandler,
  GetServiceAccountHandler,
  GetRoleDefinitionHandler,
  ResolvePermissionsHandler,
  createIdentityQueryHandlers,
} from './handlers/query-handlers';
export type {
  GetUserPayload,
  GetUserByEmailPayload,
  IdentityQueryDeps,
} from './handlers/query-handlers';

// Event handlers & projections
export {
  UserRegisteredEventHandler,
  SessionCreatedEventHandler,
  SessionRevokedEventHandler,
  SessionExpiredEventHandler,
  AccountLockedEventHandler,
  AuthenticationFailedEventHandler,
  EmailVerificationRequestedEventHandler,
  PasswordResetRequestedEventHandler,
  RoleDefinitionCreatedEventHandler,
  PermissionGrantedEventHandler,
  MemberInvitedEventHandler,
  ServiceAccountCreatedEventHandler,
  UserProjectionHandler,
  SessionProjectionHandler,
  OrganizationProjectionHandler,
} from './handlers/event-handlers';
export type {
  UserProjection,
  SessionProjection,
  OrganizationProjection,
} from './handlers/event-handlers';

// Test fixtures
export {
  createTestUser,
  createVerifiedUser,
  createUserWithMfa,
  createUserWithRoles,
  createTestSession,
  createTestOrganization,
  createTestServiceAccount,
  createTestAuthAttemptSuccess,
  createTestAuthAttemptFailure,
  createTestEmailVerification,
  createTestPasswordReset,
  createTestRoleDefinition,
  createTestPlatformRoles,
} from './test-fixtures';
