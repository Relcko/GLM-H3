# Identity Event Catalog Overview

Status: Final

The identity event catalog is the source of event type strings for emitted identity domain events. Sprint 2.1 removed the unused passkey removed event so the catalog matches emitted events.

## User Events

- identity.user.registered
- identity.user.activated
- identity.user.profile.updated
- identity.user.suspended
- identity.user.reactivated
- identity.user.locked
- identity.user.unlocked
- identity.user.deleted
- identity.user.restored
- identity.user.email.verified
- identity.user.password_auth.enabled
- identity.user.password_auth.disabled
- identity.user.mfa.enabled
- identity.user.mfa.disabled

## Wallet Events

- identity.wallet.linked
- identity.wallet.verified
- identity.wallet.verification.revoked
- identity.wallet.unlinked
- identity.wallet.primary.set
- identity.wallet.primary.unset
- identity.wallet.chain.added
- identity.wallet.metadata.updated

## Session Events

- identity.session.created
- identity.session.activated
- identity.session.expired
- identity.session.revoked
- identity.session.refreshed
- identity.session.last_activity.updated
- identity.session.client.updated
- identity.session.refresh_token.rotated

## Authentication Attempt Events

- identity.authentication.succeeded
- identity.authentication.failed
- identity.authentication_attempt.recorded
- identity.authentication_attempt.method.recorded
- identity.authentication_attempt.mfa.required
- identity.authentication_attempt.mfa.challenge.begun
- identity.authentication_attempt.mfa.challenge.completed
- identity.authentication_attempt.mfa.failed
- identity.authentication_attempt.lockout.triggered
- identity.authentication_attempt.throttle.triggered
- identity.authentication_attempt.risk_score.recorded
- identity.authentication_attempt.expired
- identity.authentication_attempt.cancelled

## Passkey Events

- identity.passkey.registered
- identity.passkey.verified
- identity.passkey.activated
- identity.passkey.deactivated
- identity.passkey.revoked
- identity.passkey.name.updated
- identity.passkey.transports.updated
- identity.passkey.credential.rotated
- identity.passkey.usage.recorded

## Supporting Identity Events

- identity.organization.created
- identity.organization.updated
- identity.organization.deleted
- identity.organization.member.added
- identity.organization.member.removed
- identity.organization.member.role.changed
- identity.role.created
- identity.role.updated
- identity.role.deleted
- identity.role.assigned
- identity.role.unassigned
- identity.service_account.created
- identity.service_account.updated
- identity.service_account.activated
- identity.service_account.deactivated
- identity.email.verification.initiated
- identity.email.verification.completed
- identity.email.verification.failed
- identity.password.reset.initiated
- identity.password.reset.completed
- identity.password.reset.expired
- identity.recovery.initiated
- identity.recovery.approved
- identity.recovery.completed
- identity.recovery.expired
- identity.recovery.cancelled
- identity.policy.evaluated
