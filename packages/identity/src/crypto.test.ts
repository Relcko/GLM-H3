import { describe, it, expect } from "vitest";
import { Ed25519Signature, generateEd25519KeyPair } from "@relcko/security";
import {
  NonceService,
  buildWalletChallengeMessage,
  Ed25519SignatureVerifier,
} from "./crypto";
import { AuthenticationError } from "./errors";

describe("NonceService (replay protection)", () => {
  it("issues and consumes a nonce exactly once", () => {
    const svc = new NonceService();
    const nonce = svc.issue("key:addr", 60);
    expect(nonce).toHaveLength(64);
    expect(svc.peek("key:addr")?.nonce).toBe(nonce);
    expect(() => svc.consume("key:addr", nonce)).not.toThrow();
    // Second consume must fail (single-use).
    expect(() => svc.consume("key:addr", nonce)).toThrow(AuthenticationError);
  });

  it("rejects an unknown nonce", () => {
    const svc = new NonceService();
    expect(() => svc.consume("missing", "deadbeef")).toThrow(AuthenticationError);
  });

  it("rejects an expired nonce", () => {
    const svc = new NonceService();
    const nonce = svc.issue("key:exp", -1);
    expect(() => svc.consume("key:exp", nonce)).toThrow(AuthenticationError);
  });
});

describe("Wallet challenge message", () => {
  it("binds nonce and address into the signed message", () => {
    const msg = buildWalletChallengeMessage({
      address: "0xABCDEF",
      chainId: 1,
      nonce: "abc123",
      action: "wallet-authentication",
    });
    expect(msg).toContain("abc123");
    expect(msg).toContain("0xabcdef");
    expect(msg).toContain("Chain: 1");
  });
});

describe("Ed25519SignatureVerifier", () => {
  it("verifies a valid signature and rejects a tampered one", () => {
    const kp = generateEd25519KeyPair();
    const other = generateEd25519KeyPair();
    const verifier = new Ed25519SignatureVerifier();
    const sig = new Ed25519Signature();
    const message = "Relcko Authentication";
    const signature = sig.sign(message, kp.privateKey);
    expect(verifier.verify(message, signature, kp.publicKey)).toBe(true);
    // Wrong public key (different key pair) must fail.
    expect(verifier.verify(message, signature, other.publicKey)).toBe(false);
    // Tampered message must fail.
    expect(verifier.verify(message + "!", signature, kp.publicKey)).toBe(false);
  });
});
