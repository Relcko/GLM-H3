/**
 * Central event catalog for Identity v2.0.
 *
 * This is the ONLY source of event type strings.
 * No inline event strings anywhere in the identity domain.
 */
export const EventCatalog = {
  /** User lifecycle */
  USER_REGISTERED: 'identity.user.registered',
  USER_ACTIVATED: 'identity.user.activated',
  USER_PROFILE_UPDATED: 'identity.user.profile.updated',
  USER_SUSPENDED: 'identity.user.suspended',
  USER_REACTIVATED: 'identity.user.reactivated',
  USER_LOCKED: 'identity.user.locked',
  USER_UNLOCKED: 'identity.user.unlocked',
  USER_DELETED: 'identity.user.deleted',
  USER_RESTORED: 'identity.user.restored',
  USER_EMAIL_VERIFIED: 'identity.user.email.verified',
  USER_PASSWORD_AUTH_ENABLED: 'identity.user.password_auth.enabled',
  USER_PASSWORD_AUTH_DISABLED: 'identity.user.password_auth.disabled',
  USER_MFA_ENABLED: 'identity.user.mfa.enabled',
  USER_MFA_DISABLED: 'identity.user.mfa.disabled',

  /** Wallet lifecycle */
  WALLET_LINKED: 'identity.wallet.linked',
  WALLET_VERIFIED: 'identity.wallet.verified',
  WALLET_VERIFICATION_REVOKED: 'identity.wallet.verification.revoked',
  WALLET_UNLINKED: 'identity.wallet.unlinked',
  WALLET_PRIMARY_SET: 'identity.wallet.primary.set',
  WALLET_PRIMARY_UNSET: 'identity.wallet.primary.unset',
  WALLET_CHAIN_ADDED: 'identity.wallet.chain.added',
  WALLET_METADATA_UPDATED: 'identity.wallet.metadata.updated',

  /** Session lifecycle */
  SESSION_CREATED: 'identity.session.created',
  SESSION_EXPIRED: 'identity.session.expired',
  SESSION_REVOKED: 'identity.session.revoked',
  SESSION_REFRESHED: 'identity.session.refreshed',

  /** Organization lifecycle */
  ORGANIZATION_CREATED: 'identity.organization.created',
  ORGANIZATION_UPDATED: 'identity.organization.updated',
  ORGANIZATION_DELETED: 'identity.organization.deleted',
  MEMBER_ADDED: 'identity.organization.member.added',
  MEMBER_REMOVED: 'identity.organization.member.removed',
  MEMBER_ROLE_CHANGED: 'identity.organization.member.role.changed',

  /** Role definition lifecycle */
  ROLE_CREATED: 'identity.role.created',
  ROLE_UPDATED: 'identity.role.updated',
  ROLE_DELETED: 'identity.role.deleted',
  ROLE_ASSIGNED: 'identity.role.assigned',
  ROLE_UNASSIGNED: 'identity.role.unassigned',

  /** Service account lifecycle */
  SERVICE_ACCOUNT_CREATED: 'identity.service_account.created',
  SERVICE_ACCOUNT_UPDATED: 'identity.service_account.updated',
  SERVICE_ACCOUNT_ACTIVATED: 'identity.service_account.activated',
  SERVICE_ACCOUNT_DEACTIVATED: 'identity.service_account.deactivated',

  /** Authentication attempt */
  AUTHENTICATION_SUCCEEDED: 'identity.authentication.succeeded',
  AUTHENTICATION_FAILED: 'identity.authentication.failed',

  /** Email verification */
  EMAIL_VERIFICATION_INITIATED: 'identity.email.verification.initiated',
  EMAIL_VERIFICATION_COMPLETED: 'identity.email.verification.completed',
  EMAIL_VERIFICATION_FAILED: 'identity.email.verification.failed',

  /** Password reset */
  PASSWORD_RESET_INITIATED: 'identity.password.reset.initiated',
  PASSWORD_RESET_COMPLETED: 'identity.password.reset.completed',
  PASSWORD_RESET_EXPIRED: 'identity.password.reset.expired',

  /** Guardian recovery */
  RECOVERY_INITIATED: 'identity.recovery.initiated',
  RECOVERY_APPROVED: 'identity.recovery.approved',
  RECOVERY_COMPLETED: 'identity.recovery.completed',
  RECOVERY_EXPIRED: 'identity.recovery.expired',
  RECOVERY_CANCELLED: 'identity.recovery.cancelled',

  /** Policy decision */
  POLICY_EVALUATED: 'identity.policy.evaluated',

  /** Passkey lifecycle */
  PASSKEY_REGISTERED: 'identity.passkey.registered',
  PASSKEY_REMOVED: 'identity.passkey.removed',
  PASSKEY_VERIFIED: 'identity.passkey.verified',
  PASSKEY_ACTIVATED: 'identity.passkey.activated',
  PASSKEY_DEACTIVATED: 'identity.passkey.deactivated',
  PASSKEY_REVOKED: 'identity.passkey.revoked',
  PASSKEY_NAME_UPDATED: 'identity.passkey.name.updated',
  PASSKEY_TRANSPORTS_UPDATED: 'identity.passkey.transports.updated',
  PASSKEY_CREDENTIAL_ROTATED: 'identity.passkey.credential.rotated',
  PASSKEY_USAGE_RECORDED: 'identity.passkey.usage.recorded',

  /** Authentication attempt */
  AUTHENTICATION_ATTEMPT_RECORDED: 'identity.authentication_attempt.recorded',
} as const;

export type EventCatalogValue = (typeof EventCatalog)[keyof typeof EventCatalog];
