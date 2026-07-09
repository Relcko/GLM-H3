"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, Kicker } from "@/components/layout";
import { SplitWords } from "@/components/Reveal";
import { EASE_LUX } from "@/lib/motion";

const QA = [
  {
    q: "What exactly do I own?",
    a: "Each token represents fractional legal ownership of an SPV that holds the building. Your tokens are secured on-chain and verifiable at any time.",
  },
  {
    q: "How are rental yields paid?",
    a: "Distributions are streamed directly to your wallet monthly, in stablecoin, proportional to your token holdings. No paperwork, no waiting.",
  },
  {
    q: "Can I sell my stake?",
    a: "Yes — the secondary market lets you list tokens any time. Settlement is near-instant and global, 24/7.",
  },
  {
    q: "Is my investment insured?",
    a: "The protocol carries institutional custody insurance and audited smart contracts. Physical assets carry property insurance at the SPV level.",
  },
  {
    q: "What is the minimum?",
    a: "Ownership starts at $1. No accreditation required for retail-grade tranches in supported jurisdictions.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section
      id="faq"
      height="auto"
      center
      compact
      aria-labelledby="faq-title"
    >
      <div className="mx-auto w-full max-w-2xl px-5 sm:px-0">
        <div className="mb-12 text-center">
          <Kicker>Questions</Kicker>
          <h2
            id="faq-title"
            className="mt-4 font-display text-chapter font-semibold gradient-text"
          >
            <SplitWords text="Clarity, before commitment." />
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`glass card-interactive overflow-hidden rounded-2xl transition-all duration-500 ease-lux ${
                  isOpen ? "border-white/12" : ""
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-300"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-medium transition-colors duration-300 sm:text-base ${
                      isOpen ? "text-white" : "text-white/75 group-hover:text-white"
                    }`}
                  >
                    {item.q}
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ease-lux ${
                      isOpen
                        ? "rotate-45 border-accent/40 bg-accent/10 text-accent"
                        : "border-white/10 text-white/40 group-hover:border-white/20 group-hover:text-white/70"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, filter: "blur(4px)" }}
                      animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
                      exit={{ height: 0, opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.5, ease: EASE_LUX }}
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-white/65">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
