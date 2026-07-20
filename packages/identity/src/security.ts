import { generateOpaqueToken, createSha256 } from "@relcko/security";
import { timingSafeEqual } from "node:crypto";
import { SecurityError } from "./errors";

/**
 * Security abstractions for the identity surface: rate limiting (brute-force
 * protection), CSRF double-submit tokens, and device fingerprinting (trusted
 * device detection). All are interface-first so production can swap in a
 * distributed limiter / HSM-backed CSRF without touching call sites.
 */

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly retryAfterSeconds?: number;
}

export interface RateLimiter {
  consume(key: string, cost?: number): RateLimitResult;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(
    private readonly capacity = 10,
    private readonly refillPerSecond = 1,
  ) {}

  consume(key: string, cost = 1): RateLimitResult {
    const now = Date.now();
    const bucket = this.refill(key, now);
    if (bucket.tokens < cost) {
      const deficit = cost - bucket.tokens;
      return {
        allowed: false,
        limit: this.capacity,
        remaining: 0,
        retryAfterSeconds: Math.ceil(deficit / this.refillPerSecond),
      };
    }
    bucket.tokens -= cost;
    this.buckets.set(key, bucket);
    return { allowed: true, limit: this.capacity, remaining: Math.floor(bucket.tokens) };
  }

  private refill(key: string, now: number): Bucket {
    const existing = this.buckets.get(key);
    if (!existing) {
      return { tokens: this.capacity, lastRefill: now };
    }
    const elapsed = (now - existing.lastRefill) / 1000;
    const added = elapsed * this.refillPerSecond;
    const tokens = Math.min(this.capacity, existing.tokens + added);
    return { tokens, lastRefill: now };
  }
}

/** CSRF double-submit protection: cookie token must equal header token. */
export class CsrfProtection {
  issueToken(): string {
    return generateOpaqueToken(32);
  }

  verify(cookieToken: string, headerToken: string): boolean {
    if (!cookieToken || !headerToken) return false;
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

export interface DeviceFingerprintInput {
  readonly userAgent?: string;
  readonly ip?: string;
  readonly acceptLanguage?: string;
}

/**
 * Stable device fingerprint: hashes the weakly-identifying signals a browser
 * sends. NOT a tracking cookie — it only enables "trusted device" MFA relief.
 */
export class DeviceFingerprintService {
  private readonly sha = createSha256();
  compute(input: DeviceFingerprintInput): string {
    const seed = [input.userAgent ?? "", input.ip ?? "", input.acceptLanguage ?? ""].join("|");
    return this.sha.hash(seed);
  }
}

export { SecurityError };
