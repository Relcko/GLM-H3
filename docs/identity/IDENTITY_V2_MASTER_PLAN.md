# Identity v2 Master Plan

Status: Final

## Scope

Identity v2 defines the domain layer for RELCKO identity and access primitives. This document records the accepted architecture and Sprint 2.1 stabilization posture. It does not introduce new architecture.

## Aggregates

- User: lifecycle, profile, email verification flags, password authentication flag, MFA flag.
- Wallet: wallet link, ownership verification, primary marker, supported chains, unlinking.
- Passkey: credential registration, verification, activation, rotation, usage, revocation.
- Session: session creation, activation, refresh, expiry, revocation, client metadata, refresh-token rotation.
- AuthenticationAttempt: authentication attempt recording, methods, MFA challenge state, risk, terminal outcomes.

## Invariants

- User restore does not elevate privileges. Restored users are inactive until explicitly activated.
- Passkey usage and credential rotation require verified, active, and not revoked.
- Passkey activation requires verified and not revoked.
- Wallet primary status is observable through WalletPrimaryUnset before primary wallets are revoked or unlinked.
- Session validity matches aggregate reusable guard semantics: not expired and not revoked.

## Persistence Contracts

Repository interfaces extend the kernel repository contract with concrete aggregate and identifier types:

- IUserRepository extends IRepository<User, UserId>
- IWalletRepository extends IRepository<Wallet, WalletId>
- IPasskeyRepository extends IRepository<Passkey, PasskeyId>
- ISessionRepository extends IRepository<Session, SessionId>
- IAuthenticationAttemptRepository extends IRepository<AuthenticationAttempt, AttemptId>

## Replay And Snapshots

Replay remains deterministic and folds ordered domain events into aggregate state. Snapshots remain state-only serialization and restoration of aggregate fields plus version.
