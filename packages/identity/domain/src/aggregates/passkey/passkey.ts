import { InvariantViolationError } from '@relcko/errors';
import { AggregateRoot } from '@relcko/kernel';

import { PasskeyRevokedError } from '../../errors';
import {
  PasskeyActivated,
  PasskeyCredentialRotated,
  PasskeyDeactivated,
  PasskeyNameUpdated,
  PasskeyRegistered,
  PasskeyRevoked,
  PasskeyTransportsUpdated,
  PasskeyUsageRecorded,
  PasskeyVerified,
} from '../../events/passkey-events';
import {
  AAGUID,
  PasskeyId,
  PasskeyPublicKey,
  UserId,
  WebAuthnTransport,
} from '../../value-objects';

import type { DomainEvent } from '@relcko/kernel';
import type { EventId } from '@relcko/types';

export interface PasskeySnapshot {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly credentialId: string;
  readonly publicKey: string;
  readonly aaguid: string | null;
  readonly transports: readonly string[];
  readonly verified: boolean;
  readonly active: boolean;
  readonly revoked: boolean;
  readonly registeredAt: string;
  readonly verifiedAt: string | null;
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
  readonly revokeReason: string | null;
  readonly version: number;
}

export class Passkey extends AggregateRoot<PasskeyId> {
  readonly aggregateType = 'Passkey';

  private _userId!: UserId;
  private _name!: string;
  private _credentialId!: string;
  private _publicKey!: PasskeyPublicKey;
  private _aaguid: AAGUID | null = null;
  private _transports: WebAuthnTransport[] = [];
  private _verified = false;
  private _active = false;
  private _revoked = false;
  private _registeredAt!: Date;
  private _verifiedAt: Date | null = null;
  private _lastUsedAt: Date | null = null;
  private _revokedAt: Date | null = null;
  private _revokeReason: string | null = null;

  private constructor(id: PasskeyId) {
    super(id);
  }

  static register(
    id: PasskeyId,
    userId: UserId,
    name: string,
    credentialId: string,
    publicKey: PasskeyPublicKey,
    aaguid: AAGUID | null,
    transports: readonly WebAuthnTransport[],
    eventId: EventId,
    occurredAt: Date,
  ): Passkey {
    if (!name.trim()) {
      throw new InvariantViolationError('Passkey', id.toString(), 'passkey-name-empty', {});
    }
    const passkey = new Passkey(id);
    passkey.apply(
      new PasskeyRegistered(
        {
          eventId,
          aggregateId: id.toString(),
          aggregateType: passkey.aggregateType,
          aggregateVersion: passkey.nextVersion(),
          occurredAt,
        },
        id,
        userId,
        name.trim(),
        credentialId,
        publicKey,
        aaguid,
        transports,
        occurredAt,
      ),
    );
    return passkey;
  }

  static fromSnapshot(snapshot: PasskeySnapshot): Passkey {
    const passkey = new Passkey(new PasskeyId(snapshot.id));
    passkey._userId = new UserId(snapshot.userId);
    passkey._name = snapshot.name;
    passkey._credentialId = snapshot.credentialId;
    passkey._publicKey = new PasskeyPublicKey(snapshot.publicKey);
    passkey._aaguid = snapshot.aaguid ? new AAGUID(snapshot.aaguid) : null;
    passkey._transports = snapshot.transports.map((t) => new WebAuthnTransport(t));
    passkey._verified = snapshot.verified;
    passkey._active = snapshot.active;
    passkey._revoked = snapshot.revoked;
    passkey._registeredAt = new Date(snapshot.registeredAt);
    passkey._verifiedAt = snapshot.verifiedAt ? new Date(snapshot.verifiedAt) : null;
    passkey._lastUsedAt = snapshot.lastUsedAt ? new Date(snapshot.lastUsedAt) : null;
    passkey._revokedAt = snapshot.revokedAt ? new Date(snapshot.revokedAt) : null;
    passkey._revokeReason = snapshot.revokeReason;
    passkey.restoreVersion(snapshot.version);
    return passkey;
  }

  static reconstitute(id: PasskeyId): Passkey {
    return new Passkey(id);
  }

  get userId(): UserId {
    return this._userId;
  }

  get name(): string {
    return this._name;
  }

  get credentialId(): string {
    return this._credentialId;
  }

  get publicKey(): PasskeyPublicKey {
    return this._publicKey;
  }

  get aaguid(): AAGUID | null {
    return this._aaguid;
  }

  get transports(): readonly WebAuthnTransport[] {
    return [...this._transports];
  }

  get verified(): boolean {
    return this._verified;
  }

  get active(): boolean {
    return this._active;
  }

  get revoked(): boolean {
    return this._revoked;
  }

  get registeredAt(): Date {
    return this._registeredAt;
  }

  get verifiedAt(): Date | null {
    return this._verifiedAt;
  }

  get lastUsedAt(): Date | null {
    return this._lastUsedAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get revokeReason(): string | null {
    return this._revokeReason;
  }

  verifyRegistration(eventId: EventId, occurredAt: Date): void {
    this.requireNotRevoked();
    if (this._verified) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-already-verified',
        {},
      );
    }
    this.apply(
      new PasskeyVerified(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  activate(eventId: EventId, occurredAt: Date): void {
    this.requireNotRevoked();
    if (this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-already-active',
        {},
      );
    }
    this.apply(
      new PasskeyActivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  deactivate(eventId: EventId, occurredAt: Date): void {
    this.requireNotRevoked();
    if (!this._active) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-not-active',
        {},
      );
    }
    this.apply(
      new PasskeyDeactivated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  revoke(reason: string, eventId: EventId, occurredAt: Date): void {
    if (this._revoked) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-already-revoked',
        {},
      );
    }
    if (!reason.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-revoke-reason-required',
        {},
      );
    }
    this.apply(
      new PasskeyRevoked(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        reason.trim(),
        occurredAt,
      ),
    );
  }

  updateName(name: string, eventId: EventId, occurredAt: Date): void {
    this.requireNotRevoked();
    if (!name.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-name-empty',
        {},
      );
    }
    const trimmed = name.trim();
    if (trimmed === this._name) {
      return;
    }
    this.apply(
      new PasskeyNameUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        trimmed,
      ),
    );
  }

  updateTransports(
    transports: readonly WebAuthnTransport[],
    eventId: EventId,
    occurredAt: Date,
  ): void {
    this.requireNotRevoked();
    if (transports.length === 0) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-transports-empty',
        {},
      );
    }
    const current = this._transports;
    if (
      current.length === transports.length &&
      current.every((t, i) => t.toString() === transports[i]?.toString())
    ) {
      return;
    }
    this.apply(
      new PasskeyTransportsUpdated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        transports,
      ),
    );
  }

  rotateCredential(
    credentialId: string,
    publicKey: PasskeyPublicKey,
    eventId: EventId,
    occurredAt: Date,
  ): void {
    this.requireNotRevoked();
    if (!credentialId.trim()) {
      throw new InvariantViolationError(
        this.aggregateType,
        this.id.toString(),
        'passkey-credential-id-empty',
        {},
      );
    }
    this.apply(
      new PasskeyCredentialRotated(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        credentialId.trim(),
        publicKey,
      ),
    );
  }

  recordUsage(eventId: EventId, occurredAt: Date): void {
    this.requireNotRevoked();
    this.apply(
      new PasskeyUsageRecorded(
        {
          eventId,
          aggregateId: this.id.toString(),
          aggregateType: this.aggregateType,
          aggregateVersion: this.nextVersion(),
          occurredAt,
        },
        this.id,
        this._userId,
        occurredAt,
      ),
    );
  }

  toSnapshot(): PasskeySnapshot {
    return {
      id: this.id.toString(),
      userId: this._userId.toString(),
      name: this._name,
      credentialId: this._credentialId,
      publicKey: this._publicKey.toString(),
      aaguid: this._aaguid?.toString() ?? null,
      transports: this._transports.map((t) => t.toString()),
      verified: this._verified,
      active: this._active,
      revoked: this._revoked,
      registeredAt: this._registeredAt.toISOString(),
      verifiedAt: this._verifiedAt?.toISOString() ?? null,
      lastUsedAt: this._lastUsedAt?.toISOString() ?? null,
      revokedAt: this._revokedAt?.toISOString() ?? null,
      revokeReason: this._revokeReason,
      version: this.version,
    };
  }

  protected when(event: DomainEvent): void {
    if (event instanceof PasskeyRegistered) {
      this._userId = event.userId;
      this._name = event.name;
      this._credentialId = event.credentialId;
      this._publicKey = event.publicKey;
      this._aaguid = event.aaguid;
      this._transports = [...event.transports];
      this._active = true;
      this._registeredAt = event.registeredAt;
    } else if (event instanceof PasskeyVerified) {
      this._verified = true;
      this._verifiedAt = event.verifiedAt;
    } else if (event instanceof PasskeyActivated) {
      this._active = true;
    } else if (event instanceof PasskeyDeactivated) {
      this._active = false;
    } else if (event instanceof PasskeyRevoked) {
      this._revoked = true;
      this._active = false;
      this._revokedAt = event.revokedAt;
      this._revokeReason = event.reason;
    } else if (event instanceof PasskeyNameUpdated) {
      this._name = event.name;
    } else if (event instanceof PasskeyTransportsUpdated) {
      this._transports = [...event.transports];
    } else if (event instanceof PasskeyCredentialRotated) {
      this._credentialId = event.credentialId;
      this._publicKey = event.publicKey;
    } else if (event instanceof PasskeyUsageRecorded) {
      this._lastUsedAt = event.usedAt;
    }
  }

  private requireNotRevoked(): void {
    if (this._revoked) {
      throw new PasskeyRevokedError(this.id.toString(), this._revokeReason ?? undefined);
    }
  }
}
