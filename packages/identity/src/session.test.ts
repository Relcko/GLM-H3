import { describe, it, expect } from "vitest";
import { MockEventBus } from "@relcko/testing";
import { InMemorySessionStore, SessionEngine } from "./session";
import { createAccount } from "./account";
import { AccountType } from "./types";
import { SessionError } from "./errors";

function setup(maxConcurrent = 10) {
  const bus = new MockEventBus();
  const store = new InMemorySessionStore();
  const engine = new SessionEngine(store, { bus, secret: "s", maxConcurrentSessions: maxConcurrent });
  const account = createAccount({ type: AccountType.Individual });
  return { bus, store, engine, account };
}

describe("SessionEngine", () => {
  it("creates a session and resolves it", async () => {
    const { engine, account } = setup();
    const tokens = await engine.createSession(account, { ip: "1.2.3.4" });
    expect(tokens.sessionId).toBeTruthy();
    const session = await engine.getSession(tokens.sessionId);
    expect(session).toBeDefined();
    expect(session?.ip).toBe("1.2.3.4");
    expect(session?.revoked).toBe(false);
  });

  it("rotates refresh token and invalidates the old one", async () => {
    const { engine, account } = setup();
    const first = await engine.createSession(account);
    const refreshed = await engine.refreshSession(first.refreshToken);
    expect(refreshed.refreshToken).not.toBe(first.refreshToken);
    // Old refresh token must now be rejected (reuse detected).
    await expect(engine.refreshSession(first.refreshToken)).rejects.toBeInstanceOf(SessionError);
  });

  it("revokes a single session and all sessions", async () => {
    const { engine, account } = setup();
    const a = await engine.createSession(account);
    const b = await engine.createSession(account);
    await engine.revokeSession(a.sessionId);
    expect(await engine.getSession(a.sessionId)).toBeUndefined();
    expect((await engine.listSessions(account.id)).length).toBe(1);
    await engine.revokeAll(account.id);
    expect(await engine.listSessions(account.id)).toHaveLength(0);
    expect(await engine.getSession(b.sessionId)).toBeUndefined();
  });

  it("records activity", async () => {
    const { engine, account, store } = setup();
    const t = await engine.createSession(account);
    await engine.recordActivity(t.sessionId);
    const session = await store.get(t.sessionId);
    expect(session?.lastActivityAt).toBeTruthy();
  });

  it("sweeps expired access tokens and emits SessionExpired", async () => {
    const { engine, account, store, bus } = setup();
    const t = await engine.createSession(account);
    const session = await store.get(t.sessionId);
    await store.save({ ...session!, accessExpiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = await engine.expireSessions();
    expect(expired).toBe(1);
    expect(await engine.getSession(t.sessionId)).toBeUndefined();
    expect(bus.publishedOfType("identity.session.expired")).toHaveLength(1);
  });

  it("enforces a concurrency ceiling", async () => {
    const { engine, account } = setup(2);
    await engine.createSession(account);
    await engine.createSession(account);
    await engine.createSession(account);
    expect((await engine.listSessions(account.id)).length).toBeLessThanOrEqual(2);
  });

  it("trusts a previously seen device fingerprint", async () => {
    const { engine, account } = setup();
    await engine.createSession(account, { deviceFingerprint: "fp-1" });
    const second = await engine.createSession(account, { deviceFingerprint: "fp-1" });
    const session = await engine.getSession(second.sessionId);
    expect(session?.trustedDevice).toBe(true);
    const third = await engine.createSession(account, { deviceFingerprint: "fp-2" });
    const other = await engine.getSession(third.sessionId);
    expect(other?.trustedDevice).toBe(false);
  });
});
