import type { Transition, Variants } from "framer-motion";

/**
 * Cinematic easing curves.
 *
 * LUX     — Apple-style deceleration. Default for content reveals.
 * CINE    — Long settle, slow attack. Feels like a heavy cinema camera.
 * GLIDE   — Smooth ease-in-out. Sections, crossfades, ambient motion.
 * SNAP    — Punchy, deliberate. UI controls, hover states.
 * DOLLY   — Ease in then glide. The "push into" feeling, used for section
 *           depth transitions.
 * SETTLE  — Extra-long tail. The "camera rests" curve — almost no motion
 *           for the last 30%, so elements drift into place and hold.
 * DRIFT   — Soft S-curve for ambient, breathing motion (orbs, light).
 */
export const EASE_LUX = [0.16, 1, 0.3, 1] as const;
export const EASE_CINE = [0.22, 1, 0.36, 1] as const;
export const EASE_GLIDE = [0.65, 0, 0.35, 1] as const;
export const EASE_SNAP = [0.4, 0, 0.2, 1] as const;
export const EASE_DOLLY = [0.5, 0, 0.1, 1] as const;
export const EASE_SETTLE = [0.04, 0.9, 0.16, 1] as const;
export const EASE_DRIFT = [0.37, 0, 0.63, 1] as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Standardized spring configs. */
export const SPRING = {
  /** Snappy, slightly bouncy. UI controls. */
  snappy: { type: "spring", stiffness: 320, damping: 22 } satisfies Transition,
  /** Smooth glide. Cards, reveals. */
  glide: { type: "spring", stiffness: 180, damping: 22 } satisfies Transition,
  /** Heavy, deliberate. Hero motion. */
  heavy: { type: "spring", stiffness: 120, damping: 28, mass: 0.6 } satisfies Transition,
  /** Magnetic button. */
  magnet: { type: "spring", stiffness: 260, damping: 18 } satisfies Transition,
  /** Cinematic. Long settle, weighted. */
  cine: { type: "spring", stiffness: 90, damping: 26, mass: 0.9 } satisfies Transition,
} as const;

/** Durations in seconds. */
export const DUR = {
  fast: 0.25,
  base: 0.5,
  slow: 0.9,
  cin: 1.2,
  epic: 1.8,
} as const;

/** Reusable motion variants. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DUR.slow, ease: EASE_LUX },
  },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.slow, ease: EASE_LUX } },
};

export const wordRise: Variants = {
  hidden: { opacity: 0, y: "110%" },
  show: { opacity: 1, y: "0%", transition: { duration: DUR.slow, ease: EASE_LUX } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_LUX } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_LUX } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.slow, ease: EASE_LUX } },
};

/**
 * Stagger container for child reveals.
 * Use a small delay (~0.08s) for cinematic pacing, larger (~0.15s) for
 * deliberate editorial pacing.
 */
export const stagger = (delay = 0.08, initial = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: delay, delayChildren: initial },
  },
});

/** Read reduced motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Map a value v in [vMin..vMax] to [tMin..tMax] with clamp.
 * Used by scrubbed transforms to keep things within bounds.
 */
export function remap(v: number, vMin: number, vMax: number, tMin: number, tMax: number) {
  const t = (v - vMin) / (vMax - vMin);
  return tMin + (tMax - tMin) * Math.max(0, Math.min(1, t));
}

/** Smoothstep — Hermite interpolation. Feels more organic than linear. */
export function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Smootherstep — Ken Perlin's. Even softer. */
export function smootherstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Mouse-tracking spotlight handler. Attach to an element carrying the
 * `.spotlight` CSS class — it writes `--mx` / `--my` custom properties
 * (in px, relative to the element) which the `.spotlight::after` glow
 * uses to position its radial gradient. Gives every card a cursor-
 * following light that reads as handcrafted attention to detail.
 */
export function trackSpotlight(e: { currentTarget: HTMLElement; clientX: number; clientY: number }) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * Frame-rate-independent damping toward a target.
 *
 * Uses exponential decay: `current + (target - current) * (1 - e^(-λ·dt))`.
 * `lambda` is the decay rate per second (higher = snappier). This is
 * refresh-rate agnostic, so a 120Hz display feels identical to 60Hz —
 * essential for "smooth interpolation" that doesn't depend on FPS.
 *
 * Reference: http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
 *
 * Approximate mapping from the old per-frame `rate r` (at 60fps):
 *   λ ≈ -ln(1 - r) · 60
 *     r=0.085 → λ≈5.3   (heavy trail)
 *     r=0.12  → λ≈7.7   (smooth)
 *     r=0.18  → λ≈12    (responsive)
 *     r=0.28  → λ≈17    (snappy)
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Damp but never overshoot past the target (clamp to the [from→to] segment). */
export function dampClamp(current: number, target: number, lambda: number, dt: number): number {
  const next = damp(current, target, lambda, dt);
  // If we've crossed the target, snap to it.
  if ((target >= current && next >= target) || (target <= current && next <= target)) {
    return target;
  }
  return next;
}

/**
 * Approaches 0..1 with a weighted "camera" feel: heavier on slow input
 * (long trail), more responsive on fast input (keeps up). Returns the
 * new smoothed value. `velocity` is 0..1.
 */
export function dampWeighted(
  current: number,
  target: number,
  velocity: number,
  dt: number,
  lambdaSlow = 5.5,
  lambdaFast = 13
): number {
  const lambda = lambdaSlow + (lambdaFast - lambdaSlow) * Math.min(1, velocity);
  return damp(current, target, lambda, dt);
}

/**
 * Director easing — a slow, luxurious ease used for milestone-driven
 * cinematic reveals (curtain fade, headline wipe, dolly settle). Long
 * tail so motion "rests" rather than stopping. Keep all Director timing
 * values in the HERO constant block below — never inline literals.
 */
export const EASE_DIRECTOR = [0.16, 1, 0.3, 1] as const;

/**
 * HERO phase — shared cinematic constants for the milestone Director.
 *
 * All durations are in SECONDS. All magnitudes are unitless multipliers
 * or normalized offsets. Every value here is consumed by the Director
 * and the existing layers so no animation hard-codes a magic number.
 *
 * Milestone stages (ordinal, event-driven — never time-elapsed):
 *   0 App Mounted
 *   1 Canvas Ready
 *   2 First Frame Rendered (World Ready)
 *   3 Particles Initialized
 *   4 Lighting Initialized
 *   5 Hero Ready
 *   6 Headline Reveal
 *   7 CTA Reveal
 *   8 Scroll Hint
 */
export const HERO = {
  /** Black curtain fade-out once Hero is ready (Stage 5). */
  CURTAIN_FADE: 1.1,
  /** Opacity ceiling for the black intro curtain. */
  CURTAIN_OPACITY: 1,
  /** Per-stage reveal ramp rates (dt-damping lambda) for layer opacity. */
  LAYER_RAMP: 6,
  /** Camera dolly: max scale added during the Hero push-in (Stage 5+). */
  DOLLY_SCALE: 0.05,
  /** Camera orbit/tilt: max normalized offset drift (fraction of frame). */
  ORBIT_DRIFT: 0.012,
  /** Camera orbit/tilt oscillation rate (radians/sec). */
  ORBIT_RATE: 0.16,
  /** Headline per-word reveal stagger (seconds between words). */
  HEADLINE_STAGGER: 0.12,
  /** Headline reveal duration (seconds). */
  HEADLINE_DURATION: 1.1,
  /** CTA reveal delay after headline completes (seconds). */
  CTA_DELAY: 0.35,
  /** CTA reveal duration (seconds). */
  CTA_DURATION: 0.9,
  /** Scroll-hint reveal delay after CTA (seconds). */
  SCROLL_HINT_DELAY: 0.5,
  /** Scroll-hint reveal duration (seconds). */
  SCROLL_HINT_DURATION: 1.0,
  /** Background layer base opacities (re-used so layers stay consistent). */
  PARTICLES_OPACITY: 0.55,
  ATMOSPHERE_OPACITY: 0.72,
} as const;

/**
 * CAMERA — continuous camera language for Sprint 2.
 *
 * The camera is a PURE function of journeyProgress (0..1). It never reads
 * chapter identity, never branches on chapter index, never snaps. Every
 * curve below is continuous, so a chapter boundary is just another progress
 * value — the shot never cuts.
 *
 * Magnitudes are unitless multipliers / normalized offsets. All easing is
 * slow and heavy (no bounce, no overshoot) so motion reads as luxury.
 */
export const CAMERA = {
  /** Damping lambda for the frame-index settle (frame-rate independent). */
  FRAME_LAMBDA: 11,
  /** Velocity push-back: fast scroll eases the camera out (weight). */
  VELOCITY_PUSHBACK: 0.014,

  // --- Continuous journey gestures (all f(journeyProgress)) ---
  // Deliberate, film-like moves: slower oscillation, a touch more crane so
  // the structure is discovered from below, and a gentler finale pull-back
  // so the building stays intimate through the bright white finale. The
  // per-beat VISUAL_BEATS table layers emotional composition on top of this
  // continuous base (see sampleVisualBeat) without any chapter branching.
  /** Slow continuous dolly: gentle push-in early, slight pull-back to finale. */
  DOLLY_AMOUNT: 0.05,
  DOLLY_PULLBACK: 0.02,
  /** One gentle orbit arc across the journey (left → right). No per-chapter snap. */
  ORBIT_AMOUNT: 0.012,
  /** Faint continuous crane rise across the journey (discovery from below). */
  CRANE_AMOUNT: 0.04,
  /** Tiny tilt bias, continuous. */
  TILT_AMOUNT: 0.006,
  /** Slow orbit/crane oscillation rate (radians/sec) — barely perceptible. */
  GESTURE_RATE: 0.08,
  /** Idle depth-breathing — kept minimal so the monument feels weighty/static. */
  BREATHE: 0.0025,
  /** Idle two-sine drift amplitude — reduced so the world doesn't float. */
  IDLE_DRIFT_A: 0.06,
  IDLE_DRIFT_B: 0.04,
  /** Mouse parallax strength (X stronger, Y subtler) — decoupled from camera.
   *  Slightly reduced so the building stays anchored and monumental. */
  PARALLAX_X: 20,
  PARALLAX_Y: 10,
  PARALLAX_LAMBDA: 8,
} as const;

/**
 * WORLD — neutral, scene-agnostic geometry/reveal constants.
 *
 * No subject nouns (no "tower"/"building"/"skyline"). These describe generic
 * layer rects and discovery thresholds so future scenes (one structure,
 * many, an entire skyline) are pure config — the renderer stays agnostic.
 */
export const WORLD = {
  /** Frame fit overscan — generous so the subject always fills the frame and
   *  the per-beat compose-scale (monumental ↔ expansive) has room to breathe.
   *  The per-beat offset is clamped to the effective overscan margin so no
   *  hard edge is ever revealed. */
  FIT_OVSCAN: 1.12,
  /**
   * Discovery: how "close" the camera feels as a function of progress.
   * 0 = far silhouette, 1 = intimate detail. Drives physically-motivated
   * reveal (proximity reveals detail, never switches on).
   */
  PROXIMITY_NEAR: 0.82, // progress at which the subject reads "close"
  PROXIMITY_FAR: 0.04, // progress at which it reads as a distant mass
  /** Architectural detail reveal threshold (smoothstep over proximity). */
  DETAIL_REVEAL: 0.35,
  /** Lobby/ground-level illumination becomes legible past this proximity. */
  LOBBY_REVEAL: 0.45,
  /** Occupied-floor window warmth reveals gradually past this proximity. */
  WINDOW_REVEAL: 0.3,
  /** Crown/roof detail is discovered only near the end (final approach). */
  ROOF_REVEAL: 0.9,
  /** Maximum alpha for any discovery layer — kept low so it reads as lit, not VFX. */
  DISCOVERY_ALPHA: 0.09,
  /** Imperceptible interior "breath" amplitude (reads as occupied, not pulsing). */
  BREATH_AMPLITUDE: 0.03,
  BREATH_RATE: 0.18,
} as const;

/** Slow, heavy camera easing — no overshoot, no bounce. */
export const EASE_CAMERA = [0.22, 1, 0.36, 1] as const;

/**
 * smoothstep already exists; add a clamped remap helper used by camera
 * curves and discovery thresholds so no inline math leaks into layers.
 */
export function remapClamp(
  v: number,
  vMin: number,
  vMax: number,
  tMin: number,
  tMax: number
): number {
  const t = (v - vMin) / (vMax - vMin);
  return tMin + (tMax - tMin) * Math.max(0, Math.min(1, t));
}

/**
 * VISUAL_BEATS — the emotional storyboard of the experience.
 *
 * One beat per page section, in progress order. The page maps beats to its
 * chapters 1:1; the RENDERING SYSTEM NEVER SEES CHAPTER IDENTITY. It only
 * ever samples this table by continuous journey `progress` (see
 * sampleVisualBeat) and applies the numeric fields. No chapter name, no
 * chapter index, no branching — purely a function of progress.
 *
 * Each beat carries the four cinematic dimensions plus pacing:
 *   emotion      — what the visitor should feel (documentation / intent)
 *   camera       — the felt camera move (documentation / intent)
 *   lighting     — the felt light (documentation / intent)
 *   composition  — the felt framing (documentation / intent)
 *   scale        — compose-scale: >1 monumental (tight), <1 expansive (wide)
 *   offX         — horizontal bias (fraction of width): - left third, + right
 *   offY         — vertical bias (fraction of height): + drops subject (low-angle sky)
 *   light        — 0 cool moonlight → 1 bright clean white (tints discovery/vignette)
 *   pace         — gesture/breath feel (pacing): lower = stiller/more deliberate
 *
 * The story it tells: Arrival (monumental, low-angle, cool) → Discovery →
 * Trust/Ownership/Marketplace (steady, balanced, neutral-premium) → Vision/
 * Reveal (expansive, bright white). One unbroken emotional progression.
 */
export interface VisualBeat {
  emotion: string;
  camera: string;
  lighting: string;
  composition: string;
  /** compose-scale: >1 monumental, <1 expansive. */
  scale: number;
  /** horizontal bias (fraction of width): negative = left third. */
  offX: number;
  /** vertical bias (fraction of height): positive = subject dropped (low-angle). */
  offY: number;
  /** 0 cool moonlight → 1 bright clean white. */
  light: number;
  /** pacing feel: lower = stiller / more deliberate. */
  pace: number;
}

export const VISUAL_BEATS: VisualBeat[] = [
  // Beat 1 — Arrival: monumental, low-angle, cool moonlight.
  { emotion: "Arrival",     camera: "Low angle",     lighting: "Cool moonlight",     composition: "Monumental", scale: 1.06, offX: -0.045, offY: 0.05,  light: 0.0,  pace: 0.7 },
  // Beat 2 — Discovery: rising from below, still monumental.
  { emotion: "Discovery",   camera: "Rising",        lighting: "Cool moonlight",     composition: "Monumental", scale: 1.05, offX: -0.04,  offY: 0.04,  light: 0.05, pace: 0.8 },
  // Beat 3 — Trust: eye-level, balanced, clean architectural.
  { emotion: "Trust",       camera: "Eye level",     lighting: "Clean architectural", composition: "Balanced",   scale: 1.0,  offX: -0.015, offY: 0.0,   light: 0.2,  pace: 1.0 },
  // Beat 4 — Ownership: gentle push-in, balanced.
  { emotion: "Ownership",   camera: "Push-in",       lighting: "Neutral premium",    composition: "Balanced",   scale: 1.02, offX: 0.0,    offY: 0.0,   light: 0.35, pace: 0.9 },
  // Beat 5 — Confidence (Marketplace): eye-level, neutral premium.
  { emotion: "Confidence",  camera: "Eye level",     lighting: "Neutral premium",    composition: "Balanced",   scale: 1.0,  offX: 0.0,    offY: 0.0,   light: 0.4,  pace: 1.0 },
  // Beat 6 — Belonging: soft orbit, open.
  { emotion: "Belonging",   camera: "Soft orbit",    lighting: "Cool neutral",       composition: "Open",       scale: 0.98, offX: 0.02,   offY: 0.01,  light: 0.5,  pace: 1.1 },
  // Beat 7 — Vision (Future): wide reveal, expansive, bright white.
  { emotion: "Vision",      camera: "Wide reveal",   lighting: "Bright white",       composition: "Expansive",  scale: 0.9,  offX: 0.03,   offY: 0.02,  light: 0.8,  pace: 1.2 },
  // Beat 8 — Ascent (Reveal): rising wide, expansive, bright clean white.
  { emotion: "Ascent",      camera: "Rising wide",   lighting: "Bright clean white", composition: "Expansive",  scale: 0.92, offX: 0.025,  offY: 0.03,  light: 1.0,  pace: 1.15 },
];

/**
 * Sample the visual-beat storyboard by continuous progress (0..1).
 * Pure interpolation between adjacent beats — no chapter lookup, no state,
 * no branching. Returns the felt numeric intent the renderer applies.
 */
export function sampleVisualBeat(p: number): VisualBeat {
  const n = VISUAL_BEATS.length;
  const x = Math.max(0, Math.min(1, p)) * (n - 1);
  const i = Math.floor(x);
  const j = Math.min(n - 1, i + 1);
  const f = smoothstep(x - i);
  const a = VISUAL_BEATS[i];
  const b = VISUAL_BEATS[j];
  const mix = (u: number, v: number) => u + (v - u) * f;
  return {
    emotion: f < 0.5 ? a.emotion : b.emotion,
    camera: f < 0.5 ? a.camera : b.camera,
    lighting: f < 0.5 ? a.lighting : b.lighting,
    composition: f < 0.5 ? a.composition : b.composition,
    scale: mix(a.scale, b.scale),
    offX: mix(a.offX, b.offX),
    offY: mix(a.offY, b.offY),
    light: mix(a.light, b.light),
    pace: mix(a.pace, b.pace),
  };
}
