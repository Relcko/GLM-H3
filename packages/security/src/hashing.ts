import { createHash, randomBytes } from "node:crypto";

export interface Hash {
  readonly algorithm: string;
  hash(data: string | Uint8Array): string;
  verify(data: string | Uint8Array, expected: string): boolean;
}

/** SHA-256 hash (hex). */
export class Sha256Hash implements Hash {
  readonly algorithm = "sha256";
  hash(data: string | Uint8Array): string {
    return createHash("sha256").update(data).digest("hex");
  }
  verify(data: string | Uint8Array, expected: string): boolean {
    return this.hash(data) === expected;
  }
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function createSha256(): Hash {
  return new Sha256Hash();
}
