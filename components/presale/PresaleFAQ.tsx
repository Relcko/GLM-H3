"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, Container } from "@/components/layout";
import { Reveal } from "@/components/Reveal";
import { EASE_LUX } from "@/lib/motion";
import { SALE_META } from "@/lib/presale/config";

const FAQS = [
  {
    q: "What is the RLKO presale?",
    a: `The ${SALE_META.tokenSymbol} presale is the first opportunity to purchase ${SALE_META.tokenName} tokens before they are listed on public exchanges. Tokens are sold at progressively increasing prices across 95 stages.`,
  },
  {
    q: "How do I participate?",
    a: "Connect your EVM wallet (MetaMask, WalletConnect, or any injected browser wallet), select your payment token (BNB, USDT, ETH, or POL), enter the amount you wish to spend, and confirm the transaction. Make sure you have sufficient funds for gas.",
  },
  {
    q: "Which networks are supported?",
    a: "The presale is available on BSC, Polygon, and Ethereum (BSC Testnet for testing). We recommend BSC for the lowest transaction fees.",
  },
  {
    q: "When will tokens be claimable?",
    a: "Tokens are distributed immediately after purchase. You can view them in your wallet once the transaction is confirmed on-chain.",
  },
  {
    q: "Can I buy with a credit card?",
    a: "Currently the presale only accepts crypto payments. You may use a centralized exchange to purchase BNB/USDT and then transfer them to your wallet.",
  },
  {
    q: "Is there a minimum purchase?",
    a: "There is no strict minimum, but you must cover gas fees. We recommend a minimum of $10 worth of tokens for a meaningful position.",
  },
  {
    q: "What happens after the presale ends?",
    a: "After all 95 stages conclude, remaining unsold tokens will be burned. The team will then focus on TGE (Token Generation Event) and DEX listings.",
  },
];

function AccordionItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-left text-sm text-white/70 transition-colors hover:text-white"
      >
        <span className="pr-4">{q}</span>
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE_LUX }}
          className="shrink-0 text-white/40"
        >
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_LUX }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/45">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PresaleFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section id="presale-faq" height="auto" center={false} className="py-20" compact>
      <Container className="max-w-3xl">
        <Reveal>
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/50" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.45em] text-accent/70">
              FAQ
            </span>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="font-display text-[clamp(1.8rem,3.5vw,3rem)] font-light leading-[1.08] tracking-[-0.03em] text-white/90">
            Frequently asked questions
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                q={faq.q}
                a={faq.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
