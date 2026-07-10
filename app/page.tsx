"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import CinematicShell from "@/components/CinematicShell";
import ChapterRail from "@/components/ChapterRail";
import Chapter01 from "@/components/chapters/Chapter01";
import Chapter02 from "@/components/chapters/Chapter02";
import { getDirector } from "@/lib/director";

const Chapter03 = dynamic(() => import("@/components/chapters/Chapter03"));
const Chapter04 = dynamic(() => import("@/components/chapters/Chapter04"));
const Chapter05 = dynamic(() => import("@/components/chapters/Chapter05"));
const Chapter06 = dynamic(() => import("@/components/chapters/Chapter06"));
const Chapter07 = dynamic(() => import("@/components/chapters/Chapter07"));
const Chapter08 = dynamic(() => import("@/components/chapters/Chapter08"));
const FAQ = dynamic(() => import("@/components/FAQ"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const director = getDirector();
    const unsub = director.subscribe(() => {
      if (director.isHeroReady()) setHeroReady(true);
    });
    return unsub;
  }, []);

  return (
    <CinematicShell heroReady={heroReady}>
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
      <ChapterRail />
    </CinematicShell>
  );
}
