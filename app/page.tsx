"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SmoothScroll from "@/components/SmoothScroll";
import CinematicCanvas from "@/components/CinematicCanvas";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import Navbar from "@/components/Navbar";
import ChapterRail from "@/components/ChapterRail";
import Chapter01 from "@/components/chapters/Chapter01";
import Chapter02 from "@/components/chapters/Chapter02";
import { Z } from "@/lib/tokens";
import { getDirector } from "@/lib/director";
import { EASE_DIRECTOR, HERO } from "@/lib/motion";

/**
 * Home — Phase 5.
 *
 * Layered architecture (back to front):
 *   1. World      z=0   — scroll-driven building frames (canvas) + soft bloom
 *   2. Aurora     z=1   — slow dynamic gradient field
 *   3. Atmosphere z=1   — drifting color orbs
 *   4. Particles  z=2   — multi-layer depth particle field
 *   5. Backdrop   z=3   — content readability gradient
 *   6. Content    z=10  — chapter markup (mouse-parallaxed)
 *   7. SectionLight z=11 — per-chapter atmospheric key light (screen blend)
 *   8. VolumetricLight z=11 — god-ray shafts tied to the key light
 *   9. SectionTransition z=12 — chapter boundary cross-dissolve pulse
 *  10. UI         z=140..200 — rail, nav, progress
 *  11. Cursor     z=300 — premium custom cursor
 *
 * Phase 5 code-splitting:
 *   - Eager:  SmoothScroll, CinematicCanvas, ScrollProgress, CustomCursor,
 *             Navbar, ChapterRail, Chapter01, Chapter02 + the backdrop.
 *             These are above-the-fold / first-paint critical.
 *   - Lazy:   Chapters 03–08, FAQ, Footer, and the heavy atmospheric
 *             effects (DynamicGradient, CinematicAtmosphere, Particles,
*             VolumetricLight, SectionLight, SectionTransition,
*             MouseParallax). Each loads in its own chunk
 *             via next/dynamic with ssr:false for the canvas/effect layers
 *             (they're client-only and not needed for first paint or SEO).
 */

// --- Lazy: below-fold content (SSR on so crawlers see the full page) ---
const Chapter03 = dynamic(() => import("@/components/chapters/Chapter03"));
const Chapter04 = dynamic(() => import("@/components/chapters/Chapter04"));
const Chapter05 = dynamic(() => import("@/components/chapters/Chapter05"));
const Chapter06 = dynamic(() => import("@/components/chapters/Chapter06"));
const Chapter07 = dynamic(() => import("@/components/chapters/Chapter07"));
const Chapter08 = dynamic(() => import("@/components/chapters/Chapter08"));
const FAQ = dynamic(() => import("@/components/FAQ"));
const Footer = dynamic(() => import("@/components/Footer"));

// --- Lazy: atmospheric effect layers (client-only, not needed for SEO) ---
const DynamicGradient = dynamic(() => import("@/components/DynamicGradient"), { ssr: false });
const CinematicAtmosphere = dynamic(() => import("@/components/CinematicAtmosphere"), { ssr: false });
const Particles = dynamic(() => import("@/components/Particles"), { ssr: false });
const VolumetricLight = dynamic(() => import("@/components/VolumetricLight"), { ssr: false });
const SectionLight = dynamic(() => import("@/components/SectionLight"), { ssr: false });
const SectionTransition = dynamic(() => import("@/components/SectionTransition"), { ssr: false });
const MouseParallax = dynamic(() => import("@/components/MouseParallax"), { ssr: false });

export default function Home() {
  // Stage 5: once the Hero is ready, lift the black intro curtain.
  // Starts "not ready" on both server and client (no Director read during
  // render) to avoid hydration mismatch; the subscription flips it when the
  // Director marks the Hero ready. No synchronous setState in the effect.
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const director = getDirector();
    const unsub = director.subscribe(() => {
      if (director.isHeroReady()) setHeroReady(true);
    });
    return unsub;
  }, []);

  return (
    <>
      <SmoothScroll />

      {/* Black intro curtain — lifts once the Hero is ready (Stage 5).
          Opacity-only transition, no layout/paint beyond compositing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: Z.loader,
          background: "#050505",
          opacity: heroReady ? 0 : HERO.CURTAIN_OPACITY,
          transition: `opacity ${HERO.CURTAIN_FADE}s cubic-bezier(${EASE_DIRECTOR[0]},${EASE_DIRECTOR[1]},${EASE_DIRECTOR[2]},${EASE_DIRECTOR[3]})`,
        }}
      />

      {/* World layer (background) */}
      <CinematicCanvas />
      <DynamicGradient />
      <CinematicAtmosphere />
      <Particles />

      {/* Atmospheric backdrop overlay — very light dark tint for content legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: Z.backdrop,
          background: "rgba(5,5,5,0.22)",
        }}
      />

      {/* Content layer (subtle mouse parallax via MouseParallax) */}
      <MouseParallax />
      <main id="top" className="relative" style={{ zIndex: Z.content }}>
        <Chapter01 />
        <Chapter02 />
        <Chapter03 />
        <Chapter04 />
        <Chapter05 />
        <Chapter06 />
        <Chapter07 />
        <Chapter08 />
        <FAQ />
        <Footer />
      </main>

      {/* Atmospheric lighting & section transitions */}
      <SectionLight />
      <VolumetricLight />
      <SectionTransition />

      {/* UI layer */}
      <ScrollProgress />
      <CustomCursor />
      <Navbar />
      <ChapterRail />
    </>
  );
}
