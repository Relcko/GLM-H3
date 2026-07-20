import { randomBytes } from "node:crypto";
import { createSha256 } from "./hashing";
import { generateEd25519KeyPair } from "./signature";

export type KeyPurpose = "encryption" | "signing" | "hmac";

export interface KeyMaterial {
  readonly id: string;
  readonly algorithm: string;
  readonly purpose: KeyPurpose;
  readonly publicKey?: string; // PEM (signing)
  readonly privateKey?: string; // PEM (signing)
  readonly secret?: string; // hex (symmetric / hmac)
  readonly createdAt: string;
  readonly rotatedAt?: string;
}

export interface KeySpec {
  readonly purpose: KeyPurpose;
  readonly algorithm?: string;
}

export interface KeyStore {
  generate(id: string, spec: KeySpec): Promise<KeyMaterial>;
  get(id: string): Promise<KeyMaterial | undefined>;
  rotate(id: string): Promise<KeyMaterial>;
  list(): Promise<ReadonlyArray<string>>;
}

/** Derive a 32-byte AES key from an arbitrary secret string. */
export function deriveSymmetricKey(secret: string): Uint8Array {
  const hex = createSha256().hash(secret);
  return new Uint8Array(Buffer.from(hex, "hex")).slice(0, 32);
}

export class InMemoryKeyStore implements KeyStore {
  private readonly keys = new Map<string, KeyMaterial>();

  async generate(id: string, spec: KeySpec): Promise<KeyMaterial> {
    let material: KeyMaterial;
    if (spec.purpose === "signing") {
      const pair = generateEd25519KeyPair();
      material = { id, algorithm: spec.algorithm ?? "ed25519", purpose: spec.purpose, ...pair, createdAt: new Date().toISOString() };
    } else if (spec.purpose === "encryption") {
      material = {
        id,
        algorithm: spec.algorithm ?? "aes-256-gcm",
        purpose: spec.purpose,
        secret: randomBytes(32).toString("hex"),
        createdAt: new Date().toISOString(),
      };
    } else {
      material = {
        id,
        algorithm: spec.algorithm ?? "hmac-sha256",
        purpose: spec.purpose,
        secret: randomBytes(32).toString("hex"),
        createdAt: new Date().toISOString(),
      };
    }
    this.keys.set(id, material);
    return material;
  }

  async get(id: string): Promise<KeyMaterial | undefined> {
    return this.keys.get(id);
  }

  async rotate(id: string): Promise<KeyMaterial> {
    const existing = this.keys.get(id);
    if (!existing) throw new Error(`Unknown key: ${id}`);
    const next = await this.generate(id, { purpose: existing.purpose, algorithm: existing.algorithm });
    return { ...next, createdAt: existing.createdAt, rotatedAt: new Date().toISOString() };
  }

  async list(): Promise<ReadonlyArray<string>> {
    return [...this.keys.keys()];
  }
}
