import { describe, expect, it } from 'vitest';

import { AuditCategory, AuditContext, AuditRecord } from '../../value-objects';

describe('AuditCategory', () => {
  it('creates from allowed values', () => {
    expect(new AuditCategory('authentication').value).toBe('authentication');
    expect(new AuditCategory('authorization').value).toBe('authorization');
    expect(new AuditCategory('account').value).toBe('account');
    expect(new AuditCategory('wallet').value).toBe('wallet');
    expect(new AuditCategory('session').value).toBe('session');
    expect(new AuditCategory('recovery').value).toBe('recovery');
    expect(new AuditCategory('passkey').value).toBe('passkey');
    expect(new AuditCategory('admin').value).toBe('admin');
    expect(new AuditCategory('settings').value).toBe('settings');
    expect(new AuditCategory('security').value).toBe('security');
  });

  it('throws on invalid', () => {
    expect(() => new AuditCategory('')).toThrow();
    expect(() => new AuditCategory('unknown')).toThrow();
  });
});

describe('AuditContext', () => {
  it('creates with all fields', () => {
    const ctx = new AuditContext({
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      requestId: 'req-123',
      correlationId: 'corr-456',
      sessionId: 'sess-789',
      location: 'US',
    });
    expect(ctx.ipAddress).toBe('192.168.1.1');
    expect(ctx.correlationId).toBe('corr-456');
  });

  it('creates with empty context', () => {
    const ctx = new AuditContext({});
    expect(ctx.ipAddress).toBeUndefined();
  });

  it('equals by value', () => {
    const a = new AuditContext({ ipAddress: '1.1.1.1' });
    const b = new AuditContext({ ipAddress: '1.1.1.1' });
    const c = new AuditContext({ ipAddress: '2.2.2.2' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('AuditRecord', () => {
  const validRecord = {
    category: new AuditCategory('authentication'),
    action: 'login',
    actorId: 'user-123',
    outcome: 'success',
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };

  it('creates from valid values', () => {
    const record = new AuditRecord(validRecord);
    expect(record.action).toBe('login');
    expect(record.outcome).toBe('success');
  });

  it('throws on missing required fields', () => {
    expect(() => new AuditRecord({ ...validRecord, action: '' })).toThrow();
    expect(() => new AuditRecord({ ...validRecord, actorId: '' })).toThrow();
    expect(() => new AuditRecord({ ...validRecord, outcome: '' })).toThrow();
  });

  it('creates with optional fields', () => {
    const record = new AuditRecord({
      ...validRecord,
      targetId: 'target-456',
      context: new AuditContext({ ipAddress: '1.1.1.1' }),
      metadata: { browser: 'Chrome' },
    });
    expect(record.targetId).toBe('target-456');
    expect(record.metadata).toEqual({ browser: 'Chrome' });
  });

  it('equals by value', () => {
    const a = new AuditRecord(validRecord);
    const b = new AuditRecord({ ...validRecord });
    const c = new AuditRecord({ ...validRecord, action: 'logout' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
