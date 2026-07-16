import { createPublicKey, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";

export interface Signature {
  readonly algorithm: string;
  sign(message: string | Uint8Array, privateKey: string | Uint8Array): string;
  verify(message: string | Uint8Array, signature: string, publicKey: string | Uint8Array): boolean;
}

export interface KeyPair {
  readonly privateKey: string; // PEM
  readonly publicKey: string; // PEM
}

export function generateEd25519KeyPair(): KeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return { privateKey, publicKey };
}

/** Ed25519 signature (deterministic, fast, non-repudiable). */
export class Ed25519Signature implements Signature {
  readonly algorithm = "ed25519";
  sign(message: string | Uint8Array, privateKey: string | Uint8Array): string {
    const key = typeof privateKey === "string" ? privateKey : Buffer.from(privateKey).toString("utf8");
    const buf = typeof message === "string" ? Buffer.from(message) : Buffer.from(message);
    return cryptoSign(null, buf, key).toString("hex");
  }
  verify(message: string | Uint8Array, signature: string, publicKey: string | Uint8Array): boolean {
    try {
      const key = typeof publicKey === "string" ? publicKey : Buffer.from(publicKey).toString("utf8");
      const pub = createPublicKey(key);
      const buf = typeof message === "string" ? Buffer.from(message) : Buffer.from(message);
      return cryptoVerify(null, buf, pub, Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  }
}

export function createEd25519(): Signature {
  return new Ed25519Signature();
}
