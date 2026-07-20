import type { EntityId, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { RateLimitAlgorithm, RateLimitResult } from "./types";
import { RateLimitExceededError } from "./errors";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceEventType, publishPerformanceEvent } from "./events";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Pluggable rate limiting: token-bucket (default), fixed-window, and
 * sliding-window. Keyed by subject (user/tenant/route). Pure in-process
 * primitive — for horizontal scaling the buckets back a shared store. Rejections
 * are accounted and published as performance events (never domain errors).
 */
export class RateLimitingFramework {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windows = new Map<string, number[]>();

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly options: {
      readonly algorithm?: RateLimitAlgorithm;
      readonly limit: number;
      readonly windowMs?: number;
      readonly refillPerSec?: number;
    },
  ) {}

  check(key: string, cost = 1): RateLimitResult {
    const algorithm = this.options.algorithm ?? "token_bucket";
    if (algorithm === "token_bucket") return this.checkTokenBucket(key, cost);
    if (algorithm === "fixed_window") return this.checkFixedWindow(key, cost);
    return this.checkSlidingWindow(key, cost);
  }

  /** Check and throw on rejection (use in gateways/middleware seams). */
  assert(key: string, cost = 1): RateLimitResult {
    const result = this.check(key, cost);
    this.repository.recordRateLimitCheck(result.allowed);
    if (!result.allowed) {
      void publishPerformanceEvent(this.events, PerformanceEventType.RateLimitRejected, { key, limit: result.limit });
      throw new RateLimitExceededError("rate limit exceeded", { key, resetAt: result.resetAt });
    }
    return result;
  }

  private checkTokenBucket(key: string, cost: number): RateLimitResult {
    const now = Date.now();
    const refill = this.options.refillPerSec ?? this.options.limit;
    const bucket = this.refill(key, now, refill);
    const resetAt = refill > 0
      ? new Date(now + ((this.options.limit - bucket.tokens) / refill) * 1000).toISOString()
      : new Date(now + 3_600_000).toISOString();
    if (bucket.tokens < cost) {
      return { allowed: false, remaining: Math.floor(bucket.tokens), limit: this.options.limit, resetAt, retryAfterMs: refill > 0 ? ((cost - bucket.tokens) / refill) * 1000 : 3_600_000 };
    }
    bucket.tokens -= cost;
    return { allowed: true, remaining: Math.floor(bucket.tokens), limit: this.options.limit, resetAt, retryAfterMs: 0 };
  }

  private refill(key: string, now: number, refillPerSec: number): Bucket {
    const existing = this.buckets.get(key);
    const elapsedSec = existing ? (now - existing.updatedAt) / 1000 : 0;
    const tokens = Math.min(this.options.limit, (existing?.tokens ?? this.options.limit) + elapsedSec * refillPerSec);
    const bucket: Bucket = { tokens, updatedAt: now };
    this.buckets.set(key, bucket);
    return bucket;
  }

  private checkFixedWindow(key: string, cost: number): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs ?? 60_000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const wk = `${key}:${windowStart}`;
    const used = this.windows.get(wk) ?? [];
    if (used.length + cost > this.options.limit) {
      const resetAt = new Date(windowStart + windowMs).toISOString();
      return { allowed: false, remaining: 0, limit: this.options.limit, resetAt, retryAfterMs: windowStart + windowMs - now };
    }
    for (let i = 0; i < cost; i++) used.push(now);
    this.windows.set(wk, used);
    return { allowed: true, remaining: this.options.limit - used.length, limit: this.options.limit, resetAt: new Date(windowStart + windowMs).toISOString(), retryAfterMs: 0 };
  }

  private checkSlidingWindow(key: string, cost: number): RateLimitResult {
    const now = Date.now();
    const windowMs = this.options.windowMs ?? 60_000;
    const arr = this.windows.get(key) ?? [];
    const recent = arr.filter((t) => now - t <= windowMs);
    this.windows.set(key, recent);
    if (recent.length + cost > this.options.limit) {
      const oldest = recent[0] ?? now;
      return { allowed: false, remaining: 0, limit: this.options.limit, resetAt: new Date(oldest + windowMs).toISOString(), retryAfterMs: oldest + windowMs - now };
    }
    for (let i = 0; i < cost; i++) recent.push(now);
    this.windows.set(key, recent);
    return { allowed: true, remaining: this.options.limit - recent.length, limit: this.options.limit, resetAt: new Date(now + windowMs).toISOString(), retryAfterMs: 0 };
  }
}
