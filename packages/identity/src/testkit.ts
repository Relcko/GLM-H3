import { asAddress, asChainId, type Address, type ChainId, type EntityId } from "@relcko/types";
import { Ed25519Signature, generateEd25519KeyPair } from "@relcko/security";
import { MockEventBus } from "@relcko/testing";
import { InMemoryIdentityRepository } from "./repository";
import { InMemorySessionStore, SessionEngine } from "./session";
import { WalletService } from "./wallet";
import { IdentityService } from "./identity";
import { IdentityAuthorization, MfaService, TimeBasedMfaVerifier } from "./authorization";
import { TokenBucketRateLimiter } from "./security";
import { NonceService } from "./crypto";
import { AuthService } from "./auth";
import { MfaLevel } from "@relcko/permission";

export const TEST_ADDRESS = asAddress("0x1234567890abcdef1234567890abcdef12345678");
export const TEST_CHAIN: ChainId = asChainId(1);

export interface Signer {
  readonly publicKey: string;
  sign(message: string): string;
}

export interface TestIdentity {
  bus: MockEventBus;
  repo: InMemoryIdentityRepository;
  wallet: WalletService;
  identity: IdentityService;
  sessions: SessionEngine;
  authorization: IdentityAuthorization;
  auth: AuthService;
  nonce: NonceService;
  signer: Signer;
  enrollMfa(accountId: EntityId, secret: string): Promise<void>;
}

export function createTestIdentity(sessionSecret = "test-secret"): TestIdentity {
  const bus = new MockEventBus();
  const repo = new InMemoryIdentityRepository();
  const sessionStore = new InMemorySessionStore();
  const nonce = new NonceService();
  const wallet = new WalletService(repo, { bus, nonce });
  const identity = new IdentityService(repo, bus);
  const sessions = new SessionEngine(sessionStore, { bus, secret: sessionSecret });
  const authorization = new IdentityAuthorization();
  const rateLimiter = new TokenBucketRateLimiter(1000, 1000);
  const secrets = new Map<string, string>();
  const mfa = new MfaService(new TimeBasedMfaVerifier((id) => secrets.get(id)));
  const auth = new AuthService({
    repo,
    wallet,
    identity,
    sessions,
    nonce,
    rateLimiter,
    authorization,
    bus,
    sessionSecret,
    mfa,
  });

  const keypair = generateEd25519KeyPair();
  const sig = new Ed25519Signature();
  const signer: Signer = {
    publicKey: keypair.publicKey,
    sign: (message: string) => sig.sign(message, keypair.privateKey),
  };

  async function enrollMfa(accountId: EntityId, secret: string): Promise<void> {
    secrets.set(accountId, secret);
    const account = await repo.getAccount(accountId);
    if (account) {
      await repo.saveAccount({ ...account, mfaSecret: secret, mfaLevel: MfaLevel.Totp });
    }
  }

  return { bus, repo, wallet, identity, sessions, authorization, auth, nonce, signer, enrollMfa };
}

export function testAddress(seed = "1"): Address {
  return asAddress("0x" + (seed.padEnd(40, "0").slice(0, 40)));
}
