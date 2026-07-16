import { generateId } from "@relcko/utils";
import { randomBytes } from "node:crypto";
import { HmacToken, type Token } from "@relcko/security";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Account, AuthTokens, Session } from "./types";
import { IdentityEventType, publishIdentityEvent } from "./events";
import { SessionError } from "./errors";

interface SessionTokenPayload {
  sub: string;
  sid: string;
  typ: "access" | "refresh";
}

export interface SessionStore {
  save(session: Session): Promise<void>;
  get(id: EntityId): Promise<Session | undefined>;
  listByAccount(accountId: EntityId): Promise<Session[]>;
  listAll(): Promise<Session[]>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();
  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }
  async get(id: EntityId): Promise<Session | undefined> {
    return this.sessions.get(id);
  }
  async listByAccount(accountId: EntityId): Promise<Session[]> {
    return [...this.sessions.values()].filter((s) => s.accountId === accountId);
  }
  async listAll(): Promise<Session[]> {
    return [...this.sessions.values()];
  }
}

export interface SessionEngineOptions {
  readonly bus: EventBus;
  readonly secret: string;
  readonly accessTtlSeconds?: number;
  readonly refreshTtlSeconds?: number;
  readonly maxConcurrentSessions?: number;
}

export class SessionEngine {
  private readonly token: Token;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly maxConcurrent: number;

  constructor(
    private readonly store: SessionStore,
    private readonly options: SessionEngineOptions,
  ) {
    this.token = new HmacToken();
    this.accessTtl = options.accessTtlSeconds ?? 900;
    this.refreshTtl = options.refreshTtlSeconds ?? 2_592_000;
    this.maxConcurrent = options.maxConcurrentSessions ?? 10;
  }

  async createSession(
    account: Account,
    opts: { deviceFingerprint?: string; ip?: string; userAgent?: string } = {},
  ): Promise<AuthTokens> {
    await this.enforceConcurrency(account.id);
    const sessionId = generateId("ses");
    const trusted = opts.deviceFingerprint
      ? (await this.store.listByAccount(account.id)).some(
          (s) => s.deviceFingerprint === opts.deviceFingerprint,
        )
      : false;
    const now = Date.now();
    const accessToken = this.issue(sessionId, account.id, "access", this.accessTtl);
    const refreshToken = this.issue(sessionId, account.id, "refresh", this.refreshTtl);
    const session: Session = {
      id: sessionId,
      accountId: account.id,
      accessToken,
      refreshToken,
      accessExpiresAt: new Date(now + this.accessTtl * 1000).toISOString(),
      refreshExpiresAt: new Date(now + this.refreshTtl * 1000).toISOString(),
      deviceFingerprint: opts.deviceFingerprint,
      trustedDevice: trusted,
      ip: opts.ip,
      userAgent: opts.userAgent,
      createdAt: new Date(now).toISOString(),
      lastActivityAt: new Date(now).toISOString(),
      revoked: false,
    };
    await this.store.save(session);
    return {
      accessToken,
      refreshToken,
      sessionId,
      accessExpiresAt: session.accessExpiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verify(refreshToken, "refresh");
    const session = await this.store.get(payload.sid as EntityId);
    if (!session || session.revoked) {
      throw new SessionError("Session is invalid or revoked", "SESSION_INVALID");
    }
    if (session.accountId !== payload.sub) {
      throw new SessionError("Session subject mismatch", "SESSION_SUBJECT");
    }
    if (session.refreshToken !== refreshToken) {
      // Presented refresh token is not the current one: rotation already
      // happened (or a stolen token was used). Revoke defensively.
      await this.revokeSession(session.id);
      await this.expireEvent(session);
      throw new SessionError("Refresh token reuse detected", "REFRESH_REUSE");
    }
    if (Date.now() > Date.parse(session.refreshExpiresAt)) {
      await this.revokeSession(session.id);
      await this.expireEvent(session);
      throw new SessionError("Refresh token expired", "REFRESH_EXPIRED");
    }
    // Rotate refresh token (reuse access TTL window).
    const now = Date.now();
    const newRefresh = this.issue(session.id, session.accountId, "refresh", this.refreshTtl);
    const newAccess = this.issue(session.id, session.accountId, "access", this.accessTtl);
    const rotated: Session = {
      ...session,
      accessToken: newAccess,
      refreshToken: newRefresh,
      accessExpiresAt: new Date(now + this.accessTtl * 1000).toISOString(),
      refreshExpiresAt: new Date(now + this.refreshTtl * 1000).toISOString(),
      lastActivityAt: new Date(now).toISOString(),
    };
    await this.store.save(rotated);
    return {
      accessToken: newAccess,
      refreshToken: newRefresh,
      sessionId: session.id,
      accessExpiresAt: rotated.accessExpiresAt,
      refreshExpiresAt: rotated.refreshExpiresAt,
    };
  }

  async revokeSession(sessionId: EntityId): Promise<void> {
    const session = await this.store.get(sessionId);
    if (!session) return;
    await this.store.save({ ...session, revoked: true });
  }

  async revokeAll(accountId: EntityId): Promise<void> {
    const sessions = await this.store.listByAccount(accountId);
    for (const s of sessions) {
      await this.store.save({ ...s, revoked: true });
    }
  }

  async getSession(sessionId: EntityId): Promise<Session | undefined> {
    const session = await this.store.get(sessionId);
    return session && !session.revoked ? session : undefined;
  }

  async listSessions(accountId: EntityId): Promise<Session[]> {
    const sessions = await this.store.listByAccount(accountId);
    return sessions.filter((s) => !s.revoked);
  }

  /** Record activity (extends access window implicitly via lastActivityAt). */
  async recordActivity(sessionId: EntityId): Promise<void> {
    const session = await this.store.get(sessionId);
    if (!session || session.revoked) return;
    await this.store.save({ ...session, lastActivityAt: new Date().toISOString() });
  }

  /** Sweep expired access tokens; publishes a SessionExpired event per sweep. */
  async expireSessions(): Promise<number> {
    const all = await this.store.listAll();
    let expired = 0;
    for (const s of all) {
      if (!s.revoked && Date.now() > Date.parse(s.accessExpiresAt)) {
        await this.store.save({ ...s, revoked: true });
        await this.expireEvent(s);
        expired += 1;
      }
    }
    return expired;
  }

  private issue(sid: EntityId, sub: EntityId, typ: "access" | "refresh", ttl: number): string {
    // `jti` makes every issued token unique so refresh tokens actually rotate
    // and a reused (old) refresh token can be detected.
    return this.token.issue(
      { sub, sid, typ, jti: randomBytes(6).toString("hex") } as Record<string, unknown>,
      this.options.secret,
      ttl,
    );
  }

  private verify(token: string, typ: "access" | "refresh"): SessionTokenPayload {
    const payload = this.token.verify(token, this.options.secret) as SessionTokenPayload | null;
    if (!payload || payload.typ !== typ) {
      throw new SessionError("Invalid token", "TOKEN_INVALID");
    }
    return payload;
  }

  private async enforceConcurrency(accountId: EntityId): Promise<void> {
    const active = (await this.store.listByAccount(accountId)).filter((s) => !s.revoked);
    if (active.length >= this.maxConcurrent) {
      const oldest = active.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
      await this.revokeSession(oldest.id);
    }
  }

  private async expireEvent(session: Session): Promise<void> {
    await publishIdentityEvent(this.options.bus, {
      type: IdentityEventType.SessionExpired,
      aggregateId: session.accountId,
      actorId: session.accountId,
      payload: { sessionId: session.id },
    });
  }
}
