import { createHmac, timingSafeEqual } from "node:crypto";

export interface Token<T = Record<string, unknown>> {
  issue(payload: T, secret: string, expiresInSeconds?: number): string;
  verify(token: string, secret: string): T | null;
}

interface HmacTokenPayload {
  p: Record<string, unknown>;
  exp?: number;
}

/**
 * Opaque, HMAC-signed token (not JWT — no standard library dependency).
 * Format: base64url(payload).base64url(hmac). Tamper-evident and expiring.
 */
export class HmacToken implements Token {
  private encode(input: Uint8Array | string): string {
    const buf = typeof input === "string" ? Buffer.from(input) : Buffer.from(input);
    return buf.toString("base64url");
  }
  private decode(input: string): Buffer {
    return Buffer.from(input, "base64url");
  }

  issue(payload: Record<string, unknown>, secret: string, expiresInSeconds?: number): string {
    const body: HmacTokenPayload = {
      p: payload,
      exp: expiresInSeconds ? Math.floor(Date.now() / 1000) + expiresInSeconds : undefined,
    };
    const data = this.encode(JSON.stringify(body));
    const mac = createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${mac}`;
  }

  verify(token: string, secret: string): Record<string, unknown> | null {
    const [data, mac] = token.split(".");
    if (!data || !mac) return null;
    const expected = createHmac("sha256", secret).update(data).digest("base64url");
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const body = JSON.parse(this.decode(data).toString("utf8")) as HmacTokenPayload;
      if (body.exp !== undefined && body.exp < Math.floor(Date.now() / 1000)) return null;
      return body.p;
    } catch {
      return null;
    }
  }
}

export function createHmacToken(): Token {
  return new HmacToken();
}
