import { generateNonce } from "@relcko/utils";
import { Ed25519Signature } from "@relcko/security";
import type { ChainId } from "@relcko/types";
import type { Address, EntityId } from "@relcko/types";
import { AuthenticationError } from "./errors";

/**
 * Replay protection + wallet-ownership verification primitives.
 *
 * The signature scheme is pluggable: the default verifier uses Ed25519 (from
 * the shared `@relcko/security` package) so the module is self-contained and
 * testable without a chain node. Production wiring substitutes an EIP-191 /
 * EIP-712 secp256k1 verifier (MetaMask, WalletConnect, Coinbase) behind the
 * same `SignatureVerifier` interface — the rest of the module is unchanged.
 */

export interface StoredNonce {
  readonly nonce: string;
  readonly expiresAt: number;
  readonly used: boolean;
}

export interface NonceStore {
  issue(key: string, ttlSeconds: number): string;
  /** Returns true only if the nonce exists, is unused and unexpired; consumes it. */
  consume(key: string, nonce: string): boolean;
  peek(key: string): StoredNonce | undefined;
}

export class InMemoryNonceStore implements NonceStore {
  private readonly store = new Map<string, StoredNonce>();

  issue(key: string, ttlSeconds: number): string {
    const nonce = generateNonce(32);
    this.store.set(key, {
      nonce,
      expiresAt: Date.now() + ttlSeconds * 1000,
      used: false,
    });
    return nonce;
  }

  consume(key: string, nonce: string): boolean {
    const record = this.store.get(key);
    if (!record) return false;
    if (record.used || record.expiresAt < Date.now() || record.nonce !== nonce) {
      this.store.delete(key);
      return false;
    }
    this.store.set(key, { ...record, used: true });
    return true;
  }

  peek(key: string): StoredNonce | undefined {
    return this.store.get(key);
  }
}

export class NonceService {
  constructor(private readonly store: NonceStore = new InMemoryNonceStore()) {}

  issue(key: string, ttlSeconds = 300): string {
    return this.store.issue(key, ttlSeconds);
  }

  consume(key: string, nonce: string): void {
    if (!this.store.consume(key, nonce)) {
      throw new AuthenticationError("Invalid or expired nonce (replay protection)", "NONCE_INVALID");
    }
  }

  peek(key: string): StoredNonce | undefined {
    return this.store.peek(key);
  }
}

/** Build the deterministic, human-readable message a wallet must sign. */
export function buildWalletChallengeMessage(input: {
  address: string;
  chainId: number | ChainId;
  nonce: string;
  action: string;
  issuedAt?: string;
}): string {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  return [
    "Relcko Authentication",
    `Address: ${input.address.toLowerCase()}`,
    `Chain: ${Number(input.chainId)}`,
    `Action: ${input.action}`,
    `Nonce: ${input.nonce}`,
    `Issued: ${issuedAt}`,
    "",
    "Sign this message to authenticate. Never share it with anyone.",
  ].join("\n");
}

export interface SignatureVerifier {
  /** Verify `signature` over `message` using `publicKey`. */
  verify(message: string, signature: string, publicKey: string): boolean;
}

export class Ed25519SignatureVerifier implements SignatureVerifier {
  private readonly sig = new Ed25519Signature();
  verify(message: string, signature: string, publicKey: string): boolean {
    return this.sig.verify(message, signature, publicKey);
  }
}

export function createSignatureVerifier(): SignatureVerifier {
  return new Ed25519SignatureVerifier();
}
