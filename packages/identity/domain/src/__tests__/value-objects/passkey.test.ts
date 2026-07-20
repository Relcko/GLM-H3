import { describe, expect, it } from 'vitest';

import { AAGUID, PasskeyPublicKey, WebAuthnTransport } from '../../value-objects';

describe('PasskeyPublicKey', () => {
  it('creates from base64url string', () => {
    const key = new PasskeyPublicKey('pQECAyYgASFYIBSdNI1fX9Cx7sTLs9J8PJgCQwTzCQnFZ8vBxG7Jf9C');
    expect(key.value).toBe('pQECAyYgASFYIBSdNI1fX9Cx7sTLs9J8PJgCQwTzCQnFZ8vBxG7Jf9C');
  });

  it('creates from hex string', () => {
    const key = new PasskeyPublicKey('a1b2c3d4e5f6');
    expect(key.value).toBe('a1b2c3d4e5f6');
  });

  it('throws on empty', () => {
    expect(() => new PasskeyPublicKey('')).toThrow();
  });

  it('throws on invalid characters', () => {
    expect(() => new PasskeyPublicKey('invalid!@#')).toThrow();
  });
});

describe('AAGUID', () => {
  it('creates from valid UUID', () => {
    const guid = new AAGUID('550e8400-e29b-41d4-a716-446655440000');
    expect(guid.value).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('throws on invalid', () => {
    expect(() => new AAGUID('')).toThrow();
    expect(() => new AAGUID('not-a-guid')).toThrow();
  });
});

describe('WebAuthnTransport', () => {
  it('creates from allowed values', () => {
    expect(new WebAuthnTransport('usb').value).toBe('usb');
    expect(new WebAuthnTransport('nfc').value).toBe('nfc');
    expect(new WebAuthnTransport('ble').value).toBe('ble');
    expect(new WebAuthnTransport('internal').value).toBe('internal');
    expect(new WebAuthnTransport('hybrid').value).toBe('hybrid');
  });

  it('throws on invalid', () => {
    expect(() => new WebAuthnTransport('')).toThrow();
    expect(() => new WebAuthnTransport('wifi')).toThrow();
  });
});
