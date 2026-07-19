import { describe, expect, it } from 'vitest';

import {
  ApiKeyHash,
  BackupCodeHash,
  HashAlgorithm,
  HashParameters,
  PasswordHash,
  RefreshTokenHash,
  SecretReference,
  TotpSecret,
  TrustToken,
} from '../../value-objects';

describe('PasswordHash', () => {
  it('creates from non-empty string', () => {
    const hash = new PasswordHash('$argon2id$v=19$m=65536,t=3,p=4$...');
    expect(hash.value).toBe('$argon2id$v=19$m=65536,t=3,p=4$...');
  });

  it('throws on empty', () => {
    expect(() => new PasswordHash('')).toThrow();
  });

  it('equals by value', () => {
    expect(new PasswordHash('abc').equals(new PasswordHash('abc'))).toBe(true);
    expect(new PasswordHash('abc').equals(new PasswordHash('def'))).toBe(false);
  });
});

describe('HashAlgorithm', () => {
  it('creates from allowed values', () => {
    expect(new HashAlgorithm('argon2id').value).toBe('argon2id');
    expect(new HashAlgorithm('bcrypt').value).toBe('bcrypt');
    expect(new HashAlgorithm('scrypt').value).toBe('scrypt');
    expect(new HashAlgorithm('pbkdf2').value).toBe('pbkdf2');
  });

  it('throws on invalid algorithm', () => {
    expect(() => new HashAlgorithm('md5')).toThrow();
    expect(() => new HashAlgorithm('sha256')).toThrow();
    expect(() => new HashAlgorithm('')).toThrow();
  });
});

describe('HashParameters', () => {
  it('creates from valid parameters', () => {
    const params = new HashParameters({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 32,
    });
    expect(params.memory).toBe(65536);
    expect(params.iterations).toBe(3);
    expect(params.parallelism).toBe(4);
    expect(params.saltLength).toBe(16);
    expect(params.keyLength).toBe(32);
  });

  it('throws on invalid values', () => {
    expect(
      () =>
        new HashParameters({
          memory: 0,
          iterations: 3,
          parallelism: 4,
          saltLength: 16,
          keyLength: 32,
        }),
    ).toThrow();
    expect(
      () =>
        new HashParameters({
          memory: 1,
          iterations: 0,
          parallelism: 1,
          saltLength: 1,
          keyLength: 1,
        }),
    ).toThrow();
    expect(
      () =>
        new HashParameters({
          memory: 1,
          iterations: 1,
          parallelism: 0,
          saltLength: 1,
          keyLength: 1,
        }),
    ).toThrow();
    expect(
      () =>
        new HashParameters({
          memory: 1,
          iterations: 1,
          parallelism: 1,
          saltLength: 0,
          keyLength: 1,
        }),
    ).toThrow();
    expect(
      () =>
        new HashParameters({
          memory: 1,
          iterations: 1,
          parallelism: 1,
          saltLength: 1,
          keyLength: 0,
        }),
    ).toThrow();
  });

  it('equals by all components', () => {
    const a = new HashParameters({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 32,
    });
    const b = new HashParameters({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 32,
    });
    const c = new HashParameters({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 64,
    });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('serializes to JSON', () => {
    const params = new HashParameters({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 32,
    });
    expect(params.toJSON()).toEqual({
      memory: 65536,
      iterations: 3,
      parallelism: 4,
      saltLength: 16,
      keyLength: 32,
    });
  });
});

describe('TotpSecret', () => {
  it('creates from valid base32', () => {
    expect(new TotpSecret('JBSWY3DPEHPK3PXP').value).toBe('JBSWY3DPEHPK3PXP');
  });

  it('throws on invalid', () => {
    expect(() => new TotpSecret('')).toThrow();
    expect(() => new TotpSecret('not-base32!')).toThrow();
    expect(() => new TotpSecret('short')).toThrow();
  });
});

describe('SecretReference', () => {
  it('creates from non-empty string', () => {
    expect(new SecretReference('secret:abc123').value).toBe('secret:abc123');
  });

  it('throws on empty', () => {
    expect(() => new SecretReference('')).toThrow();
  });
});

describe('BackupCodeHash', () => {
  it('creates from non-empty string', () => {
    expect(new BackupCodeHash('$2b$10$...').value).toBe('$2b$10$...');
  });

  it('throws on empty', () => {
    expect(() => new BackupCodeHash('')).toThrow();
  });
});

describe('TrustToken', () => {
  it('creates from non-empty string', () => {
    expect(new TrustToken('device-token-xyz').value).toBe('device-token-xyz');
  });

  it('throws on empty', () => {
    expect(() => new TrustToken('')).toThrow();
  });
});

describe('RefreshTokenHash', () => {
  it('creates from non-empty string', () => {
    expect(new RefreshTokenHash('sha256:abc...').value).toBe('sha256:abc...');
  });

  it('throws on empty', () => {
    expect(() => new RefreshTokenHash('')).toThrow();
  });
});

describe('ApiKeyHash', () => {
  it('creates from non-empty string', () => {
    expect(new ApiKeyHash('sk-...hash').value).toBe('sk-...hash');
  });

  it('throws on empty', () => {
    expect(() => new ApiKeyHash('')).toThrow();
  });
});
