"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import SmoothScroll from "@/components/SmoothScroll";
import CinematicCanvas from "@/components/CinematicCanvas";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import Navbar from "@/components/Navbar";
import { Z } from "@/lib/tokens";

const DynamicGradient = dynamic(() => import("@/components/DynamicGradient"), { ssr: false });
const CinematicAtmosphere = dynamic(() => import("@/components/CinematicAtmosphere"), { ssr: false });
const Particles = dynamic(() => import("@/components/Particles"), { ssr: false });
const VolumetricLight = dynamic(() => import("@/components/VolumetricLight"), { ssr: false });
const SectionLight = dynamic(() => import("@/components/SectionLight"), { ssr: false });
const MouseParallax = dynamic(() => import("@/components/MouseParallax"), { ssr: false });

export default function CinematicShell({
  children,
  heroReady,
  className = "",
}: {
  children: ReactNode;
  heroReady?: boolean;
  className?: string;
}) {
  return (
    <>
      <SmoothScroll />

      {heroReady !== undefined && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: Z.loader,
            background: "#050505",
            opacity: heroReady ? 0 : 0.7,
            transition: "opacity 1.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      )}

      <CinematicCanvas />
      <DynamicGradient />
      <CinematicAtmosphere />
      <Particles />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: Z.backdrop,
          background: "rgba(5,5,5,0.22)",
        }}
      />

      <MouseParallax />
      <main id="top" className={`relative ${className}`} style={{ zIndex: Z.content }}>
        {children}
      </main>

      <SectionLight />
      <VolumetricLight />

      <ScrollProgress />
      <CustomCursor />
      <Navbar />
    </>
  );
}
