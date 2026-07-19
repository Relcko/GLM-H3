import { describe, expect, it } from 'vitest';

import {
  AvatarUrl,
  DisplayName,
  EmailAddress,
  Locale,
  PhoneNumber,
  Timezone,
} from '../../value-objects';

describe('EmailAddress', () => {
  it('creates from valid email', () => {
    const email = new EmailAddress('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('throws on invalid email', () => {
    expect(() => new EmailAddress('')).toThrow();
    expect(() => new EmailAddress('not-email')).toThrow();
    expect(() => new EmailAddress('@example.com')).toThrow();
    expect(() => new EmailAddress('test@')).toThrow();
  });

  it('fromRaw normalizes', () => {
    const email = EmailAddress.fromRaw('  Test@Example.COM  ');
    expect(email.value).toBe('test@example.com');
  });

  it('equals by value', () => {
    expect(new EmailAddress('a@b.com').equals(new EmailAddress('a@b.com'))).toBe(true);
    expect(new EmailAddress('a@b.com').equals(new EmailAddress('c@b.com'))).toBe(false);
  });

  it('serializes', () => {
    expect(new EmailAddress('test@example.com').toString()).toBe('test@example.com');
  });
});

describe('PhoneNumber', () => {
  it('creates from valid phone', () => {
    const phone = new PhoneNumber('+1234567890');
    expect(phone.value).toBe('+1234567890');
  });

  it('throws on invalid phone', () => {
    expect(() => new PhoneNumber('')).toThrow();
    expect(() => new PhoneNumber('12345')).toThrow();
    expect(() => new PhoneNumber('+abc')).toThrow();
  });

  it('equals by value', () => {
    expect(new PhoneNumber('+1234567890').equals(new PhoneNumber('+1234567890'))).toBe(true);
    expect(new PhoneNumber('+1234567890').equals(new PhoneNumber('+1987654321'))).toBe(false);
  });

  it('serializes', () => {
    expect(new PhoneNumber('+1234567890').toString()).toBe('+1234567890');
  });
});

describe('DisplayName', () => {
  it('creates from valid name', () => {
    const name = new DisplayName('John Doe');
    expect(name.value).toBe('John Doe');
  });

  it('throws on empty or whitespace', () => {
    expect(() => new DisplayName('')).toThrow();
    expect(() => new DisplayName('   ')).toThrow();
  });

  it('throws on too long', () => {
    expect(() => new DisplayName('a'.repeat(101))).toThrow();
  });

  it('accepts max length', () => {
    expect(new DisplayName('a'.repeat(100)).value).toBe('a'.repeat(100));
  });

  it('equals by value', () => {
    expect(new DisplayName('Alice').equals(new DisplayName('Alice'))).toBe(true);
    expect(new DisplayName('Alice').equals(new DisplayName('Bob'))).toBe(false);
  });
});

describe('AvatarUrl', () => {
  it('creates from valid URL', () => {
    const url = new AvatarUrl('https://example.com/avatar.png');
    expect(url.value).toBe('https://example.com/avatar.png');
  });

  it('throws on invalid URL', () => {
    expect(() => new AvatarUrl('')).toThrow();
    expect(() => new AvatarUrl('not-a-url')).toThrow();
    expect(() => new AvatarUrl('ftp://bad')).toThrow();
  });

  it('accepts http URLs', () => {
    expect(new AvatarUrl('http://example.com/pic.jpg').value).toBe('http://example.com/pic.jpg');
  });
});

describe('Locale', () => {
  it('creates from valid locale', () => {
    expect(new Locale('en').value).toBe('en');
    expect(new Locale('en-US').value).toBe('en-US');
    expect(new Locale('zh').value).toBe('zh');
  });

  it('throws on invalid locale', () => {
    expect(() => new Locale('')).toThrow();
    expect(() => new Locale('123')).toThrow();
    expect(() => new Locale('en_US')).toThrow();
  });
});

describe('Timezone', () => {
  it('creates from valid timezone', () => {
    expect(new Timezone('America/New_York').value).toBe('America/New_York');
    expect(new Timezone('UTC').value).toBe('UTC');
    expect(new Timezone('Europe/London').value).toBe('Europe/London');
  });

  it('throws on unknown timezone', () => {
    expect(() => new Timezone('Mars/Olympus')).toThrow();
  });

  it('throws on invalid format', () => {
    expect(() => new Timezone('')).toThrow();
  });
});
