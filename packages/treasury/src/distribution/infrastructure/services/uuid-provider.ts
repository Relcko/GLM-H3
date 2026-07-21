import crypto from "node:crypto";

export interface IUuidProvider {
  generate(): string;
}

export class CryptoUuidProvider implements IUuidProvider {
  generate(): string {
    return crypto.randomUUID();
  }
}
