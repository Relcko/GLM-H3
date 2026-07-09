"use client";

import { motion } from "framer-motion";
import { useScrollProgress } from "@/lib/hooks";

/**
 * Top-edge scroll progress.
 *
 * Reads the shared scroll store (Lenis-smoothed) so the bar tracks the
 * same single clock as the camera, atmosphere and lighting — no extra
 * spring layer fighting the rest of the experience.
 */
export default function ScrollProgress() {
  const progress = useScrollProgress();

  return (
    <motion.div
      className="fixed left-0 top-0 z-[150] h-px w-full origin-left bg-gradient-to-r from-accent-blue/50 via-accent/60 to-white/30"
      style={{ scaleX: progress }}
      aria-hidden="true"
    />
  );
}
