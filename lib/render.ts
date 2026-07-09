/**
 * Renderer-agnostic contracts for the cinematic world.
 *
 * The renderer (CinematicCanvas) knows NOTHING about what a layer draws.
 * It only: requests layers from a WorldSource, filters invisible ones,
 * sorts by priority, calls render(), and disposes resources. A layer owns
 * all of its own drawing behavior — including any subject-specific detail
 * (a structure, water, a bridge, a skyline) which the renderer never sees.
 *
 * This file intentionally contains NO scene/subject nouns. "Layer" is the
 * only abstraction. Future content (buildings, landscape, bridges, water,
 * city blocks, skyline) is expressed purely as new Layer implementations.
 */

import { CAMERA } from "@/lib/motion";

/** Continuous camera state — a pure function of journeyProgress + input. */
export interface CameraState {
  /** Continuous journey position 0..1 across the whole experience. */
  progress: number;
  /** Aggregated scroll velocity 0..1 (for motion feel, not branching). */
  velocity: number;
  /** Per-frame delta-time in seconds (clamped). */
  dt: number;
  /** Seconds since the loop started (for imperceptible breathing only). */
  time: number;
  /** Camera transform — the renderer applies these around the composite. */
  scale: number;
  offX: number;
  offY: number;
  /** Optional orientation hints (radians) for camera-coupled layers. */
  tilt: number;
  orbit: number;
  crane: number;
}

/**
 * The single source of rendering context handed to every layer each frame.
 * Layers read only from this — they never reach into the scroll store,
 * the Director, or any chapter system.
 */
export interface RenderEnv {
  /** Continuous journey position 0..1 (the ONLY narrative input). */
  progress: number;
  /** The fully-resolved camera for this frame. */
  camera: CameraState;
  /** Seconds since the loop started. */
  time: number;
  /** Per-frame delta-time in seconds. */
  dt: number;
  /** Device pixel ratio in use. */
  dpr: number;
  /** Canvas backing-store width (device pixels). */
  width: number;
  /** Canvas backing-store height (device pixels). */
  height: number;
}

/**
 * A drawable layer. Owns its rendering behavior entirely.
 * The renderer is stateless with respect to layer contents.
 */
export interface Layer {
  /** Stable identifier (debugging / disposal bookkeeping). */
  id: string;
  /** Draw order: lower renders first (back), higher last (front). */
  priority: number;
  /** Whether to draw this frame. Pure function of env — no side effects. */
  visible(env: RenderEnv): boolean;
  /** Paint this layer. The layer fully owns what it draws. */
  render(ctx: CanvasRenderingContext2D, env: RenderEnv): void;
  /** Optional capability flags — default behavior preserves today's pipeline. */
  capabilities?: {
    receivesCamera?: boolean;
    receivesLighting?: boolean;
    receivesPostFX?: boolean;
  };
  /** Optional teardown for owned resources (offscreen buffers, masks). */
  dispose?(): void;
}

/** Produces the layer set for a given rendering context. */
export interface WorldSource {
  getLayers(env: RenderEnv): Layer[];
  dispose?(): void;
}

/**
 * Compute the continuous camera for a frame. PURE function of journey
 * progress + velocity — never reads chapters, never branches, never snaps.
 * A chapter boundary is just another progress value, so the shot is one
 * uninterrupted move. Idle breathing + drift keep the world alive at rest
 * without any narrative branching.
 */
export function computeCameraState(args: {
  progress: number;
  velocity: number;
  dt: number;
  time: number;
  dpr: number;
  width: number;
  height: number;
}): CameraState {
  const { progress, velocity, dt, time, dpr, width, height } = args;

  // Slow continuous dolly: gentle push-in, slight pull-back toward finale.
  // Smooth sinusoid of progress — continuous, no seams.
  const dolly =
    CAMERA.DOLLY_AMOUNT * Math.sin(progress * Math.PI * 0.5) -
    CAMERA.DOLLY_PULLBACK * smoothstep(progress);

  // One gentle orbit arc across the journey (left → right), plus a barely
  // perceptible oscillation. Continuous function of progress + time.
  const orbit =
    CAMERA.ORBIT_AMOUNT * Math.sin(progress * Math.PI) +
    CAMERA.ORBIT_AMOUNT * 0.25 * Math.sin(time * CAMERA.GESTURE_RATE);

  // Faint continuous crane rise (discovery from below).
  const crane = CAMERA.CRANE_AMOUNT * smoothstep(progress);

  // Tiny tilt bias, continuous.
  const tilt = CAMERA.TILT_AMOUNT * Math.sin(progress * Math.PI * 0.5);

  // Velocity push-back: fast scroll eases the camera out (weight).
  const scale = 1 - velocity * CAMERA.VELOCITY_PUSHBACK + dolly;

  // Idle depth-breathing (imperceptible) so a parked camera still lives.
  const breathe = Math.sin(time * 0.2) * CAMERA.BREATHE;

  // Camera-coupled offsets (also carry mouse parallax from the renderer).
  const offX = orbit * width + Math.sin(time * CAMERA.GESTURE_RATE * 0.8) * CAMERA.ORBIT_AMOUNT * 0.5 * width;
  const offY = -crane * height + breathe * height;

  return {
    progress,
    velocity,
    dt,
    time,
    scale: scale + breathe,
    offX,
    offY,
    tilt,
    orbit,
    crane,
  };
}

// Local smoothstep to avoid a circular import with lib/motion.
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
