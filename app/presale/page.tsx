"use client";

import dynamic from "next/dynamic";
import CinematicShell from "@/components/CinematicShell";
import Footer from "@/components/Footer";
import PresaleHero from "@/components/presale/PresaleHero";
import PresaleStats from "@/components/presale/PresaleStats";
import PresaleBenefits from "@/components/presale/PresaleBenefits";
import PresaleTokenomics from "@/components/presale/PresaleTokenomics";
import PresaleFAQ from "@/components/presale/PresaleFAQ";

const PresalePurchasePanel = dynamic(() => import("@/components/presale/PresalePurchasePanel"), { ssr: false });
const StakePanel = dynamic(() => import("@/components/staking/StakePanel"), { ssr: false });
const RewardsCalculator = dynamic(() => import("@/components/staking/RewardsCalculator"));
const Portfolio = dynamic(() => import("@/components/staking/Portfolio"));

export default function PresalePage() {
  return (
    <CinematicShell className="bg-gradient-to-b from-[#050505] via-[#050505] to-[#060b12]">
      <PresaleHero />
      <PresaleStats />
      <PresalePurchasePanel />

      <section id="rewards" className="relative w-full px-5 py-16 sm:px-8 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              RLKO Rewards
            </span>
          </div>
          <h2 className="mb-2 font-display text-[clamp(1.8rem,3.5vw,3rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
            Earn returns on your tokens
          </h2>
          <p className="mb-10 max-w-lg text-sm leading-relaxed text-white/45">
            Lock your RLKO tokens to earn fixed returns. Choose a duration that
            matches your investment horizon.
          </p>
          <div className="grid gap-8 lg:grid-cols-2">
            <StakePanel />
            <RewardsCalculator />
          </div>
        </div>
      </section>

      <Portfolio />
      <PresaleBenefits />
      <PresaleTokenomics />
      <PresaleFAQ />
      <Footer />
    </CinematicShell>
  );
}
