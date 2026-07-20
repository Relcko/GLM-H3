import { describe, expect, it } from 'vitest';

import {
  Capability,
  Permission,
  PermissionScope,
  PolicyEffect,
  PolicyExpression,
  ResourcePattern,
} from '../../value-objects';

describe('Permission', () => {
  it('creates from valid format', () => {
    expect(new Permission('user:read').value).toBe('user:read');
    expect(new Permission('admin:write').value).toBe('admin:write');
  });

  it('throws on invalid format', () => {
    expect(() => new Permission('')).toThrow();
    expect(() => new Permission('user')).toThrow();
    expect(() => new Permission(':read')).toThrow();
    expect(() => new Permission('user:')).toThrow();
  });
});

describe('PermissionScope', () => {
  it('creates from non-empty string', () => {
    expect(new PermissionScope('*').value).toBe('*');
    expect(new PermissionScope('org:123').value).toBe('org:123');
  });

  it('throws on empty', () => {
    expect(() => new PermissionScope('')).toThrow();
  });
});

describe('Capability', () => {
  it('creates from valid format', () => {
    expect(new Capability('user').value).toBe('user');
    expect(new Capability('user:read').value).toBe('user:read');
    expect(new Capability('user:read:own').value).toBe('user:read:own');
  });

  it('throws on invalid format', () => {
    expect(() => new Capability('')).toThrow();
    expect(() => new Capability(':user')).toThrow();
    expect(() => new Capability('User:Read')).toThrow();
  });
});

describe('ResourcePattern', () => {
  it('creates from valid pattern', () => {
    expect(new ResourcePattern('/users/*').value).toBe('/users/*');
    expect(new ResourcePattern('/users/:id').value).toBe('/users/:id');
  });

  it('throws on empty', () => {
    expect(() => new ResourcePattern('')).toThrow();
  });

  it('throws if not starting with /', () => {
    expect(() => new ResourcePattern('users/*')).toThrow();
  });
});

describe('PolicyEffect', () => {
  it('creates from Allow or Deny', () => {
    expect(new PolicyEffect('Allow').value).toBe('Allow');
    expect(new PolicyEffect('Deny').value).toBe('Deny');
  });

  it('throws on invalid', () => {
    expect(() => new PolicyEffect('')).toThrow();
    expect(() => new PolicyEffect('allow')).toThrow();
    expect(() => new PolicyEffect('deny')).toThrow();
    expect(() => new PolicyEffect('Permit')).toThrow();
  });

  it('has convenience accessors', () => {
    expect(new PolicyEffect('Allow').isAllow).toBe(true);
    expect(new PolicyEffect('Allow').isDeny).toBe(false);
    expect(new PolicyEffect('Deny').isAllow).toBe(false);
    expect(new PolicyEffect('Deny').isDeny).toBe(true);
  });
});

describe('PolicyExpression', () => {
  it('creates from valid conditions', () => {
    const expr = new PolicyExpression({
      conditions: [{ operator: 'eq', field: 'role', value: 'admin' }],
    });
    expect(expr.conditions).toHaveLength(1);
    expect(expr.operator).toBe('and');
  });

  it('throws on empty conditions', () => {
    expect(() => new PolicyExpression({ conditions: [] })).toThrow();
  });

  it('throws on missing condition fields', () => {
    expect(
      () =>
        new PolicyExpression({
          conditions: [{ operator: '' as never, field: '', value: undefined }],
        }),
    ).toThrow();
  });

  it('equals by value', () => {
    const a = new PolicyExpression({
      conditions: [{ operator: 'eq', field: 'role', value: 'admin' }],
    });
    const b = new PolicyExpression({
      conditions: [{ operator: 'eq', field: 'role', value: 'admin' }],
    });
    const c = new PolicyExpression({
      conditions: [{ operator: 'eq', field: 'role', value: 'user' }],
    });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('serializes to JSON', () => {
    const expr = new PolicyExpression({
      conditions: [{ operator: 'eq', field: 'role', value: 'admin' }],
      operator: 'or',
    });
    expect(expr.toJSON()).toEqual({
      conditions: [{ operator: 'eq', field: 'role', value: 'admin' }],
      operator: 'or',
    });
  });
});
