import type { IClock } from "../infrastructure/services/clock";
import {
  type BackpressureConfig,
  type QueueDepthSnapshot,
  DEFAULT_BACKPRESSURE_CONFIG,
} from "./types";

export type BackpressureAction = "proceed" | "throttle" | "reject" | "pause";

export interface BackpressureDecision {
  readonly action: BackpressureAction;
  readonly delayMs: number;
  readonly queueDepth: number;
  readonly currentRate: number;
  readonly isPaused: boolean;
}

export interface BackpressureEvent {
  readonly type: "throttled" | "paused" | "resumed" | "rejected" | "overflow";
  readonly timestamp: number;
  readonly queueDepth: number;
  readonly currentRate: number;
}

export class BackpressureController {
  private _currentQueueDepth = 0;
  private _peakQueueDepth = 0;
  private _isPaused = false;
  private _currentRate = 0;
  private _lastRateCheck = 0;
  private _opsInWindow = 0;
  private readonly _events: BackpressureEvent[] = [];
  private _totalRejected = 0;
  private _totalThrottled = 0;

  constructor(
    private readonly config: BackpressureConfig = DEFAULT_BACKPRESSURE_CONFIG,
    private readonly clock: IClock,
  ) {}

  get isPaused(): boolean {
    return this._isPaused;
  }

  get currentQueueDepth(): number {
    return this._currentQueueDepth;
  }

  get peakQueueDepth(): number {
    return this._peakQueueDepth;
  }

  get totalRejected(): number {
    return this._totalRejected;
  }

  get totalThrottled(): number {
    return this._totalThrottled;
  }

  getRecentEvents(count: number = 10): readonly BackpressureEvent[] {
    return this._events.slice(-count);
  }

  updateQueueDepth(depth: number): void {
    this._currentQueueDepth = depth;
    if (depth > this._peakQueueDepth) {
      this._peakQueueDepth = depth;
    }
  }

  recordOperation(): void {
    this._opsInWindow += 1;
    this.updateRate();
  }

  decide(): BackpressureDecision {
    this.updateRate();

    if (this._isPaused) {
      return {
        action: "pause",
        delayMs: this.config.maxDelayBetweenBatchesMs,
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
        isPaused: true,
      };
    }

    if (this._currentQueueDepth >= this.config.highWaterMark) {
      this._isPaused = true;
      this._events.push({
        type: "paused",
        timestamp: this.clock.nowMs(),
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
      });
      return {
        action: "pause",
        delayMs: this.config.maxDelayBetweenBatchesMs,
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
        isPaused: true,
      };
    }

    if (this._currentQueueDepth > this.config.lowWaterMark) {
      const utilization = this._currentQueueDepth / this.config.highWaterMark;
      const delayRange = this.config.maxDelayBetweenBatchesMs - this.config.minDelayBetweenBatchesMs;
      const delayMs = Math.round(
        this.config.minDelayBetweenBatchesMs + delayRange * utilization,
      );
      this._totalThrottled += 1;
      this._events.push({
        type: "throttled",
        timestamp: this.clock.nowMs(),
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
      });
      return {
        action: "throttle",
        delayMs,
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
        isPaused: false,
      };
    }

    if (this._currentRate >= this.config.maxRatePerSecond) {
      if (this.config.overflowStrategy === "reject") {
        this._totalRejected += 1;
        this._events.push({
          type: "rejected",
          timestamp: this.clock.nowMs(),
          queueDepth: this._currentQueueDepth,
          currentRate: this._currentRate,
        });
        return {
          action: "reject",
          delayMs: 0,
          queueDepth: this._currentQueueDepth,
          currentRate: this._currentRate,
          isPaused: false,
        };
      }
      if (this.config.overflowStrategy === "drop") {
        this._events.push({
          type: "overflow",
          timestamp: this.clock.nowMs(),
          queueDepth: this._currentQueueDepth,
          currentRate: this._currentRate,
        });
        return {
          action: "reject",
          delayMs: 0,
          queueDepth: this._currentQueueDepth,
          currentRate: this._currentRate,
          isPaused: false,
        };
      }
      return {
        action: "throttle",
        delayMs: this.config.maxDelayBetweenBatchesMs,
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
        isPaused: false,
      };
    }

    return {
      action: "proceed",
      delayMs: this.config.minDelayBetweenBatchesMs,
      queueDepth: this._currentQueueDepth,
      currentRate: this._currentRate,
      isPaused: false,
    };
  }

  tryResume(): boolean {
    if (!this._isPaused) return true;
    if (this._currentQueueDepth <= this.config.lowWaterMark) {
      this._isPaused = false;
      this._events.push({
        type: "resumed",
        timestamp: this.clock.nowMs(),
        queueDepth: this._currentQueueDepth,
        currentRate: this._currentRate,
      });
      return true;
    }
    return false;
  }

  getQueueSnapshot(): QueueDepthSnapshot {
    return {
      current: this._currentQueueDepth,
      peak: this._peakQueueDepth,
      limit: this.config.highWaterMark,
      utilizationRatio:
        this.config.highWaterMark > 0
          ? this._currentQueueDepth / this.config.highWaterMark
          : 0,
    };
  }

  reset(): void {
    this._currentQueueDepth = 0;
    this._peakQueueDepth = 0;
    this._isPaused = false;
    this._currentRate = 0;
    this._lastRateCheck = 0;
    this._opsInWindow = 0;
    this._events.length = 0;
    this._totalRejected = 0;
    this._totalThrottled = 0;
  }

  private updateRate(): void {
    const now = this.clock.nowMs();
    if (this._lastRateCheck === 0) {
      this._lastRateCheck = now;
      return;
    }
    const elapsedMs = now - this._lastRateCheck;
    if (elapsedMs >= 1000) {
      this._currentRate = (this._opsInWindow * 1000) / Math.max(elapsedMs, 1);
      this._opsInWindow = 0;
      this._lastRateCheck = now;
    }
  }
}
