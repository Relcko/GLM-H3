"use client";

/**
 * Image sequence manager — Phase 5 optimized.
 *
 * Owns the 240-frame path convention, the preload pool,
 * and the "nearest loaded" resolver used by the canvas.
 *
 * Phase 5 optimizations:
 *   - Priority loading: the first PRIORITY_COUNT frames load with
 *     `fetchPriority="high"` + `decoding="sync"` so the loader reveals
 *     the scene the instant the user arrives. The rest load "async"
 *     with normal priority, keeping the network free for the page JS.
 *   - Lower concurrency for the tail (6 vs 12) to avoid saturating the
 *     browser's network queue — the first 30 frames now land faster.
 *
 * NOTE: Do NOT set loading="lazy" on off-DOM Image() preloads.
 * Browsers defer lazy off-DOM images indefinitely — onload/onerror
 * never fire, which permanently blocks the concurrency pool.
 *
 * Consumers should not import TOTAL_FRAMES from anywhere else.
 */

export const TOTAL_FRAMES = 240;
/** First N frames get high-priority loading (instant scene reveal). */
const PRIORITY_COUNT = 12;
const PAD = 3;
const PATH = (i: number) =>
  `/frames/ezgif-frame-${String(i + 1).padStart(PAD, "0")}.jpg`;

type LoadHandler = (loaded: number) => void;

export class FrameSequence {
  private images: (HTMLImageElement | null)[] = new Array(TOTAL_FRAMES).fill(null);
  private loaded = 0;
  private handlers = new Set<LoadHandler>();
  private inflight = 0;
  private next = 0;
  private done = false;

  constructor(
    private readonly priorityConcurrency = 6,
    private readonly tailConcurrency = 6
  ) {}

  start() {
    if (typeof window === "undefined") return;
    this.pump();
  }

  private get concurrency() {
    return this.next < PRIORITY_COUNT ? this.priorityConcurrency : this.tailConcurrency;
  }

  private pump() {
    while (this.inflight < this.concurrency && this.next < TOTAL_FRAMES) {
      const i = this.next++;
      this.inflight++;
      const im = new Image();
      const isPriority = i < PRIORITY_COUNT;
      im.decoding = isPriority ? "sync" : "async";
      // fetchPriority is a string attribute on HTMLImageElement.
      (im as HTMLImageElement & { fetchPriority?: string }).fetchPriority = isPriority ? "high" : "auto";
      im.src = PATH(i);
      im.onload = () => this.onOne(i, im);
      im.onerror = () => {
        if (typeof console !== "undefined") {
          console.warn(`[FrameSequence] Failed to load frame ${i + 1}: ${PATH(i)}`);
        }
        this.onOne(i, null);
      };
    }
  }

  private onOne(i: number, im: HTMLImageElement | null) {
    this.inflight--;
    if (im) this.images[i] = im;
    this.loaded++;
    for (const h of this.handlers) h(this.loaded);
    if (this.next >= TOTAL_FRAMES && this.inflight === 0 && !this.done) {
      this.done = true;
    }
    this.pump();
  }

  onProgress(h: LoadHandler): () => void {
    this.handlers.add(h);
    h(this.loaded);
    return () => {
      this.handlers.delete(h);
    };
  }

  /**
   * Force-complete loading: marks all unloaded frames as failed and
   * sets loaded to TOTAL_FRAMES so the consumer can proceed even if
   * images are slow or unreachable. Returns the count of images that
   * were actually loaded before the force.
   */
  forceComplete(): number {
    const previouslyLoaded = this.loaded;
    // Mark remaining unloaded slots as null (failed).
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!this.images[i]) {
        this.images[i] = null;
      }
    }
    // Advance counters so the pool drains.
    this.next = TOTAL_FRAMES;
    this.inflight = 0;
    if (this.loaded < TOTAL_FRAMES) {
      this.loaded = TOTAL_FRAMES;
      for (const h of this.handlers) h(this.loaded);
    }
    this.done = true;
    return previouslyLoaded;
  }

  get loadedCount() {
    return this.loaded;
  }

  get isDone() {
    return this.done;
  }

  /** Returns the nearest loaded frame to index, searching outward. */
  nearest(index: number): { index: number; image: HTMLImageElement } | null {
    if (index < 0) index = 0;
    if (index >= TOTAL_FRAMES) index = TOTAL_FRAMES - 1;
    if (this.images[index]) {
      return { index, image: this.images[index]! };
    }
    // search outward
    for (let d = 1; d < TOTAL_FRAMES; d++) {
      const lo = index - d;
      const hi = index + d;
      if (lo >= 0 && this.images[lo]) {
        return { index: lo, image: this.images[lo]! };
      }
      if (hi < TOTAL_FRAMES && this.images[hi]) {
        return { index: hi, image: this.images[hi]! };
      }
    }
    return null;
  }

  /** Get an exact frame, no fallback. */
  get(index: number): HTMLImageElement | null {
    return this.images[index] ?? null;
  }
}

let singleton: FrameSequence | null = null;

export function getFrameSequence(): FrameSequence {
  if (!singleton) singleton = new FrameSequence(6, 6);
  return singleton;
}
