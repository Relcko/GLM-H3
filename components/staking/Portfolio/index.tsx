"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import PortfolioSummary from "@/components/staking/PortfolioSummary";
import ActiveStakes from "@/components/staking/ActiveStakes";
import RewardsSummary from "@/components/staking/RewardsSummary";
import MagneticButton from "@/components/MagneticButton";
import { useAccount } from "@/lib/blockchain/wallet";

export default function Portfolio() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  if (!isConnected) {
    return (
      <Section id="portfolio" height="auto" center={false} className="py-20">
        <Container>
          <Reveal>
            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
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
              <MagneticButton
                onClick={openConnectModal}
                variant="primary"
                className="mt-6"
              >
                Connect Wallet
              </MagneticButton>
            </div>
          </Reveal>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="portfolio" height="auto" center={false} className="py-20">
      <Container>
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              My Portfolio
            </span>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-display text-[clamp(1.8rem,3.5vw,3rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
            Your holdings
          </h2>
        </Reveal>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="mt-8 space-y-6"
        >
          <PortfolioSummary />
          <RewardsSummary />
          <ActiveStakes />
        </motion.div>
      </Container>
    </Section>
  );
}
