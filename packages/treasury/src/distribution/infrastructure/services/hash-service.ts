import crypto from "node:crypto";

export interface IHashService {
  sha256(input: string): string;
  verify(input: string, hash: string): boolean;
}

export class CryptoHashService implements IHashService {
  sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  verify(input: string, hash: string): boolean {
    return this.sha256(input) === hash;
  }
}
