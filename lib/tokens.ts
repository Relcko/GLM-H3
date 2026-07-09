/**
 * Design tokens — single source of truth for non-Tailwind values
 * (those already in tailwind.config.ts are mirrored here for
 *  consumers that need raw access, like canvas or JS animations).
 */

export const COLOR = {
  bg: "#050505",
  bgSecondary: "#090909",
  accent: "#00D4FF",
  accentBlue: "#0057FF",
  gold: "#D6B25E",
  success: "#3CE37D",
  warning: "#FFC857",
} as const;

export const Z = {
  /** World layers (canvas, particles, atmosphere). */
  world: 0,
  /** Slow aurora gradient — above canvas, below atmosphere (DOM order). */
  aurora: 1,
  atmosphere: 1,
  particles: 2,
  backdrop: 3,
  /** Page content. */
  content: 10,
  /** Section lighting — key-light overlay above content. */
  light: 11,
  /** Volumetric god-rays — above the key light (DOM order). */
  volumetric: 11,
  /** Section transition — chapter boundary cross-dissolve. */
  transition: 12,
  /** Floating UI. */
  floating: 140,
  nav: 160,
  progress: 150,
  cursor: 300,
  loader: 200,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const SHADOW = {
  glass: "0 8px 40px -12px rgba(0, 0, 0, 0.6)",
  glowAccent: "0 0 24px rgba(0, 212, 255, 0.45)",
  glowGold: "0 0 24px rgba(214, 178, 94, 0.45)",
  card: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px -8px rgba(0,0,0,0.4)",
  cardHover: "inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 60px -20px rgba(0,0,0,0.5), 0 0 30px -10px rgba(0,212,255,0.12)",
  btn: "inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px -8px rgba(255,255,255,0.15), 0 2px 8px -2px rgba(0,0,0,0.2)",
  btnHover: "inset 0 1px 0 rgba(255,255,255,0.4), 0 12px 32px -8px rgba(255,255,255,0.25), 0 4px 12px -2px rgba(0,0,0,0.3)",
} as const;

/** Awwwards-style luxury spacing scale (px). */
export const SPACE = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  jumbo: 96,
  hero: 128,
} as const;
