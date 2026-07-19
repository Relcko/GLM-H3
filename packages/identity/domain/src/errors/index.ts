export { IdentityDomainError } from './identity-domain-error';
export {
  UserNotFoundError,
  UserAlreadyExistsError,
  UserSuspendedError,
  UserLockedError,
  UserDeletedError,
} from './user-errors';
export {
  WalletNotFoundError,
  WalletAlreadyLinkedError,
  WalletVerificationFailedError,
  WalletNotVerifiedError,
} from './wallet-errors';
export { SessionNotFoundError, SessionExpiredError, SessionRevokedError } from './session-errors';
export {
  InvalidCredentialsError,
  MfaRequiredError,
  MfaVerificationFailedError,
  EmailAlreadyLinkedError,
  EmailVerificationFailedError,
} from './auth-errors';
export { PasskeyNotFoundError, PasskeyRegistrationFailedError } from './passkey-errors';
export {
  RecoveryNotFoundError,
  RecoveryExpiredError,
  RecoveryAlreadyUsedError,
} from './recovery-errors';
export { OrganizationNotFoundError, OrganizationAccessDeniedError } from './organization-errors';
export {
  RoleNotFoundError,
  RoleAlreadyAssignedError,
  RoleAssignmentNotFoundError,
} from './role-errors';
export {
  ServiceAccountNotFoundError,
  ServiceAccountAccessDeniedError,
} from './service-account-errors';
export { PermissionDeniedError, PolicyEvaluationError } from './authorization-errors';
export { TokenExpiredError, TokenRevokedError, TokenConsumedError } from './token-errors';
