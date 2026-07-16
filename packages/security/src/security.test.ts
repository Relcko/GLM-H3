import { describe, expect, it } from "vitest";
import {
  createAesGcm,
  createEd25519,
  createHmacToken,
  createSha256,
  deriveSymmetricKey,
  generateEd25519KeyPair,
  InMemoryKeyStore,
} from "@relcko/security";

describe("hashing", () => {
  it("sha256 is deterministic and verifiable", () => {
    const h = createSha256();
    const digest = h.hash("hello");
    expect(digest).toHaveLength(64);
    expect(h.verify("hello", digest)).toBe(true);
    expect(h.verify("world", digest)).toBe(false);
  });
});

describe("tokens", () => {
  it("issues and verifies HMAC tokens, rejecting tampering/expiry", () => {
    const t = createHmacToken();
    const token = t.issue({ sub: "user_1" }, "secret", 60);
    expect(t.verify(token, "secret")).toEqual({ sub: "user_1" });
    expect(t.verify(token, "wrong")).toBeNull();

    const expired = t.issue({ sub: "x" }, "secret", -1);
    expect(t.verify(expired, "secret")).toBeNull();
  });
});

describe("encryption", () => {
  it("encrypts and decrypts with AES-256-GCM", () => {
    const enc = createAesGcm();
    const key = deriveSymmetricKey("a-strong-secret");
    const blob = enc.encrypt("secret message", key);
    const out = enc.decrypt(blob, key);
    expect(Buffer.from(out).toString("utf8")).toBe("secret message");
  });

  it("fails to decrypt with the wrong key", () => {
    const enc = createAesGcm();
    const blob = enc.encrypt("data", deriveSymmetricKey("key1"));
    expect(() => enc.decrypt(blob, deriveSymmetricKey("key2"))).toThrow();
  });
});

describe("signatures", () => {
  it("signs and verifies with Ed25519", () => {
    const sig = createEd25519();
    const { privateKey, publicKey } = generateEd25519KeyPair();
    const signature = sig.sign("message", privateKey);
    expect(sig.verify("message", signature, publicKey)).toBe(true);
    expect(sig.verify("tampered", signature, publicKey)).toBe(false);
  });
});

describe("key store", () => {
  it("generates, retrieves and rotates keys by purpose", async () => {
    const store = new InMemoryKeyStore();
    const enc = await store.generate("main", { purpose: "encryption" });
    expect(enc.secret).toBeDefined();
    const signing = await store.generate("sign", { purpose: "signing" });
    expect(signing.publicKey).toBeDefined();
    const rotated = await store.rotate("main");
    expect(rotated.rotatedAt).toBeDefined();
    expect(rotated.secret).not.toBe(enc.secret);
    expect(await store.list()).toContain("main");
  });
});
