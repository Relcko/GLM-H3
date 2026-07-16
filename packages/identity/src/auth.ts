import type { Address, ChainId, EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { IdentityRepository } from "./repository";
import type { WalletService } from "./wallet";
import type { WalletProviderKind } from "./types";
import type { IdentityService } from "./identity";
import type { SessionEngine } from "./session";
import type { NonceService } from "./crypto";
import type { RateLimiter } from "./security";
import type { IdentityAuthorization, MfaService } from "./authorization";
import type { Account, AuthTokens, LoginChallenge } from "./types";
import { IdentityEventType, publishIdentityEvent } from "./events";
import { hashPassword, verifyPassword } from "./password";
import { AccountLockedError, AuthenticationError } from "./errors";

export interface AuthServiceDependencies {
  readonly repo: IdentityRepository;
  readonly wallet: WalletService;
  readonly identity: IdentityService;
  readonly sessions: SessionEngine;
  readonly nonce: NonceService;
  readonly rateLimiter: RateLimiter;
  readonly authorization: IdentityAuthorization;
  readonly bus: EventBus;
  readonly sessionSecret: string;
  readonly mfa?: MfaService;
}

export interface WalletLoginInput {
  readonly address: Address;
  readonly chainId: ChainId;
  readonly provider: WalletProviderKind;
  readonly message: string;
  readonly nonce: string;
  readonly signature: string;
  readonly publicKey: string;
  readonly deviceFingerprint?: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

export interface EmailLoginInput {
  readonly email: string;
  readonly password: string;
  readonly deviceFingerprint?: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

export interface LoginResult {
  readonly account: Account;
  readonly tokens: AuthTokens;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  challengeWallet(address: Address, chainId: ChainId, provider: WalletProviderKind): Promise<LoginChallenge> {
    return this.deps.wallet.challenge(address, chainId, provider);
  }

  async loginWithWallet(input: WalletLoginInput): Promise<LoginResult> {
    const rate = this.deps.rateLimiter.consume("login:wallet:" + input.address);
    if (!rate.allowed) {
      throw new AuthenticationError("Too many login attempts", "RATE_LIMITED", {
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }
    await this.deps.wallet.assertOwnership(input);

    let account = await this.deps.repo.findAccountByWalletAddress(input.address);
    if (!account) {
      account = await this.deps.identity.registerIndividual();
      await this.deps.wallet.attachWallet(account.id, {
        address: input.address,
        chainId: input.chainId,
        provider: input.provider,
      });
    }

    const tokens = await this.deps.sessions.createSession(account, {
      deviceFingerprint: input.deviceFingerprint,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    await publishIdentityEvent(this.deps.bus, {
      type: IdentityEventType.Login,
      aggregateId: account.id,
      actorId: account.id,
      payload: {
        method: "wallet",
        provider: input.provider,
        address: input.address,
        chainId: Number(input.chainId),
        ip: input.ip ?? null,
        sessionId: tokens.sessionId,
        mfaPending: account.mfaLevel !== "none",
      },
    });
    return { account, tokens };
  }

  async loginWithEmail(input: EmailLoginInput): Promise<LoginResult> {
    const rate = this.deps.rateLimiter.consume("login:email:" + input.email.toLowerCase());
    if (!rate.allowed) {
      throw new AuthenticationError("Too many login attempts", "RATE_LIMITED", {
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }
    const account = await this.deps.repo.findAccountByEmail(input.email);
    if (!account || !account.passwordHash) {
      throw new AuthenticationError("Invalid credentials", "BAD_CREDENTIALS");
    }
    if (account.status === "suspended" || account.status === "closed") {
      throw new AccountLockedError("Account is " + account.status, "ACCOUNT_LOCKED", { accountId: account.id });
    }
    const ok = await verifyPassword(input.password, account.passwordHash);
    if (!ok) {
      throw new AuthenticationError("Invalid credentials", "BAD_CREDENTIALS");
    }
    const tokens = await this.deps.sessions.createSession(account, {
      deviceFingerprint: input.deviceFingerprint,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    await publishIdentityEvent(this.deps.bus, {
      type: IdentityEventType.Login,
      aggregateId: account.id,
      actorId: account.id,
      payload: {
        method: "email",
        email: input.email,
        ip: input.ip ?? null,
        sessionId: tokens.sessionId,
        mfaPending: account.mfaLevel !== "none",
      },
    });
    return { account, tokens };
  }

  async linkWallet(accountId: EntityId, input: WalletLoginInput): Promise<Account> {
    await this.deps.wallet.assertOwnership(input);
    return this.deps.wallet.attachWallet(accountId, {
      address: input.address,
      chainId: input.chainId,
      provider: input.provider,
    });
  }

  async linkEmail(accountId: EntityId, email: string, password: string): Promise<Account> {
    const hash = await hashPassword(password);
    return this.deps.identity.setEmailCredential(accountId, email, hash);
  }

  async logout(sessionId: EntityId): Promise<void> {
    await this.deps.sessions.revokeSession(sessionId);
    const session = await this.deps.sessions.getSession(sessionId);
    const actorId = session?.accountId ?? sessionId;
    await publishIdentityEvent(this.deps.bus, {
      type: IdentityEventType.Logout,
      aggregateId: actorId,
      actorId,
      payload: { sessionId },
    });
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.deps.sessions.refreshSession(refreshToken);
  }

  listSessions(accountId: EntityId) {
    return this.deps.sessions.listSessions(accountId);
  }
  revokeSession(sessionId: EntityId): Promise<void> {
    return this.deps.sessions.revokeSession(sessionId);
  }
  revokeAll(accountId: EntityId): Promise<void> {
    return this.deps.sessions.revokeAll(accountId);
  }
  recordActivity(sessionId: EntityId): Promise<void> {
    return this.deps.sessions.recordActivity(sessionId);
  }

  async verifyMfa(accountId: EntityId, code: string): Promise<boolean> {
    if (!this.deps.mfa) throw new AuthenticationError("MFA not configured", "MFA_DISABLED");
    const ok = await this.deps.mfa.verify(accountId, code);
    if (!ok) throw new AuthenticationError("Invalid MFA code", "MFA_INVALID");
    await publishIdentityEvent(this.deps.bus, {
      type: IdentityEventType.MfaVerified,
      aggregateId: accountId,
      actorId: accountId,
      payload: { accountId },
    });
    return true;
  }
}
