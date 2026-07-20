import { describe, expect, it } from 'vitest';

import {
  AuthenticationFactor,
  AuthenticationMethod,
  AuthenticationResult,
  Timestamp,
  TokenStatus,
  UserStatus,
} from '../../value-objects';

describe('Timestamp', () => {
  it('creates from Date', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const ts = new Timestamp(date);
    expect(ts.value.getTime()).toBe(date.getTime());
  });

  it('creates from timestamp number', () => {
    const ts = new Timestamp(1704067200000);
    expect(ts.value.getTime()).toBe(1704067200000);
  });

  it('creates from ISO string', () => {
    const ts = new Timestamp('2024-01-01T00:00:00Z');
    expect(ts.value.getTime()).toBe(1704067200000);
  });

  it('creates now', () => {
    const before = Date.now();
    const ts = Timestamp.now();
    const after = Date.now();
    expect(ts.epochMs).toBeGreaterThanOrEqual(before);
    expect(ts.epochMs).toBeLessThanOrEqual(after);
  });

  it('throws on invalid date', () => {
    expect(() => new Timestamp('not-a-date')).toThrow();
    expect(() => new Timestamp(NaN)).toThrow();
  });

  it('equals by epoch time', () => {
    const a = new Timestamp(1704067200000);
    const b = new Timestamp(1704067200000);
    const c = new Timestamp(1704067200001);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('serializes to ISO string', () => {
    const ts = new Timestamp(1704067200000);
    expect(ts.toString()).toBe('2024-01-01T00:00:00.000Z');
    expect(ts.toJSON()).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('AuthenticationMethod', () => {
  it('creates from allowed values', () => {
    expect(new AuthenticationMethod('siwe').value).toBe('siwe');
    expect(new AuthenticationMethod('password').value).toBe('password');
    expect(new AuthenticationMethod('passkey').value).toBe('passkey');
    expect(new AuthenticationMethod('totp').value).toBe('totp');
    expect(new AuthenticationMethod('backup_code').value).toBe('backup_code');
    expect(new AuthenticationMethod('recovery').value).toBe('recovery');
  });

  it('throws on invalid', () => {
    expect(() => new AuthenticationMethod('')).toThrow();
    expect(() => new AuthenticationMethod('oauth')).toThrow();
  });
});

describe('AuthenticationFactor', () => {
  it('creates from allowed values', () => {
    expect(new AuthenticationFactor('knowledge').value).toBe('knowledge');
    expect(new AuthenticationFactor('possession').value).toBe('possession');
    expect(new AuthenticationFactor('inherence').value).toBe('inherence');
    expect(new AuthenticationFactor('location').value).toBe('location');
  });

  it('throws on invalid', () => {
    expect(() => new AuthenticationFactor('')).toThrow();
    expect(() => new AuthenticationFactor('biometric')).toThrow();
  });
});

describe('AuthenticationResult', () => {
  const siwe = new AuthenticationMethod('siwe');

  it('creates successful result', () => {
    const result = new AuthenticationResult({ success: true, method: siwe });
    expect(result.success).toBe(true);
    expect(result.method.toString()).toBe('siwe');
  });

  it('creates failed result with reason', () => {
    const result = new AuthenticationResult({
      success: false,
      method: siwe,
      failureReason: 'Invalid signature',
    });
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('Invalid signature');
  });

  it('throws on failure without reason', () => {
    expect(() => new AuthenticationResult({ success: false, method: siwe })).toThrow();
  });

  it('creates with attempt count', () => {
    const result = new AuthenticationResult({
      success: false,
      method: siwe,
      failureReason: 'bad',
      attemptCount: 3,
    });
    expect(result.attemptCount).toBe(3);
  });
});

describe('TokenStatus', () => {
  it('creates from allowed values', () => {
    expect(new TokenStatus('active').value).toBe('active');
    expect(new TokenStatus('expired').value).toBe('expired');
    expect(new TokenStatus('revoked').value).toBe('revoked');
    expect(new TokenStatus('consumed').value).toBe('consumed');
  });

  it('throws on invalid', () => {
    expect(() => new TokenStatus('')).toThrow();
    expect(() => new TokenStatus('pending')).toThrow();
  });

  it('has convenience accessors', () => {
    expect(new TokenStatus('active').isActive).toBe(true);
    expect(new TokenStatus('active').isExpired).toBe(false);
    expect(new TokenStatus('expired').isExpired).toBe(true);
    expect(new TokenStatus('revoked').isRevoked).toBe(true);
    expect(new TokenStatus('consumed').isConsumed).toBe(true);
  });
});

describe('UserStatus', () => {
  it('creates from allowed values', () => {
    expect(new UserStatus('active').value).toBe('active');
    expect(new UserStatus('inactive').value).toBe('inactive');
    expect(new UserStatus('suspended').value).toBe('suspended');
    expect(new UserStatus('locked').value).toBe('locked');
    expect(new UserStatus('deleted').value).toBe('deleted');
  });

  it('throws on invalid', () => {
    expect(() => new UserStatus('')).toThrow();
    expect(() => new UserStatus('pending')).toThrow();
  });

  it('has convenience accessors', () => {
    expect(new UserStatus('active').isActive).toBe(true);
    expect(new UserStatus('active').isDeleted).toBe(false);
    expect(new UserStatus('suspended').isSuspended).toBe(true);
    expect(new UserStatus('locked').isLocked).toBe(true);
    expect(new UserStatus('deleted').isDeleted).toBe(true);
  });
});
