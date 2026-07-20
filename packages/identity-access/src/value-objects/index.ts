import { ValueObject } from '@relcko/kernel';

export class Email extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!Email.isValid(value)) {
      throw new Error(`Invalid email: ${value}`);
    }
  }

  static isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  static fromRaw(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}

export class Phone extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!Phone.isValid(value)) {
      throw new Error(`Invalid phone: ${value}`);
    }
  }

  static isValid(value: string): boolean {
    return /^\+[1-9]\d{6,14}$/.test(value);
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}

export class DeviceFingerprint extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value || value.length < 8) {
      throw new Error('Device fingerprint must be at least 8 characters');
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class TotpSecret extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!TotpSecret.isValid(value)) {
      throw new Error('Invalid TOTP secret');
    }
  }

  static generate(): TotpSecret {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 20; i++) {
      secret += chars[bytes[i]! % 32]!;
    }
    return new TotpSecret(secret);
  }

  static isValid(value: string): boolean {
    return /^[A-Z2-7]{16,}$/.test(value);
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class BackupCode extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!BackupCode.isValid(value)) {
      throw new Error('Invalid backup code format');
    }
  }

  static generate(): BackupCode {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 10; i++) {
      code += chars[bytes[i]! % 36]!;
    }
    return new BackupCode(code);
  }

  static isValid(value: string): boolean {
    return /^[a-z0-9]{10}$/.test(value);
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class BackupCodeHash extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) throw new Error('Backup code hash must not be empty');
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class PasswordHash extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) throw new Error('Password hash must not be empty');
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class IpAddress extends ValueObject {
  constructor(public readonly value: string) {
    super();
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class UserAgent extends ValueObject {
  constructor(public readonly value: string) {
    super();
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class AccessTokenValue extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) throw new Error('Access token must not be empty');
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class RefreshTokenValue extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!value) throw new Error('Refresh token must not be empty');
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

export class CapabilityName extends ValueObject {
  constructor(public readonly value: string) {
    super();
    if (!/^[a-z][a-z0-9_]*(:[a-z][a-z0-9_]*)*$/.test(value)) {
      throw new Error(`Invalid capability name: ${value}`);
    }
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
