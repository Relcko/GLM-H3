import { describe, it, expect } from "vitest";
import { MockEventBus } from "@relcko/testing";
import { InMemoryIdentityRepository } from "./repository";
import { InMemorySessionStore, SessionEngine } from "./session";
import { WalletService } from "./wallet";
import { IdentityService } from "./identity";
import { IdentityAuthorization } from "./authorization";
import { TokenBucketRateLimiter } from "./security";
import { NonceService } from "./crypto";
import { AuthService } from "./auth";
import { generateMfaCode } from "./authorization";
import { createTestIdentity, TEST_ADDRESS, TEST_CHAIN } from "./testkit";
import { WalletProviderKind } from "./types";
import { AuthenticationError } from "./errors";

describe("AuthService — wallet login", () => {
  it("logs in via wallet, auto-creates the account, links the wallet and emits Login", async () => {
    const t = createTestIdentity();
    const c = await t.auth.challengeWallet(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const res = await t.auth.loginWithWallet({
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
      ip: "1.2.3.4",
    });
    expect(res.tokens.accessToken).toBeTruthy();
    expect(res.tokens.refreshToken).toBeTruthy();
    expect(t.bus.publishedOfType("identity.login")).toHaveLength(1);
    const resolved = await t.identity.getResolvedIdentity(res.account.id);
    expect(resolved.wallets).toHaveLength(1);
  });

  it("rejects a replayed nonce", async () => {
    const t = createTestIdentity();
    const c = await t.auth.challengeWallet(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const input = {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    };
    await t.auth.loginWithWallet(input);
    await expect(t.auth.loginWithWallet(input)).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthService — email login", () => {
  it("logs in with email + password and rejects wrong passwords", async () => {
    const t = createTestIdentity();
    const acc = await t.identity.registerIndividual();
    await t.auth.linkEmail(acc.id, "user@example.com", "password123");
    const res = await t.auth.loginWithEmail({ email: "user@example.com", password: "password123" });
    expect(res.account.id).toBe(acc.id);
    expect(t.bus.publishedOfType("identity.login")).toHaveLength(1);
    await expect(t.auth.loginWithEmail({ email: "user@example.com", password: "nope" })).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthService — wallet + email linking", () => {
  it("links a wallet and an email to one account (verification becomes partial)", async () => {
    const t = createTestIdentity();
    const acc = await t.identity.registerIndividual();
    const c = await t.auth.challengeWallet(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const linked = await t.auth.linkWallet(acc.id, {
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    expect(linked.walletIds).toHaveLength(1);
    await t.auth.linkEmail(acc.id, "linked@example.com", "password123");
    const resolved = await t.identity.getResolvedIdentity(acc.id);
    expect(resolved.account.email).toBe("linked@example.com");
    expect(resolved.account.verification).toBe("partial");
  });
});

describe("AuthService — sessions & logout", () => {
  it("refreshes tokens and revokes on logout emitting Logout", async () => {
    const t = createTestIdentity();
    const c = await t.auth.challengeWallet(TEST_ADDRESS, TEST_CHAIN, WalletProviderKind.MetaMask);
    const res = await t.auth.loginWithWallet({
      address: TEST_ADDRESS,
      chainId: TEST_CHAIN,
      provider: WalletProviderKind.MetaMask,
      message: c.message,
      nonce: c.nonce,
      signature: t.signer.sign(c.message),
      publicKey: t.signer.publicKey,
    });
    const refreshed = await t.auth.refresh(res.tokens.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    await t.auth.logout(res.tokens.sessionId);
    expect(await t.auth.listSessions(res.account.id)).toHaveLength(0);
    expect(t.bus.publishedOfType("identity.logout")).toHaveLength(1);
  });
});

describe("AuthService — MFA", () => {
  it("verifies a valid MFA code and rejects an invalid one", async () => {
    const t = createTestIdentity();
    const acc = await t.identity.registerIndividual();
    await t.enrollMfa(acc.id, "totp-secret");
    const code = generateMfaCode("totp-secret");
    expect(await t.auth.verifyMfa(acc.id, code)).toBe(true);
    expect(t.bus.publishedOfType("identity.mfa.verified")).toHaveLength(1);
    await expect(t.auth.verifyMfa(acc.id, "000000")).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthService — rate limiting", () => {
  it("blocks login when the rate limiter is exhausted", async () => {
    const bus = new MockEventBus();
    const repo = new InMemoryIdentityRepository();
    const sessions = new SessionEngine(new InMemorySessionStore(), { bus, secret: "s" });
    const wallet = new WalletService(repo, { bus });
    const identity = new IdentityService(repo, bus);
    const auth = new AuthService({
      repo,
      wallet,
      identity,
      sessions,
      nonce: new NonceService(),
      rateLimiter: new TokenBucketRateLimiter(0, 0),
      authorization: new IdentityAuthorization(),
      bus,
      sessionSecret: "s",
    });
    await expect(
      auth.loginWithWallet({
        address: TEST_ADDRESS,
        chainId: TEST_CHAIN,
        provider: WalletProviderKind.MetaMask,
        message: "m",
        nonce: "n",
        signature: "s",
        publicKey: "p",
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
