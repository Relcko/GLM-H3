import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedBlob {
  readonly algorithm: string;
  readonly iv: string; // hex
  readonly ciphertext: string; // hex
  readonly authTag?: string; // hex (AEAD)
}

export interface Encryption {
  readonly algorithm: string;
  encrypt(plaintext: string | Uint8Array, key: Uint8Array): EncryptedBlob;
  decrypt(blob: EncryptedBlob, key: Uint8Array): Uint8Array;
}

/** AES-256-GCM authenticated encryption. */
export class AesGcmEncryption implements Encryption {
  readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;

  encrypt(plaintext: string | Uint8Array, key: Uint8Array): EncryptedBlob {
    if (key.length !== this.keyLength) throw new RangeError("AES-256 requires a 32-byte key");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = typeof plaintext === "string" ? Buffer.from(plaintext) : Buffer.from(plaintext);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      algorithm: this.algorithm,
      iv: iv.toString("hex"),
      ciphertext: ciphertext.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  decrypt(blob: EncryptedBlob, key: Uint8Array): Uint8Array {
    if (key.length !== this.keyLength) throw new RangeError("AES-256 requires a 32-byte key");
    if (!blob.authTag) throw new Error("missing auth tag");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "hex"));
    decipher.setAuthTag(Buffer.from(blob.authTag, "hex"));
    const data = Buffer.concat([
      decipher.update(Buffer.from(blob.ciphertext, "hex")),
      decipher.final(),
    ]);
    return new Uint8Array(data);
  }
}

/** Pass-through encryption (framework/testing only — NOT for production secrets). */
export class PlaintextEncryption implements Encryption {
  readonly algorithm = "plaintext";
  encrypt(plaintext: string | Uint8Array): EncryptedBlob {
    const data = typeof plaintext === "string" ? Buffer.from(plaintext) : Buffer.from(plaintext);
    return { algorithm: this.algorithm, iv: "", ciphertext: data.toString("hex") };
  }
  decrypt(blob: EncryptedBlob): Uint8Array {
    return new Uint8Array(Buffer.from(blob.ciphertext, "hex"));
  }
}

export function createAesGcm(): Encryption {
  return new AesGcmEncryption();
}
