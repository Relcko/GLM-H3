import { describe, expect, it } from 'vitest';

import {
  ChainId,
  Nonce,
  Signature,
  SiweChallenge,
  SiweMessage,
  WalletAddress,
} from '../../value-objects';

describe('WalletAddress', () => {
  it('creates from valid address', () => {
    const addr = new WalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
    expect(addr.value).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18');
  });

  it('throws on invalid address', () => {
    expect(() => new WalletAddress('')).toThrow();
    expect(() => new WalletAddress('0xshort')).toThrow();
    expect(() => new WalletAddress('742d35Cc6634C0532925a3b844Bc9e7595f2bD18')).toThrow();
    expect(() => new WalletAddress('0xGGGG35Cc6634C0532925a3b844Bc9e7595f2bD18')).toThrow();
  });

  it('equals by value', () => {
    expect(
      new WalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18').equals(
        new WalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'),
      ),
    ).toBe(true);
    expect(
      new WalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18').equals(
        new WalletAddress('0x0000000000000000000000000000000000000001'),
      ),
    ).toBe(false);
  });

  it('serializes', () => {
    expect(new WalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18').toString()).toBe(
      '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    );
  });
});

describe('ChainId', () => {
  it('creates from positive integer', () => {
    expect(new ChainId(1).value).toBe(1);
    expect(new ChainId(137).value).toBe(137);
    expect(new ChainId(84532).value).toBe(84532);
  });

  it('throws on non-positive', () => {
    expect(() => new ChainId(0)).toThrow();
    expect(() => new ChainId(-1)).toThrow();
  });

  it('throws on non-integer', () => {
    expect(() => new ChainId(1.5)).toThrow();
  });

  it('serializes', () => {
    expect(new ChainId(1).toString()).toBe('1');
  });
});

describe('Signature', () => {
  it('creates from valid hex', () => {
    const sig = new Signature('0x1234abcdef');
    expect(sig.value).toBe('0x1234abcdef');
  });

  it('throws on invalid hex', () => {
    expect(() => new Signature('')).toThrow();
    expect(() => new Signature('1234')).toThrow();
    expect(() => new Signature('0xGGGG')).toThrow();
  });
});

describe('Nonce', () => {
  it('creates from valid hex', () => {
    const nonce = new Nonce('0xdeadbeef');
    expect(nonce.value).toBe('0xdeadbeef');
  });

  it('throws on invalid hex', () => {
    expect(() => new Nonce('')).toThrow();
    expect(() => new Nonce('not-hex')).toThrow();
  });
});

describe('SiweChallenge', () => {
  const validChallenge = {
    domain: 'example.com',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    uri: 'https://example.com/login',
    version: '1',
    chainId: 1,
    nonce: '0xabc123',
    issuedAt: '2024-01-01T00:00:00Z',
  };

  it('creates from valid values', () => {
    const c = new SiweChallenge(validChallenge);
    expect(c.domain).toBe('example.com');
    expect(c.chainId).toBe(1);
  });

  it('throws on missing required fields', () => {
    expect(() => new SiweChallenge({ ...validChallenge, domain: '' })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, address: '' })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, uri: '' })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, version: '' })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, chainId: 0 })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, nonce: '' })).toThrow();
    expect(() => new SiweChallenge({ ...validChallenge, issuedAt: '' })).toThrow();
  });

  it('equals by value', () => {
    const a = new SiweChallenge(validChallenge);
    const b = new SiweChallenge({ ...validChallenge });
    const c = new SiweChallenge({ ...validChallenge, nonce: '0xdifferent' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('SiweMessage', () => {
  const validMessage = {
    domain: 'example.com',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    uri: 'https://example.com/login',
    version: '1',
    chainId: 1,
    nonce: '0xabc123',
    issuedAt: '2024-01-01T00:00:00Z',
    statement: 'Sign in to Example',
  };

  it('creates from valid values', () => {
    const m = new SiweMessage(validMessage);
    expect(m.statement).toBe('Sign in to Example');
  });

  it('creates without optional fields', () => {
    const { statement: _, ...required } = validMessage;
    const m = new SiweMessage(required);
    expect(m.statement).toBeUndefined();
  });

  it('throws on missing required fields', () => {
    expect(() => new SiweMessage({ ...validMessage, domain: '' })).toThrow();
    expect(() => new SiweMessage({ ...validMessage, chainId: 0 })).toThrow();
  });
});
