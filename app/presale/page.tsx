"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import CinematicShell from "@/components/CinematicShell";
import DashboardShell from "@/components/dashboard/DashboardShell";
import InvestorPortalScreen from "@/components/dashboard/InvestorPortalScreen";
import PortfolioKPI from "@/components/dashboard/PortfolioKPI";
import RewardsCard from "@/components/dashboard/RewardsCard";
import InvestorActivity from "@/components/dashboard/InvestorActivity";
import TransactionTimeline from "@/components/dashboard/TransactionTimeline";
import WalletHealth from "@/components/dashboard/WalletHealth";
import InvestorStats from "@/components/dashboard/InvestorStats";
import PresaleStats from "@/components/presale/PresaleStats";
import PresaleBenefits from "@/components/presale/PresaleBenefits";
import PresaleTokenomics from "@/components/presale/PresaleTokenomics";
import TransactionHistory from "@/components/dashboard/TransactionHistory";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import DocsFAQ from "@/components/dashboard/DocsFAQ";
import { GridSection, GridFull } from "@/components/dashboard/GridLayout";
import TrustBar from "@/components/presale/TrustBar";
import InvestmentSummary from "@/components/presale/InvestmentSummary";
import { EASE_LUX, fadeUp } from "@/lib/motion";

const StakePanel = dynamic(() => import("@/components/staking/StakePanel"), { ssr: false });
const RewardsCalculator = dynamic(() => import("@/components/staking/RewardsCalculator"));
const Portfolio = dynamic(() => import("@/components/staking/Portfolio"));
const PresalePurchasePanel = dynamic(() => import("@/components/presale/PresalePurchasePanel"), { ssr: false });

const sectionVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_LUX },
  },
};

const sidebarFirstVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_LUX, delay: 0.02 },
  },
};

function SectionHeader({
  label,
  title,
  desc,
  id,
}: {
  label: string;
  title: string;
  desc?: string;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      className="mb-6 scroll-mt-24"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="dashboard-accent-line" />
        <span className="dashboard-label">{label}</span>
      </div>
      <h2 className="font-display text-xl font-light text-white/90">
        {title}
      </h2>
      {desc && (
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-white/45">
          {desc}
        </p>
      )}
    </motion.div>
  );
}

export default function PresalePage() {
  const [portalDone, setPortalDone] = useState(false);

  return (
    <CinematicShell className="bg-gradient-to-b from-[#0E0F13] via-[#0E0F13] to-[#0A0D14]">
      <InvestorPortalScreen onDone={() => setPortalDone(true)}>
        <DashboardShell portalDone={portalDone}>
          <motion.div
            className="space-y-8 lg:space-y-10"
            initial="hidden"
            animate={portalDone ? "visible" : "hidden"}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.04,
                  delayChildren: 0.04,
                },
              },
            }}
          >
            {/* ── SECTION 1 — Slim Trust Bar ─────────────────────────── */}
            <motion.div variants={sidebarFirstVariant}>
              <TrustBar />
            </motion.div>

            {/* ── SECTION 2 — Investment Summary band ─────────────────── */}
            <motion.div variants={sectionVariant}>
              <InvestmentSummary />
            </motion.div>

            {/* ── SECTION 3 + 4 — Reserve heading + Investment Console ── */}
            <motion.div variants={sectionVariant} className="flex flex-col gap-4">
              <div className="px-1">
                <h2 className="font-display text-2xl font-light tracking-[-0.02em] text-white/90 sm:text-3xl">
                  Reserve Your RLKO Allocation
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
                  Invest in premium tokenized real estate through blockchain-powered fractional ownership.
                </p>
              </div>
              <PresalePurchasePanel />
            </motion.div>

            {/* ── Supporting investor portal sections (unchanged) ─────── */}
            <motion.div variants={sectionVariant}>
              <GridSection>
                <GridFull>
                  <div className="flex flex-col gap-6">
                    <PortfolioKPI />
                    <RewardsCard />
                    <InvestorActivity />
                    <TransactionTimeline />
                    <div className="grid gap-6 xl:grid-cols-2">
                      <WalletHealth />
                      <InvestorStats />
                    </div>
                  </div>
                </GridFull>
              </GridSection>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="staking" className="scroll-mt-28">
                <SectionHeader
                  label="Staking Center"
                  title="Earn returns on your tokens"
                  desc="Lock your RLKO tokens to earn fixed returns. Choose a duration that matches your investment horizon."
                />
                <GridSection>
                  <GridFull>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <StakePanel />
                      <RewardsCalculator />
                    </div>
                  </GridFull>
                </GridSection>
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="portfolio" className="scroll-mt-28">
                <Portfolio />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="transactions" className="scroll-mt-28">
                <TransactionHistory />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="stats" className="scroll-mt-28">
                <PresaleStats />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="benefits" className="scroll-mt-28">
                <PresaleBenefits />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="tokenomics" className="scroll-mt-28">
                <PresaleTokenomics />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <section id="monitor" className="scroll-mt-28">
                <AdminDashboard />
              </section>
            </motion.div>

            <motion.div variants={sectionVariant}>
              <DocsFAQ />
            </motion.div>
          </motion.div>
        </DashboardShell>
      </InvestorPortalScreen>
    </CinematicShell>
  );
}