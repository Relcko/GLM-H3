"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import PortfolioSummary from "@/components/staking/PortfolioSummary";
import ActiveStakes from "@/components/staking/ActiveStakes";
import RewardsSummary from "@/components/staking/RewardsSummary";
import { useAccount } from "@/lib/blockchain/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EASE_LUX } from "@/lib/motion";

export default function Portfolio() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  if (!isConnected) {
    return (
      <section id="portfolio" className="scroll-mt-24 py-16">
        <div className="dashboard-card overflow-hidden p-12 text-center sm:p-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/30">
              <rect x="3" y="11" width="18" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-light text-white/70">
            Connect your wallet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/40">
            Your purchased RLKO tokens, staked positions, and rewards will appear here.
          </p>
          <button
            onClick={openConnectModal}
            className="dashboard-btn dashboard-btn-primary mt-6"
          >
            Connect Wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="portfolio" className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <span className="dashboard-accent-line" />
        <span className="dashboard-label">My Portfolio</span>
      </div>

      <h2 className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
        Your holdings
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_LUX, delay: 0.1 }}
        className="mt-8 space-y-6"
      >
        <PortfolioSummary />
        <RewardsSummary />
        <ActiveStakes />
      </motion.div>
    </section>
  );
}
