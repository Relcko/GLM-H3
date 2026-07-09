"use client";

import { useEffect, useRef } from "react";
import { Z } from "@/lib/tokens";
import { getScrollStore } from "@/lib/scroll";
import { smootherstep } from "@/lib/motion";

/**
 * DynamicGradient — Phase 4 "aurora".
 *
 * A slow, living gradient field that sits just above the canvas and
 * below the atmosphere orbs. Two large radial gradients drift across
 * the frame on a long CSS timeline, and their hue shifts cool→warm
 * across the journey (mirrors the SectionLight / sun-arc mood).
 *
 * Performance: almost free. The drift is a single CSS animation (GPU-
 * composited transform on the layer); the only JS work is updating the
 * hue rotation a few times per second from the shared scroll store —
 * throttled to every ~6 frames so it never contends with the camera.
 */
export default function DynamicGradient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const store = getScrollStore();
    let raf = 0;
    let frame = 0;

    const tick = () => {
      // Throttle: update hue ~10x/s, not every frame.
      if (frame++ % 6 === 0) {
        const smooth = store.getSmooth();
        const j = smootherstep(smooth);
        // Cool cyan (start) → warm gold (finale).
        const h = 190 - j * 145; // 190° (cyan) → 45° (gold)
        if (ref.current) {
          ref.current.style.filter = `hue-rotate(${h.toFixed(1)}deg)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="gpu pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: Z.aurora, opacity: 0.5 }}
    >
      <div
        ref={ref}
        className="absolute inset-[-30%]"
        style={{
          background:
            "radial-gradient(60% 50% at 25% 30%, rgba(0,140,200,0.22) 0%, transparent 60%), radial-gradient(55% 45% at 75% 70%, rgba(0,90,255,0.18) 0%, transparent 60%)",
          animation: "auroraDrift 24s ease-in-out infinite alternate",
          willChange: "transform, filter",
        }}
      />
      <style>{`
        @keyframes auroraDrift {
          0%   { transform: translate3d(-3%, -2%, 0) rotate(0deg); }
          50%  { transform: translate3d(2%, 3%, 0) rotate(6deg); }
          100% { transform: translate3d(4%, -1%, 0) rotate(-4deg); }
        }
      `}</style>
    </div>
  );
}
