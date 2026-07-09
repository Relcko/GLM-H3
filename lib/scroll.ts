"use client";

import type Lenis from "lenis";
import { damp, dampWeighted } from "./motion";
import { CHAPTERS } from "./chapters";

/**
 * Shared scroll store — the single clock of the experience.
 *
 * ONE rAF loop owns the frame. When a Lenis smooth-scroll instance is
 * attached (by <SmoothScroll/>), this loop drives `lenis.raf(time)` and
 * reads Lenis's already-smoothed scroll/limit/progress — so the scroll
 * physics, the camera, the atmosphere, the lighting and the UI all read
 * from the same value in the same frame. That is "scroll synchronization".
 *
 * Without Lenis (reduced-motion, touch, SSR), it falls back to reading
 * the native window.scrollY directly.
 *
 * All smoothing is frame-rate-independent (exponential damping keyed on
 * real elapsed seconds), so 60Hz / 120Hz / 144Hz displays feel identical.
 *
 * Published values:
 *   - progress      0..1   along the page (Lenis-smoothed when available)
 *   - velocity      0..1   |scroll delta|/s, shaped (fast attack, slow release)
 *   - smooth        0..1   heavily-smoothed progress (atmosphere / parallax)
 *   - camera        0..1   weighted scroll for the canvas camera (heavier
 *                          on slow scroll, lighter on fast — "weighted" feel)
 *   - y             raw/animated scrollY
 *   - max           max scrollable distance
 *   - sectionIndex  which section element is closest to the viewport center
 *   - sectionMap    Map<id, 0..1> — each tracked section's progress
 *   - chapterStates cached per-frame chapter measurements (shared by
 *                  SectionLight + SectionTransition so they react to the
 *                  exact same viewport positions each frame)
 */

type Listener = () => void;

export type ChapterState = {
  id: string;
  /** 0 = just entered bottom, 0.5 = centered, 1 = just left top. */
  progress: number;
  /** min(prog, 1-prog): 0 at a chapter boundary, 0.5 at its center. */
  dist: number;
  /** sin(π·prog) bell weight, tapered at the edges. */
  weight: number;
  /** |center - viewport center| in px (smaller = more centered). */
  centerDist: number;
};

class ScrollStore {
  private listeners = new Set<Listener>();
  private raf = 0;

  // raw / animated
  private y = 0;
  private max = 1;

  // smoothed
  private progress = 0;
  private velocity = 0;
  private smooth = 0;
  private camera = 0;

  // lenis (optional — attached by <SmoothScroll/>)
  private lenis: Lenis | null = null;

  // sections
  private sectionEls = new Map<string, HTMLElement>();

  // cached chapter states (per-frame; shared by light + transition)
  private chapterCache: ChapterState[] = [];
  private chapterStamp = -1;

  // tick
  private lastY = 0;
  private lastT = 0;
  private started = false;

  /** Attach a Lenis instance. The store's rAF becomes the single driver. */
  attachLenis(lenis: Lenis) {
    this.lenis = lenis;
    // Seed from Lenis so the first frame isn't a jump from 0.
    this.y = lenis.scroll || 0;
    this.max = lenis.limit || this.max;
    this.progress = Math.max(0, Math.min(1, lenis.progress || 0));
    this.smooth = this.progress;
    this.camera = this.progress;
    this.lastY = this.y;
  }
  detachLenis() {
    this.lenis = null;
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.max = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    this.lastY = window.scrollY;
    this.lastT = performance.now();

    const tick = (now: number) => {
      // dt in seconds, clamped so a tab-return doesn't explode velocity.
      const dt = Math.max(0.001, Math.min(0.1, (now - this.lastT) / 1000));

      // --- Source: Lenis (smoothed) or native window.scrollY ------------
      let curY: number;
      if (this.lenis) {
        // Drive Lenis from THIS rAF — single clock for the whole experience.
        this.lenis.raf(now);
        curY = this.lenis.scroll;
        this.max = this.lenis.limit || this.max;
        this.progress = Math.max(0, Math.min(1, this.lenis.progress));
      } else {
        curY = window.scrollY;
        this.y = curY;
        this.progress = Math.max(0, Math.min(1, curY / this.max));
        // (max recalculated on resize; cheap to leave here)
      }
      this.y = curY;

      // --- Velocity (shaped: fast attack, slow release) -----------------
      const dy = curY - this.lastY;
      // 2400 px/s maps to 1.0 (same feel as the old px/ms: 2.4).
      const target = Math.min(1, Math.abs(dy) / dt / 2400);
      const lambda = target > this.velocity ? 17 : 5.5;
      this.velocity = damp(this.velocity, target, lambda, dt);

      // --- Smooth (atmosphere / parallax uses this) ----------------------
      this.smooth = damp(this.smooth, this.progress, 7.7, dt);

      // --- Camera (weighted; heavier on slow, responsive on fast) -------
      // This is the canvas camera. Trailing the progress gives the
      // "heavy cinema camera" feel — it arrives a beat late and settles.
      this.camera = dampWeighted(this.camera, this.progress, this.velocity, dt, 5.0, 12.5);

      this.lastY = curY;
      this.lastT = now;

      // Invalidate the chapter cache (recomputed lazily on first read).
      this.chapterStamp = -1;

      this.emit();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);

    window.addEventListener("resize", this.onResize, { passive: true });
    // Recompute max after fonts/layout settle (loader hides ~frame 30).
    setTimeout(this.onResize, 600);
    setTimeout(this.onResize, 1800);

    // Scroll synchronization around tab visibility: when the tab comes
    // back, the rAF resume would otherwise read a huge dt (clamped, but
    // the first-frame velocity could still spike) and `max` may be stale
    // if layout settled while hidden. Reset the clock and re-measure so
    // the camera/atmosphere/lighting never lurch on return.
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  stop() {
    if (!this.started) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.started = false;
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private onVisibility = () => {
    if (document.hidden) return;
    // Tab returned to focus: restart the clock cleanly and re-measure.
    this.lastT = performance.now();
    if (this.lenis) {
      this.lastY = this.lenis.scroll || 0;
      this.max = this.lenis.limit || this.max;
    } else {
      this.lastY = window.scrollY;
      this.onResize();
    }
    this.chapterStamp = -1;
  };

  private onResize = () => {
    if (this.lenis) {
      this.max = this.lenis.limit || this.max;
    } else {
      this.max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
    }
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getProgress = () => this.progress;
  getVelocity = () => this.velocity;
  getSmooth = () => this.smooth;
  getCamera = () => this.camera;
  getY = () => this.y;
  getMax = () => this.max;

  /** Register a section element. Section progress is recomputed on demand. */
  registerSection(id: string, el: HTMLElement) {
    this.sectionEls.set(id, el);
  }
  unregisterSection(id: string) {
    this.sectionEls.delete(id);
  }

  /**
   * Returns progress 0..1 for a section, where:
   *   0   = section's top just entered viewport bottom
   *   0.5 = section is centered
   *   1   = section's bottom just left viewport top
   */
  getSectionProgress(id: string): number {
    const el = this.sectionEls.get(id);
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height + vh;
    const traveled = vh - r.top;
    return Math.max(0, Math.min(1, traveled / total));
  }

  /** The section closest to viewport center. */
  getActiveSection(): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    const vh = window.innerHeight;
    for (const [id, el] of this.sectionEls) {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const dist = Math.abs(center - vh / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    }
    return best;
  }

  /**
   * Per-frame cached measurements for every chapter. Shared by
   * SectionLight and SectionTransition so both layers react to the
   * exact same viewport positions in a given frame — no drift between
   * the color of the key light and the dissolve pulse.
   *
   * Lazily computed once per frame and cached.
   */
  getChapterStates(): ChapterState[] {
    if (this.chapterStamp === this.raf && this.chapterCache.length) {
      return this.chapterCache;
    }
    const vh = window.innerHeight;
    const out: ChapterState[] = [];
    for (const c of CHAPTERS) {
      const el = document.getElementById(c.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const total = r.height + vh;
      const traveled = vh - r.top;
      const prog = Math.max(0, Math.min(1, traveled / total));
      const dist = Math.min(prog, 1 - prog);
      const bell = Math.sin(Math.PI * prog);
      const edge = Math.min(prog, 1 - prog) * 4;
      const weight = bell * Math.max(0, edge);
      const center = r.top + r.height / 2;
      out.push({
        id: c.id,
        progress: prog,
        dist,
        weight,
        centerDist: Math.abs(center - vh / 2),
      });
    }
    this.chapterCache = out;
    this.chapterStamp = this.raf;
    return out;
  }
}

let store: ScrollStore | null = null;

const SSR: ScrollStore = {
  listeners: new Set(),
  start: () => {},
  stop: () => {},
  subscribe: () => () => {},
  getProgress: () => 0,
  getVelocity: () => 0,
  getSmooth: () => 0,
  getCamera: () => 0,
  getY: () => 0,
  getMax: () => 1,
  registerSection: () => {},
  unregisterSection: () => {},
  getSectionProgress: () => 0,
  getActiveSection: () => null,
  attachLenis: () => {},
  detachLenis: () => {},
  getChapterStates: () => [],
} as unknown as ScrollStore;

export function getScrollStore(): ScrollStore {
  if (typeof window === "undefined") return SSR;
  if (!store) {
    store = new ScrollStore();
    store.start();
  }
  return store;
}
