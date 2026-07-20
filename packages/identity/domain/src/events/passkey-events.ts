import { DomainEvent } from '@relcko/kernel';

import { EventCatalog } from './event-catalog';

import type { AAGUID, PasskeyPublicKey, WebAuthnTransport } from '../value-objects';
import type { PasskeyId, UserId } from '../value-objects';
import type { DomainEventProps } from '@relcko/kernel';

export interface PasskeyRegisteredPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly name: string;
  readonly credentialId: string;
  readonly publicKey: PasskeyPublicKey;
  readonly aaguid: AAGUID | null;
  readonly transports: readonly WebAuthnTransport[];
  readonly registeredAt: Date;
}

export interface PasskeyVerifiedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly verifiedAt: Date;
}

export interface PasskeyActivatedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly activatedAt: Date;
}

export interface PasskeyDeactivatedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly deactivatedAt: Date;
}

export interface PasskeyRevokedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly reason: string;
  readonly revokedAt: Date;
}

export interface PasskeyNameUpdatedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly name: string;
}

export interface PasskeyTransportsUpdatedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly transports: readonly WebAuthnTransport[];
}

export interface PasskeyCredentialRotatedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly credentialId: string;
  readonly publicKey: PasskeyPublicKey;
}

export interface PasskeyUsageRecordedPayload {
  readonly passkeyId: PasskeyId;
  readonly userId: UserId;
  readonly usedAt: Date;
}

export class PasskeyRegistered extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_REGISTERED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly name: string,
    readonly credentialId: string,
    readonly publicKey: PasskeyPublicKey,
    readonly aaguid: AAGUID | null,
    readonly transports: readonly WebAuthnTransport[],
    readonly registeredAt: Date,
  ) {
    super(props);
  }
}

export class PasskeyVerified extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_VERIFIED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly verifiedAt: Date,
  ) {
    super(props);
  }
}

export class PasskeyActivated extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_ACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly activatedAt: Date,
  ) {
    super(props);
  }
}

export class PasskeyDeactivated extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_DEACTIVATED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly deactivatedAt: Date,
  ) {
    super(props);
  }
}

export class PasskeyRevoked extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_REVOKED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly reason: string,
    readonly revokedAt: Date,
  ) {
    super(props);
  }
}

export class PasskeyNameUpdated extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_NAME_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly name: string,
  ) {
    super(props);
  }
}

export class PasskeyTransportsUpdated extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_TRANSPORTS_UPDATED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly transports: readonly WebAuthnTransport[],
  ) {
    super(props);
  }
}

export class PasskeyCredentialRotated extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_CREDENTIAL_ROTATED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly credentialId: string,
    readonly publicKey: PasskeyPublicKey,
  ) {
    super(props);
  }
}

export class PasskeyUsageRecorded extends DomainEvent {
  readonly eventType = EventCatalog.PASSKEY_USAGE_RECORDED;

  constructor(
    props: DomainEventProps,
    readonly passkeyId: PasskeyId,
    readonly userId: UserId,
    readonly usedAt: Date,
  ) {
    super(props);
  }
}

export const PasskeyEventTypeMap = {
  registered: EventCatalog.PASSKEY_REGISTERED,
  verified: EventCatalog.PASSKEY_VERIFIED,
  activated: EventCatalog.PASSKEY_ACTIVATED,
  deactivated: EventCatalog.PASSKEY_DEACTIVATED,
  revoked: EventCatalog.PASSKEY_REVOKED,
  nameUpdated: EventCatalog.PASSKEY_NAME_UPDATED,
  transportsUpdated: EventCatalog.PASSKEY_TRANSPORTS_UPDATED,
  credentialRotated: EventCatalog.PASSKEY_CREDENTIAL_ROTATED,
  usageRecorded: EventCatalog.PASSKEY_USAGE_RECORDED,
} as const;
