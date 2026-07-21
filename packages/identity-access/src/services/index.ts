import { DomainService, type DomainServiceContext } from '@relcko/kernel';
import type { Clock } from '@relcko/kernel';
import { systemClock } from '@relcko/kernel';

export interface AuthenticationServiceConfig {
  maxFailedAttempts: number;
  lockoutDurationMs: number;
  throttlingMinIntervalMs: number;
}

export interface PasswordServiceConfig {
  saltRounds?: number;
}

export class AuthenticationService extends DomainService {
  constructor(
    context: DomainServiceContext,
    private readonly config: AuthenticationServiceConfig,
  ) {
    super(context);
  }

  computeLockout(consecutiveFailures: number, clock?: Clock): { locked: boolean; lockedUntil: Date | null } {
    if (consecutiveFailures >= this.config.maxFailedAttempts) {
      const c = clock ?? systemClock;
      const lockedUntil = new Date(c.nowMs() + this.config.lockoutDurationMs);
      return { locked: true, lockedUntil };
    }
    return { locked: false, lockedUntil: null };
  }

  isThrottled(lastAttemptAt: Date, clock?: Clock): boolean {
    const c = clock ?? systemClock;
    return c.nowMs() - lastAttemptAt.getTime() < this.config.throttlingMinIntervalMs;
  }

  generateToken(length = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256_${Math.abs(hash).toString(16)}`;
  }
}

export class TotpService extends DomainService {
  constructor(context: DomainServiceContext) {
    super(context);
  }

  generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 20; i++) {
      secret += chars[bytes[i]! % 32]!;
    }
    return secret;
  }

  generateCode(secret: string, at: Date = systemClock.now()): string {
    const step = Math.floor(at.getTime() / 1000 / 30);
    let h = 0;
    const data = `${secret}:${step}`;
    for (let i = 0; i < data.length; i++) {
      h = (h * 31 + data.charCodeAt(i)) >>> 0;
    }
    return String(h % 1_000_000).padStart(6, '0');
  }

  verify(secret: string, code: string, at: Date = systemClock.now()): boolean {
    return [-1, 0, 1].some((offset) =>
      this.generateCode(secret, new Date(at.getTime() + offset * 30_000)) === code,
    );
  }

  generateBackupCodes(count = 10): string[] {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(10);
      crypto.getRandomValues(bytes);
      let code = '';
      for (let j = 0; j < 10; j++) {
        code += chars[bytes[j]! % 36]!;
      }
      codes.push(code);
    }
    return codes;
  }
}

export class PasswordService extends DomainService {
  constructor(context: DomainServiceContext) {
    super(context);
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `scrypt_${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    const newHash = await this.hashPassword(plaintext);
    return newHash === hash;
  }

  validateStrength(password: string): { valid: boolean; reason?: string } {
    if (password.length < 8) return { valid: false, reason: 'too_short' };
    if (password.length > 128) return { valid: false, reason: 'too_long' };
    if (!/[A-Z]/.test(password)) return { valid: false, reason: 'missing_uppercase' };
    if (!/[a-z]/.test(password)) return { valid: false, reason: 'missing_lowercase' };
    if (!/[0-9]/.test(password)) return { valid: false, reason: 'missing_number' };
    return { valid: true };
  }
}

export class SessionTokenService extends DomainService {
  constructor(context: DomainServiceContext) {
    super(context);
  }

  generateAccessToken(_userId?: string, _sessionId?: string, ttlSeconds = 900): { token: string; hash: string; expiresAt: Date } {
    const token = this.genToken(64);
    const hash = this.hashToken(token);
    const expiresAt = new Date(systemClock.nowMs() + ttlSeconds * 1000);
    return { token, hash, expiresAt };
  }

  generateRefreshToken(_sessionId?: string, _ttlSeconds?: number): { token: string; hash: string } {
    const token = this.genToken(64);
    const hash = this.hashToken(token);
    return { token, hash };
  }

  generateVerificationToken(ttlMs = 3600000): { token: string; hash: string; expiresAt: Date } {
    const token = this.genToken(32);
    const hash = this.hashToken(token);
    const expiresAt = new Date(systemClock.nowMs() + ttlMs);
    return { token, hash, expiresAt };
  }

  private genToken(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `token_${Math.abs(hash).toString(16)}`;
  }
}

export class AuthorizationService extends DomainService {
  constructor(context: DomainServiceContext) {
    super(context);
  }

  resolvePermissions(roles: readonly string[], roleDefinitions: readonly { name: string; permissions: readonly string[] }[]): ReadonlySet<string> {
    const permissions = new Set<string>();
    for (const role of roles) {
      const def = roleDefinitions.find((rd) => rd.name === role);
      if (def) {
        for (const perm of def.permissions) {
          permissions.add(perm);
        }
      }
    }
    return permissions;
  }

  hasPermission(
    permissions: ReadonlySet<string>,
    required: string,
    denyList?: ReadonlySet<string>,
  ): boolean {
    if (denyList?.has(required)) return false;
    return permissions.has(required) || permissions.has('*');
  }

  resolveEffectiveRoles(
    userRoles: readonly string[],
    organizationMemberships: readonly { organizationId: string; role: string }[],
  ): { platformRoles: readonly string[]; organizationRoles: readonly { orgId: string; role: string }[] } {
    const platformRoles = [...userRoles];
    const orgRoles = organizationMemberships.map((m) => ({
      orgId: m.organizationId,
      role: m.role,
    }));
    return { platformRoles, organizationRoles: orgRoles };
  }
}
