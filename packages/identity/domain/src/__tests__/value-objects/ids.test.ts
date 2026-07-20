import { describe, expect, it } from 'vitest';

import {
  AttemptId,
  DecisionId,
  OrganizationId,
  PasskeyId,
  RecoveryId,
  RoleId,
  ServiceAccountId,
  SessionId,
  TokenId,
  UserId,
  WalletId,
} from '../../value-objects';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

describe('UserId', () => {
  it('creates from valid UUID', () => {
    const id = new UserId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('throws on invalid UUID', () => {
    expect(() => new UserId('not-a-uuid')).toThrow();
    expect(() => new UserId('')).toThrow();
    expect(() => new UserId('550e8400-e29b-41d4-a716-44665544000Z')).toThrow();
  });

  it('equals identical values', () => {
    expect(new UserId(VALID_UUID).equals(new UserId(VALID_UUID))).toBe(true);
  });

  it('not equals different values', () => {
    expect(new UserId(VALID_UUID).equals(new UserId(VALID_UUID_2))).toBe(false);
  });

  it('not equals null/undefined', () => {
    expect(new UserId(VALID_UUID).equals(null)).toBe(false);
    expect(new UserId(VALID_UUID).equals(undefined)).toBe(false);
  });

  it('is immutable - only exposes readonly property and query methods', () => {
    const id = new UserId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
    expect(typeof id.equals).toBe('function');
    expect(typeof id.toString).toBe('function');
  });

  it('serializes to string', () => {
    expect(new UserId(VALID_UUID).toString()).toBe(VALID_UUID);
  });
});

describe('WalletId', () => {
  it('creates from valid UUID', () => {
    const id = new WalletId(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('throws on invalid UUID', () => {
    expect(() => new WalletId('bad')).toThrow();
  });

  it('equals by value', () => {
    expect(new WalletId(VALID_UUID).equals(new WalletId(VALID_UUID))).toBe(true);
    expect(new WalletId(VALID_UUID).equals(new WalletId(VALID_UUID_2))).toBe(false);
  });

  it('not equals different type', () => {
    expect(new WalletId(VALID_UUID).equals(new UserId(VALID_UUID))).toBe(false);
  });
});

describe('SessionId', () => {
  it('creates from valid UUID', () => {
    expect(new SessionId(VALID_UUID).value).toBe(VALID_UUID);
  });

  it('throws on invalid UUID', () => {
    expect(() => new SessionId('')).toThrow();
  });
});

describe('OrganizationId', () => {
  it('creates from valid UUID', () => {
    expect(new OrganizationId(VALID_UUID).value).toBe(VALID_UUID);
  });

  it('throws on invalid', () => {
    expect(() => new OrganizationId('invalid')).toThrow();
  });
});

describe('ServiceAccountId', () => {
  it('creates from valid UUID', () => {
    expect(new ServiceAccountId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('PasskeyId', () => {
  it('creates from valid UUID', () => {
    expect(new PasskeyId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('RecoveryId', () => {
  it('creates from valid UUID', () => {
    expect(new RecoveryId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('RoleId', () => {
  it('creates from valid UUID', () => {
    expect(new RoleId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('AttemptId', () => {
  it('creates from valid UUID', () => {
    expect(new AttemptId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('TokenId', () => {
  it('creates from valid UUID', () => {
    expect(new TokenId(VALID_UUID).value).toBe(VALID_UUID);
  });
});

describe('DecisionId', () => {
  it('creates from valid UUID', () => {
    expect(new DecisionId(VALID_UUID).value).toBe(VALID_UUID);
  });
});
